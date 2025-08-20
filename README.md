# Ruminate Café App

## Configuration

Create an `.env` file based on `.env.example` and provide values for the variables below:

- `EXPO_PUBLIC_INSTAGRAM_FEED_URL` – endpoint that returns the latest Instagram post as JSON. The response should include an image URL (e.g. `image`, `image_url`, or `media_url`) and may include a `caption`. Used on the Home screen to display the most recent post.

Other Supabase-related variables are also required; see `.env.example` for defaults.
