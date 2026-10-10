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
  source_url?: string;
  installed_at?: string;
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
async function bundles(exclude: string[] = []) {
  const result: unknown[] = [];
  rejected = [];
  for (const pack of await inventory()) {
    if (exclude.includes(pack.sha256)) continue;
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
    packs: await Promise.all(
      (await inventory()).map(async (pack) => {
        const info = await FileSystem.getInfoAsync(
          directory() + pack.sha256 + ".json",
        );
        return {
          ...pack,
          size_bytes: info.exists && !info.isDirectory ? info.size : 0,
        };
      }),
    ),
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
export interface PackProgress {
  phase: "download" | "validate" | "install";
  loaded: number;
  total: number;
}
export function installScripturePack(
  address: string,
  expectedHash: string,
  progress?: (value: PackProgress) => void,
) {
  return mutate(async () => {
    const url = new URL(address.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.hash)
      throw Error(
        "Use a public HTTPS scripture-pack URL without credentials or fragments.",
      );
    const hash = expectedHash.trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(hash))
      throw Error("Enter the pack publisher's full SHA-256 checksum.");
    if (!FileSystem.cacheDirectory)
      throw Error("Download cache is unavailable.");
    const temporary =
      FileSystem.cacheDirectory +
      `pramana-pack-${Date.now()}-${hash.slice(0, 8)}.json`;
    let timedOut = false,
      oversized = false;
    progress?.({ phase: "download", loaded: 0, total: 0 });
    const task = FileSystem.createDownloadResumable(
      url.toString(),
      temporary,
      {},
      (event) => {
        progress?.({
          phase: "download",
          loaded: event.totalBytesWritten,
          total: Math.max(0, event.totalBytesExpectedToWrite),
        });
        if (
          event.totalBytesWritten > MAX_PACK_BYTES ||
          event.totalBytesExpectedToWrite > MAX_PACK_BYTES
        ) {
          oversized = true;
          void task.cancelAsync().catch(() => {});
        }
      },
    );
    const timer = setTimeout(() => {
      timedOut = true;
      void task.cancelAsync().catch(() => {});
    }, 60000);
    try {
      const response = await task.downloadAsync();
      if (oversized)
        throw Error("This scripture pack exceeds the 5 MB pilot limit.");
      if (timedOut)
        throw Error("Scripture pack download timed out. Try again.");
      if (!response || response.status < 200 || response.status >= 300)
        throw Error("Scripture pack download failed.");
      const info = await FileSystem.getInfoAsync(temporary);
      if (!info.exists || info.isDirectory || info.size > MAX_PACK_BYTES)
        throw Error("This scripture pack exceeds the 5 MB pilot limit.");
      progress?.({ phase: "validate", loaded: info.size, total: info.size });
      const raw = await FileSystem.readAsStringAsync(temporary);
      if (scriptureBytes(raw).length > MAX_PACK_BYTES)
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
      const replacingEdition = current.some(
        (p) =>
          p.work_id === pack.manifest.work_id &&
          p.edition_id === pack.manifest.edition_id,
      );
      if (!existing && !replacingEdition && current.length >= 30)
        throw Error(
          "The pilot supports up to 30 packs. Remove older packs first.",
        );
      const replaced = current.filter(
        (p) =>
          p.sha256 === hash ||
          (p.work_id === pack.manifest.work_id &&
            p.edition_id === pack.manifest.edition_id),
      );
      const next = new LocalScriptureIndex([
        ...(await bundles(replaced.map((p) => p.sha256))),
        value,
      ]);
      progress?.({ phase: "install", loaded: info.size, total: info.size });
      await FileSystem.makeDirectoryAsync(directory(), { intermediates: true });
      await FileSystem.writeAsStringAsync(directory() + hash + ".json", raw);
      await AsyncStorage.setItem(
        KEY,
        JSON.stringify([
          ...current.filter(
            (p) => !replaced.some((old) => old.sha256 === p.sha256),
          ),
          {
            sha256: hash,
            work_id: pack.manifest.work_id,
            edition_id: pack.manifest.edition_id,
            release: pack.manifest.release,
            completeness: pack.manifest.completeness,
            passage_count: pack.passages.length,
            source_url: url.toString(),
            installed_at: new Date().toISOString(),
          },
        ]),
      );
      ready = Promise.resolve(next);
      for (const old of replaced)
        if (old.sha256 !== hash)
          await FileSystem.deleteAsync(directory() + old.sha256 + ".json", {
            idempotent: true,
          }).catch(() => {});
      return `Installed ${pack.passages.length} reviewed passages. Search works without a Pramana backend.`;
    } catch (e) {
      if (timedOut)
        throw Error("Scripture pack download timed out. Try again.");
      if (oversized)
        throw Error("This scripture pack exceeds the 5 MB pilot limit.");
      throw e;
    } finally {
      clearTimeout(timer);
      await FileSystem.deleteAsync(temporary, { idempotent: true }).catch(
        () => {},
      );
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

export function removeScripturePack(hash: string) {
  return mutate(async () => {
    if (!/^[a-f0-9]{64}$/.test(hash))
      throw Error("Invalid scripture pack identifier.");
    const remaining = (await inventory()).filter((p) => p.sha256 !== hash);
    const next = new LocalScriptureIndex(await bundles([hash]));
    await AsyncStorage.setItem(KEY, JSON.stringify(remaining));
    ready = Promise.resolve(next);
    await FileSystem.deleteAsync(directory() + hash + ".json", {
      idempotent: true,
    });
  });
}
