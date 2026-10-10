import { Pressable, ScrollView, Text, TextInput, View } from "./ui";
import React, { useEffect, useRef, useState } from "react";
import { AppState, Linking, Platform, StyleSheet, Switch } from "react-native";
import { createConversationSocket } from "./settings-client";
import type { AudioPlayer } from "expo-audio";
import type { ExpoSpeechRecognitionModuleType } from "expo-speech-recognition/build/ExpoSpeechRecognitionModule.types";

const NativeWebView = React.lazy(() =>
  import("react-native-webview").then((module) => ({
    default: module.WebView,
  })),
);

type Props = {
  language: string;
  preferredName?: string;
  workIds: string[];
  onSpeakingChange: (speaking: boolean) => void;
  onNotice: (notice: string) => void;
};
type Line = { role: string; text: string };
type Source = { title: string; url?: string; label: string };
type Grounding = { html?: string; queries: string[] };
type State = "stopped" | "connecting" | "live" | "failed";
const MAX_AUDIO_BYTES = 1_500_000;
const SESSION_MS = 10 * 60 * 1000;
const fromBase64 = (data: string) =>
  Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
function toBase64(bytes: Uint8Array) {
  let encoded = "";
  for (let i = 0; i < bytes.length; i += 8192)
    encoded += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(encoded);
}
function wav(parts: Uint8Array[]) {
  const length = parts.reduce((sum, part) => sum + part.length, 0);
  const bytes = new Uint8Array(44 + length),
    view = new DataView(bytes.buffer);
  const ascii = (offset: number, text: string) =>
    [...text].forEach((c, i) => {
      bytes[offset + i] = c.charCodeAt(0);
    });
  ascii(0, "RIFF");
  view.setUint32(4, 36 + length, true);
  ascii(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 24000, true);
  view.setUint32(28, 48000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, length, true);
  let offset = 44;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  return toBase64(bytes);
}
function publicUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 2000) return;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.username && !url.password)
      return url.href;
  } catch {
    /* invalid source link */
  }
}
function sourcesFrom(result: unknown, name: string): Source[] {
  if (!result || typeof result !== "object") return [];
  const data = result as Record<string, unknown>;
  const candidates = [
    data.sources,
    data.citations,
    data.results,
    data.evidence,
  ].find(Array.isArray) as unknown[] | undefined;
  const isWeb =
    /web|internet/.test(name) ||
    data.source_status === "external_web_unverified";
  return (candidates || []).slice(0, 8).flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const source = entry as Record<string, unknown>;
    const citation =
      source.citation && typeof source.citation === "object"
        ? (source.citation as Record<string, unknown>)
        : source;
    const locator =
      source.source_locator && typeof source.source_locator === "object"
        ? (source.source_locator as Record<string, unknown>)
        : null;
    const location = locator
      ? ` · volume ${String(locator.volume || "?").slice(0, 30)}, printed page ${String(locator.printed_page || "?").slice(0, 10)}`
      : "";
    const reviewed =
      !isWeb &&
      (data.source_status === "reviewed_excerpt" ||
        source.status === "approved" ||
        source.review_status === "approved" ||
        citation.review_status === "approved");
    return [
      {
        title:
          String(
            source.title ||
              source.reference ||
              citation.work_title ||
              citation.work_id ||
              source.work_id ||
              "Source reference",
          ).slice(0, 180) + location,
        url: publicUrl(
          source.url ||
            source.source_url ||
            source.source_locator ||
            citation.source_url,
        ),
        label: isWeb
          ? "Web reference · check source"
          : reviewed
            ? "Reviewed scripture excerpt · check citation"
            : "Scripture reference · review pending",
      },
    ];
  });
}

export default function LiveConversation({
  language,
  preferredName,
  workIds,
  onSpeakingChange,
  onNotice,
}: Props) {
  const [state, setState] = useState<State>("stopped");
  const [connectedModel, setConnectedModel] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [tools, setTools] = useState<string[]>([]);
  const [grounding, setGrounding] = useState<Grounding | null>(null);
  const [draft, setDraft] = useState("");
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [listening, setListening] = useState(false);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const captureEnabled = useRef(true);
  const socket = useRef<
    import("../../packages/provider-client/native-live").NativeSocket | null
  >(null);
  const active = useRef(false),
    ready = useRef(false),
    generation = useRef(0),
    waiting = useRef(false);
  const callbacks = useRef({ onSpeakingChange, onNotice });
  callbacks.current = { onSpeakingChange, onNotice };
  const context = useRef<AudioContext | null>(null);
  const microphone = useRef<MediaStream | null>(null);
  const processor = useRef<ScriptProcessorNode | null>(null);
  const microphoneSource = useRef<MediaStreamAudioSourceNode | null>(null);
  const webNodes = useRef(new Set<AudioBufferSourceNode>());
  const webTimers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const webPlaying = useRef(0),
    scheduledAt = useRef(0);
  const recognition = useRef<ExpoSpeechRecognitionModuleType | null>(null);
  const subscriptions = useRef<{ remove(): void }[]>([]);
  const recognitionRunning = useRef(false),
    recognitionBlocked = useRef(false);
  const nativeParts = useRef<Uint8Array[]>([]),
    nativeBytes = useRef(0);
  const nativeQueue = useRef<string[]>([]),
    nativeFiles = useRef(new Set<string>());
  const nativePlayer = useRef<AudioPlayer | null>(null),
    nativePlaying = useRef(false),
    nativeWriting = useRef(false);
  const sessionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playEpoch = useRef(0);

  const notice = (text: string) => callbacks.current.onNotice(text);
  const addLine = (role: string, text: string, delta = false) =>
    setLines((previous) => {
      const safe = text.slice(0, 3000),
        last = previous.at(-1);
      if (delta && last?.role === role)
        return [
          ...previous.slice(0, -1),
          { role, text: (last.text + safe).slice(-6000) },
        ];
      return [...previous.slice(-19), { role, text: safe }];
    });
  const send = (message: object) => {
    if (!ready.current || socket.current?.readyState !== WebSocket.OPEN)
      return false;
    if (socket.current.bufferedAmount > 128000) {
      fail(
        "The live connection is congested. Start again when your connection improves.",
      );
      return false;
    }
    socket.current.send(JSON.stringify(message));
    return true;
  };
  function clearPlayback() {
    playEpoch.current++;
    for (const timer of webTimers.current) clearTimeout(timer);
    webTimers.current.clear();
    for (const node of webNodes.current) {
      try {
        node.stop();
        node.disconnect();
      } catch {
        /* already ended */
      }
    }
    webNodes.current.clear();
    webPlaying.current = 0;
    scheduledAt.current = 0;
    nativeParts.current = [];
    nativeBytes.current = 0;
    const player = nativePlayer.current;
    nativePlayer.current = null;
    if (player) {
      try {
        player.pause();
        player.remove();
      } catch {
        /* released */
      }
    }
    nativePlaying.current = false;
    nativeWriting.current = false;
    nativeQueue.current = [];
    callbacks.current.onSpeakingChange(false);
    const files = [...nativeFiles.current];
    nativeFiles.current.clear();
    if (Platform.OS !== "web")
      void import("expo-file-system/legacy")
        .then(async (fs) => {
          await Promise.all(
            files.map((file) =>
              fs.deleteAsync(file, { idempotent: true }).catch(() => undefined),
            ),
          );
        })
        .catch(() => undefined);
  }
  function stop(updateState = true) {
    active.current = false;
    ready.current = false;
    generation.current++;
    waiting.current = false;
    for (const timer of [
      sessionTimer.current,
      connectTimer.current,
      restartTimer.current,
    ])
      if (timer) clearTimeout(timer);
    sessionTimer.current = null;
    connectTimer.current = null;
    restartTimer.current = null;
    const ws = socket.current;
    socket.current = null;
    if (ws) {
      ws.onmessage = null;
      ws.onclose = null;
      ws.onerror = null;
      ws.onopen = null;
      ws.close();
    }
    try {
      recognition.current?.abort();
    } catch {
      /* unavailable native module */
    }
    for (const sub of subscriptions.current) sub.remove();
    subscriptions.current = [];
    recognitionRunning.current = false;
    if (processor.current) {
      processor.current.onaudioprocess = null;
      processor.current.disconnect();
      processor.current = null;
    }
    microphoneSource.current?.disconnect();
    microphoneSource.current = null;
    microphone.current?.getTracks().forEach((track) => track.stop());
    microphone.current = null;
    clearPlayback();
    const audio = context.current;
    context.current = null;
    if (audio) void audio.close().catch(() => undefined);
    if (updateState) {
      setListening(false);
      setState("stopped");
    }
  }
  function fail(message: string) {
    stop();
    setState("failed");
    notice(message);
  }
  function interrupt() {
    send({ type: "interrupt" });
    waiting.current = false;
    clearPlayback();
    if (Platform.OS !== "web") scheduleRecognition();
  }
  function scheduleRecognition() {
    if (
      Platform.OS === "web" ||
      !captureEnabled.current ||
      !active.current ||
      !ready.current ||
      waiting.current ||
      nativePlaying.current ||
      nativeWriting.current ||
      recognitionBlocked.current ||
      recognitionRunning.current
    )
      return;
    if (restartTimer.current) clearTimeout(restartTimer.current);
    restartTimer.current = setTimeout(() => {
      restartTimer.current = null;
      if (
        !active.current ||
        !ready.current ||
        waiting.current ||
        nativePlaying.current ||
        recognitionRunning.current ||
        recognitionBlocked.current
      )
        return;
      try {
        recognitionRunning.current = true;
        recognition.current?.start({
          lang: language,
          interimResults: true,
          continuous: true,
          addsPunctuation: true,
        });
        setListening(true);
      } catch {
        recognitionRunning.current = false;
        recognitionBlocked.current = true;
        notice(
          "Device transcription is unavailable. You can send typed messages or start a new session.",
        );
      }
    }, 400);
  }
  async function playNativeNext() {
    if (nativePlaying.current || !active.current) return;
    const uri = nativeQueue.current.shift();
    if (!uri) {
      scheduleRecognition();
      return;
    }
    const epoch = playEpoch.current;
    try {
      const audio = await import("expo-audio");
      if (!active.current || epoch !== playEpoch.current) return;
      await audio.setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      });
      if (!active.current || epoch !== playEpoch.current) return;
      const player = audio.createAudioPlayer(uri, { updateInterval: 100 });
      nativePlayer.current = player;
      nativePlaying.current = true;
      try {
        recognition.current?.abort();
      } catch {
        /* recognition already stopped */
      }
      const sub = player.addListener("playbackStatusUpdate", (status) => {
        if (epoch !== playEpoch.current) return;
        callbacks.current.onSpeakingChange(status.playing);
        if (status.didJustFinish) {
          sub.remove();
          player.remove();
          nativePlayer.current = null;
          nativePlaying.current = false;
          callbacks.current.onSpeakingChange(false);
          void import("expo-file-system/legacy")
            .then((fs) => fs.deleteAsync(uri, { idempotent: true }))
            .catch(() => undefined);
          nativeFiles.current.delete(uri);
          void playNativeNext();
        }
      });
      player.play();
    } catch {
      if (active.current && epoch === playEpoch.current)
        fail("Live audio could not play. Restart the session or use text.");
    }
  }
  async function flushNativeAudio() {
    if (!nativeParts.current.length) {
      scheduleRecognition();
      return;
    }
    if (nativeQueue.current.length >= 2 || nativeWriting.current) {
      fail("Audio playback fell behind. Restart the session to continue.");
      return;
    }
    const parts = nativeParts.current;
    nativeParts.current = [];
    nativeBytes.current = 0;
    const epoch = playEpoch.current;
    nativeWriting.current = true;
    try {
      const fs = await import("expo-file-system/legacy");
      if (!fs.cacheDirectory) throw new Error("No cache");
      const uri = `${fs.cacheDirectory}pramana-live-${Date.now()}-${epoch}.wav`;
      nativeFiles.current.add(uri);
      await fs.writeAsStringAsync(uri, wav(parts), {
        encoding: fs.EncodingType.Base64,
      });
      if (!active.current || epoch !== playEpoch.current) {
        await fs.deleteAsync(uri, { idempotent: true });
        nativeFiles.current.delete(uri);
        return;
      }
      nativeWriting.current = false;
      nativeQueue.current.push(uri);
      void playNativeNext();
    } catch {
      if (active.current && epoch === playEpoch.current)
        fail("Live audio could not be saved for playback. Use text or retry.");
    }
  }
  function receiveAudio(data: unknown, rate: unknown) {
    if (typeof data !== "string" || data.length > 200000 || rate !== 24000) {
      fail("The provider returned unsupported audio. Restart or use text.");
      return;
    }
    const bytes = fromBase64(data);
    if (bytes.length % 2) throw new Error("Invalid PCM");
    if (Platform.OS !== "web") {
      waiting.current = true;
      setListening(false);
      try {
        recognition.current?.abort();
      } catch {
        /* already stopped */
      }
      if (nativeBytes.current + bytes.length > MAX_AUDIO_BYTES) {
        fail(
          "This audio turn exceeded the playback limit. Please ask a shorter question.",
        );
        return;
      }
      nativeParts.current.push(bytes);
      nativeBytes.current += bytes.length;
      return;
    }
    const audio = context.current;
    if (!audio || !bytes.length) return;
    const start = Math.max(audio.currentTime + 0.03, scheduledAt.current);
    if (start - audio.currentTime > 6) {
      fail("Audio playback fell behind. Start a new session.");
      return;
    }
    const buffer = audio.createBuffer(1, bytes.length / 2, 24000),
      samples = buffer.getChannelData(0);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    for (let i = 0; i < samples.length; i++)
      samples[i] = view.getInt16(i * 2, true) / 32768;
    const node = audio.createBufferSource();
    node.buffer = buffer;
    node.connect(audio.destination);
    const epoch = playEpoch.current;
    let started = false;
    const timer = setTimeout(
      () => {
        webTimers.current.delete(timer);
        if (epoch !== playEpoch.current || !active.current) return;
        started = true;
        webPlaying.current++;
        callbacks.current.onSpeakingChange(true);
      },
      Math.max(0, (start - audio.currentTime) * 1000),
    );
    webTimers.current.add(timer);
    webNodes.current.add(node);
    node.onended = () => {
      clearTimeout(timer);
      webTimers.current.delete(timer);
      webNodes.current.delete(node);
      node.disconnect();
      if (epoch !== playEpoch.current) return;
      if (started) webPlaying.current = Math.max(0, webPlaying.current - 1);
      if (!webPlaying.current) callbacks.current.onSpeakingChange(false);
    };
    scheduledAt.current = start + buffer.duration;
    node.start(start);
  }
  async function start(captureMic = true) {
    if (active.current) return;
    stop();
    active.current = true;
    captureEnabled.current = captureMic;
    setMicrophoneEnabled(captureMic);
    recognitionBlocked.current = false;
    const session = generation.current;
    setState("connecting");
    setConnectedModel("");
    setSources([]);
    setTools([]);
    setLines([]);
    setGrounding(null);
    try {
      if (Platform.OS === "web") {
        context.current = new AudioContext();
        await context.current.resume();
        if (!active.current || session !== generation.current) return;
      }
      if (Platform.OS === "web" && captureMic) {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error("Microphone unavailable");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
          video: false,
        });
        if (!active.current || session !== generation.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        stream.getAudioTracks().forEach((track) => {
          track.onended = () => {
            if (active.current && session === generation.current)
              fail("Microphone capture ended. Check permission and retry.");
          };
        });
        microphone.current = stream;
      } else if (captureMic) {
        const module = (await import("expo-speech-recognition"))
          .ExpoSpeechRecognitionModule;
        if (!active.current || session !== generation.current) return;
        const permission = await module.requestPermissionsAsync();
        if (!active.current || session !== generation.current) return;
        if (!permission.granted) {
          fail(
            "Microphone permission is required for device transcription. You can use the regular text chat.",
          );
          return;
        }
        recognition.current = module;
      }
      const ws = await createConversationSocket({
        preferredName,
        workIds,
        enableWebSearch: webSearchEnabled,
      });
      if (!active.current || session !== generation.current) {
        ws.close();
        return;
      }
      socket.current = ws;
      connectTimer.current = setTimeout(() => {
        if (active.current && !ready.current)
          fail(
            "The live connection timed out. Check your provider settings and retry.",
          );
      }, 20000);
      ws.onclose = () => {
        if (active.current && session === generation.current)
          fail("The live connection ended. Tap Retry to start a new session.");
      };
      ws.onerror = () => {
        if (active.current && session === generation.current)
          fail(
            "The live provider could not connect. Check your keys, model and network, then retry.",
          );
      };
      ws.onmessage = (event) => {
        if (!active.current || session !== generation.current) return;
        try {
          if (typeof event.data !== "string" || event.data.length > 250000)
            throw new Error("Invalid event");
          const message = JSON.parse(event.data);
          if (message.type === "ready") {
            if (ready.current) return;
            const provider =
              message.provider === "gemini"
                ? "Gemini"
                : message.provider === "openai"
                  ? "OpenAI"
                  : "AI provider";
            const model =
              typeof message.model === "string"
                ? message.model
                    .slice(0, 80)
                    .replace(/[\u0000-\u001f\u007f]/g, "")
                : "Live model";
            setConnectedModel(`${provider} · ${model}`);
            ready.current = true;
            if (connectTimer.current) clearTimeout(connectTimer.current);
            setState("live");
            sessionTimer.current = setTimeout(() => {
              stop();
              notice(
                "The ten-minute live session ended. Tap Start for another session.",
              );
            }, SESSION_MS);
            if (captureEnabled.current) {
              if (Platform.OS === "web") beginBrowserCapture();
              else beginNativeCapture();
            }
          } else if (message.type === "audio")
            receiveAudio(message.data, message.rate ?? message.sample_rate);
          else if (
            message.type === "transcript" &&
            typeof message.text === "string"
          )
            addLine(
              message.role === "user" ? "You" : "AI · generated",
              message.text,
              true,
            );
          else if (message.type === "tool")
            setTools((previous) => [
              ...previous.slice(-7),
              `${String(message.name || "Source check").slice(0, 80)} · ${["running", "completed", "failed"].includes(message.status) ? message.status : "updated"}`,
            ]);
          else if (message.type === "sources") {
            const found = sourcesFrom(
              message.result,
              String(message.name || ""),
            );
            const topLevel = sourcesFrom(message, "web_search");
            found.push(...topLevel);
            if (
              typeof message.search_entry_point === "string" ||
              Array.isArray(message.search_queries)
            ) {
              setGrounding({
                queries: (Array.isArray(message.search_queries)
                  ? message.search_queries
                  : []
                )
                  .filter((query: unknown) => typeof query === "string")
                  .slice(0, 5)
                  .map((query: string) => query.slice(0, 250)),
                ...(typeof message.search_entry_point === "string" &&
                message.search_entry_point.length <= 30000
                  ? { html: message.search_entry_point }
                  : {}),
              });
            }
            setSources((previous) => [...previous, ...found].slice(-12));
            if (!found.length)
              setTools((previous) => [
                ...previous.slice(-7),
                "Source check returned no displayable references",
              ]);
          } else if (
            message.type === "grounding" ||
            message.type === "groundingMetadata"
          ) {
            const metadata =
              message.metadata || message.groundingMetadata || message;
            const queries = (
              metadata.search_queries ||
              metadata.webSearchQueries ||
              []
            )
              .filter((query: unknown) => typeof query === "string")
              .slice(0, 5)
              .map((query: string) => query.slice(0, 250));
            const html =
              metadata.search_entry_point?.renderedContent ||
              metadata.searchEntryPoint?.renderedContent ||
              metadata.search_entry_point;
            setGrounding({
              queries,
              ...(typeof html === "string" && html.length <= 30000
                ? { html }
                : {}),
            });
          } else if (message.type === "turn_end") {
            waiting.current = false;
            if (Platform.OS !== "web") void flushNativeAudio();
          } else if (message.type === "interrupted") {
            waiting.current = false;
            clearPlayback();
            scheduleRecognition();
          } else if (message.type === "error")
            fail(
              "The live session failed. Check provider settings and retry; source verification is separate from generated speech.",
            );
        } catch {
          fail(
            "The live session returned an invalid response. Restart or use text.",
          );
        }
      };
    } catch {
      if (active.current && session === generation.current)
        fail(
          "Live voice could not start. Check microphone permission, provider settings and network, then retry.",
        );
    }
  }
  function beginBrowserCapture() {
    const audio = context.current,
      stream = microphone.current;
    if (!audio || !stream) return;
    const input = audio.createMediaStreamSource(stream),
      capture = audio.createScriptProcessor(4096, 1, 1);
    microphoneSource.current = input;
    processor.current = capture;
    let remainder: number[] = [],
      position = 0;
    capture.onaudioprocess = (event) => {
      // Keep the output silent; microphone samples only travel to the selected live provider.
      event.outputBuffer.getChannelData(0).fill(0);
      if (!active.current || !ready.current) return;
      const samples = event.inputBuffer.getChannelData(0),
        ratio = audio.sampleRate / 16000;
      const pcm: number[] = [];
      for (; position < samples.length; position += ratio) {
        const i = Math.floor(position),
          next = Math.min(i + 1, samples.length - 1);
        const value =
          samples[i] + (samples[next] - samples[i]) * (position - i);
        pcm.push(Math.round(Math.max(-1, Math.min(1, value)) * 32767));
      }
      position -= samples.length;
      remainder.push(...pcm);
      while (remainder.length >= 4096) {
        const bytes = new Uint8Array(8192),
          view = new DataView(bytes.buffer);
        remainder
          .splice(0, 4096)
          .forEach((value, i) => view.setInt16(i * 2, value, true));
        send({
          type: "audio",
          data: toBase64(bytes),
          sample_rate: 16000,
          rate: 16000,
        });
      }
    };
    input.connect(capture);
    capture.connect(audio.destination);
    setListening(true);
  }
  function beginNativeCapture() {
    const module = recognition.current;
    if (!module) return;
    subscriptions.current = [
      module.addListener("result", (event) => {
        if (
          !active.current ||
          !event.isFinal ||
          waiting.current ||
          nativePlaying.current
        )
          return;
        const text = event.results[0]?.transcript?.trim().slice(0, 2000);
        if (!text) return;
        if (send({ type: "text", text })) {
          waiting.current = true;
          setListening(false);
          try {
            module.abort();
          } catch {
            /* ended */
          }
        }
      }),
      module.addListener("end", () => {
        recognitionRunning.current = false;
        setListening(false);
        scheduleRecognition();
      }),
      module.addListener("error", (event) => {
        recognitionRunning.current = false;
        setListening(false);
        if (!active.current || event.error === "aborted") return;
        recognitionBlocked.current = true;
        notice(
          "Device transcription paused. Send a typed message or restart to try the microphone again.",
        );
      }),
    ];
    scheduleRecognition();
  }
  function sendText() {
    const text = draft.trim().slice(0, 2000);
    if (!text || waiting.current) return;
    interrupt();
    if (send({ type: "text", text })) {
      waiting.current = true;
      setDraft("");
      if (Platform.OS !== "web") {
        try {
          recognition.current?.abort();
        } catch {
          /* no recognition */
        }
      }
    }
  }
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (value) => {
      if (value !== "active" && active.current) stop();
    });
    const hidden = () => {
      if (document.hidden && active.current) stop();
    };
    if (Platform.OS === "web")
      document.addEventListener("visibilitychange", hidden);
    return () => {
      subscription.remove();
      if (Platform.OS === "web")
        document.removeEventListener("visibilitychange", hidden);
      stop(false);
    };
  }, []);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Live conversation</Text>
      <Text style={styles.disclosure}>
        Live AI generated · citations checked separately
      </Text>
      <Text style={styles.detail}>
        {Platform.OS === "web"
          ? "Continuous microphone audio streams to your selected AI provider."
          : "Device transcription sends final text to the live AI provider. Your phone’s speech service may process audio remotely. AI audio plays after each turn; raw microphone audio is not streamed to the AI."}
      </Text>
      <View style={styles.row}>
        <Switch
          accessibilityLabel="Enable web search tools"
          value={webSearchEnabled}
          onValueChange={setWebSearchEnabled}
          disabled={state === "live" || state === "connecting"}
        />
        <Text style={styles.detail}>
          Web search tools · provider charges may apply
        </Text>
      </View>
      <Text accessibilityLiveRegion="polite" style={styles.status}>
        {state === "live"
          ? !microphoneEnabled
            ? "Connected · microphone off"
            : listening
              ? "Connected · listening"
              : "Connected · responding"
          : state === "connecting"
            ? "Connecting…"
            : state === "failed"
              ? "Connection stopped · retry available"
              : "Microphone off"}{" "}
        · 10-minute maximum
      </Text>
      {state === "live" && !!connectedModel && (
        <Text style={styles.detail}>{connectedModel}</Text>
      )}
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          style={styles.button}
          onPress={
            state === "live" || state === "connecting"
              ? () => stop()
              : () => void start()
          }
        >
          <Text style={styles.buttonText}>
            {state === "live" || state === "connecting"
              ? "Stop"
              : state === "failed"
                ? "Retry"
                : "Start live voice"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={state !== "live"}
          onPress={interrupt}
          style={[styles.outline, state !== "live" && styles.disabled]}
        >
          <Text>Interrupt</Text>
        </Pressable>
      </View>
      {(state === "stopped" || state === "failed") && (
        <Pressable
          accessibilityRole="button"
          style={styles.outline}
          onPress={() => void start(false)}
        >
          <Text>Connect with text · microphone off</Text>
        </Pressable>
      )}
      <View style={styles.row}>
        <TextInput
          accessibilityLabel="Message for live conversation"
          placeholder="Or type a message"
          value={draft}
          onChangeText={setDraft}
          maxLength={2000}
          style={styles.input}
          editable={state === "live"}
          onSubmitEditing={sendText}
        />
        <Pressable
          accessibilityRole="button"
          disabled={state !== "live" || !draft.trim()}
          onPress={sendText}
          style={styles.outline}
        >
          <Text>Send</Text>
        </Pressable>
      </View>
      {!!lines.length && (
        <ScrollView style={styles.transcripts} nestedScrollEnabled>
          {lines.map((line, i) => (
            <View key={i} style={styles.line}>
              <Text style={styles.role}>{line.role}</Text>
              <Text selectable>{line.text}</Text>
            </View>
          ))}
        </ScrollView>
      )}
      {grounding && (
        <View style={styles.source}>
          <Text style={styles.role}>
            Google Search suggestions · external web
          </Text>
          {Platform.OS === "web" && grounding.html ? (
            React.createElement("iframe", {
              title: "Google Search suggestions",
              srcDoc: grounding.html,
              sandbox: "",
              referrerPolicy: "no-referrer",
              style: { border: 0, width: "100%", height: 160 },
            })
          ) : grounding.html ? (
            <React.Suspense
              fallback={
                <Text style={styles.detail}>Loading search suggestions…</Text>
              }
            >
              <NativeWebView
                source={{
                  html: grounding.html,
                  baseUrl: "https://www.google.com",
                }}
                javaScriptEnabled={false}
                domStorageEnabled={false}
                allowFileAccess={false}
                allowFileAccessFromFileURLs={false}
                allowUniversalAccessFromFileURLs={false}
                mixedContentMode="never"
                setSupportMultipleWindows={false}
                originWhitelist={["https://*", "about:blank"]}
                onShouldStartLoadWithRequest={(request) => {
                  if (
                    request.url === "about:blank" ||
                    request.url === "https://www.google.com" ||
                    request.url === "https://www.google.com/"
                  )
                    return true;
                  const url = publicUrl(request.url);
                  if (url)
                    void Linking.openURL(url).catch(() =>
                      notice("The search link could not open."),
                    );
                  return false;
                }}
                style={{ height: 160, backgroundColor: "transparent" }}
              />
            </React.Suspense>
          ) : (
            grounding.queries.map((query, i) => (
              <Pressable
                key={i}
                accessibilityRole="link"
                onPress={() =>
                  void Linking.openURL(
                    `https://www.google.com/search?q=${encodeURIComponent(query)}`,
                  ).catch(() => notice("The search link could not open."))
                }
              >
                <Text style={styles.link}>{query}</Text>
              </Pressable>
            ))
          )}
        </View>
      )}
      {tools.map((tool, i) => (
        <Text key={i} style={styles.detail}>
          {tool}
        </Text>
      ))}
      {sources.map((source, i) => (
        <View key={i} style={styles.source}>
          <Text style={styles.role}>{source.label}</Text>
          <Text>{source.title}</Text>
          {source.url && (
            <Pressable
              accessibilityRole="link"
              onPress={() =>
                void Linking.openURL(source.url!).catch(() =>
                  notice("This source link could not open."),
                )
              }
            >
              <Text style={styles.link}>Open source</Text>
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 18, backgroundColor: "#F3F0E6", gap: 10 },
  title: { fontSize: 20, fontWeight: "700", color: "#143D29" },
  disclosure: { fontWeight: "600", color: "#755019" },
  detail: { fontSize: 12, color: "#4A5B51", lineHeight: 18 },
  status: { fontSize: 13, color: "#143D29" },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  button: {
    backgroundColor: "#143D29",
    borderRadius: 10,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: "center",
  },
  buttonText: { color: "white", fontWeight: "600" },
  outline: {
    borderWidth: 1,
    borderColor: "#ABB7A8",
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 44,
    justifyContent: "center",
  },
  disabled: { opacity: 0.4 },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: "#ABB7A8",
    borderRadius: 10,
    padding: 10,
    backgroundColor: "white",
  },
  transcripts: { maxHeight: 240 },
  line: { marginBottom: 10, gap: 4 },
  role: { fontSize: 12, fontWeight: "700", color: "#52634F" },
  source: { borderTopWidth: 1, borderColor: "#D4D8CB", paddingTop: 8, gap: 4 },
  link: {
    color: "#185837",
    textDecorationLine: "underline",
    paddingVertical: 8,
  },
});
