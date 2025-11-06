/**
 * PRIVACY MIXER - COMPLETE FLOW TEST
 *
 * This CLI app:
 * 1. Generates deposit and recipient wallets
 * 2. Displays private keys for backup
 * 3. Waits for 0.1 SOL deposit
 * 4. Executes full privacy mixing flow
 * 5. Monitors until recipient receives SOL
 *
 * Usage:
 *   bun run scripts/test-privacy-flow.ts
 */

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  createPrivacyMixPlan,
  checkSwapStatus,
  submitDepositTx,
} from '../lib/privacy-mixer-near';
import bs58 from 'bs58';
import * as readline from 'readline';

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');

const REQUIRED_AMOUNT = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL
const POLL_INTERVAL = 5000; // 5 seconds

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForUserConfirmation(message: string): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (Press Enter to continue)`, () => {
      rl.close();
      resolve();
    });
  });
}

async function monitorBalance(publicKey: PublicKey, targetAmount: number): Promise<number> {
  log(`\n⏳ Monitoring ${publicKey.toBase58()} for deposits...`, 'yellow');
  log(`   Waiting for ${targetAmount / LAMPORTS_PER_SOL} SOL`, 'dim');

  while (true) {
    try {
      const balance = await connection.getBalance(publicKey);

      if (balance > 0) {
        log(`   Current balance: ${balance / LAMPORTS_PER_SOL} SOL`, 'dim');
      }

      if (balance >= targetAmount) {
        log(`\n✅ Deposit detected: ${balance / LAMPORTS_PER_SOL} SOL`, 'green');
        return balance;
      }

      await sleep(POLL_INTERVAL);
    } catch (error) {
      log(`   Error checking balance: ${error}`, 'red');
      await sleep(POLL_INTERVAL);
    }
  }
}

async function waitForSwapCompletion(
  depositAddress: string,
  depositMemo: string | undefined,
  hopNumber: number
): Promise<void> {
  log(`\n⏳ Waiting for HOP ${hopNumber} to complete...`, 'yellow');
  log(`   Checking status every 10 seconds`, 'dim');

  const maxAttempts = 120; // 10 minutes max
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const status = await checkSwapStatus(depositAddress, depositMemo);

      log(`   Status: ${status.status}`, 'dim');

      if (status.status === 'SUCCESS') {
        log(`\n✅ HOP ${hopNumber} completed!`, 'green');
        if (status.swapDetails) {
          log(`   Amount out: ${status.swapDetails.amountOutFormatted}`, 'dim');
        }
        return;
      } else if (status.status === 'FAILED' || status.status === 'REFUNDED') {
        throw new Error(`HOP ${hopNumber} ${status.status}`);
      }

      attempts++;
      await sleep(10000); // 10 seconds
    } catch (error: any) {
      if (error.message.includes('HOP')) {
        throw error;
      }
      log(`   Error checking status: ${error.message}`, 'red');
      attempts++;
      await sleep(10000);
    }
  }

  throw new Error(`Timeout waiting for HOP ${hopNumber}`);
}

async function main() {
  console.clear();

  log('═'.repeat(80), 'cyan');
  log('🎭 PRIVACY MIXER - COMPLETE FLOW TEST', 'bright');
  log('═'.repeat(80), 'cyan');

  log('\nThis test will:', 'bright');
  log('  1. Generate deposit and recipient wallets', 'dim');
  log('  2. Wait for you to deposit 0.1 SOL', 'dim');
  log('  3. Execute full privacy mixing flow (SOL → ZEC → SOL)', 'dim');
  log('  4. Monitor until recipient receives funds', 'dim');

  // Step 1: Generate wallets
  log('\n━━━ STEP 1: Generate Wallets ━━━', 'bright');

  const depositKeypair = Keypair.generate();
  const recipientKeypair = Keypair.generate();

  log('\n📦 Deposit Wallet:', 'green');
  log(`   Address: ${depositKeypair.publicKey.toBase58()}`, 'bright');
  log(`   Private Key: ${bs58.encode(depositKeypair.secretKey)}`, 'yellow');
  log(`   ⚠️  Save this private key! You\'ll need it if something goes wrong.`, 'red');

  log('\n📦 Recipient Wallet:', 'green');
  log(`   Address: ${recipientKeypair.publicKey.toBase58()}`, 'bright');
  log(`   Private Key: ${bs58.encode(recipientKeypair.secretKey)}`, 'yellow');

  // Save wallet info to file
  const walletInfo = {
    depositAddress: depositKeypair.publicKey.toBase58(),
    depositPrivateKey: bs58.encode(depositKeypair.secretKey),
    recipientAddress: recipientKeypair.publicKey.toBase58(),
    recipientPrivateKey: bs58.encode(recipientKeypair.secretKey),
    timestamp: new Date().toISOString(),
  };

  const fs = require('fs');
  fs.writeFileSync(
    'test-wallets.json',
    JSON.stringify(walletInfo, null, 2)
  );
  log('\n💾 Wallet info saved to: test-wallets.json', 'cyan');

  // Step 2: Wait for deposit
  log('\n━━━ STEP 2: Wait for Deposit ━━━', 'bright');
  log(`\n💰 Please send exactly 0.1 SOL to:`, 'yellow');
  log(`   ${depositKeypair.publicKey.toBase58()}`, 'bright');

  await waitForUserConfirmation('\n✋ Press Enter after you\'ve sent the SOL...');

  const depositBalance = await monitorBalance(depositKeypair.publicKey, REQUIRED_AMOUNT);
  const depositAmount = depositBalance / LAMPORTS_PER_SOL;

  // Step 3: Create privacy mix plan
  log('\n━━━ STEP 3: Create Privacy Mix Plan ━━━', 'bright');

  const transactionId = `cli-test-${Date.now()}`;

  log(`\n🎭 Creating privacy mix plan...`, 'cyan');
  log(`   Amount: ${depositAmount} SOL`, 'dim');
  log(`   Recipient: ${recipientKeypair.publicKey.toBase58()}`, 'dim');

  const plan = await createPrivacyMixPlan(
    {
      amountSOL: depositAmount,
      recipientAddress: recipientKeypair.publicKey.toBase58(),
      refundAddress: depositKeypair.publicKey.toBase58(),
      timeDelayMinutes: 2.5,
      slippageTolerance: 100,
      referral: 'privacycash-cli',
    },
    transactionId
  );

  log('\n✅ Privacy mix plan created!', 'green');
  log(`   Total hops: ${plan.totalHops}`, 'dim');
  log(`   Estimated time: ~${plan.estimatedTotalTimeMinutes} minutes`, 'dim');
  log(`   Estimated output: ${plan.estimatedFinalAmount.toFixed(6)} SOL`, 'dim');

  // Step 4: Execute HOP 1 (SOL → ZEC)
  log('\n━━━ STEP 4: Execute HOP 1 (SOL → ZEC) ━━━', 'bright');

  const hop1 = plan.hops[0];

  log(`\n📤 Sending ${depositAmount} SOL to NEAR Intents...`, 'cyan');
  log(`   Deposit address: ${hop1.depositAddress}`, 'dim');
  log(`   Expected output: ${hop1.expectedAmountOut} ZEC`, 'dim');

  // Reserve 0.001 SOL for transaction fee + rent-exemption
  const TX_FEE_RESERVE = 1000000; // 0.001 SOL (covers fee + rent-exempt minimum)
  const amountToSend = Math.floor(depositAmount * LAMPORTS_PER_SOL) - TX_FEE_RESERVE;

  log(`\n💸 Amount breakdown:`, 'dim');
  log(`   Total balance: ${depositAmount} SOL`, 'dim');
  log(`   Transaction fee reserve: ${TX_FEE_RESERVE / LAMPORTS_PER_SOL} SOL`, 'dim');
  log(`   Amount to send: ${amountToSend / LAMPORTS_PER_SOL} SOL`, 'dim');

  // Send SOL to hop 1 deposit address
  const depositTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: depositKeypair.publicKey,
      toPubkey: new PublicKey(hop1.depositAddress),
      lamports: amountToSend,
    })
  );

  log(`\n⏳ Sending transaction...`, 'yellow');
  const signature = await sendAndConfirmTransaction(connection, depositTx, [depositKeypair]);

  log(`\n✅ Transaction sent!`, 'green');
  log(`   Signature: ${signature}`, 'dim');
  log(`   Explorer: https://solscan.io/tx/${signature}`, 'blue');

  // Notify NEAR Intents
  try {
    await submitDepositTx(signature, hop1.depositAddress);
    log(`\n✅ NEAR Intents notified`, 'green');
  } catch (error) {
    log(`\n⚠️  Failed to notify NEAR Intents (continuing anyway)`, 'yellow');
  }

  // Step 5: Wait for HOP 1 completion
  log('\n━━━ STEP 5: Wait for HOP 1 Completion ━━━', 'bright');

  await waitForSwapCompletion(hop1.depositAddress, hop1.depositMemo, 1);

  // Step 6: Wait for time delay
  log('\n━━━ STEP 6: Time Delay (Privacy Enhancement) ━━━', 'bright');

  const delayMinutes = 2.5;
  const delaySeconds = delayMinutes * 60;

  log(`\n⏰ Waiting ${delayMinutes} minutes before HOP 2...`, 'yellow');
  log(`   This breaks temporal correlation for enhanced privacy`, 'dim');

  for (let i = delaySeconds; i > 0; i--) {
    process.stdout.write(`\r   Time remaining: ${Math.floor(i / 60)}m ${i % 60}s   `);
    await sleep(1000);
  }
  process.stdout.write('\r\n');

  log(`\n✅ Time delay complete!`, 'green');

  // Step 7: Next Steps - HOP 2
  log('\n━━━ STEP 7: Complete HOP 2 ━━━', 'bright');

  log(`\n✅ HOP 1 Complete: SOL → ZEC`, 'green');
  log(`   ZEC stored in NEAR account: ${process.env.NEAR_ACCOUNT || 'mertcash.near'}`, 'dim');
  log(`   Amount: ${hop1.expectedAmountOut} ZEC`, 'dim');

  log(`\n📋 To complete HOP 2 (ZEC → SOL), START THE RELAYER:`, 'yellow');
  log(`\n   Open a new terminal and run:`, 'bright');
  log(`   ───────────────────────────────`, 'dim');
  log(`   bun run relayer:near`, 'cyan');
  log(`   ───────────────────────────────`, 'dim');

  log(`\n🔄 The relayer will:`, 'dim');
  log(`   1. Detect this transaction in the database`, 'dim');
  log(`   2. Create HOP 2 quote (ZEC → SOL)`, 'dim');
  log(`   3. Execute the swap from NEAR account`, 'dim');
  log(`   4. Deliver SOL to recipient`, 'dim');

  log(`\n💡 Alternative: Wait for automatic processing`, 'dim');
  log(`   If relayer is already running, it will process automatically`, 'dim');

  // Ask user if they want to monitor
  log(`\n❓ Do you want to monitor the recipient wallet?`, 'yellow');
  log(`   (The relayer needs to be running for HOP 2 to complete)`, 'dim');

  await waitForUserConfirmation('\nPress Enter to start monitoring (or Ctrl+C to exit and start relayer)...');

  // Step 8: Monitor recipient wallet
  log('\n━━━ STEP 8: Monitor Recipient Wallet ━━━', 'bright');

  log(`\n👀 Monitoring recipient for incoming SOL...`, 'cyan');
  log(`   Address: ${recipientKeypair.publicKey.toBase58()}`, 'dim');
  log(`   Expected: ~${plan.estimatedFinalAmount.toFixed(6)} SOL`, 'dim');
  log(`   ⚠️  Make sure relayer is running!`, 'yellow');

  const maxMonitorTime = 15 * 60 * 1000; // 15 minutes
  const startTime = Date.now();
  let recipientBalance = 0;

  while (Date.now() - startTime < maxMonitorTime) {
    try {
      recipientBalance = await connection.getBalance(recipientKeypair.publicKey);

      if (recipientBalance > 0) {
        log(`\n💰 Recipient balance: ${recipientBalance / LAMPORTS_PER_SOL} SOL`, 'green');
      }

      if (recipientBalance >= 0.01 * LAMPORTS_PER_SOL) {
        break;
      }

      // Show elapsed time
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      process.stdout.write(`\r   ⏱️  Waiting... (${Math.floor(elapsed / 60)}m ${elapsed % 60}s elapsed)   `);

      await sleep(10000); // Check every 10 seconds
    } catch (error) {
      log(`   Error checking balance: ${error}`, 'red');
      await sleep(10000);
    }
  }
  process.stdout.write('\r\n');

  // Final results
  log('\n═'.repeat(80), 'cyan');
  log('🎉 PRIVACY MIX TEST COMPLETE!', 'bright');
  log('═'.repeat(80), 'cyan');

  log('\n📊 Final Results:', 'bright');
  log(`   Input: ${depositAmount} SOL`, 'dim');
  log(`   Output: ${recipientBalance / LAMPORTS_PER_SOL} SOL`, 'dim');
  log(`   Actual fee: ${((1 - recipientBalance / depositBalance) * 100).toFixed(2)}%`, 'dim');

  if (recipientBalance > 0) {
    log('\n✅ SUCCESS!', 'green');
    log(`   Recipient received: ${recipientBalance / LAMPORTS_PER_SOL} SOL`, 'bright');
    log(`   Privacy: HIGH (SOL → ZEC → SOL routing)`, 'dim');
  } else {
    log('\n⚠️  Recipient has not received funds yet', 'yellow');
    log(`   This might be normal if HOP 2 is still processing`, 'dim');
    log(`   Check recipient balance manually: ${recipientKeypair.publicKey.toBase58()}`, 'dim');
  }

  log('\n📁 Wallet Info:', 'bright');
  log(`   Saved to: test-wallets.json`, 'dim');

  log('\n🔗 Useful Links:', 'bright');
  log(`   Deposit wallet: https://solscan.io/account/${depositKeypair.publicKey.toBase58()}`, 'blue');
  log(`   Recipient wallet: https://solscan.io/account/${recipientKeypair.publicKey.toBase58()}`, 'blue');
  log(`   Transaction: https://solscan.io/tx/${signature}`, 'blue');

  log('\n💡 Next Steps:', 'bright');
  if (recipientBalance === 0) {
    log(`   1. Wait for HOP 2 to complete (check relayer logs)`, 'dim');
    log(`   2. Or manually trigger HOP 2 from NEAR account`, 'dim');
    log(`   3. Monitor recipient: ${recipientKeypair.publicKey.toBase58()}`, 'dim');
  } else {
    log(`   1. Verify funds in recipient wallet`, 'dim');
    log(`   2. Check that sender/recipient addresses are unlinked`, 'dim');
    log(`   3. Ready for production deployment!`, 'dim');
  }

  log('\n');
}

// Run the test
main()
  .then(() => {
    log('✅ Test completed', 'green');
    process.exit(0);
  })
  .catch((error) => {
    log(`\n❌ Test failed: ${error.message}`, 'red');
    if (error.stack) {
      log(`\nStack trace:`, 'dim');
      log(error.stack, 'dim');
    }
    process.exit(1);
  });
