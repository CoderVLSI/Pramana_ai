import React, { useState } from "react";
import { Switch } from "react-native";
import { Text, View, TextInput, Pressable } from "./ui";
import { useDevicePreferences } from "./DevicePreferences";
import {
  containsCredential,
  memorySuggestion,
  proposeMemory,
} from "../../packages/device-preferences";
export default function Scratchpad() {
  const { state, update, ready } = useDevicePreferences();
  const [draft, setDraft] = useState(state.memory.scratchpad),
    [newMemory, setNewMemory] = useState("");
  const [message, setMessage] = useState(""),
    [confirm, setConfirm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null),
    [editedText, setEditedText] = useState("");
  const persist = (change: Parameters<typeof update>[0], text: string) =>
    void update(change)
      .then(() => setMessage(text))
      .catch(() => setMessage("Could not save memory changes on this device."));
  const add = () => {
    const text = newMemory.trim();
    if (!text) return;
    if (containsCredential(text)) {
      setMessage("Do not save API keys, passwords or tokens as AI memory.");
      return;
    }
    if (state.memory.approved.length >= 20) {
      setMessage(
        "Keep up to 20 approved memories. Delete an older item first.",
      );
      return;
    }
    persist(
      (s) => ({
        ...s,
        memory: {
          ...s.memory,
          approved: [
            { id: `manual-${Date.now()}`, text },
            ...s.memory.approved,
          ],
        },
      }),
      "Memory saved. It is sent to the AI only when Use approved memories is enabled.",
    );
    setNewMemory("");
  };
  return (
    <View
      style={{
        padding: 20,
        gap: 12,
        borderRadius: 12,
        backgroundColor: "#fffefa",
        marginVertical: 20,
      }}
    >
      <Text style={{ fontSize: 22, color: "#263d35" }}>
        Scratchpad & personal memory
      </Text>
      <Text style={{ lineHeight: 22, color: "#778179" }}>
        Keep private study notes here. Approved memories help personalize online
        explanations and new Live sessions; they never establish scripture
        truth. This is saved context, not model training.
      </Text>
      <TextInput
        accessibilityLabel="Private scratchpad"
        multiline
        maxLength={6000}
        value={draft}
        onChangeText={setDraft}
        placeholder="Your private study scratchpad…"
        style={[field, { minHeight: 130 }]}
      />
      <Pressable
        disabled={!ready}
        onPress={() =>
          persist(
            (s) => ({ ...s, memory: { ...s.memory, scratchpad: draft } }),
            "Scratchpad saved locally. It is never included in AI memory context.",
          )
        }
        style={button}
      >
        <Text>Save private scratchpad</Text>
      </Pressable>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text>Use approved memories with AI</Text>
        <Switch
          accessibilityLabel="Use approved memories with AI"
          value={state.memory.useWithAI}
          disabled={!ready}
          onValueChange={(value) =>
            persist(
              (s) => ({ ...s, memory: { ...s.memory, useWithAI: value } }),
              value
                ? "Approved memories will be shared with your configured provider on online explanation requests and new Live sessions. Private scratchpad and unapproved suggestions stay local."
                : "Memory sharing disabled for future requests. Stop any active Live session to end its existing context.",
            )
          }
        />
      </View>
      <Text style={{ color: "#778179", fontSize: 12 }}>
        Sharing is off by default. Stored data is local and not encrypted by
        Pramana. Don’t put keys or passwords here. Changing or deleting memory
        cannot recall context already sent to a provider.
      </Text>
      <TextInput
        accessibilityLabel="New approved memory"
        value={newMemory}
        onChangeText={setNewMemory}
        maxLength={300}
        placeholder="For example: I prefer concise explanations in Hindi"
        style={field}
      />
      <Pressable
        disabled={!ready || !newMemory.trim()}
        onPress={add}
        style={button}
      >
        <Text>Add approved memory</Text>
      </Pressable>
      {state.memory.approved.length === 0 && (
        <Text>No approved memories yet.</Text>
      )}
      {state.memory.approved.map((item) => (
        <View
          key={item.id}
          style={{
            gap: 8,
            paddingVertical: 8,
            borderTopWidth: 1,
            borderColor: "#e4e5db",
          }}
        >
          {editing === item.id ? (
            <>
              <TextInput
                accessibilityLabel="Edit approved memory"
                value={editedText}
                onChangeText={setEditedText}
                maxLength={300}
                style={field}
              />
              <Pressable
                style={button}
                onPress={() => {
                  if (!editedText.trim() || containsCredential(editedText)) {
                    setMessage(
                      "Enter a preference without passwords or API keys.",
                    );
                    return;
                  }
                  persist(
                    (s) => ({
                      ...s,
                      memory: {
                        ...s.memory,
                        approved: s.memory.approved.map((m) =>
                          m.id === item.id
                            ? { ...m, text: editedText.trim() }
                            : m,
                        ),
                      },
                    }),
                    "Memory updated.",
                  );
                  setEditing(null);
                }}
              >
                <Text>Save memory edit</Text>
              </Pressable>
              <Pressable onPress={() => setEditing(null)} style={button}>
                <Text>Cancel edit</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text>{item.text}</Text>
              <View style={row}>
                <Pressable
                  accessibilityLabel={`Edit memory ${item.text}`}
                  onPress={() => {
                    setEditing(item.id);
                    setEditedText(item.text);
                  }}
                  style={button}
                >
                  <Text>Edit</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={`Delete memory ${item.text}`}
                  onPress={() =>
                    persist(
                      (s) => ({
                        ...s,
                        memory: {
                          ...s.memory,
                          approved: s.memory.approved.filter(
                            (m) => m.id !== item.id,
                          ),
                        },
                      }),
                      "Memory deleted from this device.",
                    )
                  }
                  style={button}
                >
                  <Text>Delete</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      ))}
      <Text style={{ fontSize: 18 }}>Suggestions from interactions</Text>
      <Text style={{ color: "#778179", fontSize: 12 }}>
        Explicit “remember”, “I prefer”, “I study” and similar statements can
        become suggestions. Nothing is approved automatically, and the full chat
        history is not uploaded to infer your identity.
      </Text>
      <Pressable
        disabled={!ready}
        style={button}
        onPress={() =>
          persist(
            (s) =>
              s.history.reduce((next, entry) => {
                const suggestion = memorySuggestion(entry.query);
                return suggestion ? proposeMemory(next, suggestion) : next;
              }, s),
            "Suggestions checked against recent local text history. Review each item before approving.",
          )
        }
      >
        <Text>Suggest memories from local history</Text>
      </Pressable>
      {state.memory.suggestions.map((item) => (
        <View key={item.id} style={{ gap: 8 }}>
          <Text>{item.text}</Text>
          <View style={row}>
            <Pressable
              accessibilityLabel={`Approve memory ${item.text}`}
              disabled={state.memory.approved.length >= 20}
              onPress={() =>
                persist(
                  (s) => ({
                    ...s,
                    memory: {
                      ...s.memory,
                      approved: [item, ...s.memory.approved],
                      suggestions: s.memory.suggestions.filter(
                        (m) => m.id !== item.id,
                      ),
                    },
                  }),
                  "Suggestion approved. You can edit or delete it above.",
                )
              }
              style={button}
            >
              <Text>Approve</Text>
            </Pressable>
            <Pressable
              accessibilityLabel={`Dismiss memory ${item.text}`}
              onPress={() =>
                persist(
                  (s) => ({
                    ...s,
                    memory: {
                      ...s.memory,
                      suggestions: s.memory.suggestions.filter(
                        (m) => m.id !== item.id,
                      ),
                    },
                  }),
                  "Suggestion dismissed.",
                )
              }
              style={button}
            >
              <Text>Dismiss</Text>
            </Pressable>
          </View>
        </View>
      ))}
      <Pressable
        disabled={!ready}
        onPress={() => setConfirm(true)}
        style={button}
      >
        <Text>Clear scratchpad & all memories</Text>
      </Pressable>
      {confirm && (
        <>
          <Text>
            Delete the private scratchpad, approved memories and suggestions?
          </Text>
          <Pressable
            onPress={() => {
              persist(
                (s) => ({
                  ...s,
                  memory: {
                    scratchpad: "",
                    useWithAI: false,
                    approved: [],
                    suggestions: [],
                  },
                }),
                "Scratchpad and memory cleared. Sharing disabled for future requests.",
              );
              setDraft("");
              setConfirm(false);
            }}
            style={button}
          >
            <Text>Confirm memory deletion</Text>
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
const row = {
  flexDirection: "row" as const,
  flexWrap: "wrap" as const,
  gap: 10,
};
const field = {
  minHeight: 48,
  padding: 12,
  borderWidth: 1,
  borderColor: "#bdc6bc",
  borderRadius: 8,
  color: "#263d35",
};
const button = {
  minHeight: 44,
  padding: 12,
  backgroundColor: "#e4e5db",
  borderRadius: 8,
};
