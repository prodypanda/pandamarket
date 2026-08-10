const axios = require('axios');

async function testSingleProduct() {
  const baseUrl = 'https://pandamarket-backend-fjom.onrender.com/api/pd';
  try {
    const listRes = await axios.get(`${baseUrl}/products/public?store_id=pd_store_6hA7WWUBufUDF5ga&limit=1`);
    const sampleId = listRes.data.data[0].id;
    console.log('Sample Product ID:', sampleId);

    const prodRes = await axios.get(`${baseUrl}/products/${sampleId}`);
    console.log('Single product response keys & store fields:', {
      id: prodRes.data.product.id,
      title: prodRes.data.product.title,
      store_name: prodRes.data.product.store_name,
      store_subdomain: prodRes.data.product.store_subdomain,
      store_custom_domain: prodRes.data.product.store_custom_domain,
      store_is_verified: prodRes.data.product.store_is_verified,
      store_seller_type: prodRes.data.product.store_seller_type,
      store_status: prodRes.data.product.store_status,
      store_settings: prodRes.data.product.store_settings,
      store_created_at: prodRes.data.product.store_created_at,
      store_product_count: prodRes.data.product.store_product_count,
    });
  } catch (err) {
    console.error('Error:', err.message, err.response?.data);
  }
}

testSingleProduct();
