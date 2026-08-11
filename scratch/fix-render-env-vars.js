const axios = require('axios');

const RENDER_API_KEY = 'rnd_Zaq8VyRZn5vZfQQTvTIacYHtw2ZV';
const BACKEND_SERVICE_ID = 'srv-d9qjrth42hec73efhoa0';

async function fixEnvVars() {
  try {
    console.log('Setting all required environment variables for Render backend...');
    const res = await axios.put(
      `https://api.render.com/v1/services/${BACKEND_SERVICE_ID}/env-vars`,
      [
        { key: 'PD_NODE_ENV', value: 'production' },
        { key: 'PD_DATABASE_URL', value: 'postgresql://postgres.lwmagicgoqbvkxsyahgu:nh568425NH**--@aws-0-eu-central-1.pooler.supabase.com:6543/postgres' },
        { key: 'PD_DATABASE_SSL', value: 'true' },
        { key: 'PD_REDIS_URL', value: 'redis://default:jrbiELGyUTOJpY751L3RPUah7p5sPlW4@forest-powder-workable-12949.db.redis.io:13264' },
        { key: 'PD_JWT_SECRET', value: 'pd_prod_jwt_secret_x9f2k7m4p1w8q3r6' },
        { key: 'PD_COOKIE_SECRET', value: 'pd_prod_cookie_secret_a3b7c5d9e1f4g8h2' },
        { key: 'PD_ENCRYPTION_KEY', value: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2' },
        { key: 'PD_SMS_PROVIDER', value: 'whatsapp_gateway' },
        { key: 'PD_WHATSAPP_GATEWAY_URL', value: 'https://evolution-api-5x9s.onrender.com/message/sendText/pandamarket' },
        { key: 'PD_WHATSAPP_GATEWAY_TOKEN', value: 'sRdf4D54F1SDnuF511dvs541f21dvs51VsF21sGRfs541p2ou900a' },
      ],
      {
        headers: {
          Authorization: `Bearer ${RENDER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    );
    console.log('All env vars set! Including PD_COOKIE_SECRET and PD_ENCRYPTION_KEY.');
    console.log(res.data.map(d => d.envVar.key).join(', '));
  } catch (err) {
    if (err.response) {
      console.error('Render API error:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
}

fixEnvVars();
