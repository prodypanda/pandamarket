const axios = require('axios');
const fs = require('fs');

const API_URL = 'https://evolution-api-5x9s.onrender.com';
const API_KEY = 'sRdf4D54F1SDnuF511dvs541f21dvs51VsF21sGRfs541p2ou900a';
const INSTANCE_NAME = 'pandamarket';

async function generateHtml() {
  try {
    const res = await axios.get(`${API_URL}/instance/connect/${INSTANCE_NAME}`, {
      headers: { apikey: API_KEY },
    });

    const base64Img = res.data?.base64 || res.data?.code;

    const htmlContent = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>PandaMarket - WhatsApp QR Code</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: white; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
    .card { background: white; color: #0f172a; padding: 30px; border-radius: 24px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.5); max-width: 380px; }
    img { width: 260px; height: 260px; border-radius: 12px; margin: 15px 0; border: 2px solid #25D366; }
    h2 { margin: 0; color: #0f172a; }
    p { font-size: 13px; color: #64748b; margin-top: 8px; }
    .step { background: #f1f5f9; padding: 10px 14px; border-radius: 12px; font-size: 12px; font-weight: bold; margin-top: 15px; color: #1e293b; text-align: left; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Connecter WhatsApp 📱</h2>
    <p>Scannez ce QR Code avec votre téléphone pour activer l'envoi de SMS / WhatsApp OTP sur PandaMarket.</p>
    <img src="${base64Img}" alt="WhatsApp QR Code" />
    <div class="step">
      1. Ouvrez WhatsApp sur votre téléphone<br>
      2. Allez dans <strong>Réglages ➔ Appareils connectés</strong><br>
      3. Appuyez sur <strong>Lier un appareil</strong> et scannez
    </div>
  </div>
</body>
</html>`;

    fs.writeFileSync('c:/tek/pandamarket/scratch/qr-code.html', htmlContent);
    console.log('HTML QR Code page generated at scratch/qr-code.html');
  } catch (err) {
    console.error('Error generating QR HTML:', err.message);
  }
}

generateHtml();
