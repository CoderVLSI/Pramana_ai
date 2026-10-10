import React, { useState } from "react";
import { ActivityIndicator, Image, Linking, Switch } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Text, View, TextInput, Pressable, ReadingText } from "./ui";
import {
  factCheckClaim,
  readClaimScreenshot,
  type FactCheckResult,
} from "./settings-client";
import type { ScreenshotInput } from "../../packages/provider-client/screenshot";
import type { Passage } from "../../packages/citation-schema";
export default function FactCheckScreen({
  workIds,
  onOpen,
}: {
  workIds: string[];
  onOpen: (p: Passage) => void;
}) {
  const [image, setImage] = useState<
    (ScreenshotInput & { uri: string }) | null
  >(null);
  const [quote, setQuote] = useState(""),
    [reference, setReference] = useState("");
  const [web, setWeb] = useState(true),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [result, setResult] = useState<FactCheckResult | null>(null);
  async function pick() {
    try {
      const selected = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        base64: true,
        exif: false,
        quality: 0.8,
      });
      if (selected.canceled) return;
      const asset = selected.assets[0];
      if (!asset.base64 || asset.base64.length > 5600000)
        throw Error("Choose a screenshot under 4 MB.");
      const mime = asset.base64.startsWith("iVBORw0KGgo")
        ? "image/png"
        : asset.base64.startsWith("/9j/")
          ? "image/jpeg"
          : null;
      if (!mime) throw Error("Choose a JPEG or PNG screenshot.");
      setImage({ base64: asset.base64, mime, uri: asset.uri });
      setResult(null);
      setMessage(
        "Screenshot selected locally. Tap Read screenshot to send it to your configured AI provider.",
      );
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Could not select the screenshot.",
      );
    }
  }
  async function extract() {
    if (!image || busy) return;
    setBusy(true);
    setMessage("");
    setResult(null);
    try {
      setQuote(
        await readClaimScreenshot({ base64: image.base64, mime: image.mime }),
      );
      setMessage(
        "Review the transcription. Put only the quotation in its field and move the claimed reference to the reference field. Image transcription may contain errors.",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not read the image.");
    } finally {
      setBusy(false);
    }
  }
  async function check() {
    if (busy || !quote.trim()) return;
    setBusy(true);
    setMessage("");
    setResult(null);
    try {
      setResult(
        await factCheckClaim({
          query: quote.trim(),
          reference: reference.trim(),
          work_ids: workIds,
          enable_web: web,
        }),
      );
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "The fact check could not complete.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <View
      style={{
        padding: 20,
        borderRadius: 12,
        gap: 12,
        backgroundColor: "#fffefa",
        marginVertical: 16,
      }}
    >
      <Text style={{ fontSize: 22, color: "#263d35" }}>
        Check a quote or screenshot
      </Text>
      <Text style={{ lineHeight: 22, color: "#778179" }}>
        Screenshots can omit context or misattribute verses. Compare wording
        with reviewed editions; web sources remain unverified. Nothing is marked
        authentic just because it appears online.
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => void pick()}
        style={button}
      >
        <Text>Choose screenshot</Text>
      </Pressable>
      {image && (
        <>
          <Image
            accessibilityLabel="Selected scripture screenshot"
            source={{ uri: image.uri }}
            style={{ width: "100%", height: 220, resizeMode: "contain" }}
          />
          <Text style={{ color: "#778179" }}>
            Image reading sends this screenshot to your selected Gemini or
            OpenAI provider and uses its quota. Remove personal information
            first. Pramana does not save it to history.
          </Text>
          <Pressable
            disabled={busy}
            accessibilityRole="button"
            onPress={() => void extract()}
            style={button}
          >
            <Text>Read screenshot with my AI provider</Text>
          </Pressable>
          <Pressable
            disabled={busy}
            onPress={() => {
              setImage(null);
              setQuote("");
              setReference("");
              setResult(null);
              setMessage("");
            }}
            style={button}
          >
            <Text>Remove screenshot & extracted text</Text>
          </Pressable>
        </>
      )}
      <TextInput
        accessibilityLabel="Alleged scripture quotation"
        value={quote}
        onChangeText={(value) => {
          setQuote(value);
          setResult(null);
        }}
        maxLength={2000}
        placeholder="Paste the quotation or review extracted text"
        multiline
        editable={!busy}
        style={[field, { minHeight: 110 }]}
      />
      <TextInput
        accessibilityLabel="Claimed scripture reference"
        value={reference}
        onChangeText={(value) => {
          setReference(value);
          setResult(null);
        }}
        maxLength={200}
        placeholder="Claimed work/chapter/verse (optional)"
        editable={!busy}
        style={field}
      />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text>Search web if wording is not matched locally</Text>
        <Switch
          accessibilityLabel="Fact-check web fallback"
          value={web}
          disabled={busy}
          onValueChange={(value) => {
            setWeb(value);
            setResult(null);
          }}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        disabled={busy || !quote.trim()}
        onPress={() => void check()}
        style={button}
      >
        <Text>Check sources</Text>
      </Pressable>
      {busy && (
        <ActivityIndicator accessibilityLabel="Checking quote evidence" />
      )}
      {!!message && <Text accessibilityLiveRegion="polite">{message}</Text>}
      {result && (
        <View style={{ gap: 12 }}>
          <Text accessibilityLiveRegion="polite" style={{ fontSize: 18 }}>
            {result.verdict === "local_text_match"
              ? "Wording found in a reviewed passage"
              : result.verdict === "related_passages_only"
                ? "Related passages found · quote not verified"
                : "Not verified"}
          </Text>
          <ReadingText>{result.note}</ReadingText>
          {result.evidence.map((p) => (
            <Pressable
              key={p.id}
              accessibilityRole="button"
              onPress={() => onOpen(p)}
              style={button}
            >
              <Text>{p.reference}</Text>
              <Text style={{ fontSize: 12 }}>
                Edition: {p.edition_id} · inspect text and context
              </Text>
            </Pressable>
          ))}
          {result.web && (
            <View style={{ gap: 8 }}>
              <Text>External web leads · unverified</Text>
              <ReadingText>
                {result.web.text ||
                  result.web.error ||
                  "No external evidence returned."}
              </ReadingText>
              {result.web.evidence?.map((source) => (
                <Pressable
                  key={source.url}
                  accessibilityRole="link"
                  onPress={() => {
                    try {
                      const u = new URL(source.url);
                      if (u.protocol === "https:" && !u.username && !u.password)
                        void Linking.openURL(u.href).catch(() =>
                          setMessage("Could not open source link."),
                        );
                    } catch {
                      setMessage("Invalid source link.");
                    }
                  }}
                  style={button}
                >
                  <Text>{source.title}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
const button = {
  minHeight: 44,
  padding: 12,
  backgroundColor: "#e4e5db",
  borderRadius: 8,
};
const field = {
  minHeight: 48,
  padding: 12,
  borderWidth: 1,
  borderColor: "#bdc6bc",
  borderRadius: 8,
  color: "#263d35",
};
