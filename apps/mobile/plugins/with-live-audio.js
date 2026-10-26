const {
  withAndroidManifest,
  withDangerousMod,
  withMainApplication,
  AndroidConfig,
} = require("@expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");
module.exports = function withLiveAudio(config) {
  config = AndroidConfig.Permissions.withPermissions(config, [
    "android.permission.RECORD_AUDIO",
    "android.permission.MODIFY_AUDIO_SETTINGS",
    "android.permission.FOREGROUND_SERVICE",
    "android.permission.FOREGROUND_SERVICE_MICROPHONE",
  ]);
  // The service that keeps a live conversation running while the app is minimized.
  config = withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application[0];
    app.service = app.service || [];
    if (!app.service.some((s) => s.$["android:name"] === ".PramanaLiveService"))
      app.service.push({
        $: {
          "android:name": ".PramanaLiveService",
          "android:exported": "false",
          "android:foregroundServiceType": "microphone",
        },
      });
    return mod;
  });
  config = withMainApplication(config, (mod) => {
    const marker = "PackageList(this).packages.apply {";
    if (!mod.modResults.contents.includes("add(PramanaAudioPackage())")) {
      if (!mod.modResults.contents.includes(marker))
        throw Error("Pramana audio package registration target missing");
      mod.modResults.contents = mod.modResults.contents.replace(
        marker,
        marker + "\n              add(PramanaAudioPackage())",
      );
    }
    return mod;
  });
  return withDangerousMod(config, [
    "android",
    async (mod) => {
      const target = path.join(
        mod.modRequest.platformProjectRoot,
        "app/src/main/java/org/pramana/study",
      );
      fs.mkdirSync(target, { recursive: true });
      for (const name of [
        "PramanaAudioModule.kt",
        "PramanaAudioPackage.kt",
        "PramanaLiveService.kt",
      ])
        fs.copyFileSync(
          path.join(__dirname, "live-audio", name),
          path.join(target, name),
        );
      return mod;
    },
  ]);
};
