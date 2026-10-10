import { Pressable, Text, TextInput, View } from "./ui";
import React, { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import {
  deviceCorpusStatus,
  installScripturePack,
  removeScripturePacks,
  removeScripturePack,
  type PackProgress,
} from "./device-corpus";

export default function ScripturePacks() {
  const [status, setStatus] =
    useState<Awaited<ReturnType<typeof deviceCorpusStatus>>>();
  const [progress, setProgress] = useState<PackProgress | null>(null);
  const [removeConfirm, setRemoveConfirm] = useState<string | null>(null);
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
  async function action(remove: boolean | string = false) {
    setBusy(true);
    setNotice("");
    try {
      if (remove) {
        if (typeof remove === "string") await removeScripturePack(remove);
        else await removeScripturePacks();
        setRemoveConfirm(null);
        setNotice(
          "Scripture packs removed from this phone. Saved bookmarks remain.",
        );
      } else {
        setNotice(await installScripturePack(url, hash, setProgress));
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
      setProgress(null);
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
      <Text style={{ color: "#778179" }}>
        Storage:{" "}
        {(
          (status?.packs.reduce((n, p) => n + p.size_bytes, 0) || 0) /
          1024 /
          1024
        ).toFixed(2)}{" "}
        MB · {status?.packs.length || 0}/30 packs
      </Text>
      {status?.packs.map((pack) => (
        <View
          key={pack.sha256}
          style={{
            gap: 8,
            paddingVertical: 10,
            borderTopWidth: 1,
            borderColor: "#e4e5db",
          }}
        >
          <Text>
            {pack.work_id} · {pack.edition_id} · {pack.passage_count} passages ·{" "}
            {pack.completeness}
          </Text>
          <Text style={{ color: "#778179", fontSize: 12 }}>
            Release: {pack.release} ·{" "}
            {(pack.size_bytes / 1024 / 1024).toFixed(2)} MB
          </Text>
          <Text style={{ color: "#778179", fontSize: 12 }}>
            Update status: not checked. Enter a trusted new release URL and
            checksum to replace this edition.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => setRemoveConfirm(pack.sha256)}
            style={{ minHeight: 44, padding: 12 }}
          >
            <Text>Remove this pack</Text>
          </Pressable>
        </View>
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
          onPress={() => setRemoveConfirm("all")}
          style={{ padding: 14 }}
        >
          <Text style={{ color: "#914626" }}>
            Remove installed scripture packs
          </Text>
        </Pressable>
      )}
      {removeConfirm && (
        <View style={{ gap: 8 }}>
          <Text>
            Remove{" "}
            {removeConfirm === "all"
              ? "all scripture packs"
              : "this scripture pack"}{" "}
            from this phone? Bookmarks and notes remain.
          </Text>
          <Pressable
            disabled={busy}
            onPress={() =>
              void action(removeConfirm === "all" ? true : removeConfirm)
            }
            style={{ padding: 14 }}
          >
            <Text>Confirm removal</Text>
          </Pressable>
          <Pressable
            disabled={busy}
            onPress={() => setRemoveConfirm(null)}
            style={{ padding: 14 }}
          >
            <Text>Cancel</Text>
          </Pressable>
        </View>
      )}
      {progress && (
        <Text accessibilityLiveRegion="polite">
          {progress.phase === "download"
            ? `Downloading · ${(progress.loaded / 1024).toFixed(0)} KB${progress.total > 0 ? ` / ${(progress.total / 1024).toFixed(0)} KB · ${Math.min(100, Math.round((progress.loaded / progress.total) * 100))}%` : ""}`
            : progress.phase === "validate"
              ? "Checking checksum and editorial records…"
              : "Installing reviewed passages…"}
        </Text>
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
