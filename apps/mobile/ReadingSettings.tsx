import React from "react";
import { Text, View, Pressable } from "./ui";
import { useDevicePreferences } from "./DevicePreferences";
export default function ReadingSettings() {
  const { state, update, ready, error } = useDevicePreferences();
  const reading = state.reading;
  const set = (patch: Partial<typeof reading>) =>
    void update((s) => ({ ...s, reading: { ...s.reading, ...patch } })).catch(
      () => {},
    );
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
      <Text style={{ fontSize: 20, color: "#263d35" }}>
        Reading & appearance
      </Text>
      <Text>Theme</Text>
      <View style={row}>
        {(["system", "light", "dark"] as const).map((value) => (
          <Pressable
            key={value}
            disabled={!ready}
            accessibilityRole="radio"
            accessibilityState={{ checked: reading.appearance === value }}
            onPress={() => set({ appearance: value })}
            style={chip}
          >
            <Text>
              {reading.appearance === value ? "● " : "○ "}
              {value}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text>Passage text size · {reading.fontSize}</Text>
      <View style={row}>
        {[14, 18, 22, 26, 30].map((value) => (
          <Pressable
            key={value}
            disabled={!ready}
            accessibilityRole="radio"
            accessibilityLabel={`Text size ${value}`}
            accessibilityState={{ checked: reading.fontSize === value }}
            onPress={() => set({ fontSize: value })}
            style={chip}
          >
            <Text>
              {reading.fontSize === value ? "● " : ""}
              {value}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text>Line spacing</Text>
      <View style={row}>
        {[1.3, 1.6, 2].map((value) => (
          <Pressable
            key={value}
            disabled={!ready}
            accessibilityRole="radio"
            accessibilityState={{ checked: reading.lineSpacing === value }}
            onPress={() => set({ lineSpacing: value })}
            style={chip}
          >
            <Text>
              {reading.lineSpacing === value ? "● " : "○ "}
              {value === 1.3
                ? "Compact"
                : value === 1.6
                  ? "Comfortable"
                  : "Spacious"}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text>Passage display</Text>
      <View style={row}>
        {(["both", "original", "translation"] as const).map((value) => (
          <Pressable
            key={value}
            disabled={!ready}
            accessibilityRole="radio"
            accessibilityState={{ checked: reading.display === value }}
            onPress={() => set({ display: value })}
            style={chip}
          >
            <Text>
              {reading.display === value ? "● " : "○ "}
              {value}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ color: "#778179", lineHeight: 21 }}>
        Display choices do not translate or alter the source. Where no
        translation is supplied, the original remains visible.
      </Text>
      <Text
        style={{
          fontSize: reading.fontSize,
          lineHeight: reading.fontSize * reading.lineSpacing,
        }}
      >
        ॐ · A little more understanding, one passage at a time.
      </Text>
      {!!error && <Text accessibilityRole="alert">{error}</Text>}
    </View>
  );
}
const row = {
  flexDirection: "row" as const,
  flexWrap: "wrap" as const,
  gap: 8,
};
const chip = {
  minHeight: 44,
  padding: 12,
  borderRadius: 8,
  backgroundColor: "#e4e5db",
};
