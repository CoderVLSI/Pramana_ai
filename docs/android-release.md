# Android release

The project has a store AAB build profile, initial Android version code 1, remote version-code tracking with auto-increment, and a production HTTPS API configuration gate. Development exports can continue using localhost. A JavaScript/Hermes export is **not** a signed Android App Bundle.

Checked 9 October 2026: Google Play requires new phone apps to target Android 16 / **API 36**, effective 31 August 2026. Expo SDK 54 targets and compiles API 36 by default; no API 35 override is configured. Confirm the final generated AAB's target SDK in Play Console. The Expo 54 / React Native 0.81 template also supports the current 16 KB page-size requirement; verify native libraries in the actual signed artifact.

## Before building

1. Deploy the backend with a real public HTTPS endpoint. Configure production server secrets privately; provider keys must never be put in an `EXPO_PUBLIC_` variable.
2. Authenticate to the app owner's Expo account, then initialize/link its real EAS project. Do not invent an owner or project ID. Select the permanent `org.pramana.study` application ID before the first upload.
3. Set the non-secret `EXPO_PUBLIC_API_URL` in the EAS **production** environment with plain-text visibility so local config evaluation can read it. Set the same value locally when running preflight. The URL must contain no credentials, query parameters or fragments.
4. Run the preflight, code checks and exports, then complete physical-device testing. See the verification record for limitations; unreviewed OCR remains excluded from approved citations.

```sh
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest env:create --environment production --name EXPO_PUBLIC_API_URL --value https://YOUR_REAL_API_HOST --visibility plaintext
cd ../..
EXPO_PUBLIC_API_URL=https://YOUR_REAL_API_HOST node scripts/release-preflight.mjs
npm run typecheck
npm test
npm run build:android
cd apps/mobile
npx eas-cli@latest build --platform android --profile production
```

The uppercase hostname is a placeholder for your deployed host, not a working API. EAS may interactively offer creation or selection of an Android upload keystore. Keep the credentials in the account owner's control. No keystore, signed AAB, EAS project, or Play Console upload has been created or verified in this workspace.

After the signed build is available, upload it to Play Console's internal testing track, enable Play App Signing, inspect warnings, and test the installed app. Complete privacy-policy hosting, Data safety, content rating, store graphics, support contact and any account-specific testing requirements before requesting production review. Submission remains a separate action.

## Preflight limits

The preflight detects missing Expo project/account configuration, unsafe or missing API URLs, and incompatible build-profile settings without printing secrets. It does not confirm that an account is logged in, that a domain resolves or its backend works, that signing credentials exist, or that Play Console will approve the app. Expo evaluates `app.config.js` for the production profile and rejects missing/unsafe API configuration even when the standalone preflight is skipped.

## Official references

- [Google Play target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- [Expo SDK 54 supported platform versions](https://docs.expo.dev/versions/v54.0.0/)
- [Expo SDK 54 release notes](https://expo.dev/changelog/sdk-54)
- [EAS environment variables](https://docs.expo.dev/eas/environment-variables/)
- [Create a production build](https://docs.expo.dev/build/introduction/)
- [Android 16 KB page-size support](https://developer.android.com/guide/practices/page-sizes)
