import React, { useEffect, useState } from "react";
import { Switch } from "react-native";
import { View, Text, TextInput, Pressable } from "./ui";
import { cloudAuth } from "./cloud-auth";
import { CloudSyncClient, cloudSnapshot } from "../../packages/cloud-sync";
import type { CloudSession } from "../../packages/cloud-sync/auth";
import { CLOUD_PROJECT_URL, CLOUD_PUBLISHABLE_KEY } from "./cloud-config";
import { useDevicePreferences } from "./DevicePreferences";
import type { StudyProfile } from "./ProfileScreen";
export default function CloudAccount({
  profile,
  onRestoreProfile,
}: {
  profile: StudyProfile;
  onRestoreProfile: (profile: StudyProfile) => Promise<void>;
}) {
  const prefs = useDevicePreferences();
  const [session, setSession] = useState<CloudSession | null>(null),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [busy, setBusy] = useState(true),
    [message, setMessage] = useState(""),
    [includeMemories, setIncludeMemories] = useState(false),
    [confirm, setConfirm] = useState<"restore" | "delete" | null>(null);
  useEffect(() => {
    let active = true;
    cloudAuth
      .session()
      .then((s) => {
        if (active) setSession(s);
      })
      .catch(() => {
        if (active)
          setMessage("Could not restore your session. You can sign in again.");
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, []);
  async function action(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function client() {
    const s = await cloudAuth.session();
    if (!s) throw Error("Sign in to use cloud backups.");
    setSession(s);
    return {
      sync: new CloudSyncClient(
        CLOUD_PROJECT_URL,
        CLOUD_PUBLISHABLE_KEY,
        s.access_token,
      ),
      id: s.user.id,
    };
  }
  const button = (label: string, fn: () => Promise<void>) => (
    <Pressable
      accessibilityLabel={label}
      disabled={busy}
      onPress={() => void action(fn)}
      style={{
        padding: 12,
        backgroundColor: "#e4e5db",
        borderRadius: 10,
        marginVertical: 4,
        opacity: busy ? 0.5 : 1,
      }}
    >
      <Text>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ gap: 8, marginBottom: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: "700" }}>
        Optional cloud account
      </Text>
      <Text>
        Guest use stays available. Backups include your profile and reading
        settings only when you tap Upload. API keys, history, screenshots and
        private scratchpad stay on this device.
      </Text>
      {!session ? (
        <>
          <TextInput
            accessibilityLabel="Account email"
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            style={{ padding: 12, borderWidth: 1, borderColor: "#d4d8ca" }}
          />
          <TextInput
            accessibilityLabel="Account password"
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            style={{ padding: 12, borderWidth: 1, borderColor: "#d4d8ca" }}
          />
          {button("Sign in", async () => {
            const s = await cloudAuth.signIn(email, password);
            setSession(s);
            setPassword("");
            setMessage("Signed in. Nothing has been uploaded.");
          })}
          {button("Create email account", async () => {
            const s = await cloudAuth.signUp(email, password);
            setSession(s);
            setPassword("");
            setMessage(
              s
                ? "Account ready. Nothing has been uploaded."
                : "Check your email to confirm your account, then return here to sign in.",
            );
          })}
          <Text>
            Email delivery is subject to provider limits. Google sign-in is not
            configured.
          </Text>
        </>
      ) : (
        <>
          <Text>Signed in as {session.user.email || "your account"}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Switch
              accessibilityLabel="Include approved memories in cloud backup"
              value={includeMemories}
              onValueChange={setIncludeMemories}
              disabled={busy}
            />
            <Text>Include approved memories in this upload</Text>
          </View>
          <Text>
            This is separate from sharing memories with AI. Upload replaces the
            previous backup; leaving memories off removes them from that backup.
          </Text>
          {button("Upload backup", async () => {
            const { sync, id } = await client();
            await sync.upload(id, profile, prefs.state, includeMemories);
            setMessage("Backup uploaded.");
          })}
          {button("Restore backup", async () => {
            setConfirm("restore");
          })}
          {button("Delete cloud backup", async () => {
            setConfirm("delete");
          })}
          {confirm && (
            <>
              <Text>
                {confirm === "restore"
                  ? "Replace your local profile and reading settings? Memories are restored only if you enabled the memory switch. Local AI-sharing consent stays unchanged."
                  : "Delete your cloud backup? Local data and your sign-in account remain."}
              </Text>
              {button("Confirm " + confirm, async () => {
                const { sync, id } = await client();
                if (confirm === "delete") {
                  await sync.deleteBackup(id);
                  setMessage("Cloud backup deleted.");
                } else {
                  const rows = await sync.download(id);
                  const row = Array.isArray(rows) ? rows[0] : null;
                  if (!row) throw Error("No cloud backup exists.");
                  if (row.schema_version !== 1)
                    throw Error("Unsupported backup version.");
                  const safe = cloudSnapshot(
                    row.profile || {},
                    {
                      reading: row.reading,
                      memory: { approved: row.approved_memories },
                    },
                    true,
                  );
                  await onRestoreProfile(safe.profile as StudyProfile);
                  await prefs.update((s) => ({
                    ...s,
                    reading: safe.reading,
                    memory: includeMemories
                      ? { ...s.memory, approved: safe.approved_memories }
                      : s.memory,
                  }));
                  setMessage("Backup restored.");
                }
                setConfirm(null);
              })}
              {button("Cancel", async () => {
                setConfirm(null);
              })}
            </>
          )}
          {button("Sign out", async () => {
            await cloudAuth.signOut();
            setSession(null);
            setIncludeMemories(false);
            setConfirm(null);
            setPassword("");
            setMessage("Signed out. Local study data is unchanged.");
          })}
        </>
      )}
      {!!message && <Text accessibilityLiveRegion="polite">{message}</Text>}
      {busy && <Text>Working…</Text>}
    </View>
  );
}
