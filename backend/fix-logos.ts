import { query } from './src/db/pool';

async function cleanup() {
  console.log('Fixing broken logo URLs in pd_platform_config...');
  
  const updateRes = await query(`
    UPDATE pd_platform_config
    SET value = '/pd-product-images' || value
    WHERE key IN ('marketplace_logo_url', 'marketplace_logo_light_url', 'marketplace_logo_dark_url', 'marketplace_favicon_url')
    AND value LIKE '/branding/%'
  `);
  
  console.log(`Updated ${updateRes.rowCount} branding URLs in pd_platform_config`);
  
  console.log('Cleanup complete!');
  process.exit(0);
}

cleanup().catch(console.error);
