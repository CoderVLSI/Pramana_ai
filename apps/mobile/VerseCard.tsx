import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { palette } from "./theme";

export type VerseInfo = {
  work: string;
  ref: string;
  edition: string;
  aiOnly: boolean;
};

export default function VerseCard({
  source,
  dark,
  onOpen,
}: {
  source: { excerpt?: string; url?: string; verse?: VerseInfo };
  dark: boolean;
  onOpen: (url: string) => void;
}) {
  const P = palette[dark ? "dark" : "light"];
  const v = source.verse!;
  const lines = String(source.excerpt || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return (
    <View
      accessible
      accessibilityLabel={`${v.work} ${v.ref.includes(".") ? v.ref : `Verse ${v.ref}`}. ${lines.join(" ")}`}
      style={{
        borderRadius: 24,
        borderWidth: 1,
        borderColor: P.line,
        backgroundColor: P.surface,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 12,
        }}
      >
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: P.saffronSoft,
          }}
        >
          <Text style={{ fontSize: 20, color: P.saffron }}>ॐ</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: P.ink }}>
            {v.work}
          </Text>
          {!!v.edition && (
            <Text style={{ fontSize: 12, color: P.muted, marginTop: 1 }}>
              {v.edition}
            </Text>
          )}
        </View>
        <View
          style={{
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 14,
            backgroundColor: P.accentSoft,
          }}
        >
          <Text
            style={{ fontSize: 14, fontWeight: "700", color: P.accentText }}
          >
            {v.ref}
          </Text>
        </View>
      </View>
      <View
        style={{
          marginHorizontal: 12,
          paddingVertical: 20,
          paddingHorizontal: 16,
          borderRadius: 18,
          backgroundColor: P.saffronSoft,
          gap: 6,
        }}
      >
        {lines.map((line, i) => (
          <Text
            key={i}
            selectable
            style={{
              fontSize: 22,
              lineHeight: 36,
              textAlign: "center",
              color: P.ink,
              letterSpacing: 0.2,
            }}
          >
            {line}
          </Text>
        ))}
      </View>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 14,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 12,
            backgroundColor: v.aiOnly ? P.saffronSoft : P.accentSoft,
          }}
        >
          <Ionicons
            name={v.aiOnly ? "sparkles-outline" : "checkmark-circle-outline"}
            size={14}
            color={v.aiOnly ? P.saffron : P.accentText}
          />
          <Text
            style={{
              fontSize: 12,
              fontWeight: "600",
              color: v.aiOnly ? P.saffron : P.accentText,
            }}
          >
            {v.aiOnly ? "AI-transcribed · not yet human-reviewed" : "Reviewed"}
          </Text>
        </View>
        {!!source.url && (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="View the page scan"
            onPress={() => onOpen(source.url!)}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Text
              style={{ fontSize: 13, fontWeight: "600", color: P.accentText }}
            >
              View page scan
            </Text>
            <Ionicons name="arrow-forward" size={14} color={P.accentText} />
          </Pressable>
        )}
      </View>
    </View>
  );
}
