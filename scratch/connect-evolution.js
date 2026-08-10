const axios = require('axios');

const API_URL = 'https://evolution-api-5x9s.onrender.com';
const API_KEY = 'sRdf4D54F1SDnuF511dvs541f21dvs51VsF21sGRfs541p2ou900a';
const INSTANCE_NAME = 'pandamarket';

async function setup() {
  try {
    console.log('1. Creating Evolution API instance:', INSTANCE_NAME);
    const createRes = await axios.post(
      `${API_URL}/instance/create`,
      {
        instanceName: INSTANCE_NAME,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      },
      {
        headers: {
          apikey: API_KEY,
          'Content-Type': 'application/json',
        },
      },
    );
    console.log('Instance Created successfully!');
    console.log(JSON.stringify(createRes.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.log('Instance creation response:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }

  try {
    console.log('\n2. Fetching QR Code / Connection state...');
    const connectRes = await axios.get(
      `${API_URL}/instance/connect/${INSTANCE_NAME}`,
      {
        headers: { apikey: API_KEY },
      },
    );
    console.log('Connection response:');
    console.log(JSON.stringify(connectRes.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.log('Connect error response:', err.response.data);
    } else {
      console.error('Connect error:', err.message);
    }
  }
}

setup();
