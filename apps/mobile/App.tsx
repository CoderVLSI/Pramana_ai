import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Image,
  TextInput,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
  Platform,
} from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Answer, Passage } from "../../packages/citation-schema";
const API = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";
const C = {
  ink: "#263d35",
  muted: "#778179",
  green: "#315444",
  paper: "#f6f4ee",
  line: "#e4e5db",
  accent: "#b27e42",
};
async function request(path: string, body?: unknown) {
  const r = await fetch(API + path, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json();
  if (!r.ok) throw Error(data.error || data.message || "Request failed");
  return data;
}
function Icon({
  name,
  size = 22,
  color = C.ink,
}: {
  name: React.ComponentProps<typeof Ionicons>["name"];
  size?: number;
  color?: string;
}) {
  return <Ionicons name={name} size={size} color={color} />;
}
function PassageCard({
  p,
  saved,
  onOpen,
  onToggle,
}: {
  p: Passage;
  saved: string[];
  onOpen: (p: Passage) => void;
  onToggle: (p: Passage) => void;
}) {
  return (
    <Pressable onPress={() => onOpen(p)} style={s.passage}>
      <View style={s.row}>
        <Text style={s.reference}>{p.reference}</Text>
        <Pressable
          accessibilityLabel={
            saved.includes(p.id) ? "Remove bookmark" : "Save passage"
          }
          onPress={() => onToggle(p)}
        >
          <Icon
            name={saved.includes(p.id) ? "bookmark" : "bookmark-outline"}
            size={19}
          />
        </Pressable>
      </View>
      <Text style={s.sanskrit}>{p.original}</Text>
      <Text style={s.body}>{p.translation}</Text>
      <View style={[s.row, { marginTop: 18 }]}>
        <Text style={s.small}>Development rendering · Sanskrit fixture</Text>
        <Icon name="arrow-forward" size={18} />
      </View>
    </Pressable>
  );
}
export default function App() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StudyApp />
    </SafeAreaProvider>
  );
}
function StudyApp() {
  const { width } = useWindowDimensions(),
    wide = width > 850;
  const [tab, setTab] = useState("Study"),
    [query, setQuery] = useState(""),
    [answer, setAnswer] = useState<Answer | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [reader, setReader] = useState<(Passage & { context?: Passage[] }) | null>(
      null,
    ),
    [saved, setSaved] = useState<string[]>([]),
    [all, setAll] = useState<Passage[]>([]),
    [works, setWorks] = useState<
      { id: string; title: string; status: string; passage_count: number }[]
    >([]),
    [scope, setScope] = useState("bhagavad-gita"),
    [report, setReport] = useState(false),
    [reason, setReason] = useState(""),
    [notice, setNotice] = useState(""),
    [ready, setReady] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem("pramana-bookmarks")
      .then((v) => {
        if (v) setSaved(JSON.parse(v));
      })
      .catch(() => setError("Saved passages could not be loaded."))
      .finally(() => setReady(true));
    request("/v1/works")
      .then(setWorks)
      .catch(() => {});
    request("/v1/passages")
      .then(setAll)
      .catch(() =>
        setError("Start the API to connect to the development corpus."),
      );
  }, []);
  useEffect(() => {
    if (ready)
      AsyncStorage.setItem("pramana-bookmarks", JSON.stringify(saved)).catch(
        () => setError("Could not save bookmarks on this device."),
      );
  }, [saved, ready]);
  async function ask(text = query) {
    if (!text.trim()) return;
    setBusy(true);
    setError("");
    setAnswer(null);
    setReader(null);
    setTab("Study");
    setQuery(text);
    try {
      setAnswer(
        await request("/v1/questions", { query: text, work_ids: [scope] }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function open(p: Passage) {
    setReport(false);
    setNotice("");
    try {
      setReader(await request("/v1/passages/" + p.id));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function toggle(p: Passage) {
    setSaved((s) =>
      s.includes(p.id) ? s.filter((id) => id !== p.id) : [...s, p.id],
    );
  }
  async function sendReport() {
    try {
      const r = await request("/v1/reports", {
        passage_id: reader!.id,
        reason,
      });
      setNotice("Report received · " + r.case_id.slice(0, 8));
      setReport(false);
      setReason("");
    } catch (e) {
      setNotice((e as Error).message);
    }
  }
  const nav = [
    ["Study", "sparkles-outline"],
    ["Library", "library-outline"],
    ["Saved", "bookmark-outline"],
    ["About", "information-circle-outline"],
  ] as const;

  return (
    <SafeAreaView style={s.root} edges={["top", "right", "bottom", "left"]}>
      <View style={[s.shell, !wide && { flexDirection: "column" }]}>
        {wide && (
          <View style={s.sidebar}>
            <View style={s.brand}>
              <Image
                source={require("./assets/icon.png")}
                style={s.mark}
                accessibilityLabel="Pramana AI sage"
              />
              <View>
                <Text style={s.brandName}>pramāṇa</Text>
                <Text style={s.small}>KNOWLEDGE, GROUNDED.</Text>
              </View>
            </View>
            <Text style={s.navLabel}>YOUR STUDY SPACE</Text>
            {nav.map(([name, icon]) => (
              <Pressable
                key={name}
                onPress={() => {
                  setTab(name);
                  setReader(null);
                }}
                style={[s.nav, tab === name && s.navActive]}
              >
                <Icon name={icon} color={tab === name ? C.green : C.muted} />
                <Text style={[s.navText, tab === name && { color: C.green }]}>
                  {name}
                </Text>
                {name === "Saved" && (
                  <Text style={s.count}>{saved.length}</Text>
                )}
              </Pressable>
            ))}
            <View style={{ flex: 1 }} />
            <View style={s.sidebarNote}>
              <Icon name="leaf-outline" />
              <Text style={[s.body, { fontSize: 13, marginTop: 10 }]}>
                A space for inquiry, grounded in the source.
              </Text>
            </View>
            <Text style={[s.small, { marginTop: 24 }]}>
              DEVELOPMENT BUILD · 0.1
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View style={s.header}>
            <Text style={s.headerTitle}>{wide ? tab : "pramāṇa"}</Text>
            <View style={s.row}>
              <View style={s.dot} />
              <Text style={s.small}>Strict sources</Text>
              <View style={s.avatar}>
                <Text style={{ color: C.green }}>P</Text>
              </View>
            </View>
          </View>
          <ScrollView
            contentContainerStyle={[s.content, !wide && { padding: 20 }]}
            keyboardShouldPersistTaps="handled"
          >
            {reader ? (
              <>
                <Pressable onPress={() => setReader(null)} style={s.row}>
                  <Icon name="arrow-back" size={18} />
                  <Text style={s.body}> Back to study</Text>
                </Pressable>
                <Text style={s.kicker}>EXACT PASSAGE</Text>
                <Text style={s.title}>{reader.reference}</Text>
                <PassageCard
                  saved={saved}
                  onOpen={open}
                  onToggle={toggle}
                  p={reader}
                />
                <View style={s.info}>
                  <Text style={s.sectionTitle}>Source & provenance</Text>
                  <Text style={s.body}>
                    Edition: development Sanskrit fixture{"\n"}Translation:{" "}
                    {reader.translator}
                    {"\n"}Review: pending · Release: {reader.released_in}
                  </Text>
                  <Text style={s.small}>Immutable ID: {reader.id}</Text>
                </View>
                <Text style={s.sectionTitle}>Surrounding passages</Text>
                {reader.context
                  ?.filter((p) => p.id !== reader.id)
                  .map((p) => (
                    <PassageCard
                      saved={saved}
                      onOpen={open}
                      onToggle={toggle}
                      key={p.id}
                      p={p}
                    />
                  ))}
                {reader.context?.length === 1 && (
                  <Text style={s.body}>
                    Adjacent verses are not available in this pilot.
                  </Text>
                )}
                <Pressable
                  onPress={() => setReport(!report)}
                  style={s.secondary}
                >
                  <Icon name="flag-outline" size={17} />
                  <Text style={s.body}>Report a source problem</Text>
                </Pressable>
                {report && (
                  <View style={s.info}>
                    <TextInput
                      value={reason}
                      onChangeText={setReason}
                      placeholder="Describe the citation or wording issue"
                      multiline
                      style={s.reportInput}
                    />
                    <Pressable
                      disabled={reason.trim().length < 5}
                      onPress={sendReport}
                      style={s.button}
                    >
                      <Text style={s.buttonText}>Submit report</Text>
                    </Pressable>
                  </View>
                )}
                {!!notice && <Text style={s.body}>{notice}</Text>}
              </>
            ) : tab === "Study" ? (
              <>
                <View style={s.row}>
                  <Text style={s.kicker}>THE SCRIPTURE STUDY COMPANION</Text>
                  <Text style={s.small}>✦ Begin with a question</Text>
                </View>
                <Text style={[s.title, !wide && { fontSize: 36 }]}>
                  Let curiosity lead.{"\n"}Let the source speak.
                </Text>
                <Text style={s.intro}>
                  Explore scripture with care. Ask a question, find the passage,
                  {"\n"}and make room for a deeper understanding.
                </Text>
                <View style={s.composer}>
                  <TextInput
                    accessibilityLabel="Ask a scripture question"
                    value={query}
                    onChangeText={setQuery}
                    onSubmitEditing={() => ask()}
                    placeholder="What does the Gita say about attachment?"
                    placeholderTextColor="#959c92"
                    multiline
                    style={s.input}
                  />
                  <View
                    style={[
                      s.row,
                      {
                        borderTopWidth: 1,
                        borderColor: C.line,
                        paddingTop: 16,
                      },
                    ]}
                  >
                    <Pressable
                      style={s.row}
                      onPress={() =>
                        setNotice(
                          "Voice is gated until the corpus is reviewed and a provider is configured.",
                        )
                      }
                      accessibilityLabel="Voice availability"
                    >
                      <Icon name="mic-outline" size={20} />
                      <Text style={[s.small, { marginLeft: 8 }]}>
                        Voice · coming after review
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel="Ask question"
                      disabled={busy || !query.trim()}
                      onPress={() => ask()}
                      style={[
                        s.button,
                        (!query.trim() || busy) && { opacity: 0.5 },
                      ]}
                    >
                      {busy ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <>
                          <Text style={s.buttonText}>Find sources</Text>
                          <Icon name="arrow-forward" size={16} color="white" />
                        </>
                      )}
                    </Pressable>
                  </View>
                </View>
                <View
                  style={[
                    s.row,
                    {
                      justifyContent: "flex-start",
                      gap: 8,
                      flexWrap: "wrap",
                      marginTop: 16,
                    },
                  ]}
                >
                  <Icon
                    name="shield-checkmark-outline"
                    size={16}
                    color={C.green}
                  />
                  <Text style={s.small}>
                    Sources first. No unsupported claims.
                  </Text>
                  <Text style={s.small}>·</Text>
                  <Pressable
                    onPress={() =>
                      setScope(
                        scope === "bhagavad-gita"
                          ? "mahabharata"
                          : "bhagavad-gita",
                      )
                    }
                  >
                    <Text style={[s.small, { color: C.green }]}>
                      {scope === "bhagavad-gita"
                        ? "Bhagavad Gita"
                        : "Mahabharata"}{" "}
                      ▾
                    </Text>
                  </Pressable>
                </View>
                {!!notice && (
                  <Text style={[s.small, { marginTop: 12 }]}>{notice}</Text>
                )}
                {busy && (
                  <Text style={[s.body, { marginTop: 24 }]}>
                    Finding passages and checking citations…
                  </Text>
                )}
                {answer ? (
                  <View style={{ marginTop: 30 }}>
                    <View style={s.row}>
                      <Text style={s.sectionTitle}>Your source trail</Text>
                      <Text style={s.badge}>
                        {answer.support_state === "DIRECT"
                          ? "PASSAGE MATCH"
                          : "NOT VERIFIED"}
                      </Text>
                    </View>
                    <Text style={s.body}>{answer.answer}</Text>
                    {answer.citations.map((p) => (
                      <PassageCard
                        saved={saved}
                        onOpen={open}
                        onToggle={toggle}
                        key={p.id}
                        p={p}
                      />
                    ))}
                    <View style={s.info}>
                      {answer.caveats.map((c) => (
                        <Text key={c} style={[s.small, { marginBottom: 6 }]}>
                          {c}
                        </Text>
                      ))}
                    </View>
                    <Pressable
                      onPress={() => {
                        setAnswer(null);
                        setQuery("");
                      }}
                      style={s.secondary}
                    >
                      <Text style={s.body}>Start a new question</Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    <View style={s.sectionRow}>
                      <Text style={s.sectionTitle}>A few places to begin</Text>
                      <Text style={s.small}>FOLLOW YOUR CURIOSITY</Text>
                    </View>
                    <View
                      style={[s.cards, !wide && { flexDirection: "column" }]}
                    >
                      {[
                        [
                          "The art of action",
                          "What does the Gita say about action?",
                          "leaf-outline",
                        ],
                        [
                          "A quieter mind",
                          "How can I focus a restless mind?",
                          "water-outline",
                        ],
                        [
                          "The path of devotion",
                          "What does the Gita say about devotion?",
                          "flower-outline",
                        ],
                      ].map(([title, q, icon]) => (
                        <Pressable
                          key={title}
                          onPress={() => ask(q)}
                          style={s.topic}
                        >
                          <Icon name={icon as any} size={25} color={C.accent} />
                          <Text style={s.topicTitle}>{title}</Text>
                          <Text style={s.small}>{q}</Text>
                          <Icon name="arrow-forward" size={17} />
                        </Pressable>
                      ))}
                    </View>
                    <View style={s.sectionRow}>
                      <Text style={s.sectionTitle}>A passage to sit with</Text>
                      <Text style={s.small}>BHAGAVAD GITA · 2.47</Text>
                    </View>
                    <View style={s.feature}>
                      <Text style={s.quoteMark}>“</Text>
                      <Text style={s.featureQuote}>
                        Your concern is with action alone,{"\n"}never with its
                        fruits.
                      </Text>
                      <Text
                        style={[s.small, { color: "#d8dfcb", marginTop: 16 }]}
                      >
                        DEVELOPMENT RENDERING · REVIEW PENDING
                      </Text>
                      <Pressable
                        onPress={async () => {
                          try {
                            setReader(
                              await request("/v1/passages/fixture_bg_2_47"),
                            );
                          } catch (e) {
                            setError((e as Error).message);
                          }
                        }}
                        style={[
                          s.row,
                          {
                            justifyContent: "flex-start",
                            gap: 10,
                            marginTop: 22,
                          },
                        ]}
                      >
                        <Text style={{ color: "white", fontSize: 14 }}>
                          Read the full passage
                        </Text>
                        <Icon name="arrow-forward" color="white" size={17} />
                      </Pressable>
                      <View style={s.featureCircle} />
                    </View>
                  </>
                )}
              </>
            ) : tab === "Library" ? (
              <>
                <Text style={s.kicker}>THE SOURCE COLLECTION</Text>
                <Text style={s.title}>A library, thoughtfully built.</Text>
                <Text style={s.intro}>
                  Each edition has its own voice. Each passage has its own
                  provenance.
                </Text>
                {works.map(({ id, title: name, status }) => {
                  const icon =
                    id === "bhagavad-gita" ? "book-outline" : "library-outline";
                  return (
                    <View key={name} style={s.passage}>
                      <View style={s.row}>
                        <Icon name={icon as any} color={C.accent} />
                        <Text style={s.sectionTitle}>{name}</Text>
                        <Text style={s.badge}>
                          {name === "Bhagavad Gita" ? "PILOT" : "PLANNED"}
                        </Text>
                      </View>
                      <Text style={[s.small, { marginTop: 12 }]}>{status}</Text>
                    </View>
                  );
                })}
                <Text style={[s.sectionTitle, { marginTop: 20 }]}>
                  Explore the pilot passages
                </Text>
                {all.map((p) => (
                  <PassageCard
                    saved={saved}
                    onOpen={open}
                    onToggle={toggle}
                    key={p.id}
                    p={p}
                  />
                ))}
              </>
            ) : tab === "Saved" ? (
              <>
                <Text style={s.kicker}>YOUR PERSONAL COLLECTION</Text>
                <Text style={s.title}>Return to what resonates.</Text>
                <Text style={s.intro}>
                  Passages saved on this device for your next study session.
                </Text>
                {saved.length === 0 ? (
                  <View style={s.info}>
                    <Icon name="bookmark-outline" size={30} />
                    <Text style={s.body}>
                      Open a passage and tap the bookmark to save it here.
                    </Text>
                  </View>
                ) : (
                  saved.map((id) => (
                    <SavedPassage
                      key={id}
                      id={id}
                      render={(p) => (
                        <PassageCard
                          saved={saved}
                          onOpen={open}
                          onToggle={toggle}
                          p={p}
                        />
                      )}
                    />
                  ))
                )}
              </>
            ) : (
              <>
                <Text style={s.kicker}>OUR APPROACH</Text>
                <Text style={s.title}>Trust begins with the source.</Text>
                <View style={s.info}>
                  <Text style={s.sectionTitle}>A research companion</Text>
                  <Text style={s.body}>
                    Pramana helps you inspect passages and distinguish textual
                    wording from interpretation. It does not claim universal
                    authority across traditions.
                  </Text>
                </View>
                <View style={s.info}>
                  <Text style={s.sectionTitle}>What this build includes</Text>
                  <Text style={s.body}>
                    Five development Sanskrit fixtures, original English
                    renderings, exact reference lookup, lexical passage
                    matching, persistent bookmarks, and correction reports. The
                    citation gate checks IDs, hashes, and excerpt spans. It does
                    not certify scholarly accuracy.
                  </Text>
                </View>
                <View style={s.info}>
                  <Text style={s.sectionTitle}>Before a public release</Text>
                  <Text style={s.body}>
                    Choose precise editions, clear usage rights, complete
                    independent review, and pass the edition-aware benchmark.
                    Voice narration stays gated until reviewed sources and a
                    provider are available.
                  </Text>
                </View>
                <Text style={s.small}>
                  Bookmarks are stored on your device. Submitted corrections are
                  stored by the local API. No raw audio is recorded.
                </Text>
              </>
            )}
            {!!error && (
              <View
                accessibilityRole="alert"
                style={[s.info, { backgroundColor: "#f7e9de" }]}
              >
                <Text style={s.body}>{error}</Text>
              </View>
            )}
            <View style={s.footer}>
              <Icon name="leaf-outline" size={14} color={C.muted} />
              <Text style={s.small}>
                {" "}
                A little more understanding, one passage at a time.
              </Text>
            </View>
          </ScrollView>
          {!wide && (
            <View style={s.bottomNav}>
              {nav.map(([name, icon]) => (
                <Pressable
                  accessibilityLabel={name}
                  key={name}
                  onPress={() => {
                    setTab(name);
                    setReader(null);
                  }}
                  style={s.tabItem}
                >
                  <Icon name={icon} color={tab === name ? C.green : C.muted} />
                  <Text style={s.small}>{name}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
function SavedPassage({
  id,
  render,
}: {
  id: string;
  render: (p: Passage) => React.ReactNode;
}) {
  const [p, setP] = useState<Passage | null>(null),
    [error, setError] = useState(false);
  useEffect(() => {
    request("/v1/passages/" + id)
      .then(setP)
      .catch(() => setError(true));
  }, [id]);
  return p ? (
    <>{render(p)}</>
  ) : (
    <Text>{error ? "Saved passage unavailable." : "Loading passage…"}</Text>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.paper },
  shell: { flex: 1, flexDirection: "row" },
  sidebar: {
    width: 246,
    padding: 26,
    borderRightWidth: 1,
    borderColor: C.line,
    backgroundColor: "#f0f1e9",
  },
  brand: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginBottom: 60,
  },
  mark: {
    width: 42,
    height: 46,
    backgroundColor: C.green,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontFamily: Platform.OS === "web" ? "Georgia" : "serif",
    fontSize: 26,
    color: C.ink,
  },
  navLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: C.muted,
    marginBottom: 18,
  },
  nav: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    padding: 14,
    marginBottom: 8,
    borderRadius: 8,
  },
  navActive: { backgroundColor: "#e0e6d8" },
  navText: { fontSize: 15, color: C.muted },
  count: { marginLeft: "auto", fontSize: 12, color: C.muted },
  sidebarNote: { borderTopWidth: 1, borderColor: C.line, paddingTop: 25 },
  header: {
    height: 80,
    borderBottomWidth: 1,
    borderColor: C.line,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 36,
  },
  headerTitle: { fontSize: 15, color: C.ink },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.green,
    marginRight: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e3e8dc",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 25,
  },
  content: { padding: 48, width: "100%", maxWidth: 1080, alignSelf: "center" },
  kicker: {
    fontSize: 10,
    letterSpacing: 2,
    color: C.accent,
    marginTop: 12,
    marginBottom: 22,
  },
  title: {
    fontFamily: Platform.OS === "web" ? "Georgia" : "serif",
    fontSize: 48,
    lineHeight: 58,
    color: C.ink,
    marginBottom: 20,
  },
  intro: { fontSize: 15, lineHeight: 25, color: C.muted, marginBottom: 32 },
  composer: {
    backgroundColor: "#fffefa",
    borderWidth: 1,
    borderColor: "#dcded2",
    borderRadius: 14,
    padding: 22,
    shadowColor: "#273c2c",
    shadowOpacity: 0.04,
    shadowRadius: 16,
  },
  input: {
    minHeight: 78,
    fontSize: 17,
    color: C.ink,
    padding: 0,
    textAlignVertical: "top",
    ...(Platform.OS === "web" ? { outlineStyle: "none" as any } : {}),
  },
  button: {
    backgroundColor: C.green,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  buttonText: { color: "white", fontSize: 13, fontWeight: "600" },
  small: { fontSize: 11, lineHeight: 18, color: C.muted },
  body: { fontSize: 14, lineHeight: 24, color: C.ink },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 36,
    marginBottom: 18,
    flexWrap: "wrap",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Platform.OS === "web" ? "Georgia" : "serif",
    color: C.ink,
    marginBottom: 8,
  },
  cards: { flexDirection: "row", gap: 14 },
  topic: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 10,
    padding: 20,
    gap: 12,
    backgroundColor: "#faf9f4",
  },
  topicTitle: {
    fontSize: 17,
    fontFamily: Platform.OS === "web" ? "Georgia" : "serif",
    color: C.ink,
  },
  feature: {
    backgroundColor: C.green,
    borderRadius: 12,
    padding: 32,
    overflow: "hidden",
  },
  quoteMark: {
    fontFamily: "serif",
    fontSize: 52,
    color: "#c6cda9",
    lineHeight: 45,
  },
  featureQuote: {
    fontFamily: Platform.OS === "web" ? "Georgia" : "serif",
    fontSize: 25,
    lineHeight: 36,
    color: "#fffdf1",
    zIndex: 1,
  },
  featureCircle: {
    position: "absolute",
    width: 250,
    height: 250,
    borderWidth: 1,
    borderColor: "#67816c",
    borderRadius: 125,
    right: -60,
    bottom: -95,
    opacity: 0.4,
  },
  passage: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: "#fffefa",
    marginTop: 16,
  },
  reference: { fontSize: 14, fontWeight: "600", color: C.green },
  sanskrit: { fontSize: 20, lineHeight: 34, color: C.ink, marginVertical: 20 },
  info: {
    backgroundColor: "#eeefe6",
    padding: 22,
    borderRadius: 10,
    marginTop: 20,
    gap: 8,
  },
  badge: {
    fontSize: 9,
    letterSpacing: 1,
    color: C.green,
    backgroundColor: "#e4ebdd",
    padding: 8,
    borderRadius: 5,
  },
  secondary: {
    paddingVertical: 18,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  reportInput: {
    borderWidth: 1,
    borderColor: C.line,
    padding: 12,
    minHeight: 90,
    backgroundColor: "white",
    color: C.ink,
  },
  footer: {
    marginTop: 40,
    paddingTop: 24,
    borderTopWidth: 1,
    borderColor: C.line,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  tabItem: {
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    gap: 2,
  },
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 56,
    borderTopWidth: 1,
    borderColor: C.line,
    backgroundColor: C.paper,
  },
});
