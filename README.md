# Ruminate Café App

## Configuration

Create an `.env` file based on `.env.example` and provide values for the variables below:


- `EXPO_PUBLIC_INSTAGRAM_FEED_URL` – endpoint that returns the latest Instagram post as JSON (`{ image, caption, url }`). Used on the Home screen to display and link to the most recent post.


Other Supabase-related variables are also required; see `.env.example` for defaults.

## Reward utilities

Run `node scripts/grant-rewards.js <email> <freeDrinks> <loyaltyStamps>` with `SUPABASE_SERVICE_ROLE_KEY` set to grant free drinks and loyalty stamps.

Run `node scripts/reset-rewards.js <email>` with `SUPABASE_SERVICE_ROLE_KEY` to remove all free drinks and loyalty stamps for the given user.
