require('dotenv').config({ path: 'c:/tek/pandamarket/backend/.env' });
const { subscriptionPaymentService } = require('../backend/dist/backend/src/services/subscription-payment.service.js');
async function run() {
  try {
    console.log("Calling getFraudEarlyWarningRadar...");
    const radar = await subscriptionPaymentService.getFraudEarlyWarningRadar();
    console.log("Success! Returned items:", radar.length);
  } catch (err) {
    console.error("Error occurred:", err);
  }
  process.exit(0);
}
run();
