import React from "react";
import { Image, View } from "react-native";
export const PROFILE_AVATARS = ["Vishnu", "Shiva", "Durga", "Ganesha", "Surya", "Skanda"] as const;
export type ProfileAvatarId = typeof PROFILE_AVATARS[number];
export function normalizeAvatar(value: unknown): ProfileAvatarId {
  return PROFILE_AVATARS.includes(value as ProfileAvatarId) ? value as ProfileAvatarId : "Vishnu";
}
export default function ProfileAvatar({ avatar, size = 64 }: { avatar: ProfileAvatarId; size?: number }) {
  const index = PROFILE_AVATARS.indexOf(normalizeAvatar(avatar));
  return <View accessibilityLabel={`${avatar} profile picture`} style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", backgroundColor: "#f5f1e7" }}>
    <Image source={require("./assets/profile-avatars.png")} accessible={false} style={{ position: "absolute", width: size * 3, height: size * 2, left: -(index % 3) * size, top: -Math.floor(index / 3) * size }} resizeMode="stretch" />
  </View>;
}
