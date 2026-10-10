import React, { useState } from "react";
import { Text, View, Pressable, ReadingText } from "./ui";
import { useDevicePreferences } from "./DevicePreferences";
import type { HistoryEntry } from "../../packages/device-preferences";
export default function StudyHistory({
  onRecall,
}: {
  onRecall: (entry: HistoryEntry) => void;
}) {
  const { state, update, ready } = useDevicePreferences();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false),
    [error, setError] = useState("");
  const remove = (id?: string) =>
    void update((s) => ({
      ...s,
      history: id ? s.history.filter((e) => e.id !== id) : [],
    }))
      .then(() => setConfirm(false))
      .catch(() => setError("Could not delete saved history."));
  return (
    <View
      style={{
        gap: 12,
        padding: 20,
        borderRadius: 12,
        backgroundColor: "#fffefa",
        marginVertical: 20,
      }}
    >
      <Text style={{ fontSize: 20, color: "#263d35" }}>
        Recent conversations
      </Text>
      <Text style={{ color: "#778179" }}>
        Latest 50 text turns on this device. Live sessions and audio are not
        recorded. Reusing a question does not send it until you tap Ask.
      </Text>
      {state.history.length === 0 && <Text>No saved conversations yet.</Text>}
      {state.history.map((entry) => (
        <View
          key={entry.id}
          style={{
            borderTopWidth: 1,
            borderColor: "#e4e5db",
            paddingTop: 12,
            gap: 8,
          }}
        >
          <Text style={{ fontWeight: "600" }}>{entry.query}</Text>
          <Text style={{ color: "#778179", fontSize: 12 }}>
            {new Date(entry.at).toLocaleString()} ·{" "}
            {entry.evidence === "local"
              ? "Reviewed local passage snapshot"
              : entry.evidence === "web"
                ? "External web · unverified"
                : entry.evidence === "conversation"
                  ? "App conversation"
                  : "Not verified"}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: expanded === entry.id }}
            onPress={() => setExpanded(expanded === entry.id ? null : entry.id)}
            style={button}
          >
            <Text>
              {expanded === entry.id ? "Hide reply" : "Read saved reply"}
            </Text>
          </Pressable>
          {expanded === entry.id && <ReadingText>{entry.text}</ReadingText>}
          {entry.references.map((ref) => (
            <Text key={ref} style={{ fontSize: 12 }}>
              {ref}
            </Text>
          ))}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              accessibilityRole="button"
              onPress={() => onRecall(entry)}
              style={button}
            >
              <Text>Reuse question</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete conversation ${entry.query}`}
              disabled={!ready}
              onPress={() => remove(entry.id)}
              style={button}
            >
              <Text>Delete</Text>
            </Pressable>
          </View>
        </View>
      ))}
      {state.history.length > 0 && (
        <Pressable
          accessibilityRole="button"
          onPress={() => setConfirm(true)}
          style={button}
        >
          <Text>Clear history</Text>
        </Pressable>
      )}
      {confirm && (
        <View>
          <Text>Delete all saved conversations from this device?</Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              disabled={!ready}
              onPress={() => remove()}
              style={button}
            >
              <Text>Delete all</Text>
            </Pressable>
            <Pressable onPress={() => setConfirm(false)} style={button}>
              <Text>Cancel</Text>
            </Pressable>
          </View>
        </View>
      )}
      {!!error && <Text accessibilityRole="alert">{error}</Text>}
    </View>
  );
}
const button = {
  padding: 12,
  minHeight: 44,
  backgroundColor: "#e4e5db",
  borderRadius: 8,
};
