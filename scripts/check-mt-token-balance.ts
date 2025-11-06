/**
 * Check mt-token balance on NEAR Intents
 *
 * This checks the multi-token balance stored in intents.near contract
 * (where HOP 1 deposits ZEC)
 *
 * Usage: bun run scripts/check-mt-token-balance.ts
 */

import { getNearConnection, checkNearCredentials } from '../lib/near-helper';

const NEAR_ACCOUNT_ID = process.env.NEAR_ACCOUNT || 'mertcash.near';
const INTENTS_CONTRACT = 'intents.near';
const ZEC_MT_TOKEN_ID = 'zec.omft.near';

async function main() {
  console.log('🔍 Checking MT-Token Balance (NEAR Intents)\n');

  // Check credentials
  if (!checkNearCredentials()) {
    console.error('❌ Please configure NEAR credentials in .env file');
    process.exit(1);
  }

  try {
    const { account } = await getNearConnection();

    console.log(`📊 Checking balance for: ${NEAR_ACCOUNT_ID}`);
    console.log(`📍 Contract: ${INTENTS_CONTRACT}`);
    console.log(`🪙 Token ID: ${ZEC_MT_TOKEN_ID}\n`);

    // Check mt-token balance using batch method (returns array)
    console.log('💰 Checking mt-token balance...');
    const balances = await account.viewFunction({
      contractId: INTENTS_CONTRACT,
      methodName: 'mt_batch_balance_of',
      args: {
        account_id: NEAR_ACCOUNT_ID,
        token_ids: [`nep141:${ZEC_MT_TOKEN_ID}`],
      },
    });

    const balance = balances && balances.length > 0 ? balances[0] : '0';

    const balanceZatoshis = BigInt(balance);
    const balanceZEC = Number(balanceZatoshis) / 1e8;

    console.log(`\n📊 MT-Token Balance:`);
    console.log(`   intents.near:zec.omft.near`);
    console.log(`   ZEC: ${balanceZEC.toFixed(8)} ZEC`);
    console.log(`   Zatoshis: ${balanceZatoshis.toString()}\n`);

    if (balanceZatoshis === BigInt(0)) {
      console.log('⚠️  No ZEC in mt-token balance!');
      console.log('   This could mean:');
      console.log('   1. HOP 1 hasn\'t completed yet');
      console.log('   2. ZEC has already been used for HOP 2');
      console.log('   3. Check NEAR Intents status\n');
    } else {
      console.log('✅ ZEC available for HOP 2!');
      console.log(`   You can transfer ${balanceZEC.toFixed(8)} ZEC for swaps\n`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('\nPossible causes:');
    console.error('1. Account not registered with intents.near');
    console.error('2. Invalid token_id');
    console.error('3. Network connectivity issues\n');
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  });
