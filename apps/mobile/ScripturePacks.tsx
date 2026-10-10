import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  deviceCorpusStatus,
  installScripturePack,
  removeScripturePacks,
} from "./device-corpus";

export default function ScripturePacks() {
  const [status, setStatus] =
    useState<Awaited<ReturnType<typeof deviceCorpusStatus>>>();
  const [url, setUrl] = useState(""),
    [hash, setHash] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  async function refresh() {
    setStatus(await deviceCorpusStatus());
  }
  useEffect(() => {
    void refresh().catch(() =>
      setNotice("Installed scripture packs could not be loaded."),
    );
  }, []);
  async function action(remove = false) {
    setBusy(true);
    setNotice("");
    try {
      if (remove) {
        await removeScripturePacks();
        setNotice(
          "Scripture packs removed from this phone. Saved bookmarks remain.",
        );
      } else {
        setNotice(await installScripturePack(url, hash));
        setUrl("");
        setHash("");
      }
      await refresh();
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "The scripture pack operation failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <View
      style={{
        backgroundColor: "#fffefa",
        padding: 22,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "#e4e5db",
        marginBottom: 20,
        gap: 12,
      }}
    >
      <Text style={{ fontSize: 20, color: "#263d35" }}>
        Scripture on this phone
      </Text>
      <Text style={{ color: "#263d35", lineHeight: 22 }}>
        {status
          ? `${status.approved_passages} reviewed passages · ${status.installed_collections} collections`
          : "Loading collection status…"}
      </Text>
      <Text style={{ color: "#778179", lineHeight: 21 }}>
        No scripture texts are included yet. Install a reviewed Gita Press
        source pack when available. Local search works offline; online AI
        replies and web search use your provider.
      </Text>
      {status?.packs.map((pack) => (
        <Text key={pack.sha256} style={{ color: "#263d35" }}>
          {pack.work_id} · {pack.edition_id} · {pack.passage_count} passages ·{" "}
          {pack.completeness}
        </Text>
      ))}
      {status?.rejected.map((note) => (
        <Text key={note} style={{ color: "#914626" }}>
          {note}
        </Text>
      ))}
      <Text style={{ color: "#263d35" }}>Reviewed pack URL</Text>
      <TextInput
        accessibilityLabel="Reviewed scripture pack URL"
        value={url}
        onChangeText={setUrl}
        editable={!busy}
        placeholder="https://…/reviewed-pack.json"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        style={field}
      />
      <Text style={{ color: "#263d35" }}>Publisher’s SHA-256 checksum</Text>
      <TextInput
        accessibilityLabel="Scripture pack SHA-256 checksum"
        value={hash}
        onChangeText={setHash}
        editable={!busy}
        placeholder="64 hexadecimal characters"
        maxLength={64}
        autoCapitalize="none"
        autoCorrect={false}
        style={field}
      />
      <Text style={{ color: "#778179", lineHeight: 21 }}>
        Use a trusted release with edition, page/verse mapping and review
        records. A checksum verifies the download; it does not establish the
        truth of its editorial approval. PDFs and draft OCR are not reviewed
        packs.
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={busy || !url.trim() || hash.trim().length !== 64}
        onPress={() => void action()}
        style={{
          padding: 14,
          borderRadius: 8,
          backgroundColor: "#315444",
          opacity: busy || !url.trim() || hash.trim().length !== 64 ? 0.5 : 1,
        }}
      >
        <Text style={{ color: "white" }}>Download & install pack</Text>
      </Pressable>
      {(!status || status.packs.length > 0) && (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void action(true)}
          style={{ padding: 14 }}
        >
          <Text style={{ color: "#914626" }}>
            Remove installed scripture packs
          </Text>
        </Pressable>
      )}
      {busy && (
        <ActivityIndicator
          accessibilityLabel="Updating scripture collection"
          color="#315444"
        />
      )}
      {!!notice && (
        <Text
          accessibilityLiveRegion="polite"
          style={{ color: "#263d35", lineHeight: 22 }}
        >
          {notice}
        </Text>
      )}
    </View>
  );
}
const field = {
  padding: 14,
  borderWidth: 1,
  borderColor: "#dce2d5",
  borderRadius: 8,
  color: "#263d35",
};
