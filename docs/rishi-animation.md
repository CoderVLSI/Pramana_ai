# AI Rishi animation

The Study screen includes an eight-frame transparent sprite atlas derived from the app's AI Rishi icon. Frames provide idle, blink and digital mouth variations. The preview runs for five seconds without audio; it can be stopped early. Reduced-motion preferences disable frame cycling.

`RishiAvatar` accepts a `speaking` prop for future audio playback integration. This is a stylized talking loop, not phoneme lip sync. Do not activate speaking simply because a provider request is pending. Actual voice playback is not connected yet.

Validation: TypeScript check and Android Hermes bundle export passed. Browser preview start/stop verified separately.
