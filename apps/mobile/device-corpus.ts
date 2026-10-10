import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import {
  scriptureBytes,
  scriptureDigest,
  validateGitaPressBundle,
} from "../../packages/corpus-schema/gita-press";
import {
  LocalScriptureIndex,
  MAX_PACK_BYTES,
} from "../../packages/corpus-schema/local-index";

const KEY = "pramana.device.scripture-packs.v1";
type InstalledPack = {
  sha256: string;
  work_id: string;
  edition_id: string;
  release: string;
  passage_count: number;
  completeness: string;
};
let ready: Promise<LocalScriptureIndex> | undefined;
let queue: Promise<unknown> = Promise.resolve();
let rejected: string[] = [];
function directory() {
  if (!FileSystem.documentDirectory)
    throw Error("Scripture storage is unavailable on this device.");
  return FileSystem.documentDirectory + "scripture-packs/";
}
async function inventory(): Promise<InstalledPack[]> {
  const value = JSON.parse((await AsyncStorage.getItem(KEY)) || "[]");
  if (
    !Array.isArray(value) ||
    value.length > 30 ||
    value.some((p) => !p || !/^[a-f0-9]{64}$/.test(p.sha256))
  )
    throw Error(
      "The installed scripture inventory is damaged. Remove installed packs and reinstall them.",
    );
  return value;
}
async function bundles() {
  const result: unknown[] = [];
  rejected = [];
  for (const pack of await inventory()) {
    try {
      const raw = await FileSystem.readAsStringAsync(
        directory() + pack.sha256 + ".json",
      );
      if (scriptureDigest(raw) !== pack.sha256)
        throw Error("checksum mismatch");
      const value = JSON.parse(raw);
      validateGitaPressBundle(value, true);
      result.push(value);
    } catch {
      rejected.push(
        `${pack.work_id}: saved pack failed integrity or source validation; reinstall it.`,
      );
    }
  }
  return result;
}
export async function localScripture() {
  await queue;
  if (!ready)
    ready = bundles()
      .then((packs) => new LocalScriptureIndex(packs))
      .catch((e) => {
        ready = undefined;
        throw e;
      });
  return ready;
}
export async function deviceCorpusStatus() {
  const index = await localScripture();
  return {
    ...index.status(),
    packs: await inventory(),
    rejected: [...rejected],
  };
}
function mutate<T>(action: () => Promise<T>) {
  const result = queue.then(action);
  queue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}
export function installScripturePack(address: string, expectedHash: string) {
  return mutate(async () => {
    const url = new URL(address.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.hash)
      throw Error(
        "Use a public HTTPS scripture-pack URL without credentials or fragments.",
      );
    const hash = expectedHash.trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(hash))
      throw Error("Enter the pack publisher's full SHA-256 checksum.");
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
      });
      if (!response.ok) throw Error("Scripture pack download failed.");
      if (Number(response.headers.get("content-length")) > MAX_PACK_BYTES)
        throw Error("Use scripture packs smaller than 5 MB for this pilot.");
      const raw = await response.text();
      if (
        raw.length > MAX_PACK_BYTES ||
        scriptureBytes(raw).length > MAX_PACK_BYTES
      )
        throw Error("This scripture pack exceeds the 5 MB pilot limit.");
      if (scriptureDigest(raw) !== hash)
        throw Error(
          "Downloaded pack checksum does not match. Nothing was installed.",
        );
      const value = JSON.parse(raw),
        pack = validateGitaPressBundle(value, true);
      const current = await inventory();
      const existing = current.some((p) => p.sha256 === hash);
      if (existing) {
        try {
          const saved = await FileSystem.readAsStringAsync(
            directory() + hash + ".json",
          );
          if (scriptureDigest(saved) === hash)
            return "This pack is already installed.";
        } catch {
          /* A missing or damaged saved file can be reinstalled. */
        }
      }
      if (!existing && current.length >= 30)
        throw Error(
          "The pilot supports up to 30 packs. Remove older packs first.",
        );
      const next = new LocalScriptureIndex([...(await bundles()), value]);
      await FileSystem.makeDirectoryAsync(directory(), { intermediates: true });
      await FileSystem.writeAsStringAsync(directory() + hash + ".json", raw);
      await AsyncStorage.setItem(
        KEY,
        JSON.stringify([
          ...current.filter((p) => p.sha256 !== hash),
          {
            sha256: hash,
            work_id: pack.manifest.work_id,
            edition_id: pack.manifest.edition_id,
            release: pack.manifest.release,
            completeness: pack.manifest.completeness,
            passage_count: pack.passages.length,
          },
        ]),
      );
      ready = Promise.resolve(next);
      return `Installed ${pack.passages.length} reviewed passages. Search works without a Pramana backend.`;
    } catch (e) {
      if (controller.signal.aborted)
        throw Error("Scripture pack download timed out. Try again.");
      throw e;
    } finally {
      clearTimeout(timer);
    }
  });
}
export function removeScripturePacks() {
  return mutate(async () => {
    await AsyncStorage.removeItem(KEY);
    ready = Promise.resolve(new LocalScriptureIndex());
    rejected = [];
    await FileSystem.deleteAsync(directory(), { idempotent: true });
  });
}
