const axios = require('axios');
const fs = require('fs');

const API_URL = 'https://evolution-api-5x9s.onrender.com';
const API_KEY = 'sRdf4D54F1SDnuF511dvs541f21dvs51VsF21sGRfs541p2ou900a';
const INSTANCE_NAME = 'pandamarket';

async function saveQrImage() {
  try {
    const res = await axios.get(`${API_URL}/instance/connect/${INSTANCE_NAME}`, {
      headers: { apikey: API_KEY },
    });

    const base64Data = res.data?.base64 || res.data?.code;
    if (base64Data && base64Data.startsWith('data:image')) {
      const base64String = base64Data.split(',')[1];
      const buffer = Buffer.from(base64String, 'base64');
      fs.writeFileSync('C:/Users/PC/.gemini/antigravity/brain/ae6b7c8f-9879-48cb-9503-5d6038865e76/whatsapp-qr.png', buffer);
      console.log('QR Code PNG saved to artifacts directory: whatsapp-qr.png');
    } else {
      console.log('No base64 image data found in response:', res.data);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

saveQrImage();
