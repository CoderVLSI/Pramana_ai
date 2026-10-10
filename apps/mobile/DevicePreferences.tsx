import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  EMPTY_PREFERENCES,
  normalizePreferences,
  type DevicePreferences,
} from "../../packages/device-preferences";
export const DEVICE_PREFERENCES_KEY = "pramana.quality-of-life.v1";
const KEY = DEVICE_PREFERENCES_KEY;
const Context = createContext<{
  state: DevicePreferences;
  ready: boolean;
  error: string;
  update: (
    change: (s: DevicePreferences) => DevicePreferences,
  ) => Promise<void>;
}>({
  state: EMPTY_PREFERENCES,
  ready: false,
  error: "",
  update: async () => {},
});
export function DevicePreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, setState] = useState<DevicePreferences>(EMPTY_PREFERENCES);
  const [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const current = useRef(state),
    writes = useRef(Promise.resolve());
  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(KEY)
      .then((raw) => {
        const value = normalizePreferences(raw ? JSON.parse(raw) : {});
        if (active) {
          current.current = value;
          setState(value);
        }
      })
      .catch(() => {
        if (active)
          setError(
            "Device preferences could not be read. Changes will replace the damaged record.",
          );
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  const update = async (
    change: (s: DevicePreferences) => DevicePreferences,
  ) => {
    if (!ready) throw Error("Device preferences are still loading.");
    const next = normalizePreferences(change(current.current));
    current.current = next;
    setState(next);
    const write = writes.current.then(() =>
      AsyncStorage.setItem(KEY, JSON.stringify(next)),
    );
    writes.current = write.catch(() => {});
    try {
      await write;
      setError("");
    } catch (e) {
      setError("Changes could not be saved on this device. Try again.");
      throw e;
    }
  };
  return (
    <Context.Provider value={{ state, ready, error, update }}>
      {children}
    </Context.Provider>
  );
}
export const useDevicePreferences = () => useContext(Context);
