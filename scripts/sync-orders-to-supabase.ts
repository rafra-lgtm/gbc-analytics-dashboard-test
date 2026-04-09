import { config } from 'dotenv';
import { syncRetailOrdersToSupabase } from '../lib/sync';

config({ path: '.env.local' });
config();

async function main() {
  const stats = await syncRetailOrdersToSupabase(false);

  console.log('=== Sync summary ===');
  console.log(`Fetched: ${stats.fetched}`);
  console.log(`Inserted: ${stats.inserted}`);
  console.log(`Updated: ${stats.updated}`);
  console.log(`Failed: ${stats.failed}`);
}

main().catch((error) => {
  console.error('Sync script crashed:', error);
  process.exit(1);
});
