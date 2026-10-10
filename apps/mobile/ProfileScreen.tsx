import { ScrollView, View, Text, TextInput, Pressable } from "./ui";
import React, { useState } from "react";

import ProfileAvatar, {
  PROFILE_AVATARS,
  type ProfileAvatarId,
} from "./ProfileAvatar";
export type StudyProfile = {
  name: string;
  avatar: ProfileAvatarId;
  language: string;
  mode: string;
  interests: string;
  ishtaDevata: string;
};
export const EMPTY_PROFILE: StudyProfile = {
  name: "",
  avatar: "Vishnu",
  language: "English",
  mode: "Text",
  interests: "",
  ishtaDevata: "",
};
export const PROFILE_KEY = "pramana-study-profile-v1";
export default function ProfileScreen({
  initial,
  firstTime,
  onSave,
  onClose,
  onDelete,
}: {
  initial: StudyProfile;
  firstTime: boolean;
  onSave: (profile: StudyProfile) => Promise<void>;
  onClose: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [profile, setProfile] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch {
      setError("Could not save changes on this device. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  const button = {
    minHeight: 48,
    padding: 12,
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: "#e4e5db",
    justifyContent: "center" as const,
  };
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        padding: 24,
        maxWidth: 640,
        width: "100%",
        alignSelf: "center",
      }}
    >
      <Text style={{ fontSize: 28, color: "#263d35", fontWeight: "700" }}>
        {firstTime ? "Welcome to Pramana" : "Your profile"}
      </Text>
      <Text style={{ marginVertical: 14, color: "#526459" }}>
        Tell us how you’d like to be addressed. Your name is shared with the
        configured AI provider for greetings and app help. Other preferences
        stay on this device. You can edit or delete them anytime.
      </Text>
      <View style={{ alignItems: "center", gap: 8, marginTop: 8 }}>
        <ProfileAvatar avatar={profile.avatar} size={96} />
        <Text style={{ color: "#263d35", fontSize: 20 }}>
          {profile.name.trim() || "Your profile"}
        </Text>
      </View>
      <Text style={{ color: "#263d35", marginTop: 20, marginBottom: 10 }}>
        Choose your profile picture
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {PROFILE_AVATARS.map((avatar) => (
          <Pressable
            key={avatar}
            accessibilityRole="radio"
            accessibilityLabel={`${avatar} avatar`}
            accessibilityState={{ checked: profile.avatar === avatar }}
            disabled={busy}
            onPress={() => setProfile((p) => ({ ...p, avatar }))}
            style={{
              alignItems: "center",
              gap: 6,
              padding: 10,
              borderRadius: 16,
              borderWidth: 2,
              borderColor: profile.avatar === avatar ? "#315444" : "#d8ddd2",
              backgroundColor: profile.avatar === avatar ? "#e5eddf" : "#fff",
            }}
          >
            <ProfileAvatar avatar={avatar} size={64} />
            <Text style={{ color: "#263d35" }}>
              {profile.avatar === avatar ? "✓ " : ""}
              {avatar}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ color: "#526459", marginTop: 10, fontSize: 12 }}>
        Your picture stays on this device. Choosing an avatar does not set your
        Ishta Devata.
      </Text>
      {(
        [
          ["name", "What should we call you?", 80],
          ["interests", "Study interests (optional)", 200],
          ["ishtaDevata", "Ishta Devata (optional)", 80],
        ] as const
      ).map(([key, label, max]) => (
        <View key={key} style={{ marginTop: 16 }}>
          <Text style={{ color: "#263d35", marginBottom: 8 }}>{label}</Text>
          <TextInput
            accessibilityLabel={label}
            value={profile[key]}
            maxLength={max}
            onChangeText={(value) =>
              setProfile((p) => ({ ...p, [key]: value }))
            }
            autoCapitalize="words"
            style={{
              minHeight: 48,
              borderWidth: 1,
              borderColor: "#bdc6bc",
              borderRadius: 8,
              padding: 12,
              backgroundColor: "white",
            }}
          />
        </View>
      ))}
      {(
        [
          ["language", ["English", "Hindi", "Sanskrit"]],
          ["mode", ["Text", "Voice + text"]],
        ] as const
      ).map(([key, options]) => (
        <View key={key} style={{ marginTop: 18 }}>
          <Text style={{ color: "#263d35" }}>
            {key === "language"
              ? "Preferred language"
              : "Preferred interaction"}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {options.map((value) => (
              <Pressable
                key={value}
                accessibilityRole="radio"
                accessibilityState={{ checked: profile[key] === value }}
                disabled={busy}
                onPress={() => setProfile((p) => ({ ...p, [key]: value }))}
                style={button}
              >
                <Text>
                  {profile[key] === value ? "◉" : "○"} {value}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
      <Text style={{ marginTop: 16, color: "#526459", fontSize: 12 }}>
        Language and voice choices are preferences. Source languages and voice
        availability depend on the verified collection. Ishta Devata is optional
        and does not change scripture citations.
      </Text>
      {!!error && (
        <Text
          accessibilityRole="alert"
          style={{ color: "#a02f2f", marginTop: 12 }}
        >
          {error}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => {
          if (!profile.name.trim()) {
            setError("Enter a preferred name, or skip setup for now.");
            return;
          }
          void action(() =>
            onSave({
              ...profile,
              name: profile.name.trim(),
              interests: profile.interests.trim(),
              ishtaDevata: profile.ishtaDevata.trim(),
            }),
          );
        }}
        style={[button, { backgroundColor: "#315444" }]}
      >
        <Text style={{ color: "white", textAlign: "center" }}>
          Save preferences
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => void action(onClose)}
        style={button}
      >
        <Text style={{ textAlign: "center" }}>
          {firstTime ? "Skip for now" : "Cancel"}
        </Text>
      </Pressable>
      {!firstTime && (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void action(onDelete)}
          style={button}
        >
          <Text style={{ textAlign: "center" }}>Delete study preferences</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
