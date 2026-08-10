const axios = require('axios');

const RENDER_API_KEY = 'rnd_Zaq8VyRZn5vZfQQTvTIacYHtw2ZV';
const BACKEND_SERVICE_ID = 'srv-d9qjrth42hec73efhoa0';

async function updateEnvVars() {
  try {
    console.log('Updating Render backend environment variables for Evolution API...');
    const res = await axios.put(
      `https://api.render.com/v1/services/${BACKEND_SERVICE_ID}/env-vars`,
      [
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
    console.log('Render backend env vars updated successfully!');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.error('Render API error:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
}

updateEnvVars();
