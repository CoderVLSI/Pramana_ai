import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { CloudAuth } from "../../packages/cloud-sync/auth";
import { CLOUD_PROJECT_URL, CLOUD_PUBLISHABLE_KEY } from "./cloud-config";
const KEY = "pramana.cloud.session.v1";
export const cloudAuth = new CloudAuth(
  CLOUD_PROJECT_URL,
  CLOUD_PUBLISHABLE_KEY,
  {
    get: async () =>
      Platform.OS === "web"
        ? (globalThis.sessionStorage?.getItem(KEY) ?? null)
        : SecureStore.getItemAsync(KEY),
    set: async (value) => {
      if (Platform.OS === "web") globalThis.sessionStorage.setItem(KEY, value);
      else
        await SecureStore.setItemAsync(KEY, value, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
    },
    remove: async () => {
      if (Platform.OS === "web") globalThis.sessionStorage.removeItem(KEY);
      else await SecureStore.deleteItemAsync(KEY);
    },
  },
);
