import React, { useState } from "react";
import { Text, View, TextInput, Pressable } from "./ui";
import { useDevicePreferences } from "./DevicePreferences";
export default function BookmarkEditor({
  id,
  onSave,
}: {
  id: string;
  onSave: () => void;
}) {
  const { state, update, ready } = useDevicePreferences();
  const initial = state.notes[id];
  const [folder, setFolder] = useState(initial?.folder || ""),
    [note, setNote] = useState(initial?.note || ""),
    [message, setMessage] = useState("");
  const folders = [
    ...new Set(
      Object.values(state.notes)
        .map((n) => n.folder)
        .filter(Boolean),
    ),
  ];
  async function save() {
    try {
      await update((s) => ({
        ...s,
        notes: { ...s.notes, [id]: { folder: folder.trim(), note } },
      }));
      onSave();
      setMessage("Note and folder saved on this device.");
    } catch {
      setMessage("Could not save this note. Try again.");
    }
  }
  return (
    <View
      style={{
        gap: 10,
        padding: 20,
        backgroundColor: "#fffefa",
        borderRadius: 12,
        marginVertical: 16,
      }}
    >
      <Text style={{ fontSize: 18, color: "#263d35" }}>Your note & folder</Text>
      <TextInput
        accessibilityLabel="Bookmark folder"
        placeholder="Folder name (optional)"
        value={folder}
        onChangeText={setFolder}
        maxLength={40}
        style={field}
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {folders.map((f) => (
          <Pressable
            key={f}
            accessibilityRole="button"
            onPress={() => setFolder(f)}
            style={button}
          >
            <Text>{f}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        accessibilityLabel="Personal passage note"
        placeholder="Your reflection (optional)"
        value={note}
        onChangeText={setNote}
        maxLength={2000}
        multiline
        style={[field, { minHeight: 100 }]}
      />
      <Text style={{ fontSize: 12, color: "#778179" }}>
        Personal notes are separate from scripture and remain on this device.
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={!ready}
        onPress={() => void save()}
        style={button}
      >
        <Text>Save note & bookmark</Text>
      </Pressable>
      {!!message && <Text accessibilityLiveRegion="polite">{message}</Text>}
    </View>
  );
}
const field = {
  minHeight: 48,
  borderWidth: 1,
  borderColor: "#bdc6bc",
  borderRadius: 8,
  padding: 12,
  color: "#263d35",
};
const button = {
  minHeight: 44,
  padding: 12,
  borderRadius: 8,
  backgroundColor: "#e4e5db",
};
