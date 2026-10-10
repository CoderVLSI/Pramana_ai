import { hapticsEnabled, setHapticsEnabled, selectionHaptic } from "./haptics";
import React, { useEffect, useState } from "react";
import ScripturePacks from "./ScripturePacks";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Switch,
  ActivityIndicator,
  Platform,
  Linking,
} from "react-native";
import {
  DEVICE_CONNECTIONS,
  loadCatalog,
  loadSettings,
  saveSettings,
  testSettings,
  disconnectSettings,
  resetSettingsSession,
  type Provider,
  type Catalog,
  type PublicProfile,
} from "./settings-client";
export default function SettingsScreen() {
  const [haptics, setHaptics] = useState(true);
  useEffect(() => {
    let active = true;
    void hapticsEnabled().then((value) => {
      if (active) setHaptics(value);
    });
    return () => {
      active = false;
    };
  }, []);
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [profile, setProfile] = useState<PublicProfile | null>(null),
    [provider, setProvider] = useState<Provider>("openai"),
    [model, setModel] = useState(""),
    [fallbacks, setFallbacks] = useState<string[]>([]),
    [cross, setCross] = useState(false),
    [key, setKey] = useState(""),
    [busy, setBusy] = useState(true),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  function apply(p: PublicProfile, selected = p.active_provider) {
    setProfile(p);
    setProvider(selected);
    setModel(p[selected].model);
    setFallbacks(p[selected].fallback_models);
    setCross(p.cross_provider_fallback);
    setKey("");
  }
  async function load() {
    setBusy(true);
    setError("");
    try {
      const [c, p] = await Promise.all([loadCatalog(), loadSettings()]);
      setCatalog(c);
      apply(p);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  function choose(p: Provider) {
    if (!profile) return;
    setProvider(p);
    setModel(profile[p].model);
    setFallbacks(profile[p].fallback_models);
    setKey("");
    setMessage("");
    setError("");
  }
  async function save(remove_key = false) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const p = await saveSettings({
        provider,
        model,
        fallback_models: fallbacks.filter((m) => m !== model),
        cross_provider_fallback: cross,
        ...(remove_key
          ? { remove_key: true }
          : key.trim()
            ? { api_key: key.trim() }
            : {}),
      });
      apply(p, provider);
      setMessage(
        remove_key
          ? "Provider key removed."
          : "Settings saved. Your API key is cleared from this field.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function test() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      setMessage((await testSettings(provider)).message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function disconnect() {
    setBusy(true);
    try {
      await disconnectSettings();
      setProfile(null);
      setKey("");
      await load();
      setMessage("All keys and connection settings were deleted.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const models = catalog?.models[provider] || [];
  return (
    <View>
      <Text style={s.kicker}>YOUR CONNECTIONS</Text>
      <Text style={s.title}>Voice & API settings</Text>
      <Text style={s.intro}>
        Choose your provider, bring your own key, and set a backup plan.
      </Text>
      {Platform.OS !== "web" && (
        <View style={s.notice}>
          <Text style={s.body}>Haptic feedback</Text>
          <Text style={s.small}>
            Subtle feedback when switching tabs or saving passages.
          </Text>
          <Switch
            accessibilityLabel="Haptic feedback"
            value={haptics}
            onValueChange={(value) => {
              setHaptics(value);
              void setHapticsEnabled(value)
                .then(() => {
                  if (value) void selectionHaptic();
                })
                .catch(() => setError("Could not save the haptic preference."));
            }}
          />
        </View>
      )}
      {DEVICE_CONNECTIONS && <ScripturePacks />}
      <View style={s.notice}>
        <Text style={s.body}>
          {DEVICE_CONNECTIONS
            ? "Keys are saved securely on this phone and sent directly to your selected AI provider over encrypted connections. No Pramana backend is required."
            : "Keys are encrypted on your backend. This browser keeps only a private settings-session token. Use your own trusted backend with HTTPS outside local development."}
        </Text>
        <Text style={s.small}>
          {DEVICE_CONNECTIONS
            ? "Android protects your keys using encrypted storage backed by Android Keystore. Existing backend keys must be entered again on this phone."
            : "Backend settings use a private session token saved on this device or browser."}
        </Text>
      </View>
      {busy && !profile ? (
        <ActivityIndicator
          accessibilityLabel="Loading settings"
          color="#315444"
        />
      ) : null}
      {profile && catalog ? (
        <>
          <View style={s.section}>
            <Text style={s.heading}>Provider</Text>
            <View style={s.row}>
              {(["openai", "gemini"] as const).map((p) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: p === provider }}
                  accessibilityLabel={
                    p === "openai" ? "OpenAI provider" : "Gemini provider"
                  }
                  disabled={busy}
                  onPress={() => choose(p)}
                  style={[s.chip, p === provider && s.selected]}
                  key={p}
                >
                  <Text style={[s.body, p === provider && { color: "white" }]}>
                    {p === "openai" ? "OpenAI" : "Google Gemini"}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={s.small}>
              Active provider:{" "}
              {profile.active_provider === "openai"
                ? "OpenAI"
                : "Google Gemini"}
              . Save to change it.
            </Text>
            <Text style={s.heading}>API key</Text>
            <Text style={s.small}>
              {profile[provider].configured
                ? "A key is saved. Enter a new key to replace it."
                : "No key saved for this provider."}
            </Text>
            <TextInput
              accessibilityLabel={
                provider === "openai" ? "OpenAI API key" : "Gemini API key"
              }
              value={key}
              onChangeText={setKey}
              editable={!busy}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="none"
              autoComplete="off"
              placeholder="Paste your provider API key"
              placeholderTextColor="#838b80"
              style={s.field}
            />
            <Text style={s.small}>
              Keys are cleared from this field after saving. Provider usage is
              billed to your account.
            </Text>
            <Text style={s.heading}>Main voice model</Text>
            {models.map((m) => {
              const expired =
                !!m.expires_on &&
                Date.now() >= Date.parse(m.expires_on + "T00:00:00Z");
              return (
                <Pressable
                  key={m.id}
                  disabled={busy || expired}
                  accessibilityRole="radio"
                  accessibilityState={{
                    selected: model === m.id,
                    disabled: expired,
                  }}
                  onPress={() => {
                    setModel(m.id);
                    setFallbacks((f) => f.filter((id) => id !== m.id));
                  }}
                  style={[
                    s.option,
                    model === m.id && s.optionSelected,
                    expired && { opacity: 0.4 },
                  ]}
                >
                  <Text style={s.body}>
                    {model === m.id ? "◉" : "○"} {m.label}
                    {m.recommended ? " · recommended" : ""}
                  </Text>
                  {m.expires_on && (
                    <Text style={s.small}>
                      Legacy preview · retires {m.expires_on}
                    </Text>
                  )}
                </Pressable>
              );
            })}
            <View style={s.row}>
              <Text style={s.heading}>Automatic fallback</Text>
              <Switch
                accessibilityLabel="Automatic model fallback"
                disabled={busy}
                value={fallbacks.length > 0}
                onValueChange={(enabled) =>
                  setFallbacks(
                    enabled
                      ? models
                          .filter(
                            (m) =>
                              m.id !== model &&
                              (!m.expires_on ||
                                Date.now() <
                                  Date.parse(m.expires_on + "T00:00:00Z")),
                          )
                          .map((m) => m.id)
                      : [],
                  )
                }
                trackColor={{ true: "#315444" }}
              />
            </View>
            <Text style={s.small}>
              If a model is busy, rate-limited, or temporarily unavailable, try
              these models in order. Keys, access errors, and verification
              failures do not trigger retries.
            </Text>
            {fallbacks.map((id, index) => {
              const m = models.find((m) => m.id === id);
              return (
                <View style={s.fallback} key={id}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.body}>
                      {index + 1}. {m?.label || id}
                    </Text>
                    {m?.expires_on && (
                      <Text style={s.small}>
                        Automatically skipped after retirement.
                      </Text>
                    )}
                  </View>
                  {index > 0 && (
                    <Pressable
                      disabled={busy}
                      accessibilityLabel={"Move " + m?.label + " earlier"}
                      style={s.smallButton}
                      onPress={() =>
                        setFallbacks((f) => {
                          const copy = [...f];
                          [copy[index - 1], copy[index]] = [
                            copy[index],
                            copy[index - 1],
                          ];
                          return copy;
                        })
                      }
                    >
                      <Text style={s.body}>↑</Text>
                    </Pressable>
                  )}
                  <Pressable
                    disabled={busy}
                    accessibilityLabel={"Remove fallback " + m?.label}
                    onPress={() =>
                      setFallbacks((f) => f.filter((x) => x !== id))
                    }
                    style={s.smallButton}
                  >
                    <Text style={s.body}>×</Text>
                  </Pressable>
                </View>
              );
            })}
            <View style={s.row}>
              <Text style={s.heading}>Allow the other provider as backup</Text>
              <Switch
                accessibilityLabel="Allow cross-provider fallback"
                disabled={busy}
                value={cross}
                onValueChange={setCross}
                trackColor={{ true: "#315444" }}
              />
            </View>
            <Text style={s.small}>
              {DEVICE_CONNECTIONS
                ? "Requires a saved key for both providers. Live startup can try the next configured model or provider after temporary failures, with at most two attempts. Started conversations are not replayed automatically. Text and web search use the selected provider; charges may differ."
                : "Requires saved keys for both providers. When enabled, a verified speech script may be sent to the other provider after temporary failure. At most four speech attempts are made; text remains available."}
            </Text>
            <View
              style={[s.row, { justifyContent: "flex-start", marginTop: 22 }]}
            >
              <Pressable
                disabled={
                  busy || (key.trim().length > 0 && key.trim().length < 16)
                }
                accessibilityLabel="Save provider settings"
                onPress={() => save()}
                style={[s.button, busy && { opacity: 0.5 }]}
              >
                <Text style={s.buttonText}>
                  {busy ? "Working…" : "Save settings"}
                </Text>
              </Pressable>
              <Pressable
                disabled={busy || !profile[provider].configured || !!key}
                accessibilityLabel="Test provider connection"
                onPress={test}
                style={s.outline}
              >
                <Text style={s.body}>Test connection</Text>
              </Pressable>
              {profile[provider].configured && (
                <Pressable
                  disabled={busy}
                  onPress={() => save(true)}
                  style={s.outline}
                >
                  <Text style={s.body}>Remove key</Text>
                </Pressable>
              )}
            </View>
            <Text style={s.small}>
              Connection tests check key and model metadata access; they do not
              start or bill a voice conversation.
            </Text>
          </View>
          <View style={s.notice}>
            <Text style={s.heading}>Source verification stays on</Text>
            <Text style={s.body}>{catalog.reason}</Text>
            <Text style={s.small}>
              {DEVICE_CONNECTIONS
                ? "Regular replies use this phone’s speech voice. Live replies stream directly from the provider and are labeled generated, not verified scripture. On Android, the device speech service transcribes your microphone before sending text turns."
                : "Scripted provider speech is checked against its transcript before release. Live conversation streams generated, unverified replies and shows retrieved source evidence separately."}
            </Text>
            <Text style={s.small}>
              Model documentation checked: {catalog.researched_on}
            </Text>
            <View style={s.row}>
              <Pressable
                onPress={() => Linking.openURL(catalog.models.openai[0].source)}
              >
                <Text style={s.link}>OpenAI documentation ↗</Text>
              </Pressable>
              <Pressable
                onPress={() => Linking.openURL(catalog.models.gemini[0].source)}
              >
                <Text style={s.link}>Gemini documentation ↗</Text>
              </Pressable>
            </View>
          </View>
          <Pressable disabled={busy} onPress={disconnect} style={s.outline}>
            <Text style={s.body}>Delete all stored provider settings</Text>
          </Pressable>
        </>
      ) : null}
      {!!message && (
        <View style={s.notice} accessibilityRole="alert">
          <Text style={s.body}>{message}</Text>
        </View>
      )}
      {!!error && (
        <View
          style={[s.notice, { backgroundColor: "#f7e9de" }]}
          accessibilityRole="alert"
        >
          <Text style={s.body}>{error}</Text>
          <Pressable disabled={busy} onPress={load}>
            <Text style={s.link}>Retry</Text>
          </Pressable>
          {!profile && DEVICE_CONNECTIONS && (
            <Pressable disabled={busy} onPress={disconnect}>
              <Text style={s.link}>
                Delete device connections and start again
              </Text>
            </Pressable>
          )}
          {!profile && !DEVICE_CONNECTIONS && (
            <Pressable
              disabled={busy}
              onPress={async () => {
                await resetSettingsSession();
                await load();
              }}
            >
              <Text style={s.link}>Reconnect settings session</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
const s = StyleSheet.create({
  kicker: {
    fontSize: 10,
    letterSpacing: 2,
    color: "#b27e42",
    marginBottom: 18,
  },
  title: {
    fontFamily: Platform.OS === "web" ? "Georgia" : "serif",
    fontSize: 32,
    color: "#263d35",
  },
  intro: { fontSize: 14, lineHeight: 24, color: "#778179", marginVertical: 18 },
  notice: {
    backgroundColor: "#eeefe6",
    borderRadius: 10,
    padding: 20,
    gap: 12,
    marginBottom: 20,
  },
  section: {
    backgroundColor: "#fffefa",
    borderWidth: 1,
    borderColor: "#e4e5db",
    borderRadius: 12,
    padding: 22,
    marginBottom: 20,
  },
  heading: {
    fontSize: 16,
    color: "#263d35",
    fontWeight: "500",
    marginTop: 18,
    marginBottom: 12,
  },
  body: { fontSize: 14, lineHeight: 23, color: "#263d35" },
  small: { fontSize: 12, lineHeight: 20, color: "#778179" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dce2d5",
  },
  selected: { backgroundColor: "#315444" },
  field: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#dce2d5",
    borderRadius: 8,
    fontSize: 15,
    marginVertical: 12,
    color: "#263d35",
  },
  option: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#e4e5db",
    borderRadius: 8,
    marginBottom: 8,
  },
  optionSelected: { backgroundColor: "#e4ebdd", borderColor: "#315444" },
  fallback: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#e4e5db",
  },
  smallButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  button: { padding: 14, backgroundColor: "#315444", borderRadius: 8 },
  buttonText: { color: "white", fontSize: 14 },
  outline: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#dce2d5",
    borderRadius: 8,
    marginVertical: 8,
  },
  link: { color: "#315444", fontSize: 13, textDecorationLine: "underline" },
});
