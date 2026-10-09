# Local Android test APK

The cloud workspace can build an APK without an Expo login using Android command-line tools, a full JDK and Gradle. The workspace originally had only a Java runtime; Temurin JDK 17 was installed at `/workspace/android-jdk` and selected with `JAVA_HOME`. Android Studio's desktop UI and BlueStacks are not required.

Installed SDK packages: platform-tools, platforms;android-36, build-tools;36.0.0, ndk;27.1.12297006 and cmake;3.22.1. SDK location in this workspace: `/workspace/android-sdk`.

Generate the native project with `CI=1 npx expo prebuild --platform android --no-install` from `apps/mobile`, then run `./gradlew --no-daemon --max-workers=2 :app:assembleRelease -PreactNativeArchitectures=arm64-v8a` from the generated Android directory with `ANDROID_HOME` and `ANDROID_SDK_ROOT` set. Where the runtime requires a proxy, retain its network policy and configure Gradle's HTTP/HTTPS proxy flags for that proxy.

This build uses Expo's generated development signing configuration. It is an installable test APK, not the production Play signing artifact. Never commit generated private signing material, SDK downloads, Gradle caches or native build outputs. Production remains subject to the release preflight and actual HTTPS backend configuration.

The default development backend is localhost; on a phone that refers to the phone itself. Without a reachable configured backend, onboarding and local preferences can be tested, but server-dependent searches/settings will not work. No production backend deployment or real-device verification is established by producing the APK.

## Verified build result

Local `assembleRelease` succeeded: 274 tasks, arm64-v8a, package org.pramana.study, version 0.1.0/code 1, minimum Android API 24 and target API 36. `apksigner verify --verbose` passed APK signature scheme v2. APK is approximately 29 MB, saved as `/workspace/Pramana-preview.apk`. SHA-256: `49baf615feb3dc0cc150a89caa369d23edc28f83f798425d003aca1edf9633f0`. Not tested on a physical phone; development backend limitations above remain.
