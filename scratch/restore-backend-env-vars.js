const axios = require('axios');

const RENDER_API_KEY = 'rnd_Zaq8VyRZn5vZfQQTvTIacYHtw2ZV';
const BACKEND_SERVICE_ID = 'srv-d9qjrth42hec73efhoa0';

async function restoreBackendEnvVars() {
  try {
    console.log('Restoring complete environment variables for Render backend...');
    const res = await axios.put(
      `https://api.render.com/v1/services/${BACKEND_SERVICE_ID}/env-vars`,
      [
        { key: 'PD_NODE_ENV', value: 'production' },
        { key: 'PD_DATABASE_URL', value: 'postgresql://postgres.lwmagicgoqbvkxsyahgu:nh568425NH**--@aws-0-eu-central-1.pooler.supabase.com:6543/postgres' },
        { key: 'PD_REDIS_URL', value: 'redis://default:jrbiELGyUTOJpY751L3RPUah7p5sPlW4@forest-powder-workable-12949.db.redis.io:13264' },
        { key: 'PD_JWT_SECRET', value: 'pd_super_secret_jwt_key_2026' },
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
    console.log('Backend env vars restored successfully!');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.error('Render API error:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
}

restoreBackendEnvVars();
