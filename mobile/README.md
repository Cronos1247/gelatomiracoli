# Gelato Miracoli Mobile

This is the Expo companion app for the main Next.js web project.

## Setup

1. Copy `.env.example` to `.env`.
2. Set:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - optionally `EXPO_PUBLIC_WEB_API_BASE_URL`

For iPhone testing against your laptop, set `EXPO_PUBLIC_WEB_API_BASE_URL` to your LAN URL, for example:

`http://192.168.1.40:3000`

Then run the web app from the repo root with:

`npm run dev:lan`

And the mobile app with:

`npm run mobile:start`

## Notes

- Pantry loading works directly from Supabase.
- The Maestro mobile assistant can call the richer Next.js assistant route when the web app is reachable on your network.
- If the web API is not reachable, the app falls back to local archetype-based drafting.
