import React, { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import * as Speech from "expo-speech";
import * as FileSystem from "expo-file-system/legacy";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import type { ExpoSpeechRecognitionModuleType } from "expo-speech-recognition/build/ExpoSpeechRecognitionModule.types";

// Expo Go or an older installed APK may lack the optional native recognition module.
let recognition: ExpoSpeechRecognitionModuleType | null = null;
try {
  recognition = require("expo-speech-recognition").ExpoSpeechRecognitionModule;
} catch {
  /* Typing stays available. */
}
export interface VoiceModeProps {
  busy: boolean;
  language: string;
  onTranscript: (text: string) => void;
  onSpeakingChange: (speaking: boolean) => void;
  response: {
    id: number;
    text: string;
    audio?: { audio_base64: string; mime_type: string } | null;
    note?: string;
  } | null;
  onNotice: (message: string) => void;
}
export default function VoiceMode(props: VoiceModeProps) {
  const current = useRef(props);
  current.current = props;
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const alive = useRef(true),
    generation = useRef(0),
    recording = useRef(false);
  const player = useRef<AudioPlayer | null>(null),
    cached = useRef<string | null>(null);
  const webAudio = useRef<HTMLAudioElement | null>(null);
  const subscription = useRef<{ remove(): void } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const speakingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const updateSpeaking = (value: boolean) => {
    if (!alive.current) return;
    setSpeaking(value);
    current.current.onSpeakingChange(value);
  };
  const stopListening = (abort = false) => {
    if (abort) recording.current = false;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    try {
      abort ? recognition?.abort() : recognition?.stop();
    } catch {
      /* Optional native service can disappear. */
    }
    if (alive.current) setListening(false);
  };
  const stopPlayback = () => {
    generation.current++;
    if (speakingTimeout.current) clearTimeout(speakingTimeout.current);
    speakingTimeout.current = null;
    void Speech.stop().catch(() => {});
    if (webAudio.current) {
      const element = webAudio.current;
      element.onplaying =
        element.onpause =
        element.onended =
        element.onerror =
          null;
      element.pause();
      element.removeAttribute("src");
      element.load();
      webAudio.current = null;
    }
    subscription.current?.remove();
    subscription.current = null;
    try {
      player.current?.pause();
      player.current?.remove();
    } catch {}
    player.current = null;
    if (cached.current) {
      if (Platform.OS === "web") URL.revokeObjectURL(cached.current);
      else
        void FileSystem.deleteAsync(cached.current, { idempotent: true }).catch(
          () => {},
        );
      cached.current = null;
    }
    updateSpeaking(false);
  };
  useEffect(() => {
    alive.current = true;
    if (!recognition)
      return () => {
        stopListening(true);
        stopPlayback();
        alive.current = false;
      };
    const result = recognition.addListener("result", (event) => {
      if (!recording.current || !alive.current) return;
      const text = event.results[0]?.transcript?.trim();
      if (text) current.current.onTranscript(text.slice(0, 2000));
    });
    const end = recognition.addListener("end", () => {
      recording.current = false;
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      if (alive.current) setListening(false);
    });
    const error = recognition.addListener("error", (event) => {
      stopListening(true);
      if (alive.current && event.error !== "aborted")
        current.current.onNotice(
          event.error === "not-allowed"
            ? "Microphone access was denied. Enable it in app or browser settings, or type your question."
            : "Speech recognition stopped. Try again, check your connection, or type your question.",
        );
    });
    return () => {
      result.remove();
      end.remove();
      error.remove();
      stopListening(true);
      stopPlayback();
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (props.busy) {
      stopListening(true);
      stopPlayback();
    }
  }, [props.busy]);
  const beginListening = async () => {
    if (current.current.busy || speaking || recording.current) return;
    if (!recognition || !recognition.isRecognitionAvailable()) {
      current.current.onNotice(
        "Speech recognition is unavailable here. Use Chrome or Edge with microphone access, install the updated Android build, or type your question.",
      );
      return;
    }
    try {
      const requestEpoch = generation.current;
      const permission = await recognition.requestPermissionsAsync();
      if (
        !alive.current ||
        current.current.busy ||
        generation.current !== requestEpoch
      )
        return;
      if (!permission.granted) {
        current.current.onNotice(
          "Microphone permission is needed only for voice input. You can continue typing.",
        );
        return;
      }
      stopPlayback();
      recording.current = true;
      setListening(true);
      recognition.start({
        lang: current.current.language || "en-IN",
        interimResults: true,
        continuous: false,
        maxAlternatives: 1,
      });
      timer.current = setTimeout(() => {
        stopListening();
        current.current.onNotice(
          "Listening stopped after 30 seconds. Review your text and tap Ask.",
        );
      }, 30000);
    } catch {
      stopListening(true);
      current.current.onNotice(
        "The microphone could not start. Check permissions or type your question.",
      );
    }
  };
  const handledResponse = useRef<number | null>(null);
  const playResponse = (response: NonNullable<VoiceModeProps["response"]>) => {
    if (current.current.busy) return;
    stopListening(true);
    stopPlayback();
    const epoch = generation.current;
    const isCurrent = () => alive.current && generation.current === epoch;
    const speakText = () => {
      if (!isCurrent()) return;
      Speech.speak(response.text.slice(0, 6000), {
        language: current.current.language || "en-IN",
        onStart: () => {
          if (isCurrent()) updateSpeaking(true);
        },
        onDone: () => {
          if (isCurrent()) stopPlayback();
        },
        onStopped: () => {
          if (isCurrent()) updateSpeaking(false);
        },
        onError: () => {
          if (isCurrent()) {
            stopPlayback();
            current.current.onNotice(
              "Device speech is unavailable. The text response remains available.",
            );
          }
        },
      });
    };
    speakingTimeout.current = setTimeout(() => {
      if (isCurrent()) {
        stopPlayback();
        current.current.onNotice(
          "Voice playback stopped at the time limit. Read the remaining text below.",
        );
      }
    }, 180000);
    void (async () => {
      if (!response.audio) {
        speakText();
        return;
      }
      let uri: string | null = null;
      try {
        const audio = response.audio;
        if (
          !/^audio\/(?:wav|x-wav|wave)$/.test(audio.mime_type) ||
          audio.audio_base64.length > 16 * 1024 * 1024 ||
          !audio.audio_base64.startsWith("UklGR") ||
          !/^[A-Za-z0-9+/]+={0,2}$/.test(audio.audio_base64)
        )
          throw Error("Invalid audio");
        if (Platform.OS === "web") {
          const raw = atob(audio.audio_base64);
          const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
          if (raw.slice(0, 4) !== "RIFF" || raw.slice(8, 12) !== "WAVE")
            throw Error("Invalid WAV");
          uri = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
        } else {
          if (!FileSystem.cacheDirectory) throw Error("Cache unavailable");
          uri =
            FileSystem.cacheDirectory +
            `pramana-voice-${Date.now()}-${epoch}.wav`;
          await FileSystem.writeAsStringAsync(uri, audio.audio_base64, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
        if (!isCurrent()) {
          if (Platform.OS === "web") URL.revokeObjectURL(uri);
          else await FileSystem.deleteAsync(uri, { idempotent: true });
          return;
        }
        cached.current = uri;
        if (Platform.OS === "web") {
          const element = new Audio(uri);
          webAudio.current = element;
          element.onplaying = () => {
            if (isCurrent()) updateSpeaking(true);
          };
          element.onpause = () => {
            if (isCurrent()) updateSpeaking(false);
          };
          element.onended = () => {
            if (isCurrent()) stopPlayback();
          };
          element.onerror = () => {
            if (!isCurrent()) return;
            element.onplaying =
              element.onpause =
              element.onended =
              element.onerror =
                null;
            element.pause();
            webAudio.current = null;
            current.current.onNotice(
              "Provider audio could not play. Using device speech; use Play reply if your browser blocks playback.",
            );
            speakText();
          };
          await element.play();
          return;
        }
        const audioPlayer = createAudioPlayer({ uri }, { updateInterval: 100 });
        player.current = audioPlayer;
        subscription.current = audioPlayer.addListener(
          "playbackStatusUpdate",
          (status) => {
            if (!isCurrent()) return;
            updateSpeaking(status.playing);
            if (status.didJustFinish) stopPlayback();
          },
        );
        audioPlayer.play();
      } catch {
        if (uri && cached.current !== uri) {
          if (Platform.OS === "web") URL.revokeObjectURL(uri);
          else
            void FileSystem.deleteAsync(uri, { idempotent: true }).catch(
              () => {},
            );
        }
        if (isCurrent()) {
          if (webAudio.current) {
            const element = webAudio.current;
            element.onplaying =
              element.onpause =
              element.onended =
              element.onerror =
                null;
            element.pause();
            webAudio.current = null;
          }
          current.current.onNotice(
            "Provider audio could not play. Using device speech; tap Play reply if browser playback is blocked.",
          );
          speakText();
        }
      }
    })();
  };
  useEffect(() => {
    const response = props.response;
    if (
      props.busy ||
      !response?.text.trim() ||
      handledResponse.current === response.id
    )
      return;
    handledResponse.current = response.id;
    playResponse(response);
    return stopPlayback;
  }, [props.response?.id, props.busy]);
  return (
    <View style={styles.box}>
      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            listening ? "Stop listening" : "Dictate a question"
          }
          disabled={props.busy || speaking}
          onPress={listening ? () => stopListening() : beginListening}
          style={[styles.button, (props.busy || speaking) && styles.disabled]}
        >
          <Text style={styles.buttonText}>
            {listening ? "Stop listening" : "Speak your question"}
          </Text>
        </Pressable>
        {props.response && !speaking && !listening && !props.busy && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Play spoken reply"
            onPress={() => {
              if (current.current.response)
                playResponse(current.current.response);
            }}
            style={styles.stop}
          >
            <Text>Play reply</Text>
          </Pressable>
        )}
        {speaking && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Stop spoken reply"
            onPress={stopPlayback}
            style={styles.stop}
          >
            <Text>Stop reply</Text>
          </Pressable>
        )}
      </View>
      <Text style={styles.hint}>
        {listening
          ? "Listening… Review the transcript, then tap Ask."
          : "Voice input fills your question; review it before asking. Your device or browser speech service may process microphone audio. Replies use provider audio when available, otherwise device speech."}
      </Text>
    </View>
  );
}
const styles = StyleSheet.create({
  box: { gap: 8, paddingVertical: 12 },
  controls: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  button: {
    backgroundColor: "#174C3C",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: { color: "white", fontWeight: "600" },
  stop: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#B9C9BF",
    borderRadius: 12,
  },
  hint: { fontSize: 12, color: "#52645B", lineHeight: 18 },
  disabled: { opacity: 0.5 },
});
