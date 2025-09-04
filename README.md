# Ruminate Café App

Cross‑platform membership and loyalty app for the Ruminate Café built with [Expo](https://docs.expo.dev/) and React Native.
The app shows opening hours, specials and quotes pulled from the CMS, and lets customers collect loyalty stamps or manage paid memberships.

## Requirements

- Node.js 18+
- npm
- Optional: [Expo CLI](https://docs.expo.dev/more/expo-cli/) and a device or simulator

## Setup

1. Install dependencies:
   ```sh
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in the values:
   ```sh
   cp .env.example .env
   ```

### Environment variables

| Variable | Description |
|---------|-------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Public anon key for the Supabase client |
| `EXPO_PUBLIC_FUNCTIONS_URL` | Base URL for Supabase Edge Functions |
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Same values for server‑side scripts |
| `FUNCTIONS_URL` | Same as `EXPO_PUBLIC_FUNCTIONS_URL` but for scripts |
| `SERVICE_ROLE_KEY` | Supabase service‑role key used by utilities |
| `EXPO_PUBLIC_INSTAGRAM_FEED_URL` | Optional endpoint returning the latest Instagram post |
| `CMS_FUNCTIONS_BASE` | Base URL for CMS Supabase functions |
| `SUPABASE_ANON` | Anon key sent with CMS function requests |

## Development

Start the Expo development server:
```sh
npm start
```

### Testing CMS integration

1. Open the web CMS and add keys `special 1`, `special 2` and `rumi quote`.
2. Run the app in Expo Go and pull to refresh on the Home screen.
3. The specials and quote should match the values from the CMS.
4. Deleting a key in the CMS and refreshing the app should remove it from the UI.

## Project structure

```
src/
  components/    # Reusable UI elements
  navigation/    # React Navigation setup
  screens/       # Feature screens (Home, Membership, Loyalty, etc.)
  services/      # Data fetching and business logic
```

Assets live in `assets/` and scripts for admin utilities are in `scripts/`.

## Tests

Run the type-checked test suite:
```sh
npm test
```
