# First-time study preferences

The app asks for a preferred name and optionally study interests and Ishta Devata. Language and interaction choices are stored preferences, not a promise of language translation or live voice availability. Setup is skippable. Settings → Name & study preferences supports editing and deleting all profile preferences. Deletion causes setup to reappear on the next launch.

The name appears in the Study greeting. It is not added to scripture quotations, citation verification, API question bodies, or provider prompts. Voice-name personalization is not connected while audio playback remains pending.

Preferences use local AsyncStorage and are not encrypted or synchronized to the server. Ishta Devata may reveal religious preferences, so it is optional. Do not claim these fields are protected by the backend API-key encryption. No user account or identity verification is created.

Browser validation covers save/name greeting, persistence after reload, deletion and persistent skip; TypeScript and Android bundle checked separately.

Ordinary greetings/app help now send the preferred name and request to the configured provider. Other profile preferences stay on-device. Scripture quotations remain unchanged. Live voice personalization is pending.
