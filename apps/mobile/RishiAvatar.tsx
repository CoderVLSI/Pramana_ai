import React, { useEffect, useState } from "react";
import { AccessibilityInfo, Image, Pressable, Text, View } from "react-native";

/** Eight-frame atlas. Speaking is controlled by actual audio playback, not network activity. */
export function RishiAvatar({
  speaking = false,
  size = 144,
}: {
  speaking?: boolean;
  size?: number;
}) {
  const [frame, setFrame] = useState(0);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (alive) setReduced(value);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);
  useEffect(() => {
    setFrame(0);
    if (reduced) return;
    let tick = 0;
    const sequence = [2, 3, 4, 3, 5, 6, 2, 7];
    const timer = setInterval(
      () => {
        tick++;
        setFrame(
          speaking
            ? sequence[tick % sequence.length]
            : tick % 32 === 31
              ? 1
              : 0,
        );
      },
      speaking ? 140 : 120,
    );
    return () => clearInterval(timer);
  }, [speaking, reduced]);
  return (
    <View
      accessible
      accessibilityLabel={speaking ? "AI Rishi speaking" : "AI Rishi resting"}
      style={{ width: size, height: size, overflow: "hidden" }}
    >
      <Image
        source={require("./assets/rishi-sprites.png")}
        accessibilityElementsHidden
        importantForAccessibility="no"
        style={{
          width: size * 4,
          height: size * 2,
          position: "absolute",
          left: -(frame % 4) * size,
          top: -Math.floor(frame / 4) * size,
        }}
        resizeMode="stretch"
      />
    </View>
  );
}

export default function RishiPreview({
  speaking = false,
}: {
  speaking?: boolean;
}) {
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    if (!demo) return;
    const timer = setTimeout(() => setDemo(false), 5000);
    return () => clearTimeout(timer);
  }, [demo]);
  return (
    <View style={{ alignItems: "center", marginBottom: 20 }}>
      <RishiAvatar speaking={speaking || demo} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Preview Rishi talking animation"
        onPress={() => setDemo((value) => !value)}
        style={{
          minHeight: 44,
          justifyContent: "center",
          paddingHorizontal: 16,
        }}
      >
        <Text style={{ color: "#315444", fontWeight: "600" }}>
          {demo ? "Stop animation preview" : "Preview Rishi animation"}
        </Text>
      </Pressable>
      <Text style={{ color: "#778179", fontSize: 12 }}>
        {speaking ? "Speaking your reply" : "Animation preview · no audio"}
      </Text>
    </View>
  );
}
