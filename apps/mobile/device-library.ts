import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  MAHAPURANA_TARGETS,
  VEDA_TARGETS,
} from "../../packages/corpus-schema/register";
import { UPANISHAD_TARGETS } from "../../packages/corpus-schema/upanishads";
import { localScripture } from "./device-corpus";
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
    return works.map((w) =>
      status.works[w.id]
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
  if (path === "/v1/passages") return index.passages();
  if (path.startsWith("/v1/passages/"))
    return index.record(path.slice("/v1/passages/".length));
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
