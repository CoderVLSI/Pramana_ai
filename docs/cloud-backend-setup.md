# Optional cloud accounts: Supabase

Use a Supabase **Free** project for initial authentication and small profile backups. No paid hosting or separate app server is needed for these records. Gemini/OpenAI usage is billed by those providers separately; Supabase does not make AI calls free.

The official pricing page advertises a Free plan with 50,000 monthly active users. Free projects have storage/traffic limits and may pause after inactivity; verify current limits at https://supabase.com/pricing before launch. Choose Free explicitly and do not enable paid upgrades.

## Provisioning

1. Sign in at https://supabase.com/dashboard and create a Free project named Pramana. Pick a region near users. Keep the database password private.
2. Run `supabase/migrations/202610100001_user_sync.sql` in the project's SQL editor, or apply it with the Supabase CLI using authenticated project access.
3. Configure email authentication. For production email delivery, configure an SMTP provider: default Supabase email delivery has restrictive limits and is unsuitable for general production signups. Google sign-in additionally requires a Google OAuth client and approved redirect configuration.
4. Obtain the project URL and **publishable** key. Only these public values belong in app configuration. Never put a service-role/secret key in the APK or Git.
5. The source now includes email/password account creation, confirmation instructions, sign-in, session refresh, local sign-out, and manual backup/restore/delete in Settings. Native sessions use SecureStore; web sessions use tab sessionStorage. Existing APKs require a rebuild to include this flow.

## Data and privacy

The migration provides owner-only row-level policies for authenticated CRUD. Anonymous clients have no table access; account deletion cascades to its settings record. Test access with two different accounts before launch.

`packages/cloud-sync` prepares explicit, manual upload/download/delete operations. Its whitelist includes profile and reading preferences; approved memories require a separate opt-in to upload. It excludes API keys, scratchpad, pending memory suggestions, screenshots, and chat history. Download never silently replaces local data. Cloud storage consent and AI memory-sharing consent are separate decisions.

Before connecting a public app, verify migration application, two-account isolation, email delivery, Google redirects if enabled, token refresh/sign-out, restore confirmation, deletion, privacy policy and free-tier limits. This preparation is not a deployed or tested cloud account system.

## Connected project

Public client configuration lives in `apps/mobile/cloud-config.ts` and can be overridden with the two Expo public environment variables in `.env.example`. Project: `https://fdntjeknihekiqldyrpn.supabase.co`.

A read-only connectivity check on 11 October 2026 returned HTTP 200 from Auth settings with email enabled and Google disabled. The Data API returned PGRST205 for `user_settings`: the migration has not been applied or the table is not available in the schema cache. Public configuration does not grant database-administration access. Apply the SQL migration in the dashboard before testing authenticated sync. Sign-in UI remains pending; existing APKs do not acquire new configuration automatically.

## Account flow validation

Email account creation can require confirmation in the inbox before password sign-in. Creating an account never uploads study data. Backup and restore are manual, with separate approved-memory opt-in and restore confirmation. Scratchpad, pending suggestions, API keys, history and screenshots are excluded. Restore preserves local AI-sharing consent. Sign-out clears local credentials even if server logout cannot complete offline. Deleting a backup does not delete the authentication account.

Authentication/session tests cover confirmation without a session, expired token refresh with simultaneous callers, exclusion of passwords from persisted sessions, and offline sign-out. Real email delivery, authenticated two-account row isolation, and actual backup/restore on this project still require user sign-in testing. Full account deletion and password recovery remain release tasks; this is not yet a Play Store-ready account system.
