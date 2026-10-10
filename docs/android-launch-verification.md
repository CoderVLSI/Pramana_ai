# Android startup verification

The reported immediate launch failure was reproduced on the Android 15 x86_64
emulator. The crash happened during Expo native module registration, before the
JavaScript app rendered:

```text
java.lang.NoSuchMethodError: No static method getDirectConverter(...)
  at expo.modules.font.FontLoaderModule.definition(FontLoaderModule.kt:98)
```

The lockfile had Expo Font 57.0.4 alongside Expo SDK 54 and Expo Modules Core
3.0.30. The icon package's open-ended peer dependency admitted the newer font
module. The mobile dependency, workspace pin and override now select Expo Font
14.0.12, matching SDK 54. CI checks Expo dependency compatibility and the font
dependency tree.

To verify the packaged app on a running emulator:

```sh
python3 scripts/android-launch-smoke.py path/to/emulator-compatible.apk \
  --adb "$ANDROID_HOME/platform-tools/adb" \
  --output /tmp/pramana-launch-smoke
```

This test clears app data, waits for boot, installs the APK, launches the activity,
checks for native crash records and confirms the onboarding screen remains alive.
It saves logcat, the crash buffer, activity output, UI XML and a screenshot.
It only accepts emulator serials. Software emulation may require a longer install
timeout; the default is ten minutes.

An x86_64 emulator build does not validate OnePlus hardware or live provider calls.
The separately built arm64 APK still needs a launch check on the user's Nord 4.

The corrected build was verified with a fresh-data cold launch on Android 15:
UI hierarchy contains `Welcome to Pramana`, the app process remains alive, and
the crash buffer is empty. A separate force-stop/relaunch also reached JavaScript
startup without the original native exception. All 52 JavaScript tests,
TypeScript and Expo dependency compatibility checks passed. Both x86_64 and
arm64 release APK builds completed; the arm64 signature matches the prior preview.

The software emulator produced unrelated launcher/System UI ANR dialogs. They
were dismissed during verification; UI capture uses `/data/local/tmp` because
the emulator's external-storage service was unreliable.
