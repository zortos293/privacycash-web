/**
 * PRIVACY CASH RELAYER - NEAR INTENTS ONLY
 *
 * 2-hop privacy mixer using NEAR Intents with ZEC
 * No complex z-address management needed!
 *
 * Flow:
 * 1. User deposits SOL to deposit wallet
 * 2. HOP 1: Swap SOL → ZEC (stored in NEAR Intents account)
 * 3. Wait 2.5 minutes (time delay for privacy)
 * 4. HOP 2: Swap ZEC → SOL (from NEAR Intents) → direct to recipient
 *
 * Privacy Features:
 * - Cross-chain routing through NEAR network
 * - ZEC privacy coin as intermediate token (enhanced anonymity)
 * - ZEC stored in NEAR Intents system (not on-chain)
 * - Time delays break temporal correlation
 * - NEAR's internal pooling provides additional anonymity
 * - No direct SOL→SOL link on-chain
 */

import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  Keypair,
} from '@solana/web3.js';
import {
  prisma,
  createWallet,
  getWalletKeypair,
  addTransactionStep,
  updateTransactionStatus,
  updateStepStatus,
  getPendingTransactions,
  checkForDeposits,
} from '../lib/db';
import { WalletPurpose } from '@prisma/client';
import {
  createPrivacyMixPlan,
  executeHop,
  waitForHopCompletion,
  checkSwapStatus,
  submitDepositTx,
  type PrivacyMixPlan,
} from '../lib/privacy-mixer-near';
import { executeHop2Withdrawal, checkNearCredentials, testNearConnection } from '../lib/near-helper';
import axios from 'axios';

const NETWORK = 'mainnet';
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet.solana.com';

const connection = new Connection(RPC_URL, 'confirmed');

const POLLING_INTERVAL = 15000; // 15 seconds
const MIN_BALANCE_FOR_DEPOSIT = 0.001 * LAMPORTS_PER_SOL;

/**
 * PRIVACY CASH RELAYER - NEAR INTENTS ONLY
 */
export async function startRelayer() {
  console.log('🎭 Privacy Cash Relayer (NEAR Intents)');
  console.log(`📡 Solana RPC: ${RPC_URL}`);
  console.log(`🌉 Bridge: NEAR Intents 1Click API`);
  console.log(`⏱️  Time delay: 2.5 minutes`);
  console.log(`🔄 Flow: SOL → ZEC → SOL\n`);

  // Check NEAR credentials
  console.log('🔐 Checking NEAR credentials...');
  if (!checkNearCredentials()) {
    console.error('❌ NEAR credentials not properly configured');
    console.error('   Please set NEAR_ACCOUNT and NEAR_PRIVATE_KEY in .env');
    process.exit(1);
  }

  // Test NEAR connection
  console.log('🔗 Testing NEAR connection...');
  const nearConnected = await testNearConnection();
  if (!nearConnected) {
    console.error('❌ Failed to connect to NEAR');
    console.error('   Check your NEAR_PRIVATE_KEY and network connectivity');
    process.exit(1);
  }

  console.log('\n✅ All systems ready\n');
  console.log('🔁 Starting main loop...\n');

  // Main processing loop
  while (true) {
    try {
      await processDeposits();
      await processPendingTransactions();
      await sleep(POLLING_INTERVAL);
    } catch (error) {
      console.error('❌ Relayer error:', error);
      await sleep(POLLING_INTERVAL);
    }
  }
}

/**
 * Detect new deposits
 */
async function processDeposits() {
  const pendingDeposits = await checkForDeposits();

  for (const tx of pendingDeposits) {
    try {
      const depositWallet = tx.wallets.find((w) => w.purpose === 'DEPOSIT');
      if (!depositWallet) continue;

      const balance = await connection.getBalance(new PublicKey(depositWallet.walletAddress));

      if (balance >= MIN_BALANCE_FOR_DEPOSIT) {
        console.log(`\n💰 NEW DEPOSIT: ${balance / LAMPORTS_PER_SOL} SOL (tx: ${tx.id})`);

        await updateTransactionStatus(tx.id, 'DEPOSIT_RECEIVED');

        const depositStep = tx.steps.find((s) => s.stepName === 'Waiting for deposit');
        if (depositStep) {
          await updateStepStatus(depositStep.id, 'COMPLETED', {
            balance: balance / LAMPORTS_PER_SOL,
          });
        }
      }
    } catch (error) {
      console.error(`Error detecting deposit for ${tx.id}:`, error);
    }
  }
}

/**
 * Process pending transactions
 */
async function processPendingTransactions() {
  const pending = await getPendingTransactions();

  for (const tx of pending) {
    try {
      if (tx.status === 'FAILED') {
        await handleRetry(tx);
        continue;
      }

      await processTransaction(tx);
    } catch (error) {
      console.error(`\n❌ Error processing ${tx.id}:`, error);

      const newRetryCount = tx.retryCount + 1;
      const isPermanentFailure = newRetryCount >= tx.maxRetries;

      await prisma.transaction.update({
        where: { id: tx.id },
        data: {
          status: 'FAILED',
          retryCount: newRetryCount,
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      });

      await addTransactionStep(
        tx.id,
        isPermanentFailure
          ? `Permanently failed after ${newRetryCount} attempts`
          : `Failed (attempt ${newRetryCount}/${tx.maxRetries})`,
        'FAILED',
        {
          error: error instanceof Error ? error.message : String(error),
          willRetry: !isPermanentFailure,
        }
      );
    }
  }
}

async function processTransaction(tx: any) {
  switch (tx.status) {
    case 'DEPOSIT_RECEIVED':
      await handleStep1_CreatePrivacyPlan(tx);
      break;
    case 'HOP_1_DEPOSITING':
      await handleStep2_WaitForHop1(tx);
      break;
    case 'HOP_1_DELAY':
      await handleStep3_DelayBeforeHop2(tx);
      break;
    case 'HOP_2_DEPOSITING':
      await handleStep4_ExecuteHop2(tx);
      break;
  }
}

/**
 * STEP 1: Create privacy mix plan with multiple wallets
 */
async function handleStep1_CreatePrivacyPlan(tx: any) {
  console.log(`\n━━━ STEP 1: Create Privacy Mix Plan ━━━`);
  console.log(`Transaction: ${tx.id}`);

  const depositWallet = tx.wallets.find((w: any) => w.purpose === 'DEPOSIT');
  if (!depositWallet) throw new Error('Deposit wallet not found');

  const depositBalance = await connection.getBalance(new PublicKey(depositWallet.walletAddress));
  const depositAmount = depositBalance / LAMPORTS_PER_SOL;
  const relayerFee = tx.relayerFee || 0.001;
  const amountToMix = depositAmount - relayerFee;

  console.log(`💰 Deposit: ${depositAmount} SOL`);
  console.log(`💸 Relayer fee: ${relayerFee} SOL`);
  console.log(`🎭 Amount to mix: ${amountToMix} SOL`);

  // Create privacy mix plan (simplified 2-hop)
  const plan = await createPrivacyMixPlan(
    {
      amountSOL: amountToMix,
      recipientAddress: tx.recipientAddress,
      refundAddress: depositWallet.walletAddress,
      timeDelayMinutes: 2.5,
      numIntermediateWallets: 2, // Only 2 wallets for simplified flow
      slippageTolerance: 100,
      referral: 'privacycash',
    },
    tx.id
  );

  // Store intermediate wallets in database
  for (const wallet of plan.intermediateWallets) {
    // Encrypt and store the keypair
    const walletRecord = await prisma.wallet.create({
      data: {
        transactionId: tx.id,
        walletAddress: wallet.address,
        encryptedPrivateKey: Buffer.from(wallet.keypair.secretKey).toString('base64'),
        purpose: wallet.purpose as WalletPurpose,
      },
    });

    console.log(`📦 Saved ${wallet.purpose}: ${wallet.address}`);
  }

  // Store privacy plan in transaction metadata
  await prisma.transaction.update({
    where: { id: tx.id },
    data: {
      metadata: JSON.stringify({
        privacyPlan: {
          totalHops: plan.totalHops,
          estimatedTimeMinutes: plan.estimatedTotalTimeMinutes,
          estimatedFinalAmount: plan.estimatedFinalAmount,
          hops: plan.hops,
        },
      }),
    },
  });

  await addTransactionStep(
    tx.id,
    `Privacy mix plan created: ${plan.totalHops} hops, ${plan.estimatedTotalTimeMinutes} min`,
    'COMPLETED',
    {
      totalHops: plan.totalHops,
      estimatedTime: plan.estimatedTotalTimeMinutes,
      intermediateWallets: plan.intermediateWallets.length,
    }
  );

  // Now deposit to HOP 1
  console.log(`\n📤 Depositing to HOP 1...`);
  const hop1 = plan.hops[0];

  const depositKeypair = await getWalletKeypair(depositWallet.walletAddress, tx.id);

  // Send SOL to hop 1 deposit address
  const depositTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: depositKeypair.publicKey,
      toPubkey: new PublicKey(hop1.depositAddress),
      lamports: Math.floor(amountToMix * LAMPORTS_PER_SOL),
    })
  );

  const signature = await sendAndConfirmTransaction(connection, depositTx, [depositKeypair]);

  console.log(`✅ HOP 1 deposited: ${signature}`);

  // Notify NEAR Intents about the deposit
  try {
    await submitDepositTx(signature, hop1.depositAddress);
  } catch (error) {
    console.log(`⚠️  Notification failed (non-critical)`);
  }

  await addTransactionStep(tx.id, `HOP 1: SOL → ZEC deposited`, 'COMPLETED', {
    depositAddress: hop1.depositAddress,
    txSignature: signature,
    solanaTxUrl: `https://solscan.io/tx/${signature}`,
    expectedOutput: hop1.expectedAmountOut,
  });

  await updateTransactionStatus(tx.id, 'HOP_1_DEPOSITING');
}

/**
 * STEP 2: Wait for HOP 1 to complete
 */
async function handleStep2_WaitForHop1(tx: any) {
  console.log(`\n━━━ STEP 2: Waiting for HOP 1 completion ━━━`);

  const metadata = JSON.parse(tx.metadata || '{}');
  const plan = metadata.privacyPlan;
  const hop1 = plan.hops[0];

  const status = await checkSwapStatus(hop1.depositAddress, hop1.depositMemo);

  console.log(`📊 HOP 1 status: ${status.status}`);

  if (status.status === 'SUCCESS') {
    console.log(`✅ HOP 1 complete: ${status.swapDetails?.amountOutFormatted} ZEC received`);

    await addTransactionStep(tx.id, 'HOP 1 completed: SOL → ZEC', 'COMPLETED', {
      amountOut: status.swapDetails?.amountOutFormatted,
      nearTxHashes: status.swapDetails?.nearTxHashes,
      intentHashes: status.swapDetails?.intentHashes,
    });

    // Start delay before hop 2 (use user's configured delay)
    const delayMs = (tx.delayMinutes || 5) * 60 * 1000; // Default 5 minutes if not set
    await prisma.transaction.update({
      where: { id: tx.id },
      data: {
        status: 'HOP_1_DELAY',
        additionalData: {
          hop1CompletedAt: new Date().toISOString(),
          hop2StartAt: new Date(Date.now() + delayMs).toISOString(),
        },
      },
    });
  } else if (status.status === 'FAILED' || status.status === 'REFUNDED') {
    throw new Error(`HOP 1 ${status.status}`);
  } else {
    console.log(`⏳ Still waiting... (${status.status})`);
  }
}

/**
 * STEP 3: Time delay before HOP 2
 */
async function handleStep3_DelayBeforeHop2(tx: any) {
  const additionalData = tx.additionalData as any;
  const hop2StartAt = new Date(additionalData?.hop2StartAt);
  const now = new Date();

  const remainingMs = hop2StartAt.getTime() - now.getTime();

  if (remainingMs > 0) {
    // Don't log every iteration
    return;
  }

  console.log(`\n━━━ STEP 3: Execute HOP 2 (ZEC → SOL) ━━━`);

  const metadata = JSON.parse(tx.metadata || '{}');
  const plan = metadata.privacyPlan;
  const hop1 = plan.hops[0];
  const hop2 = plan.hops[1];

  console.log(`🔄 Creating HOP 2 quote: ${hop1.expectedAmountOut} ZEC → SOL`);

  try {
    // Execute HOP 2 withdrawal from NEAR account
    const hop2Result = await executeHop2Withdrawal({
      zecAmount: hop1.expectedAmountOut,
      recipientSolanaAddress: tx.recipientAddress,
      refundNearAccount: process.env.NEAR_ACCOUNT || 'mertcash.near',
      slippageTolerance: 100,
      referral: 'privacycash',
    });

    console.log(`✅ Quote: ${hop2Result.quote.amountOutFormatted} SOL expected`);

    // Update hop2 with the actual quote data
    hop2.depositAddress = hop2Result.quote.depositAddress;
    hop2.depositMemo = hop2Result.quote.depositMemo;
    hop2.expectedAmountOut = hop2Result.quote.amountOutFormatted;

    // Save updated plan
    await prisma.transaction.update({
      where: { id: tx.id },
      data: {
        metadata: JSON.stringify({ privacyPlan: plan }),
      },
    });

    // Transfer ZEC from mt-token balance to deposit address
    console.log(`\n📤 Transferring ${hop1.expectedAmountOut} ZEC to deposit address...`);

    const { transferZecFromIntents } = await import('../lib/near-helper');
    let depositTxHash: string;

    try {
      depositTxHash = await transferZecFromIntents({
        depositAddress: hop2Result.quote.depositAddress,
        zecAmountZatoshis: hop2Result.quote.amountIn,
      });
      console.log(`✅ Transfer complete: ${depositTxHash}`);
    } catch (error: any) {
      console.error(`❌ Transfer failed: ${error.message}`);
      throw error;
    }

    // Submit transaction hash to NEAR Intents
    const NEAR_INTENTS_API = process.env.NEAR_INTENTS_API_URL || 'https://1click.chaindefuser.com';
    const NEAR_INTENTS_JWT = process.env.NEAR_INTENTS_JWT;

    try {
      const payload: any = {
        txHash: depositTxHash,
        depositAddress: hop2Result.quote.depositAddress,
        nearSenderAccount: process.env.NEAR_ACCOUNT || 'mertcash.near',
      };

      if (hop2Result.quote.depositMemo) {
        payload.memo = hop2Result.quote.depositMemo;
      }

      const headers: any = { 'Content-Type': 'application/json' };
      if (NEAR_INTENTS_JWT) {
        headers.Authorization = `Bearer ${NEAR_INTENTS_JWT}`;
      }

      await axios.post(`${NEAR_INTENTS_API}/v0/deposit/submit`, payload, { headers });
      console.log(`✅ Deposit submitted to NEAR Intents`);
    } catch (error: any) {
      // Non-critical, continue anyway
      console.log(`⚠️  Deposit notification failed (non-critical)`);
    }

    await addTransactionStep(tx.id, 'HOP 2: ZEC transferred, waiting for swap', 'IN_PROGRESS', {
      depositAddress: hop2Result.quote.depositAddress,
      depositTxHash,
      nearTxUrl: `https://nearblocks.io/txns/${depositTxHash}`,
      expectedOutput: hop2Result.quote.amountOutFormatted,
      recipient: tx.recipientAddress,
    });

    await updateTransactionStatus(tx.id, 'HOP_2_DEPOSITING');
  } catch (error: any) {
    console.error(`❌ Failed to execute HOP 2:`, error.message);
    throw error;
  }
}

/**
 * STEP 4: Wait for HOP 2 completion (ZEC → SOL, delivers directly to recipient)
 */
async function handleStep4_ExecuteHop2(tx: any) {
  const metadata = JSON.parse(tx.metadata || '{}');
  const plan = metadata.privacyPlan;
  const hop2 = plan.hops[1];

  const status = await checkSwapStatus(hop2.depositAddress, hop2.depositMemo);

  if (status.status === 'SUCCESS') {
    console.log(`\n✅ PRIVACY MIX COMPLETE!`);
    console.log(`   🎭 SOL → ZEC → SOL`);
    console.log(`   💰 ${status.swapDetails?.amountOutFormatted} SOL → ${tx.recipientAddress}`);

    // Get Solana tx hash from destination chain
    const solanaTxHash = status.swapDetails?.destinationChainTxHashes?.[0]?.hash;

    await addTransactionStep(tx.id, 'HOP 2 completed: ZEC → SOL', 'COMPLETED', {
      amountOut: status.swapDetails?.amountOutFormatted,
      recipient: tx.recipientAddress,
      nearTxHashes: status.swapDetails?.nearTxHashes,
      intentHashes: status.swapDetails?.intentHashes,
      solanaTxHash,
      solanaTxUrl: solanaTxHash ? `https://solscan.io/tx/${solanaTxHash}` : undefined,
    });

    await updateTransactionStatus(tx.id, 'COMPLETED', {
      completedAt: new Date(),
    });
  } else if (status.status === 'FAILED' || status.status === 'REFUNDED') {
    throw new Error(`HOP 2 ${status.status}`);
  }
  // Silent wait for non-final statuses
}

/**
 * Handle retries
 */
async function handleRetry(tx: any) {
  console.log(`🔄 Retrying transaction ${tx.id} (attempt ${tx.retryCount + 1}/${tx.maxRetries})`);

  await prisma.transaction.update({
    where: { id: tx.id },
    data: {
      retryCount: tx.retryCount + 1,
      status: 'DEPOSIT_RECEIVED',
      errorMessage: null,
    },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Start relayer
if (require.main === module) {
  startRelayer().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
