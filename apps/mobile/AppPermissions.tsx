import React, { useEffect, useState } from "react";
import { Platform, Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, Text, Pressable } from "./ui";
const KEY = "pramana.permissions.launch.v1";
export default function AppPermissions({
  launch = false,
}: {
  launch?: boolean;
}) {
  const [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function request() {
    if (Platform.OS !== "android") return;
    setBusy(true);
    try {
      const speech = (await import("expo-speech-recognition"))
        .ExpoSpeechRecognitionModule;
      const mic = await speech.requestPermissionsAsync();
      const notifications = await import("expo-notifications");
      const notification = await notifications.requestPermissionsAsync();
      setMessage(
        `${mic.granted ? "Microphone allowed." : "Microphone denied; text chat remains available."} ${notification.granted ? "Notifications allowed; reminders stay off until enabled." : "Notifications denied."}`,
      );
      await AsyncStorage.setItem(KEY, "requested");
    } catch {
      setMessage(
        "Permissions could not be requested. Open Android app settings to review them.",
      );
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (!launch || Platform.OS !== "android") return;
    let active = true;
    void AsyncStorage.getItem(KEY)
      .then((value) => {
        if (active && !value) void request();
      })
      .catch(() => setMessage("Use Settings to enable microphone permission."));
    return () => {
      active = false;
    };
  }, [launch]);
  if (Platform.OS !== "android") return null;
  if (launch) return null;
  return (
    <View style={{ gap: 8, marginBottom: 20 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>App permissions</Text>
      <Text>
        Microphone enables voice questions. Notifications enable optional
        reminders. Text study works without either permission.
      </Text>
      <Pressable
        disabled={busy}
        onPress={() => void request()}
        style={{ padding: 12, backgroundColor: "#e4e5db", borderRadius: 10 }}
      >
        <Text>
          {busy
            ? "Requesting permissions…"
            : "Enable microphone and notifications"}
        </Text>
      </Pressable>
      <Pressable
        onPress={() =>
          void Linking.openSettings().catch(() =>
            setMessage("Android settings could not open."),
          )
        }
        style={{ padding: 12 }}
      >
        <Text>Open Android app permissions</Text>
      </Pressable>
      {!!message && <Text accessibilityLiveRegion="polite">{message}</Text>}
    </View>
  );
}
