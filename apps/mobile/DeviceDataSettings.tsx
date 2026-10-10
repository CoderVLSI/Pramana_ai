import React, { useState } from "react";
import { Text, View, Pressable } from "./ui";
import { useDevicePreferences } from "./DevicePreferences";
export default function DeviceDataSettings() {
  const { state, update, ready } = useDevicePreferences();
  const [confirm, setConfirm] = useState(false),
    [message, setMessage] = useState("");
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
      <Text style={{ fontSize: 20, color: "#263d35" }}>Device study data</Text>
      <Text>
        {state.history.length} saved turns · {Object.keys(state.notes).length}{" "}
        notes · {Object.keys(state.positions).length} reading positions
      </Text>
      <Text style={{ color: "#778179", lineHeight: 21 }}>
        Stored on this device. Clear history, personal notes, folders and
        reading positions here. Bookmarks, profile, source packs, reminders and
        API keys have separate controls.
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={!ready}
        onPress={() => setConfirm(true)}
        style={button}
      >
        <Text>Clear history, notes & reading positions</Text>
      </Pressable>
      {confirm && (
        <>
          <Text>Delete this study data from the device?</Text>
          <Pressable
            accessibilityRole="button"
            disabled={!ready}
            onPress={() =>
              void update((s) => ({
                ...s,
                history: [],
                notes: {},
                positions: {},
              }))
                .then(() => {
                  setConfirm(false);
                  setMessage("Device study data cleared.");
                })
                .catch(() =>
                  setMessage("Could not clear study data. Try again."),
                )
            }
            style={button}
          >
            <Text>Confirm deletion</Text>
          </Pressable>
          <Pressable onPress={() => setConfirm(false)} style={button}>
            <Text>Cancel</Text>
          </Pressable>
        </>
      )}
      {!!message && <Text accessibilityLiveRegion="polite">{message}</Text>}
    </View>
  );
}
const button = {
  minHeight: 44,
  padding: 12,
  backgroundColor: "#e4e5db",
  borderRadius: 8,
};
