import { query } from './src/db/pool';

async function fix() {
  const goodUrl = '/pd-product-images/marketplace/branding/pd_user_56F6TsjNRjNJJHyk/pd_file_xNXPusk79gdPnQtm.png';
  
  await query(`
    UPDATE pd_platform_config
    SET value = $1
    WHERE key IN ('marketplace_logo_url', 'marketplace_logo_dark_url')
  `, [goodUrl]);
  
  console.log("Updated logos to use existing blob!");
  process.exit(0);
}

fix().catch(console.error);
