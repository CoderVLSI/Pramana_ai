import React, { useEffect, useState } from "react";
import { Platform, Switch } from "react-native";
import { Text, View, TextInput, Pressable } from "./ui";
import * as Notifications from "expo-notifications";
const TAG = "pramana-study-reminder";
export default function ReminderSettings() {
  const [enabled, setEnabled] = useState(false),
    [hour, setHour] = useState("19"),
    [minute, setMinute] = useState("00");
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    if (Platform.OS === "web") return;
    let active = true;
    void Notifications.getAllScheduledNotificationsAsync()
      .then((items) => {
        const item = items.find((n) => n.content.data?.tag === TAG);
        if (!active) return;
        setEnabled(!!item);
        const trigger = item?.trigger as
          { hour?: number; minute?: number } | undefined;
        if (typeof trigger?.hour === "number") setHour(String(trigger.hour));
        if (typeof trigger?.minute === "number")
          setMinute(String(trigger.minute).padStart(2, "0"));
      })
      .catch(() => {
        if (active)
          setMessage("Reminder status is unavailable on this device.");
      });
    return () => {
      active = false;
    };
  }, []);
  async function save(nextEnabled: boolean) {
    if (busy) return;
    if (
      nextEnabled &&
      (!/^\d{1,2}$/.test(hour) ||
        !/^\d{1,2}$/.test(minute) ||
        Number(hour) > 23 ||
        Number(minute) > 59)
    ) {
      setMessage("Enter a valid time: hour 0–23 and minute 0–59.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const old = (
        await Notifications.getAllScheduledNotificationsAsync()
      ).filter((n) => n.content.data?.tag === TAG);
      if (nextEnabled) {
        if (Platform.OS === "android")
          await Notifications.setNotificationChannelAsync("study", {
            name: "Study reminders",
            importance: Notifications.AndroidImportance.DEFAULT,
            vibrationPattern: [0, 100],
            sound: "default",
          });
        const permission = await Notifications.requestPermissionsAsync();
        if (!permission.granted) {
          setMessage(
            "Notifications weren’t allowed. Study remains available without reminders.",
          );
          return;
        }
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: "A moment for study",
            body: "Return to Pramana for a little scripture reading.",
            data: { tag: TAG },
            sound: "default",
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour: Number(hour),
            minute: Number(minute),
            channelId: "study",
          },
        });
        try {
          for (const item of old)
            await Notifications.cancelScheduledNotificationAsync(
              item.identifier,
            );
        } catch (e) {
          await Notifications.cancelScheduledNotificationAsync(id);
          throw e;
        }
      } else {
        for (const item of old)
          await Notifications.cancelScheduledNotificationAsync(item.identifier);
      }
      setEnabled(nextEnabled);
      setMessage(
        nextEnabled
          ? `Daily reminder set for ${hour.padStart(2, "0")}:${minute.padStart(2, "0")} in the phone’s local time. Android may delay delivery to save battery.`
          : "Study reminders turned off.",
      );
    } catch {
      setMessage(
        "Could not update reminders. Check notification settings and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <View
      style={{
        padding: 22,
        marginBottom: 20,
        borderRadius: 12,
        backgroundColor: "#fffefa",
        gap: 12,
      }}
    >
      <Text style={{ fontSize: 20, color: "#263d35" }}>Study reminders</Text>
      {Platform.OS === "web" ? (
        <Text>Local daily reminders are available in the Android app.</Text>
      ) : (
        <>
          <Text>Optional daily notification. No account or server needed.</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text>Enable daily reminder</Text>
            <Switch
              accessibilityLabel="Daily study reminder"
              value={enabled}
              disabled={busy}
              onValueChange={(value) => void save(value)}
            />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text>24-hour time</Text>
            <TextInput
              accessibilityLabel="Reminder hour"
              value={hour}
              onChangeText={setHour}
              maxLength={2}
              keyboardType="number-pad"
              editable={!busy}
              style={field}
            />
            <Text>:</Text>
            <TextInput
              accessibilityLabel="Reminder minute"
              value={minute}
              onChangeText={setMinute}
              maxLength={2}
              keyboardType="number-pad"
              editable={!busy}
              style={field}
            />
          </View>
          {enabled && (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => void save(true)}
              style={{
                minHeight: 44,
                padding: 12,
                backgroundColor: "#e4e5db",
                borderRadius: 8,
              }}
            >
              <Text>Update reminder time</Text>
            </Pressable>
          )}
        </>
      )}
      {!!message && <Text accessibilityLiveRegion="polite">{message}</Text>}
    </View>
  );
}
const field = {
  padding: 12,
  minHeight: 48,
  width: 64,
  borderWidth: 1,
  borderColor: "#bdc6bc",
  borderRadius: 8,
  color: "#263d35",
};
