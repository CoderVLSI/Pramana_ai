import { readApprovedMemory } from "./memory-context";
import * as SecureStore from "expo-secure-store";
import { DeviceClient } from "../../packages/provider-client/device-client";
import { retrieveScripture } from "./scripture-retrieval";
const DEVICE_KEY = "pramana.device.connections.v1";
export const deviceClient = new DeviceClient(
  {
    get: () => SecureStore.getItemAsync(DEVICE_KEY),
    set: (value) =>
      SecureStore.setItemAsync(DEVICE_KEY, value, {
        keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      }),
    remove: () => SecureStore.deleteItemAsync(DEVICE_KEY),
  },
  globalThis.fetch,
  async (query, workIds, filters) =>
    retrieveScripture(query, { work_ids: workIds, ...filters }),
  readApprovedMemory,
);
