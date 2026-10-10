# Backend deployment candidate

The Windows portable app includes its own local API. The default Android build now calls providers directly and stores keys securely on the phone; no Pramana backend is required for those features. An optional backend-mode Android build needs a remotely reachable HTTPS API for provider credentials, local scripture retrieval, web-search tools and live sessions. The current vault stores encrypted profiles in files; deployment requires persistent writable storage. This configuration targets one always-on Docker instance with a persistent disk. It does not claim a stateless Vercel deployment is ready; a durable database-backed vault and distributed session/rate-limit coordination would be needed for that deployment shape.

## Build and run

Build from the repository root:

```sh
docker build -t pramana-api -f services/api/Dockerfile .
```

The runtime contains the compiled backend and production API dependencies, runs as the unprivileged Node user, binds the platform's `PORT`, checks `/health`, and closes live sessions on process shutdown. Private scans, keys and app build outputs are excluded from the build context. No user provider key is baked into the image.

Set `NODE_ENV=production`, `SETTINGS_MASTER_KEY` (exactly 64 hexadecimal characters), `PRAMANA_DATA_DIR` (on a persistent disk), and the browser frontend's exact `CLIENT_ORIGIN`. Keep the same master key across restarts. Configure `TRUST_PROXY` to trusted proxy IP/subnet values, or the exact trusted hop count when the public host only routes through its edge proxy. Numeric hop values are compiled into Fastify's trust function; arbitrary incoming headers are not trusted in direct mode.

`render.yaml` is a reviewable Render Docker service blueprint with one Starter instance and a 1 GB persistent disk. It references a paid plan; no hosting resources or subscriptions have been created. Supply `SETTINGS_MASTER_KEY` and `CLIENT_ORIGIN` in the host's secret/settings UI. Generate the encryption key locally with `openssl rand -hex 32`; do not commit it. Render terminates TLS and forwards to the service. Confirm `/health` and settings transport over the deployed HTTPS URL before distributing a mobile build.

On Render, use the blueprint from the repository and keep auto-deployment disabled for controlled releases. Existing-host alternatives can run the same container behind their HTTPS reverse proxy and persistent volume.

## Mobile configuration

For the optional backend mode, build Expo with `EXPO_PUBLIC_CONNECTION_MODE=backend` and `EXPO_PUBLIC_API_URL=https://<your-api-host>`. That value is public configuration, not a key. A backend-mode APK must be rebuilt with the hosting URL; default device-mode APKs do not use localhost for AI features. The app sends settings bearer tokens only in headers or the live socket's first message; provider keys remain encrypted server-side.

Real Gemini key/voice testing requires saving a key through the app connected to that backend. No Gemini key is configured in this workspace. Do not paste keys into chat.

## Remaining deployment steps

Hosting account selection/authentication and an actual public HTTPS deployment remain pending. The Vercel connector returned a reauthentication error. No deployment URL, external data store or production provider test has been established. Production approved-corpus bundles also remain empty; external web search does not approve those local sources.

## Validation performed

The Docker image built successfully. A temporary production-mode container passed health checks, settings authentication using simulated forwarded HTTPS headers, encrypted fake-key save with no key echo, restart persistence on a named disk volume, and profile deletion. Test containers/volumes were removed. TypeScript and all 44 JavaScript tests pass. These checks do not establish a public HTTPS host, actual Render disk permissions/routing, or a live paid-provider connection.
