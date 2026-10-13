import { liveFailureMessage } from "../../packages/provider-client/provider-error";
import { shouldStopLive } from "../../packages/provider-client/live-lifecycle";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  useDarkMode,
  useThemeColor,
} from "./ui";
import React, { useEffect, useRef, useState } from "react";
import {
  AppState,
  Linking,
  Platform,
  StyleSheet,
  Switch,
  Animated,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  PermissionsAndroid,
} from "react-native";
import {
  activeProvider,
  createConversationSocket,
  readClaimScreenshot,
} from "./settings-client";
import {
  needsProviderAccount,
  providerLinks,
  type LinkedProvider,
} from "./provider-links";
import type { AudioPlayer } from "expo-audio";
import type { ExpoSpeechRecognitionModuleType } from "expo-speech-recognition/build/ExpoSpeechRecognitionModule.types";

import { androidLiveAudio } from "./live-audio";
import { RishiAvatar } from "./RishiAvatar";
import { Ionicons } from "@expo/vector-icons";

const NativeWebView = React.lazy(() =>
  import("react-native-webview").then((module) => ({
    default: module.WebView,
  })),
);

type Props = {
  onSourceSearch?: () => void;
  rishiSpeaking?: boolean;
  language: string;
  preferredName?: string;
  workIds: string[];
  onSpeakingChange: (speaking: boolean) => void;
  onNotice: (notice: string) => void;
};
type Line = { role: string; text: string; imageUri?: string };
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

function Glyph({
  name,
  size = 20,
  color = "#315444",
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name} size={size} color={useThemeColor(color)} />;
}
const TOOL_LABELS: Record<string, string> = {
  search_scripture: "Searching scripture",
  web_search: "Searching the web",
  fact_check_claim: "Checking the quote",
  corpus_status: "Checking the library",
};
function toolChip(text: string): {
  label: string;
  state: "running" | "done" | "problem";
} {
  const match = /^(\w+) · (running|completed|failed|updated)$/.exec(text);
  if (match) {
    const label = TOOL_LABELS[match[1]] || "Checking sources";
    return match[2] === "running"
      ? { label: label + "…", state: "running" }
      : match[2] === "failed"
        ? { label: label + " failed", state: "problem" }
        : { label, state: "done" };
  }
  if (/^Source check failed/.test(text))
    return {
      label: text.replace("Source check failed: ", "Couldn’t check sources: "),
      state: "problem",
    };
  return { label: "No matching sources found", state: "problem" };
}
const SUGGESTIONS = [
  "What is the Vishnu Purana?",
  "Explain karma yoga simply",
  "Is this verse authentic?",
];

export default function LiveConversation({
  onSourceSearch,
  rishiSpeaking,
  language,
  preferredName,
  workIds,
  onSpeakingChange,
  onNotice,
}: Props) {
  const duplex = useRef<ReturnType<typeof androidLiveAudio> | null>(null);
  const inputPaused = useRef(false);
  const [micLevel, setMicLevel] = useState(0);
  const lastReplyAudio = useRef<string[]>([]);
  const lastReplyBytes = useRef(0);
  const [canReplay, setCanReplay] = useState(false);
  const audioCounts = useRef({ sent: 0, received: 0 });
  const [audioStatus, setAudioStatus] = useState({ sent: 0, received: 0 });
  const messageScroll = useRef<import("react-native").ScrollView>(null);
  const [heard, setHeard] = useState("");
  const [state, setState] = useState<State>("stopped");
  const [details, setDetails] = useState(false);
  const [image, setImage] = useState<{
    uri: string;
    base64: string;
    mime: "image/png" | "image/jpeg";
  } | null>(null);
  const [readingImage, setReadingImage] = useState(false);
  const pendingText = useRef("");
  const pendingImage = useRef<typeof image>(null);
  const replyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sessionNotice, setSessionNotice] = useState("");
  const requestingPermission = useRef(false);
  const [connectedModel, setConnectedModel] = useState("");
  const [provider, setProvider] = useState<LinkedProvider | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const linesRef = useRef<Line[]>([]);
  linesRef.current = lines;
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

  const notice = (text: string) => {
    setSessionNotice(text);
    callbacks.current.onNotice(text);
  };
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
    duplex.current?.interrupt();
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
    if (replyTimer.current) clearTimeout(replyTimer.current);
    pendingText.current = "";
    active.current = false;
    inputPaused.current = false;
    duplex.current?.dispose();
    duplex.current = null;
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
    if (Platform.OS !== "web" && Platform.OS !== "android")
      scheduleRecognition();
  }
  function scheduleRecognition() {
    if (
      Platform.OS === "web" ||
      Platform.OS === "android" ||
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
          continuous: false,
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
        allowsRecording: false,
        shouldRouteThroughEarpiece: false,
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
    if (Platform.OS === "android" && duplex.current) {
      if (lastReplyBytes.current + data.length <= 4000000) {
        lastReplyAudio.current.push(data);
        lastReplyBytes.current += data.length;
        setCanReplay(true);
      }
      audioCounts.current.received++;
      setAudioStatus({ ...audioCounts.current });
      duplex.current.play(data);
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
    setSessionNotice("");
    setState("connecting");
    setConnectedModel("");
    setSources([]);
    setTools([]);
    // Keep bounded chat messages when reconnecting.
    setGrounding(null);
    let startingNativeAudio = false;
    try {
      if (Platform.OS === "web") {
        context.current = new AudioContext();
        await context.current.resume();
        if (!active.current || session !== generation.current) return;
      }
      if (Platform.OS === "android") {
        startingNativeAudio = true;
        if (captureMic) {
          requestingPermission.current = true;
          let permission;
          try {
            permission = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            );
          } finally {
            requestingPermission.current = false;
          }
          if (!active.current || session !== generation.current) return;
          if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
            fail(
              "Allow microphone permission to start live voice. Typed messages still work.",
            );
            return;
          }
        }
        audioCounts.current = { sent: 0, received: 0 };
        setAudioStatus({ ...audioCounts.current });
        const bridge = androidLiveAudio((event) => {
          if (!active.current || session !== generation.current) return;
          if (event.type === "audio" && ready.current && !inputPaused.current) {
            if (send({ type: "audio", data: event.data })) {
              audioCounts.current.sent++;
              if (
                audioCounts.current.sent === 1 ||
                audioCounts.current.sent % 25 === 0
              )
                setAudioStatus({ ...audioCounts.current });
              setListening(true);
            }
          } else if (event.type === "level")
            setMicLevel(Math.min(100, Math.max(0, Number(event.data) || 0)));
          else if (event.type === "playing")
            callbacks.current.onSpeakingChange(true);
          else if (event.type === "ended")
            callbacks.current.onSpeakingChange(false);
          else if (event.type === "error") fail(event.data);
          else if (event.type === "paused")
            fail(
              "Live audio paused when the app left the foreground. Tap the microphone to reconnect.",
            );
        });
        duplex.current = bridge;
        await bridge.start(captureMic);
        if (!active.current || session !== generation.current) {
          bridge.dispose();
          return;
        }
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
      } else if (captureMic && Platform.OS !== "android") {
        const module = (await import("expo-speech-recognition"))
          .ExpoSpeechRecognitionModule;
        if (!active.current || session !== generation.current) return;
        requestingPermission.current = true;
        let permission;
        try {
          permission = await module.requestPermissionsAsync();
        } finally {
          requestingPermission.current = false;
        }
        if (!active.current || session !== generation.current) return;
        if (AppState.currentState === "background") {
          fail(
            "Pramana is in the background. Return to the app and tap Retry.",
          );
          return;
        }
        if (!permission.granted) {
          fail(
            "Microphone permission is required for device transcription. You can use the regular text chat.",
          );
          return;
        }
        if (!module.isRecognitionAvailable()) {
          fail(
            "No Android speech service is available. Enable Google speech recognition, or send a typed message.",
          );
          return;
        }
        recognition.current = module;
      }
      startingNativeAudio = false;
      void activeProvider().then((p) => {
        if (session === generation.current) setProvider(p);
      });
      const ws = await createConversationSocket({
        preferredName,
        workIds,
        enableWebSearch: webSearchEnabled,
        history: linesRef.current.map((l) => ({
          role: l.role === "You" ? ("user" as const) : ("assistant" as const),
          text: l.text,
        })),
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
            setSessionNotice("");
            setState("live");
            if (pendingText.current) {
              const queued = pendingText.current;
              pendingText.current = "";
              submitText(queued);
            }
            sessionTimer.current = setTimeout(() => {
              stop();
              notice(
                "The ten-minute live session ended. Tap Start for another session.",
              );
            }, SESSION_MS);
            if (captureEnabled.current) {
              if (Platform.OS === "web") beginBrowserCapture();
              else if (Platform.OS !== "android") beginNativeCapture();
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
            if (!found.length) {
              const r = (message.result ?? {}) as Record<string, unknown>;
              const why = [
                ...new Set(
                  [r.error, r.detail].filter(
                    (v): v is string => typeof v === "string" && !!v,
                  ),
                ),
              ]
                .join(" · ")
                .slice(0, 220);
              setTools((previous) => [
                ...previous.slice(-7),
                why
                  ? `Source check failed: ${why}`
                  : "Source check returned no displayable references",
              ]);
            }
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
            if (replyTimer.current) clearTimeout(replyTimer.current);
            waiting.current = false;
            inputPaused.current = false;
            if (Platform.OS === "android") duplex.current?.endTurn();
            else if (Platform.OS !== "web") void flushNativeAudio();
          } else if (message.type === "interrupted") {
            waiting.current = false;
            clearPlayback();
            scheduleRecognition();
          } else if (message.type === "error") {
            const problem = liveFailureMessage(message.message);
            fail(problem);
            // A provider can fail after delivering its answer. stop() flushes the
            // live track; preserve and play the received answer independently.
            if (Platform.OS === "android" && lastReplyAudio.current.length)
              void replayReply(problem);
          }
        } catch {
          fail(
            "The live session returned an invalid response. Restart or use text.",
          );
        }
      };
    } catch (error) {
      if (active.current && session === generation.current)
        fail(
          startingNativeAudio && error instanceof Error
            ? error.message.slice(0, 240)
            : "Live voice could not start. Check microphone permission, provider settings and network, then retry.",
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
        if (active.current)
          setHeard(event.results[0]?.transcript?.slice(0, 2000) || "");
        if (
          !active.current ||
          !event.isFinal ||
          waiting.current ||
          nativePlaying.current
        )
          return;
        const text = event.results[0]?.transcript?.trim().slice(0, 2000);
        if (!text) return;
        if (submitText(text)) {
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
        if (event.error === "no-speech" || event.error === "speech-timeout") {
          recognitionBlocked.current = false;
          scheduleRecognition();
          return;
        }
        recognitionBlocked.current = true;
        notice(
          event.error === "network"
            ? "Android speech recognition could not reach its service. Check your connection, then tap the microphone to restart."
            : "Microphone transcription stopped (" +
                event.error +
                "). Tap the microphone to restart, or send a typed message.",
        );
      }),
    ];
    scheduleRecognition();
  }
  function submitText(text: string) {
    lastReplyAudio.current = [];
    lastReplyBytes.current = 0;
    setCanReplay(false);
    const attachment = pendingImage.current;
    if (
      !send({
        type: "text",
        text,
        ...(attachment
          ? { image: { mime: attachment.mime, base64: attachment.base64 } }
          : {}),
      })
    )
      return false;
    pendingImage.current = null;
    if (attachment) setImage(null);
    setHeard("");
    setLines((previous) => [
      ...previous.slice(-19),
      { role: "user", text, imageUri: attachment?.uri },
    ]);
    waiting.current = true;
    setListening(false);
    if (replyTimer.current) clearTimeout(replyTimer.current);
    replyTimer.current = setTimeout(() => {
      if (active.current && waiting.current)
        fail(
          "No reply arrived within 45 seconds. Retry or check provider quota in Settings.",
        );
    }, 45000);
    return true;
  }
  async function sendText() {
    const text =
      draft.trim().slice(0, 2000) ||
      (image
        ? "Please describe this image and help me check any scripture claims in it."
        : "");
    if (!text || waiting.current) return;
    setDraft("");
    if (!ready.current) {
      await start(false);
      pendingImage.current = image;
      if (ready.current) submitText(text);
      else if (active.current) pendingText.current = text;
      else setDraft(text);
      return;
    }
    clearPlayback();
    pendingImage.current = image;
    if (
      submitText(text) &&
      Platform.OS !== "web" &&
      Platform.OS !== "android"
    ) {
      try {
        recognition.current?.abort();
      } catch {}
    }
  }
  async function attachImage() {
    try {
      const picker = await import("expo-image-picker");
      const result = await picker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        base64: true,
        quality: 0.8,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset.base64 || asset.base64.length > 5600000)
        throw Error("Choose a JPEG or PNG image smaller than 4 MB.");
      const mime = asset.base64.startsWith("iVBORw0KGgo")
        ? "image/png"
        : asset.base64.startsWith("/9j/")
          ? "image/jpeg"
          : null;
      if (!mime) throw Error("Choose a JPEG or PNG image.");
      setImage({ uri: asset.uri, base64: asset.base64, mime });
    } catch (e) {
      notice((e as Error).message);
    }
  }
  async function readImage() {
    if (!image || readingImage) return;
    setReadingImage(true);
    try {
      setDraft(
        (
          await readClaimScreenshot({ base64: image.base64, mime: image.mime })
        ).slice(0, 2000),
      );
      notice(
        "Image text extracted. Review it before sending; it is not verified scripture.",
      );
      setImage(null);
    } catch (e) {
      notice((e as Error).message);
    } finally {
      setReadingImage(false);
    }
  }

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (value) => {
      if (
        value === "background" &&
        shouldStopLive(value, active.current, requestingPermission.current)
      ) {
        stop();
        notice(
          "Live paused because Pramana moved to the background. Tap Retry to reconnect.",
        );
      }
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

  async function replayReply(problem = "") {
    const chunks = [...lastReplyAudio.current];
    if (!chunks.length) return;
    stop();
    try {
      const bridge = androidLiveAudio((event) => {
        if (event.type === "playing") callbacks.current.onSpeakingChange(true);
        if (event.type === "ended") {
          callbacks.current.onSpeakingChange(false);
          bridge.dispose();
          duplex.current = null;
        }
        if (event.type === "error") {
          notice(event.data);
          bridge.dispose();
          duplex.current = null;
        }
      });
      duplex.current = bridge;
      await bridge.start(false);
      for (const chunk of chunks) bridge.play(chunk);
      bridge.endTurn();
      notice(
        `${problem ? problem + " " : ""}Replaying received reply audio. Live microphone is stopped; tap the microphone to resume.`,
      );
    } catch {
      notice("Reply playback failed. Check your audio output and retry.");
    }
  }
  async function testSpeaker() {
    stop();
    try {
      if (Platform.OS === "android") {
        const bridge = androidLiveAudio((event) => {
          if (event.type === "playing")
            callbacks.current.onSpeakingChange(true);
          else if (event.type === "ended") {
            callbacks.current.onSpeakingChange(false);
            bridge.dispose();
            if (duplex.current === bridge) duplex.current = null;
          } else if (event.type === "error") {
            notice(event.data);
            bridge.dispose();
            if (duplex.current === bridge) duplex.current = null;
          }
        });
        duplex.current = bridge;
        await bridge.start(false);
        const bytes = new Uint8Array(24000),
          view = new DataView(bytes.buffer);
        for (let i = 0; i < 12000; i++) {
          const fade = Math.min(1, i / 480, (12000 - i) / 480);
          view.setInt16(
            i * 2,
            Math.sin((i * 2 * Math.PI * 440) / 24000) * 2400 * fade,
            true,
          );
        }
        bridge.play(toBase64(bytes));
        bridge.endTurn();
        notice(
          "You should hear a short tone through the live voice output. Press volume up while it plays. This test uses no API.",
        );
        return;
      }
      const speech = await import("expo-speech");
      await speech.stop();
      speech.speak("Pramana voice is ready.", {
        language,
        onStart: () => callbacks.current.onSpeakingChange(true),
        onDone: () => callbacks.current.onSpeakingChange(false),
        onStopped: () => callbacks.current.onSpeakingChange(false),
        onError: () => {
          callbacks.current.onSpeakingChange(false);
          notice(
            "The phone speech voice could not play. Check media volume and installed speech voices.",
          );
        },
      });
      notice(
        "Speaker test uses your phone's voice. Turn up media volume; this does not test the AI provider.",
      );
    } catch {
      notice(
        "Speaker test could not start. Check your phone's speech settings.",
      );
    }
  }
  const dark = useDarkMode();
  const accent = useThemeColor("#315444");
  const haloColor = useThemeColor("#cce7d1");
  const speakingNow = !!rishiSpeaking;
  const statusText =
    state === "connecting"
      ? "Connecting…"
      : state === "live"
        ? speakingNow
          ? "Speaking"
          : listening
            ? "Listening"
            : waiting.current
              ? "Thinking…"
              : Platform.OS === "android" &&
                  microphoneEnabled &&
                  audioStatus.sent === 0
                ? "Starting microphone…"
                : "Ready"
        : state === "failed"
          ? "Disconnected"
          : "Tap the mic to talk";
  const tone: "live" | "busy" | "idle" =
    state === "live"
      ? speakingNow || listening
        ? "live"
        : "busy"
      : state === "connecting"
        ? "busy"
        : "idle";
  const dotColor =
    tone === "live" ? "#15803d" : tone === "busy" ? "#d97706" : "#9a9389";
  const orb = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(orb, {
      toValue: 1 + Math.min(100, micLevel) / 120,
      duration: 140,
      useNativeDriver: true,
    }).start();
  }, [micLevel]);
  function finishTurn() {
    if (!send({ type: "audio_end" })) return;
    inputPaused.current = true;
    setListening(false);
    waiting.current = true;
    notice("Turn sent. Waiting for your transcript and Rishi’s reply…");
    if (replyTimer.current) clearTimeout(replyTimer.current);
    replyTimer.current = setTimeout(() => {
      inputPaused.current = false;
      waiting.current = false;
      notice(
        "No transcript or reply arrived. Check microphone level and packet counts in ⋮, then retry.",
      );
    }, 20000);
  }
  const nativeDock =
    state === "live" && Platform.OS === "android" && microphoneEnabled;
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.avatarRing}>
            <RishiAvatar size={46} speaking={speakingNow} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Rishi</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
              <Text accessibilityLiveRegion="polite" style={styles.status}>
                {statusText}
              </Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Source search"
            onPress={onSourceSearch}
            style={styles.iconButton}
          >
            <Glyph name="search" />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Voice details"
            onPress={() => setDetails((v) => !v)}
            style={[styles.iconButton, details && styles.iconButtonOn]}
          >
            <Glyph name="ellipsis-horizontal" />
          </Pressable>
        </View>
        {!!sessionNotice && (
          <View accessibilityLiveRegion="assertive" style={styles.notice}>
            <Glyph name="information-circle" size={18} color="#755019" />
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={styles.noticeText}>{sessionNotice}</Text>
              {!!provider && needsProviderAccount(sessionNotice) && (
                <View style={styles.noticeActions}>
                  {(
                    [
                      ["Add credits", providerLinks[provider].billing],
                      ["Get API key", providerLinks[provider].getKey],
                    ] as const
                  ).map(([label, url]) => (
                    <Pressable
                      key={label}
                      accessibilityRole="link"
                      onPress={() =>
                        void Linking.openURL(url).catch(() =>
                          notice("The link could not open."),
                        )
                      }
                      style={styles.noticeAction}
                    >
                      <Text style={styles.noticeActionText}>{label} ↗</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
        <ScrollView
          ref={messageScroll}
          style={{ flex: 1 }}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            if (lines.length || tools.length)
              messageScroll.current?.scrollToEnd({ animated: true });
          }}
        >
          {details && (
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Voice details</Text>
              <Text style={styles.detail}>
                {Platform.OS === "web"
                  ? "Microphone audio streams to your selected AI provider."
                  : Platform.OS === "android"
                    ? "Microphone audio streams directly to your selected AI provider. Reply audio plays through the speaker. No microphone recordings are saved."
                    : "Device speech recognition transcribes your voice; final text goes to your AI provider."}{" "}
                Sessions last up to 10 minutes.
              </Text>
              {!!connectedModel && (
                <View style={styles.kv}>
                  <Text style={styles.detail}>Model</Text>
                  <Text style={styles.kvValue}>{connectedModel}</Text>
                </View>
              )}
              {Platform.OS === "android" && (
                <>
                  <View style={styles.kv}>
                    <Text style={styles.detail}>Microphone level</Text>
                    <Text style={styles.kvValue}>
                      {micLevel}% · {micLevel > 0 ? "sound detected" : "silent"}
                    </Text>
                  </View>
                  <View style={styles.kv}>
                    <Text style={styles.detail}>Audio packets</Text>
                    <Text style={styles.kvValue}>
                      {audioStatus.sent} sent · {audioStatus.received} received
                    </Text>
                  </View>
                </>
              )}
              <View style={styles.kv}>
                <Text style={[styles.detail, { flex: 1 }]}>
                  Web search (provider charges may apply)
                </Text>
                <Switch
                  accessibilityLabel="Enable web search tools"
                  value={webSearchEnabled}
                  onValueChange={setWebSearchEnabled}
                  trackColor={{
                    false: dark ? "#2D2C38" : "#E8E3DA",
                    true: dark ? "#6D64E8" : "#4338CA",
                  }}
                  thumbColor="#FFFFFF"
                  disabled={state === "live" || state === "connecting"}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => void testSpeaker()}
                style={styles.ghost}
              >
                <Glyph name="volume-high" size={18} />
                <Text style={styles.ghostText}>Test phone speaker</Text>
              </Pressable>
            </View>
          )}
          {!lines.length && (
            <View style={styles.empty}>
              <RishiAvatar size={112} speaking={speakingNow} />
              <Text style={styles.hello}>Namaste</Text>
              <Text style={styles.helloSub}>
                Ask about the Gita, Upanishads or Puranas, or share a quote to
                verify.
              </Text>
              <View style={styles.chips}>
                {SUGGESTIONS.map((text) => (
                  <Pressable
                    key={text}
                    accessibilityRole="button"
                    onPress={() => setDraft(text)}
                    style={styles.chip}
                  >
                    <Text style={styles.chipText}>{text}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
          {Platform.OS === "android" && canReplay && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Replay reply"
              onPress={() => void replayReply()}
              style={styles.ghost}
            >
              <Glyph name="play-circle" size={18} />
              <Text style={styles.ghostText}>Replay reply</Text>
            </Pressable>
          )}
          {lines.map((line, i) => {
            const mine = line.role === "user" || line.role === "You";
            return (
              <View
                key={i}
                accessible
                accessibilityLabel={`${mine ? "You" : "Rishi"}: ${line.text}`}
                style={[styles.bubble, mine ? styles.mine : styles.theirs]}
              >
                {!!line.imageUri && (
                  <Image
                    source={{ uri: line.imageUri }}
                    style={styles.sentImage}
                    accessibilityLabel="Sent image"
                  />
                )}
                <Text
                  selectable
                  style={mine ? styles.mineText : styles.theirsText}
                >
                  {line.text}
                </Text>
              </View>
            );
          })}
          {grounding && (
            <View style={styles.sourceCard}>
              <Text style={styles.sourceLabel}>
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
                    <Text style={styles.detail}>
                      Loading search suggestions…
                    </Text>
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
          {tools
            .filter((tool, i) => {
              const m = /^(\w+) · running$/.exec(tool);
              return (
                !m ||
                !tools
                  .slice(i + 1)
                  .some((later) => later.startsWith(m[1] + " · "))
              );
            })
            .map((tool, i) => {
              const chip = toolChip(tool);
              return (
                <View
                  key={i}
                  style={[
                    styles.toolChip,
                    chip.state === "problem" && styles.toolChipProblem,
                  ]}
                >
                  {chip.state === "running" ? (
                    <ActivityIndicator size="small" color={accent} />
                  ) : (
                    <Glyph
                      name={
                        chip.state === "done"
                          ? "checkmark-circle"
                          : "alert-circle"
                      }
                      size={16}
                      color={chip.state === "done" ? "#315444" : "#914626"}
                    />
                  )}
                  <Text style={styles.toolChipText}>{chip.label}</Text>
                  {chip.state === "problem" &&
                    !!provider &&
                    needsProviderAccount(tool) && (
                      <Pressable
                        accessibilityRole="link"
                        onPress={() =>
                          void Linking.openURL(
                            providerLinks[provider].billing,
                          ).catch(() => notice("The link could not open."))
                        }
                      >
                        <Text style={styles.noticeActionText}>
                          Add credits ↗
                        </Text>
                      </Pressable>
                    )}
                </View>
              );
            })}
          {sources.map((source, i) => (
            <View key={i} style={styles.sourceCard}>
              <Text style={styles.sourceLabel}>{source.label}</Text>
              <Text style={styles.sourceTitle}>{source.title}</Text>
              {source.url && (
                <Pressable
                  accessibilityRole="link"
                  onPress={() =>
                    void Linking.openURL(source.url!).catch(() =>
                      notice("This source link could not open."),
                    )
                  }
                  style={styles.sourceLink}
                >
                  <Text style={styles.link}>Open source</Text>
                  <Glyph name="arrow-forward" size={14} />
                </Pressable>
              )}
            </View>
          ))}
        </ScrollView>
        <View style={styles.dock}>
          {!!image && (
            <View style={styles.attachment}>
              <Image source={{ uri: image.uri }} style={styles.thumb} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.detail}>
                  Sending uploads this image with your message to your AI
                  provider.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={readingImage}
                  onPress={() => void readImage()}
                >
                  <Text style={styles.link}>
                    {readingImage ? "Reading…" : "Read text from image"}
                  </Text>
                </Pressable>
              </View>
              <Pressable
                accessibilityLabel="Remove image"
                onPress={() => setImage(null)}
                style={styles.iconButton}
              >
                <Glyph name="close" size={18} />
              </Pressable>
            </View>
          )}
          {!!heard && listening && (
            <Text numberOfLines={2} style={styles.detail}>
              {heard}
            </Text>
          )}
          {nativeDock && (
            <View style={styles.voiceBar}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Stop"
                onPress={() => stop()}
                style={styles.sideAction}
              >
                <View style={[styles.sideCircle, styles.stopCircle]}>
                  <Glyph name="stop" size={20} color="#a02f2f" />
                </View>
                <Text style={styles.sideLabel}>End</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Finish turn"
                onPress={finishTurn}
                style={styles.orbWrap}
              >
                <Animated.View
                  style={[
                    styles.orbHalo,
                    { backgroundColor: haloColor, transform: [{ scale: orb }] },
                  ]}
                />
                <View style={styles.orb}>
                  <Glyph
                    name={speakingNow ? "volume-high" : "mic"}
                    size={30}
                    color="white"
                  />
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Interrupt"
                onPress={interrupt}
                style={styles.sideAction}
              >
                <View style={styles.sideCircle}>
                  <Glyph name="hand-left" size={20} />
                </View>
                <Text style={styles.sideLabel}>Interrupt</Text>
              </Pressable>
            </View>
          )}
          {nativeDock && (
            <Text style={styles.voiceHint}>
              {speakingNow
                ? "Rishi is speaking · tap Interrupt to cut in"
                : "Speak naturally · tap the mic to send now"}
            </Text>
          )}
          {state === "live" && !nativeDock && (
            <View style={styles.pillRow}>
              <Pressable
                accessibilityRole="button"
                onPress={() => stop()}
                style={styles.ghost}
              >
                <Glyph name="stop-circle" size={18} color="#a02f2f" />
                <Text style={styles.ghostText}>End</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={interrupt}
                style={styles.ghost}
              >
                <Glyph name="hand-left" size={18} />
                <Text style={styles.ghostText}>Interrupt</Text>
              </Pressable>
              {listening &&
                Platform.OS !== "web" &&
                Platform.OS !== "android" && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => recognition.current?.stop()}
                    style={styles.ghost}
                  >
                    <Glyph name="send" size={16} />
                    <Text style={styles.ghostText}>Send speech</Text>
                  </Pressable>
                )}
            </View>
          )}
          <View style={styles.composer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Attach an image"
              onPress={() => void attachImage()}
              style={styles.iconButton}
            >
              <Glyph name="image-outline" size={22} />
            </Pressable>
            <TextInput
              accessibilityLabel="Message for live conversation"
              placeholder="Message Rishi…"
              value={draft}
              onChangeText={setDraft}
              maxLength={2000}
              style={styles.input}
              editable={state !== "connecting" && !readingImage}
              onSubmitEditing={sendText}
              multiline
              numberOfLines={1}
            />
            {draft.trim() || image ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send"
                disabled={state === "connecting" || readingImage}
                onPress={sendText}
                style={styles.sendButton}
              >
                <Glyph name="arrow-up" size={22} color="white" />
              </Pressable>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Start live voice"
                disabled={state === "connecting"}
                onPress={() => {
                  stop();
                  void start(true);
                }}
                style={[
                  styles.sendButton,
                  state === "live" && styles.sendButtonOn,
                ]}
              >
                {state === "connecting" ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Glyph name="mic" size={22} color="white" />
                )}
              </Pressable>
            )}
          </View>
          <Text style={styles.footnote}>
            AI-generated · scripture sources are checked separately
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: "#F6F4EE", overflow: "hidden" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatarRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e0e6d8",
  },
  title: {
    fontSize: 22,
    fontFamily: Platform.OS === "web" ? "Georgia" : "serif",
    color: "#263d35",
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  status: { fontSize: 13, color: "#778179" },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f1e9",
  },
  iconButtonOn: { backgroundColor: "#e0e6d8" },
  notice: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    marginHorizontal: 16,
    marginBottom: 4,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#f7e9de",
  },
  noticeText: { fontSize: 13, lineHeight: 19, color: "#755019" },
  noticeActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  noticeAction: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#ffffff",
  },
  noticeActionText: { fontSize: 13, fontWeight: "600", color: "#315444" },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 10 },
  empty: {
    alignItems: "center",
    paddingTop: 28,
    paddingHorizontal: 12,
    gap: 8,
  },
  hello: {
    fontSize: 30,
    fontFamily: Platform.OS === "web" ? "Georgia" : "serif",
    color: "#263d35",
    marginTop: 8,
  },
  helloSub: {
    fontSize: 15,
    lineHeight: 22,
    color: "#778179",
    textAlign: "center",
    maxWidth: 320,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e4e5db",
    backgroundColor: "#ffffff",
  },
  chipText: { fontSize: 14, color: "#315444" },
  bubble: {
    maxWidth: "86%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    gap: 8,
  },
  mine: {
    alignSelf: "flex-end",
    backgroundColor: "#315444",
    borderBottomRightRadius: 6,
  },
  theirs: {
    alignSelf: "flex-start",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e4e5db",
    borderBottomLeftRadius: 6,
  },
  mineText: { fontSize: 16, lineHeight: 23, color: "white" },
  theirsText: { fontSize: 16, lineHeight: 24, color: "#263d35" },
  sentImage: { width: 200, height: 180, borderRadius: 14 },
  toolChip: {
    alignSelf: "flex-start",
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: "#f0f1e9",
  },
  toolChipProblem: { backgroundColor: "#f7e9de" },
  toolChipText: {
    flexShrink: 1,
    fontSize: 13,
    lineHeight: 18,
    color: "#526459",
  },
  sourceCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e4e5db",
    backgroundColor: "#ffffff",
    gap: 6,
  },
  sourceLabel: {
    fontSize: 11,
    letterSpacing: 0.6,
    fontWeight: "700",
    color: "#755019",
  },
  sourceTitle: { fontSize: 15, lineHeight: 21, color: "#263d35" },
  sourceLink: { flexDirection: "row", alignItems: "center", gap: 6 },
  link: { color: "#315444", fontWeight: "600", paddingVertical: 4 },
  panel: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e4e5db",
    backgroundColor: "#ffffff",
    gap: 10,
  },
  panelTitle: { fontSize: 16, fontWeight: "700", color: "#263d35" },
  detail: { fontSize: 13, color: "#526459", lineHeight: 19 },
  kv: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  kvValue: { fontSize: 13, fontWeight: "600", color: "#263d35" },
  ghost: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    minHeight: 40,
    borderRadius: 999,
    backgroundColor: "#f0f1e9",
  },
  ghostText: { fontSize: 14, color: "#263d35", fontWeight: "600" },
  dock: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    gap: 10,
    backgroundColor: "#F6F4EE",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: "#e4e5db",
  },
  attachment: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    padding: 10,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e4e5db",
  },
  thumb: { height: 56, width: 56, borderRadius: 12 },
  voiceBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 4,
  },
  sideAction: { alignItems: "center", gap: 4, minWidth: 72 },
  sideCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f1e9",
  },
  stopCircle: { backgroundColor: "#f7e9de" },
  sideLabel: { fontSize: 12, color: "#778179" },
  orbWrap: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  orbHalo: {
    position: "absolute",
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#cce7d1",
    opacity: 0.7,
  },
  orb: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#315444",
  },
  voiceHint: {
    textAlign: "center",
    fontSize: 13,
    color: "#778179",
    marginTop: -4,
  },
  pillRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    padding: 6,
    borderRadius: 28,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e4e5db",
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    fontSize: 16,
    paddingHorizontal: 6,
    paddingTop: 10,
    paddingBottom: 10,
    color: "#263d35",
    ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#315444",
  },
  sendButtonOn: { opacity: 0.85 },
  footnote: {
    textAlign: "center",
    fontSize: 11,
    color: "#778179",
  },
});
