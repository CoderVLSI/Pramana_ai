import { readApprovedMemory } from "./memory-context";
import * as SecureStore from "expo-secure-store";
import { DeviceClient } from "../../packages/provider-client/device-client";
import { localScripture } from "./device-corpus";
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
    (await localScripture()).answer(query, { work_ids: workIds, ...filters }),
  readApprovedMemory,
);
