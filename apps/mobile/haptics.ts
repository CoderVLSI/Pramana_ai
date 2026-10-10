import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

const KEY = "pramana.haptics.v1";
let enabled = true;
let preferenceVersion = 0;
const loaded = AsyncStorage.getItem(KEY)
  .then((value) => {
    if (preferenceVersion === 0) enabled = value !== "off";
  })
  .catch(() => {});

export async function hapticsEnabled(): Promise<boolean> {
  await loaded;
  return enabled;
}
export async function setHapticsEnabled(value: boolean): Promise<void> {
  preferenceVersion++;
  enabled = value;
  await AsyncStorage.setItem(KEY, value ? "on" : "off");
}
export async function selectionHaptic(): Promise<void> {
  await loaded;
  if (enabled && Platform.OS !== "web") {
    try {
      await Haptics.selectionAsync();
    } catch {
      /* Optional device feedback. */
    }
  }
}
