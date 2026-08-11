import { query } from './src/db/pool';

async function cleanup() {
  console.log('Cleaning up garbage image variants from pd_file_asset and pd_file_blobs...');
  
  const suffixes = ['_thumbnail.webp', '_small.webp', '_medium.webp', '_large.webp', '_small.jpg', '_medium.jpg', '_large.jpg', '_thumbnail.jpg', '_small_small.webp'];
  
  for (const suffix of suffixes) {
    console.log(`Deleting variants ending with ${suffix}...`);
    
    // Delete from pd_file_asset
    const assetRes = await query(`DELETE FROM pd_file_asset WHERE file_key LIKE $1 OR url LIKE $1`, [`%${suffix}`]);
    console.log(`Deleted ${assetRes.rowCount} rows from pd_file_asset for ${suffix}`);
    
    // Delete from pd_file_blobs
    const blobsRes = await query(`DELETE FROM pd_file_blobs WHERE key LIKE $1`, [`%${suffix}`]);
    console.log(`Deleted ${blobsRes.rowCount} rows from pd_file_blobs for ${suffix}`);
  }
  
  console.log('Cleanup complete!');
  process.exit(0);
}

cleanup().catch(console.error);
