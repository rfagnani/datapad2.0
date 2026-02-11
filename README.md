# Tigabytes Datapad Portal

Customer portal prototype for Tigabytes, built with React (Vite) and Supabase authentication. The initial milestone focuses on a branded login experience with Spanish, Portuguese (Brazil), and English localization.

## Highlights
- Supabase email/password sign-in flow wired through `@supabase/supabase-js`.
- Built-in language detection and manual selector powered by `i18next` and `react-i18next`.
- UI adheres to Tigabytes color palette (#051533, #2662DB, #43FFCE) with Red Hat typography and responsive layout.
- Accessible form states with success/error/loading feedback and fallbacks when Supabase keys are not configured.

## Getting Started
1. Install dependencies
   ```bash
   npm install
   ```
2. Configure environment variables
   ```bash
   cp .env.example .env.local
   # Edit with your Supabase project credentials
   ```
3. Run the development server
   ```bash
   npm run dev
   ```
4. Open the local URL printed in the terminal to view the login page prototype.

## Environment Variables
| Key                     | Description                         |
|-------------------------|-------------------------------------|
| `VITE_SUPABASE_URL`     | Supabase project URL               |
| `VITE_SUPABASE_ANON_KEY`| Public anon key for the project    |
| `SUPABASE_URL`          | Fallback URL key (for some Netlify/Supabase integrations) |
| `SUPABASE_ANON_KEY`     | Fallback anon key (for some Netlify/Supabase integrations) |

If the keys are missing, the UI stays interactive but surfaces a descriptive configuration warning when attempting to sign in.
On Netlify, set variables before deploying and trigger a new deploy after any environment variable change.

## Project Structure
- `src/App.tsx` – Branded login page markup and Supabase interaction.
- `src/components/LanguageSelector.tsx` – Language dropdown hooked to `react-i18next`.
- `src/i18n.ts` – Localization setup with Spanish, Portuguese-BR, and English translations.
- `src/lib/supabaseClient.ts` – Supabase client factory reading Vite env vars.
- `src/index.css` & `src/App.css` – Global and component-level styling aligned with Tigabytes branding.

## Next Ideas
- Connect real password reset and SSO flows once the corresponding Supabase providers are configured.
- Add integration tests that mock Supabase responses for CI validation.
- Expand the portal layout with dashboards once authentication is complete.
