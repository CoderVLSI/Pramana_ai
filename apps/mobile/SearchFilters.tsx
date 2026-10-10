import React from "react";
import { Text, View, Pressable } from "./ui";
export interface SearchSelection {
  evidence_mode: "auto" | "local" | "web";
  edition_ids: string[];
  translation_language?: string;
}
export const DEFAULT_SEARCH: SearchSelection = {
  evidence_mode: "auto",
  edition_ids: [],
};
export default function SearchFilters({
  value,
  editions,
  onChange,
}: {
  value: SearchSelection;
  editions: string[];
  onChange: (value: SearchSelection) => void;
}) {
  return (
    <View
      style={{
        marginVertical: 16,
        padding: 18,
        gap: 10,
        borderRadius: 12,
        backgroundColor: "#fffefa",
      }}
    >
      <Text style={{ color: "#263d35", fontSize: 18 }}>Search filters</Text>
      <View style={row}>
        {(["auto", "local", "web"] as const).map((mode) => (
          <Pressable
            key={mode}
            accessibilityRole="radio"
            accessibilityState={{ checked: value.evidence_mode === mode }}
            onPress={() => onChange({ ...value, evidence_mode: mode })}
            style={chip}
          >
            <Text>
              {value.evidence_mode === mode ? "● " : "○ "}
              {mode === "auto"
                ? "Local, then web"
                : mode === "local"
                  ? "Local only"
                  : "Web only"}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text>Translation language · only recorded edition metadata is used</Text>
      <View style={row}>
        {[
          ["", "Any"],
          ["en", "English"],
          ["hi", "Hindi"],
          ["sa", "Sanskrit"],
        ].map(([code, title]) => (
          <Pressable
            key={code}
            disabled={value.evidence_mode === "web"}
            accessibilityRole="radio"
            accessibilityState={{
              checked: (value.translation_language || "") === code,
            }}
            onPress={() =>
              onChange({ ...value, translation_language: code || undefined })
            }
            style={chip}
          >
            <Text>
              {(value.translation_language || "") === code ? "● " : "○ "}
              {title}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text>Installed edition</Text>
      <View style={row}>
        {["", ...editions].map((id) => (
          <Pressable
            key={id}
            disabled={value.evidence_mode === "web"}
            accessibilityRole="radio"
            accessibilityState={{
              checked: id
                ? value.edition_ids.includes(id)
                : !value.edition_ids.length,
            }}
            onPress={() => onChange({ ...value, edition_ids: id ? [id] : [] })}
            style={chip}
          >
            <Text>
              {(id ? value.edition_ids.includes(id) : !value.edition_ids.length)
                ? "● "
                : "○ "}
              {id || "Any installed edition"}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ color: "#778179", fontSize: 12, lineHeight: 20 }}>
        Edition and language filters apply to local retrieval, not public web
        results. Live has its own web-search switch and uses the selected work
        collection. Filters do not translate queries or sources.
      </Text>
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
