import 'dotenv/config';
import appJson from './app.json';

export default ({ config }) => {
  const base = { ...(appJson.expo || {}), ...(config || {}) };
  return {
    ...base,
    name: base.name ?? 'Ruminate Cafe',
    slug: base.slug ?? 'ruminate-cafe',
    extra: {
      ...base.extra,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      FUNCTIONS_URL: process.env.FUNCTIONS_URL,
    },
  };
};
