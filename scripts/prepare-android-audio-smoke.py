#!/usr/bin/env python3
"""Prepare generated Android project for the framework-only native audio test.
Run after Expo prebuild. Build assembleRelease assembleReleaseAndroidTest for
the connected device ABI. Install both APKs, grant RECORD_AUDIO and
POST_NOTIFICATIONS, then run:
adb shell am instrument -w -e class org.pramana.study.PramanaAudioSmokeTest \
  org.pramana.study.test/android.test.InstrumentationTestRunner
No credentials or provider calls are needed.
"""
import argparse
from pathlib import Path
import shutil
parser = argparse.ArgumentParser()
parser.add_argument("android_root", type=Path)
args = parser.parse_args()
root = args.android_root / "app"
gradle = root / "build.gradle"
text = gradle.read_text()
if 'android.test.InstrumentationTestRunner' not in text:
    text += """
android {
  testBuildType "release"
  defaultConfig { testInstrumentationRunner "android.test.InstrumentationTestRunner" }
  useLibrary "android.test.runner"
  useLibrary "android.test.base"
}
"""
gradle.write_text(text)
target = root / "src/androidTest/java/org/pramana/study"
target.mkdir(parents=True, exist_ok=True)
shutil.copyfile(Path(__file__).resolve().parents[1] / "eval/android/PramanaAudioSmokeTest.java", target / "PramanaAudioSmokeTest.java")
(root / "src/androidTest/AndroidManifest.xml").write_text('<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application><uses-library android:name="android.test.runner"/></application></manifest>')
print("Prepared native audio smoke test.")
