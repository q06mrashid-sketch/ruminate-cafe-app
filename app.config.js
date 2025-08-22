import 'dotenv/config';
import appJson from './app.json';

export default ({ config }) => {
  const base = config && Object.keys(config).length ? config : (appJson.expo || {});
  return {
    ...base,
    name: base.name || 'Ruminate Cafe',
    slug: base.slug || 'ruminate-cafe',
    extra: {
      ...(base.extra || {}),
      SUPABASE_URL: process.env.SUPABASE_URL || 'https://eamewialuovzguldcdcf.supabase.co',
      SUPABASE_ANON_KEY:
        process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVhbWV3aWFsdW92eGd1bGRjZGNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxNjY5MjIsImV4cCI6MjA3MDc0MjkyMn0.oZy-UH7mB7NSFZZyivm3dbCtjsbOahcD2_coUNiiQNs',
      FUNCTIONS_URL:
        process.env.FUNCTIONS_URL || 'https://eamewialuovzguldcdcf.functions.supabase.co',
    },
  };
};
