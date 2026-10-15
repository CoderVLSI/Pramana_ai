import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  MAHAPURANA_TARGETS,
  VEDA_TARGETS,
} from "../../packages/corpus-schema/register";
import { UPANISHAD_TARGETS } from "../../packages/corpus-schema/upanishads";
import { localScripture } from "./device-corpus";
import {
  SCRIPTURE_BACKEND_ENABLED,
  scriptureBackend,
} from "./scripture-retrieval";
const works = [
  ["bhagavad-gita", "Bhagavad Gita"],
  ["valmiki-ramayana", "Valmiki Ramayana"],
  ["mahabharata", "Mahabharata"],
  ...MAHAPURANA_TARGETS,
  ...VEDA_TARGETS,
  ...UPANISHAD_TARGETS,
].map(([id, title]) => ({
  id,
  title,
  subtitle: "Local collection pending review and installation",
  passage_count: 0,
  status: "No approved passages installed",
  editions: [],
}));
export async function deviceLibraryRequest(path: string, body?: unknown) {
  const index = await localScripture();
  if (path === "/v1/works") {
    const status = index.status();
    let releases: any[] = [];
    if (SCRIPTURE_BACKEND_ENABLED) {
      try {
        const catalog = await scriptureBackend.catalog();
        if (Array.isArray(catalog.releases)) releases = catalog.releases;
      } catch {
        /* Preserve the installed library offline. */
      }
    }
    return works.map((w) =>
      releases.some((r) => r.work_id === w.id)
        ? {
            ...w,
            passage_count: releases
              .filter((r) => r.work_id === w.id)
              .reduce((n, r) => n + r.passage_count, 0),
            status: "Cloud passages · internet required",
            subtitle: releases.some(
              (r) => r.work_id === w.id && /^gita-open/.test(r.released_in),
            )
              ? "Sanskrit text from a public-domain 1909 edition · AI-checked, not yet human-reviewed"
              : "Gita Press scripture backend",
            editions: releases
              .filter((r) => r.work_id === w.id)
              .map((r) => ({
                id: r.edition_id,
                released_in: r.released_in,
                completeness: r.completeness,
              })),
          }
        : status.works[w.id]
          ? {
              ...w,
              ...status.works[w.id],
              status:
                "Reviewed passages installed · edition coverage shown below",
              subtitle: "On-device scripture collection",
            }
          : w,
    );
  }
  if (path === "/v1/passages") {
    const local = index.passages();
    if (!SCRIPTURE_BACKEND_ENABLED) return local;
    try {
      return [
        ...new Map(
          [...local, ...(await scriptureBackend.passages())].map((p) => [
            p.id,
            p,
          ]),
        ).values(),
      ];
    } catch {
      return local;
    }
  }
  if (path.startsWith("/v1/passages/")) {
    const id = path.slice("/v1/passages/".length);
    try {
      return index.record(id);
    } catch (error) {
      if (!SCRIPTURE_BACKEND_ENABLED) throw error;
      return scriptureBackend.record(id);
    }
  }
  if (path === "/v1/reports") {
    const key = "pramana.device.corrections.v1",
      previous = JSON.parse((await AsyncStorage.getItem(key)) || "[]");
    await AsyncStorage.setItem(
      key,
      JSON.stringify([
        ...previous.slice(-49),
        { body, recorded_at: new Date().toISOString() },
      ]),
    );
    return {
      message:
        "Correction saved on this phone; it has not been submitted to a reviewer.",
    };
  }
  throw Error("This passage is not installed on your phone yet.");
}
