
+++ b/README.md

 # Ruminate Café App
 
-## Configuration
+Cross‑platform membership and loyalty app for the Ruminate Café, built with [Expo](https://docs.expo.dev/) and React Native. Customers can create a free digital loyalty card to gain stamps (up to 8 for a free drink) or join the paid membership tier to receive 3 monthly drink credits and other perks. The app also shows café opening hours, the latest Instagram post and links to community features.
 

+## Features
 
+- **Home screen** – displays today’s opening status, weekly hours and the latest Instagram post. When signed in, there is a Rumi quote, a tile to show the loyalty stamps available to user, and a tile to show the free drinks available to the user. 
+- **Membership & loyalty** – sign up for a free loyalty card or the paid membership tier, see collected stamps (shown as filled in cofee beans) and view free drink credits (shown as a circular progress counter). a QR carousel shows the User's scannable QR which is shown at the coutner to gain a stamp, and, when a free drink is available, this is added to the carousel as a scannable voucher. 
+- **Digital wallet passes** – generate Apple/Google wallet passes for quick scanning in store.
+- **Account management** – manage subscription details, update profile information and view receipts.
+- **Admin utilities** – scripts for granting or resetting rewards via Supabase. 
 
-- `EXPO_PUBLIC_INSTAGRAM_FEED_URL` – endpoint that returns the latest Instagram post as JSON (`{ image, caption, url }`). Used on the Home screen to display and link to the most recent post.
+## Requirements
 
+- [Node.js](https://nodejs.org/) 18 or later
+- npm
+- Optional: [Expo CLI](https://docs.expo.dev/more/expo-cli/) and an iOS/Android device or simulator
 
-Other Supabase-related variables are also required; see `.env.example` for defaults.
+## Setup
 
-## Reward utilities
+1. Install dependencies:
+   ```sh
+   npm install
+   ```
+2. Create an `.env` file based on `.env.example` and provide values for the variables below.
+
+### Environment variables
+
+| Variable | Description |
+|---------|-------------|
+| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL used by the app |
+| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Public anon key for Supabase client |
+| `EXPO_PUBLIC_FUNCTIONS_URL` | Base URL for Supabase Edge Functions |
+| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Same values for server‑side scripts |
+| `FUNCTIONS_URL` | Same as `EXPO_PUBLIC_FUNCTIONS_URL` but for scripts |
+| `SERVICE_ROLE_KEY` | Supabase service‑role key used by utilities |
+| `EXPO_PUBLIC_INSTAGRAM_FEED_URL` | Optional endpoint returning the latest Instagram post as `{ image, caption, url }` for the Home screen |
+
+## Development
+
+Start the Expo development server:
+```sh
+npm start
+```
+
+Additional scripts:
+
+| Command | Description |
+|---------|-------------|
+| `npm run android` | Build and run the app on Android |
+| `npm run ios` | Build and run the app on iOS |
+| `npm run web` | Run the app in a web browser |
+| `npm run mock` | Generate wallet passes then start Expo |
+| `npm run grant-rewards <email> <freeDrinks> <loyaltyStamps>` | Grant free drinks and loyalty stamps (requires `SUPABASE_SERVICE_ROLE_KEY`) |
+| `npm run reset-rewards <email>` | Remove all drink vouchers and stamps for a user |
+
+## Project structure
+
+```
+src/
+  components/    # Reusable UI elements
+  navigation/    # React Navigation setup
+  screens/       # Feature screens (Home, Membership, Loyalty, etc.)
+  services/      # Data fetching and business logic
+```
+
+`assets/` contains images and fonts. Scripts for admin utilities live in `scripts/`.
+
+## Testing
+
+No automated test suite is currently configured. Running `npm test` will output a warning because no `test` script exists.
 
-Run `node scripts/grant-rewards.js <email> <freeDrinks> <loyaltyStamps>` with `SUPABASE_SERVICE_ROLE_KEY` set to grant free drinks and loyalty stamps. node scripts/reset-rewards.js <email> will reset rewards. 
 
EOF
)
