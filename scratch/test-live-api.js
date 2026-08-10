const axios = require('axios');

async function testQrCode() {
  try {
    console.log('Testing live QR code endpoint...');
    const res = await axios.get('https://pandamarket-backend-fjom.onrender.com/api/pd/auth/whatsapp/qr-code');
    console.log('QR Code HTML Response Status:', res.status);
    console.log('First 200 chars:', res.data.slice(0, 200));
  } catch (err) {
    if (err.response) {
      console.log('API Response error status:', err.response.status);
      console.log('Data:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
}

testQrCode();
