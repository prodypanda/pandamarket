const axios = require('axios');

const RENDER_API_KEY = 'rnd_Zaq8VyRZn5vZfQQTvTIacYHtw2ZV';
const SERVICE_ID = 'srv-d9qjrth42hec73efhoa0';

async function updateService() {
  try {
    const res = await axios.patch(
      `https://api.render.com/v1/services/${SERVICE_ID}`,
      {
        healthCheckPath: '',
      },
      {
        headers: {
          Authorization: `Bearer ${RENDER_API_KEY}`,
          'Content-Type': 'application/json',
        },
      },
    );
    console.log('Health check path removed successfully!');
    console.log(JSON.stringify(res.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.error('Error response:', err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
}

updateService();
