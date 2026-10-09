import WebSocket from "ws";
import { ProviderFailure } from "./provider-error";
import { GoogleGenAI, Modality } from "@google/genai";
import { VaultError } from "./settings-vault";
import { validModel, type Provider } from "./provider-models";
export interface VerifiedAudio {
  audio_base64: string;
  mime_type: "audio/wav";
  transcript: string;
  provider: Provider;
  model: string;
}
export const speechMatches = (expected: string, actual: string) =>
  expected
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim() ===
  actual
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export function pcmToWav(pcm: Buffer, sampleRate = 24000) {
  if (!pcm.length || pcm.length % 2)
    throw new VaultError(502, "Provider returned invalid audio.");
  const h = Buffer.alloc(44);
  h.write("RIFF");
  h.writeUInt32LE(pcm.length + 36, 4);
  h.write("WAVE", 8);
  h.write("fmt ", 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(sampleRate * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36);
  h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}
export async function testProvider(
  provider: Provider,
  key: string,
  model: string,
  fetcher: typeof fetch = fetch,
) {
  if (!validModel(provider, model))
    throw new VaultError(400, "Choose a supported voice model.");
  const url =
    provider === "openai"
      ? `https://api.openai.com/v1/models/${encodeURIComponent(model)}`
      : `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}`;
  let r: Response;
  try {
    r = await fetcher(url, {
      headers:
        provider === "openai"
          ? { Authorization: `Bearer ${key}` }
          : { "x-goog-api-key": key },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new VaultError(502, "Provider could not be reached. Try again.");
  }
  if (!r.ok)
    throw new VaultError(
      r.status === 401 || r.status === 403 ? 422 : 502,
      r.status === 401 || r.status === 403
        ? "Provider rejected the key or model access."
        : "Selected model is unavailable to this account.",
    );
  return {
    ok: true,
    message:
      "Key accepted and selected model metadata is accessible. Live audio has not been tested.",
  };
}
function finishAudio(
  provider: Provider,
  model: string,
  script: string,
  transcript: string,
  chunks: Buffer[],
): VerifiedAudio {
  if (!speechMatches(script, transcript))
    throw new VaultError(
      502,
      "Spoken wording differed from the verified script. Audio was withheld.",
    );
  return {
    audio_base64: pcmToWav(Buffer.concat(chunks)).toString("base64"),
    mime_type: "audio/wav",
    transcript,
    provider,
    model,
  };
}
// Audio is buffered and output transcription checked before any bytes reach the app.
export function speakOpenAI(
  key: string,
  model: string,
  script: string,
  timeoutMs = 20000,
): Promise<VerifiedAudio> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(
      `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`,
      { headers: { Authorization: `Bearer ${key}` }, handshakeTimeout: 15000 },
    );
    const chunks: Buffer[] = [];
    let transcript = "",
      bytes = 0,
      done = false;
    const timer = setTimeout(
      () => stop(new ProviderFailure(504, "Voice provider timed out.", true)),
      timeoutMs,
    );
    function stop(error?: Error, result?: VerifiedAudio) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      socket.close();
      error ? reject(error) : resolve(result!);
    }
    socket.on("open", () =>
      socket.send(
        JSON.stringify({
          type: "session.update",
          session: {
            type: "realtime",
            output_modalities: ["audio"],
            audio: {
              input: { turn_detection: null },
              output: {
                format: { type: "audio/pcm", rate: 24000 },
                voice: "marin",
              },
            },
          },
        }),
      ),
    );
    socket.on("unexpected-response", (_request, response) =>
      stop(
        new ProviderFailure(
          response.statusCode || 502,
          "OpenAI could not accept the voice session.",
          [429, 500, 502, 503, 504].includes(response.statusCode || 502),
        ),
      ),
    );
    socket.on("error", () =>
      stop(new ProviderFailure(502, "OpenAI voice connection failed.", true)),
    );
    socket.on("close", (code) => {
      if (!done)
        stop(
          new ProviderFailure(
            502,
            "OpenAI voice session ended early.",
            [1006, 1011, 1012, 1013].includes(code),
          ),
        );
    });
    socket.on("message", (raw) => {
      try {
        const e = JSON.parse(raw.toString());
        if (e.type === "session.updated")
          socket.send(
            JSON.stringify({
              type: "response.create",
              response: {
                conversation: "none",
                output_modalities: ["audio"],
                instructions:
                  "Read exactly the supplied passage script verbatim. Do not add an introduction, interpretation, or conclusion.",
                input: [
                  {
                    type: "message",
                    role: "user",
                    content: [{ type: "input_text", text: script }],
                  },
                ],
              },
            }),
          );
        if (e.type === "response.output_audio.delta") {
          const b = Buffer.from(e.delta, "base64");
          bytes += b.length;
          if (bytes > 8 * 1024 * 1024)
            return stop(
              new VaultError(502, "Voice response exceeded its limit."),
            );
          chunks.push(b);
        }
        if (e.type === "response.output_audio_transcript.delta")
          transcript += e.delta;
        if (e.type === "error")
          stop(
            new ProviderFailure(
              502,
              "OpenAI rejected the voice request.",
              e.error?.code === "rate_limit_exceeded" ||
                e.error?.type === "server_error",
            ),
          );
        if (e.type === "response.done") {
          if (e.response?.status !== "completed")
            return stop(
              new VaultError(502, "OpenAI voice response did not complete."),
            );
          try {
            stop(
              undefined,
              finishAudio("openai", model, script, transcript, chunks),
            );
          } catch (error) {
            stop(error as Error);
          }
        }
      } catch {
        stop(new VaultError(502, "Invalid OpenAI voice response."));
      }
    });
  });
}
export async function speakGemini(
  key: string,
  model: string,
  script: string,
  timeoutMs = 20000,
): Promise<VerifiedAudio> {
  const ai = new GoogleGenAI({ apiKey: key });
  let session: Awaited<ReturnType<typeof ai.live.connect>> | undefined;
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let transcript = "",
      bytes = 0,
      done = false;
    const timer = setTimeout(
      () => stop(new ProviderFailure(504, "Voice provider timed out.", true)),
      timeoutMs,
    );
    function stop(error?: Error, result?: VerifiedAudio) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      session?.close();
      error ? reject(error) : resolve(result!);
    }
    ai.live
      .connect({
        model,
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          systemInstruction:
            "Read the supplied verified script verbatim. Add no introduction, interpretation, or conclusion.",
        },
        callbacks: {
          onmessage: (message) => {
            if (done) return;
            const c = message.serverContent;
            if (c?.outputTranscription?.text)
              transcript += c.outputTranscription.text;
            for (const part of c?.modelTurn?.parts || []) {
              if (part.inlineData?.data) {
                if (!part.inlineData.mimeType?.startsWith("audio/pcm"))
                  return stop(
                    new VaultError(502, "Unexpected Gemini audio format."),
                  );
                const b = Buffer.from(part.inlineData.data, "base64");
                bytes += b.length;
                if (bytes > 8 * 1024 * 1024)
                  return stop(
                    new VaultError(502, "Voice response exceeded its limit."),
                  );
                chunks.push(b);
              }
            }
            if (c?.turnComplete) {
              try {
                stop(
                  undefined,
                  finishAudio("gemini", model, script, transcript, chunks),
                );
              } catch (error) {
                stop(error as Error);
              }
            }
          },
          onerror: (error) =>
            stop(
              new ProviderFailure(
                502,
                "Gemini voice connection failed.",
                /429|503|UNAVAILABLE|RESOURCE_EXHAUSTED/i.test(error.message),
              ),
            ),
          onclose: (event) => {
            if (!done)
              stop(
                new ProviderFailure(
                  502,
                  "Gemini voice session ended early.",
                  [1006, 1011, 1012, 1013].includes(event.code),
                ),
              );
          },
        },
      })
      .then((s) => {
        session = s;
        if (done) {
          s.close();
          return;
        }
        s.sendClientContent({
          turns: [{ role: "user", parts: [{ text: script }] }],
          turnComplete: true,
        });
      })
      .catch((error) =>
        stop(
          new ProviderFailure(
            502,
            "Gemini rejected the voice request.",
            [429, 500, 502, 503, 504].includes(Number(error.status)) ||
              /429|503|UNAVAILABLE|RESOURCE_EXHAUSTED|network|fetch failed/i.test(
                String(error.message),
              ),
          ),
        ),
      );
  });
}
