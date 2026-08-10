const axios = require('axios');

const API_URL = 'https://evolution-api-5x9s.onrender.com';
const API_KEY = 'sRdf4D54F1SDnuF511dvs541f21dvs51VsF21sGRfs541p2ou900a';
const INSTANCE_NAME = 'pandamarket';

async function getQrCode() {
  try {
    const res = await axios.get(`${API_URL}/instance/connect/${INSTANCE_NAME}`, {
      headers: { apikey: API_KEY },
    });
    console.log('Connect Status:', res.data?.instance?.state);
    if (res.data?.base64) {
      console.log('BASE64_QR_CODE_FOUND');
      console.log(res.data.base64);
    } else if (res.data?.code) {
      console.log('PAIRING_CODE:', res.data.code);
    } else {
      console.log('Response:', JSON.stringify(res.data, null, 2));
    }
  } catch (err) {
    if (err.response) {
      console.error('Error response:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
}

getQrCode();
