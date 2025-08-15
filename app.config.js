require('dotenv').config();
const appJson = require('./app.json');

module.exports = ({ config }) => {
  const base = (config && Object.keys(config).length ? config : (appJson.expo || {}));
  return {
    ...base,
    name: base.name || 'Ruminate Cafe',
    slug: base.slug || 'ruminate-cafe',
    extra: {
      ...(base.extra || {}),
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    },
  };
};
