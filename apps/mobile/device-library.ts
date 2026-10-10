import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  MAHAPURANA_TARGETS,
  VEDA_TARGETS,
} from "../../packages/corpus-schema/register";
import { UPANISHAD_TARGETS } from "../../packages/corpus-schema/upanishads";
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
  if (path === "/v1/works") return works;
  if (path === "/v1/passages") return [];
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
