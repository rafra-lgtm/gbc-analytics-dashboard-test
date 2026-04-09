import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from 'dotenv';
import { createRetailOrder } from '../lib/retailcrm';

config({ path: '.env.local' });
config();

type RawOrder = Record<string, unknown>;

async function main() {
  const filePath = path.join(process.cwd(), 'mock_orders.json');
  const fileContent = await readFile(filePath, 'utf-8');
  const orders = JSON.parse(fileContent) as RawOrder[];

  let sent = 0;
  let failed = 0;

  for (const [index, order] of orders.entries()) {
    try {
      await createRetailOrder(order);
      sent += 1;
      console.log(`[${index + 1}/${orders.length}] ✅ Sent`);
    } catch (error) {
      failed += 1;
      console.error(`[${index + 1}/${orders.length}] ❌ Failed`, error);
    }
  }

  console.log('\n=== Import summary ===');
  console.log(`Total: ${orders.length}`);
  console.log(`Sent: ${sent}`);
  console.log(`Failed: ${failed}`);
}

main().catch((error) => {
  console.error('Import script crashed:', error);
  process.exit(1);
});
