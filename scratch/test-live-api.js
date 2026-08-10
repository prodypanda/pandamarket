const axios = require('axios');

async function testApi() {
  const baseUrl = 'https://pandamarket-backend-fjom.onrender.com/api/pd';

  try {
    const storeRes = await axios.get(`${baseUrl}/products/public?store_id=pd_store_6hA7WWUBufUDF5ga&limit=5`);
    console.log(JSON.stringify(storeRes.data, null, 2));
  } catch (err) {
    console.error('API test error:', err.message);
  }
}

testApi();
