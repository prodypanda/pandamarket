const axios = require('axios');

async function testLoginWithOrigin() {
  try {
    console.log('1. Fetching CSRF with Origin header...');
    const csrfRes = await axios.get('https://pandamarket-backend-fjom.onrender.com/api/pd/auth/csrf', {
      headers: { Origin: 'http://localhost:3000' },
    });
    const cookies = csrfRes.headers['set-cookie'];
    let csrfToken = '';
    if (cookies) {
      for (const c of cookies) {
        const match = c.match(/pd_csrf=([^;]+)/);
        if (match) csrfToken = match[1];
      }
    }
    console.log('CSRF Token:', csrfToken);

    console.log('2. Sending admin login request with Origin header...');
    const res = await axios.post(
      'https://pandamarket-backend-fjom.onrender.com/api/pd/auth/login/admin',
      {
        email: 'admin@pandamarket.tn',
        password: 'Admin123!',
      },
      {
        headers: {
          Origin: 'http://localhost:3000',
          'x-csrf-token': csrfToken,
          Cookie: cookies ? cookies.join('; ') : '',
        },
      },
    );
    console.log('SUCCESS Status:', res.status);
    console.log('Access Control Allow Origin:', res.headers['access-control-allow-origin']);
    console.log('Response User:', res.data.user.email, 'Role:', res.data.user.role);
  } catch (err) {
    if (err.response) {
      console.log('ERROR Status:', err.response.status);
      console.log('ERROR Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Network Error:', err.message);
    }
  }
}

testLoginWithOrigin();
