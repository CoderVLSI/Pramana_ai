import { createLiveAgent, type LiveAgentOptions } from "./live-agent";
import type { ProviderProfile } from "./profile";

export interface NativeSocket {
  readyState: number;
  bufferedAmount: number;
  onopen: ((event?: any) => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event?: any) => void) | null;
  onclose: ((event?: any) => void) | null;
  send(data: string): void;
  close(): void;
}
export type SocketFactory = (
  url: string,
  headers: Record<string, string>,
) => NativeSocket;

/** Adapter for React Native's authenticated WebSocket; keys never appear in URLs. */
function openAISocket(url: string, options: any, make: SocketFactory) {
  const ws = make(url, options.headers);
  const listeners = new Map<string, ((...args: any[]) => void)[]>();
  const emit = (name: string, ...args: any[]) =>
    listeners.get(name)?.forEach((fn) => fn(...args));
  ws.onopen = () => emit("open");
  ws.onmessage = (event) => emit("message", event.data);
  ws.onerror = () => emit("error");
  ws.onclose = () => emit("close");
  return {
    get readyState() {
      return ws.readyState;
    },
    send: (data: string) => ws.send(data),
    close: () => ws.close(),
    on(name: string, fn: (...args: any[]) => void) {
      listeners.set(name, [...(listeners.get(name) || []), fn]);
    },
    removeAllListeners() {
      listeners.clear();
    },
  };
}
export function geminiConnect(make: SocketFactory, sockets: Set<NativeSocket>) {
  return (options: any): Promise<any> =>
    new Promise((resolve, reject) => {
      const ws = make(
        "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent",
        { "x-goog-api-key": options.apiKey },
      );
      sockets.add(ws);
      let settled = false,
        intentionallyClosed = false;
      const timer = setTimeout(() => {
        reject(Error("Live setup timeout"));
        close();
      }, 18000);
      function close() {
        intentionallyClosed = true;
        clearTimeout(timer);
        sockets.delete(ws);
        ws.close();
      }
      const write = (message: unknown) => {
        if (!intentionallyClosed && ws.readyState === 1)
          ws.send(JSON.stringify(message));
      };
      const session = {
        close,
        sendClientContent: (value: unknown) => write({ clientContent: value }),
        sendToolResponse: (value: unknown) => write({ toolResponse: value }),
        sendRealtimeInput: (value: any) =>
          write({
            realtimeInput: value.audio ? { mediaChunks: [value.audio] } : value,
          }),
      };
      ws.onopen = () => {
        const c = options.config;
        write({
          setup: {
            model: `models/${options.model}`,
            generationConfig: { responseModalities: c.responseModalities },
            systemInstruction: { parts: [{ text: c.systemInstruction }] },
            tools: c.tools,
            inputAudioTranscription: c.inputAudioTranscription,
            outputAudioTranscription: c.outputAudioTranscription,
          },
        });
      };
      ws.onmessage = (event) => {
        void (async () => {
          const raw =
            typeof event.data === "string"
              ? event.data
              : event.data && typeof (event.data as any).text === "function"
                ? await (event.data as any).text()
                : "";
          if (raw.length > 1024 * 1024) throw Error("Live response too large");
          const message = JSON.parse(raw);
          if (message.error) {
            const error = Object.assign(Error("Live provider rejected setup"), {
              status: Number(message.error.code),
            });
            if (!settled) {
              reject(error);
              close();
            } else options.callbacks.onerror(error);
            return;
          }
          if (message.setupComplete && !settled) {
            settled = true;
            clearTimeout(timer);
            resolve(session);
          } else options.callbacks.onmessage(message);
        })().catch(() => {
          if (!settled) reject(Error("Invalid live response"));
          else options.callbacks.onerror(Error("Invalid live response"));
          close();
        });
      };
      ws.onerror = () => {
        if (!settled) {
          reject(Error("Live network unavailable"));
          close();
        } else options.callbacks.onerror(Error("Live network unavailable"));
      };
      ws.onclose = () => {
        sockets.delete(ws);
        clearTimeout(timer);
        if (intentionallyClosed) return;
        if (!settled) reject(Error("Live connection closed"));
        else options.callbacks.onclose();
      };
    });
}

/** Presents the same event interface as the browser backend socket, without a proxy server. */
export function createDeviceLiveSocket(
  profile: ProviderProfile,
  make: SocketFactory,
  runTool: LiveAgentOptions["runTool"],
  options: { preferredName?: string; enableWebSearch: boolean },
): NativeSocket {
  const geminiSockets = new Set<NativeSocket>();
  let closed = false;
  const ws: NativeSocket = {
    readyState: 0,
    bufferedAmount: 0,
    onopen: null,
    onmessage: null,
    onerror: null,
    onclose: null,
    send(data) {
      if (closed) return;
      const event = JSON.parse(data);
      if (event.type === "text") agent.inputText(event.text);
      else if (event.type === "interrupt") agent.interrupt();
      else if (event.type === "audio_end") agent.endInput();
      else if (event.type === "audio") agent.inputAudio(event.data);
    },
    close() {
      if (closed) return;
      closed = true;
      ws.readyState = 3;
      agent.close();
      for (const socket of geminiSockets) socket.close();
      geminiSockets.clear();
    },
  };
  const agent = createLiveAgent({
    profile,
    preferredName: options.preferredName,
    enableWebSearch: options.enableWebSearch,
    connectGemini: geminiConnect(make, geminiSockets),
    createSocket: (url, config) => openAISocket(url, config, make),
    runTool,
    send(event) {
      if (closed) return;
      if (event.type === "ready") ws.readyState = 1;
      ws.onmessage?.({ data: JSON.stringify(event) });
      if (event.type === "error") ws.close();
    },
  });
  // Allow the UI to install handlers before transport events arrive.
  setTimeout(() => {
    if (!closed) void agent.start();
  }, 0);
  return ws;
}
