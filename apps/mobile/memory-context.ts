import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  normalizePreferences,
  approvedMemoryContext,
} from "../../packages/device-preferences";
export async function readApprovedMemory(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem("pramana.quality-of-life.v1");
    return approvedMemoryContext(
      normalizePreferences(raw ? JSON.parse(raw) : {}),
    );
  } catch {
    return [];
  }
}
