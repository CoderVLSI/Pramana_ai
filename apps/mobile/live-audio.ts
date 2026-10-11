import { NativeEventEmitter, NativeModules, Platform } from "react-native";
type AudioEvent = {
  type: "audio" | "playing" | "ended" | "error" | "paused";
  data: string;
};
type Module = {
  start(capture: boolean): Promise<boolean>;
  play(data: string): void;
  endTurn(): void;
  interrupt(): void;
  stop(): void;
};
export function androidLiveAudio(onEvent: (event: AudioEvent) => void) {
  const native = NativeModules.PramanaLiveAudio as Module | undefined;
  if (Platform.OS !== "android" || !native)
    throw Error(
      "This APK has no native live audio module. Install the latest Pramana APK.",
    );
  const events = new NativeEventEmitter(native as never);
  const subscription = events.addListener("PramanaLiveAudio", onEvent);
  return {
    ...native,
    start: (capture: boolean) => native.start(capture),
    play: (data: string) => native.play(data),
    endTurn: () => native.endTurn(),
    interrupt: () => native.interrupt(),
    stop: () => native.stop(),
    dispose: () => {
      subscription.remove();
      native.stop();
    },
  };
}
