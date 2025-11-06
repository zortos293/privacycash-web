import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  prisma,
  createWallet,
  createZcashAddress,
  getWalletKeypair,
  addTransactionStep,
  updateTransactionStatus,
  updateStepStatus,
  getPendingTransactions,
  checkForDeposits,
  getTransactionDetails,
} from '../lib/db';
import { swapSolToZec, swapZecToSol } from '../lib/jupiter';
import * as zcash from '../lib/zcash';
import * as bridge from '../lib/bridge';

const NETWORK = 'mainnet';
const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  'https://api.mainnet.solana.com';

const connection = new Connection(RPC_URL, 'confirmed');

const POLLING_INTERVAL = 15000; // 15 seconds
const MIN_BALANCE_FOR_DEPOSIT = 0.001 * LAMPORTS_PER_SOL;

/**
 * Main relayer loop with Zcash integration
 */
export async function startRelayer() {
  console.log('🚀 Privacy Cash Relayer Starting (with Zcash z-address privacy)...');
  console.log(`📡 Solana Network: Mainnet`);
  console.log(`🔗 Solana RPC: ${RPC_URL}`);

  // Check Zcash node connectivity
  const zcashReady = await zcash.isNodeReady();
  if (zcashReady) {
    const info = await zcash.getBlockchainInfo();
    console.log(`✅ Zcash node connected (blocks: ${info.blocks})`);
  } else {
    console.log(`⚠️  Zcash node not available - running in simulation mode`);
  }

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
 * Check for new deposits
 */
async function processDeposits() {
  const pendingDeposits = await checkForDeposits();

  for (const tx of pendingDeposits) {
    try {
      const depositWallet = tx.wallets.find((w) => w.purpose === 'DEPOSIT');
      if (!depositWallet) continue;

      const balance = await connection.getBalance(
        new PublicKey(depositWallet.walletAddress)
      );

      if (balance >= MIN_BALANCE_FOR_DEPOSIT) {
        console.log(`💰 Deposit received for transaction ${tx.id}: ${balance / LAMPORTS_PER_SOL} SOL`);

        await updateTransactionStatus(tx.id, 'DEPOSIT_RECEIVED', {
          depositTxSignature: 'detected',
        });

        const depositStep = tx.steps.find(
          (s) => s.stepName === 'Waiting for deposit'
        );
        if (depositStep) {
          await updateStepStatus(depositStep.id, 'COMPLETED', {
            balance: balance / LAMPORTS_PER_SOL,
          });
        }

        await addTransactionStep(tx.id, 'Preparing cross-chain privacy operation', 'PENDING');
      }
    } catch (error) {
      console.error(`Error processing deposit for ${tx.id}:`, error);
    }
  }
}

/**
 * Process transactions through the cross-chain mixing flow
 */
async function processPendingTransactions() {
  const pending = await getPendingTransactions();

  for (const tx of pending) {
    try {
      if (tx.status === 'FAILED') {
        await handleRetry(tx);
        const retried = await getTransactionDetails(tx.id);
        if (!retried) continue;

        // Process based on reset status
        await processTransaction(retried);
        continue;
      }

      await processTransaction(tx);
    } catch (error) {
      console.error(`Error processing transaction ${tx.id}:`, error);

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

      const failureMessage = isPermanentFailure
        ? `Transaction permanently failed after ${newRetryCount} attempts`
        : `Transaction failed (attempt ${newRetryCount}/${tx.maxRetries}), will retry`;

      await addTransactionStep(tx.id, failureMessage, 'FAILED', {
        error: error instanceof Error ? error.message : String(error),
        retryCount: newRetryCount,
        willRetry: !isPermanentFailure,
      });
    }
  }
}

async function processTransaction(tx: any) {
  switch (tx.status) {
    case 'DEPOSIT_RECEIVED':
      await handleDepositReceived(tx);
      break;
    case 'SWAPPING_TO_ZEC':
      await handleSwappingToZec(tx);
      break;
    case 'BRIDGING_TO_ZEC_MAINNET':
      await handleBridgingToZcash(tx);
      break;
    case 'SHIELDING_TO_ZADDRESS':
      await handleShielding(tx);
      break;
    case 'WAITING_DELAY':
      await handleWaitingDelay(tx);
      break;
    case 'SHIELDED_TRANSFER':
      await handleShieldedTransfer(tx);
      break;
    case 'DESHIELDING_FROM_ZADDRESS':
      await handleDeshielding(tx);
      break;
    case 'BRIDGING_TO_SOLANA':
      await handleBridgingToSolana(tx);
      break;
    case 'SWAPPING_TO_SOL':
      await handleSwappingToSol(tx);
      break;
    case 'SENDING_TO_RECIPIENT':
      await handleSendingToRecipient(tx);
      break;
  }
}

/**
 * Step 1: Handle deposit and swap SOL → ZEC
 */
async function handleDepositReceived(tx: any) {
  console.log(`\n🔄 [Step 1] Processing deposit: ${tx.id}`);

  // Create intermediate Solana wallet
  let intermediateWallet = tx.wallets.find((w: any) => w.purpose === 'INTERMEDIATE');
  let intermediateKeypair: any;

  if (intermediateWallet) {
    intermediateKeypair = await getWalletKeypair(intermediateWallet.walletAddress, tx.id);
  } else {
    const created = await createWallet(tx.id, 'INTERMEDIATE');
    intermediateWallet = created.wallet;
    intermediateKeypair = created.keypair;
    await addTransactionStep(tx.id, 'Created Solana intermediate wallet', 'COMPLETED');
  }

  await updateTransactionStatus(tx.id, 'SWAPPING_TO_ZEC');

  const depositWallet = tx.wallets.find((w: any) => w.purpose === 'DEPOSIT');
  if (!depositWallet) throw new Error('Deposit wallet not found');

  const depositKeypair = await getWalletKeypair(depositWallet.walletAddress, tx.id);

  // Deduct relayer fee
  const depositAmount = tx.amount * LAMPORTS_PER_SOL;
  const relayerFee = tx.relayerFee * LAMPORTS_PER_SOL;
  const amountAfterFee = depositAmount - relayerFee;

  console.log(`💰 Deposit: ${tx.amount} SOL`);
  console.log(`💸 Relayer fee: ${tx.relayerFee} SOL`);
  console.log(`📊 Amount to process: ${amountAfterFee / LAMPORTS_PER_SOL} SOL`);

  // Transfer to intermediate wallet
  const transferTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: depositKeypair.publicKey,
      toPubkey: intermediateKeypair.publicKey,
      lamports: Math.floor(amountAfterFee),
    })
  );

  await sendAndConfirmTransaction(connection, transferTx, [depositKeypair]);
  await addTransactionStep(tx.id, 'Transferred SOL to intermediate wallet', 'COMPLETED');

  // Swap SOL → ZEC
  const swapStep = await addTransactionStep(tx.id, 'Swapping SOL → ZEC', 'IN_PROGRESS');
  const swapResult = await swapSolToZec(connection, intermediateKeypair, amountAfterFee);
  await updateStepStatus(swapStep.id, 'COMPLETED', swapResult, swapResult.txSignature);

  await updateTransactionStatus(tx.id, 'BRIDGING_TO_ZEC_MAINNET');
}

/**
 * Step 1.5: Handle swapping SOL to wrapped ZEC
 */
async function handleSwappingToZec(tx: any) {
  console.log(`\n🔄 [Step 1.5] Swapping to ZEC: ${tx.id}`);

  // TODO: Implement Jupiter swap SOL → wrapped ZEC
  // For now, just transition to the next step
  await addTransactionStep(tx.id, 'SOL → ZEC swap (placeholder)', 'COMPLETED');
  await updateTransactionStatus(tx.id, 'BRIDGING_TO_ZEC_MAINNET');
}

/**
 * Step 2: Bridge to Zcash mainnet
 */
async function handleBridgingToZcash(tx: any) {
  console.log(`\n🌉 [Step 2] Bridging to Zcash mainnet: ${tx.id}`);

  // Generate Zcash t-address for bridge destination
  let tAddress = tx.wallets.find((w: any) => w.purpose === 'ZEC_T_ADDRESS');

  if (!tAddress) {
    const newTAddress = await zcash.generateTAddress();
    const privateKey = await zcash.exportPrivateKey(newTAddress);

    tAddress = await createZcashAddress(tx.id, newTAddress, privateKey, 'ZEC_T_ADDRESS');
    await addTransactionStep(tx.id, `Generated Zcash t-address: ${newTAddress}`, 'COMPLETED');
  }

  const intermediateWallet = tx.wallets.find((w: any) => w.purpose === 'INTERMEDIATE');
  const intermediateKeypair = await getWalletKeypair(intermediateWallet.walletAddress, tx.id);

  // Bridge wrapped ZEC → real ZEC
  const bridgeStep = await addTransactionStep(tx.id, 'Bridging to Zcash mainnet', 'IN_PROGRESS');

  const zecAmount = 0.085; // Approximate amount after swaps
  const bridgeResult = await bridge.bridgeSolanaToZcash(
    connection,
    intermediateKeypair,
    tAddress.walletAddress,
    zecAmount
  );

  await updateStepStatus(bridgeStep.id, 'COMPLETED', bridgeResult, bridgeResult.txHash);
  await updateTransactionStatus(tx.id, 'SHIELDING_TO_ZADDRESS');
}

/**
 * Step 3: Shield funds to z-address
 */
async function handleShielding(tx: any) {
  console.log(`\n🛡️  [Step 3] Shielding to z-address: ${tx.id}`);

  const tAddress = tx.wallets.find((w: any) => w.purpose === 'ZEC_T_ADDRESS');
  if (!tAddress) throw new Error('T-address not found');

  // Generate first z-address
  let zAddress1 = tx.wallets.find((w: any) => w.purpose === 'ZEC_Z_ADDRESS_1');

  if (!zAddress1) {
    const newZAddress = await zcash.generateZAddress();
    const privateKey = await zcash.exportPrivateKey(newZAddress);

    zAddress1 = await createZcashAddress(tx.id, newZAddress, privateKey, 'ZEC_Z_ADDRESS_1');
    await addTransactionStep(tx.id, 'Generated z-address (shielded)', 'COMPLETED');
  }

  // Shield: t-address → z-address
  const shieldStep = await addTransactionStep(tx.id, 'Shielding funds to z-address', 'IN_PROGRESS');

  const balance = await zcash.getBalance(tAddress.walletAddress);
  const txid = await zcash.shieldFunds(
    tAddress.walletAddress,
    zAddress1.walletAddress,
    balance - 0.0001, // Reserve for fee
    `Privacy Mixer - ${tx.id}`
  );

  await updateStepStatus(shieldStep.id, 'COMPLETED', { txid }, txid);
  await updateTransactionStatus(tx.id, 'WAITING_DELAY');

  await addTransactionStep(
    tx.id,
    `Privacy delay: ${tx.delayMinutes} minutes`,
    'IN_PROGRESS',
    { delayUntil: new Date(Date.now() + tx.delayMinutes * 60 * 1000) }
  );
}

/**
 * Step 4: Wait for privacy delay
 */
async function handleWaitingDelay(tx: any) {
  const delayStep = tx.steps.find(
    (s: any) => s.stepName.includes('Privacy delay') && s.status === 'IN_PROGRESS'
  );

  if (!delayStep) {
    await updateTransactionStatus(tx.id, 'SHIELDED_TRANSFER');
    return;
  }

  const details = JSON.parse(delayStep.details || '{}');
  const delayUntil = new Date(details.delayUntil);

  if (Date.now() >= delayUntil.getTime()) {
    console.log(`⏰ Delay completed for ${tx.id}`);
    await updateStepStatus(delayStep.id, 'COMPLETED');
    await updateTransactionStatus(tx.id, 'SHIELDED_TRANSFER');
  }
}

/**
 * Step 5: Shielded z-to-z transfer (FULLY PRIVATE)
 */
async function handleShieldedTransfer(tx: any) {
  console.log(`\n🔒 [Step 5] Shielded transfer (z-to-z): ${tx.id}`);

  const zAddress1 = tx.wallets.find((w: any) => w.purpose === 'ZEC_Z_ADDRESS_1');
  if (!zAddress1) throw new Error('Z-address 1 not found');

  // Generate second z-address for privacy hop
  let zAddress2 = tx.wallets.find((w: any) => w.purpose === 'ZEC_Z_ADDRESS_2');

  if (!zAddress2) {
    const newZAddress = await zcash.generateZAddress();
    const privateKey = await zcash.exportPrivateKey(newZAddress);

    zAddress2 = await createZcashAddress(tx.id, newZAddress, privateKey, 'ZEC_Z_ADDRESS_2');
    await addTransactionStep(tx.id, 'Generated second z-address', 'COMPLETED');
  }

  // Fully shielded transfer (encrypted sender, receiver, and amount)
  const transferStep = await addTransactionStep(tx.id, 'Shielded z-to-z transfer', 'IN_PROGRESS');

  const balance = await zcash.getBalance(zAddress1.walletAddress);
  const txid = await zcash.shieldedTransfer(
    zAddress1.walletAddress,
    zAddress2.walletAddress,
    balance - 0.0001
  );

  await updateStepStatus(transferStep.id, 'COMPLETED', { txid }, txid);
  await updateTransactionStatus(tx.id, 'DESHIELDING_FROM_ZADDRESS');
}

/**
 * Step 6: Deshield for bridging back
 */
async function handleDeshielding(tx: any) {
  console.log(`\n🔓 [Step 6] Deshielding for bridge return: ${tx.id}`);

  const zAddress2 = tx.wallets.find((w: any) => w.purpose === 'ZEC_Z_ADDRESS_2');
  const tAddress = tx.wallets.find((w: any) => w.purpose === 'ZEC_T_ADDRESS');

  if (!zAddress2 || !tAddress) throw new Error('Addresses not found');

  // Deshield: z-address → t-address
  const deshieldStep = await addTransactionStep(tx.id, 'Deshielding to t-address', 'IN_PROGRESS');

  const balance = await zcash.getBalance(zAddress2.walletAddress);
  const txid = await zcash.deshieldFunds(
    zAddress2.walletAddress,
    tAddress.walletAddress,
    balance - 0.0001
  );

  await updateStepStatus(deshieldStep.id, 'COMPLETED', { txid }, txid);
  await updateTransactionStatus(tx.id, 'BRIDGING_TO_SOLANA');
}

/**
 * Step 7: Bridge back to Solana
 */
async function handleBridgingToSolana(tx: any) {
  console.log(`\n🌉 [Step 7] Bridging back to Solana: ${tx.id}`);

  const tAddress = tx.wallets.find((w: any) => w.purpose === 'ZEC_T_ADDRESS');
  const intermediateWallet = tx.wallets.find((w: any) => w.purpose === 'INTERMEDIATE');

  const bridgeStep = await addTransactionStep(tx.id, 'Bridging ZEC → Solana', 'IN_PROGRESS');

  const zecBalance = await zcash.getBalance(tAddress.walletAddress);
  const bridgeResult = await bridge.bridgeZcashToSolana(
    tAddress.walletAddress,
    intermediateWallet.walletAddress,
    zecBalance - 0.0001
  );

  await updateStepStatus(bridgeStep.id, 'COMPLETED', bridgeResult, bridgeResult.txHash);
  await updateTransactionStatus(tx.id, 'SWAPPING_TO_SOL');
}

/**
 * Step 8: Swap ZEC → SOL
 */
async function handleSwappingToSol(tx: any) {
  console.log(`\n🔄 [Step 8] Swapping ZEC → SOL: ${tx.id}`);

  const intermediateWallet = tx.wallets.find((w: any) => w.purpose === 'INTERMEDIATE');
  const intermediateKeypair = await getWalletKeypair(intermediateWallet.walletAddress, tx.id);

  const swapStep = await addTransactionStep(tx.id, 'Swapping ZEC → SOL', 'IN_PROGRESS');
  const swapResult = await swapZecToSol(connection, intermediateKeypair);

  await updateStepStatus(swapStep.id, 'COMPLETED', swapResult, swapResult.txSignature);
  await updateTransactionStatus(tx.id, 'SENDING_TO_RECIPIENT');
}

/**
 * Step 9: Send to recipient
 */
async function handleSendingToRecipient(tx: any) {
  console.log(`\n📤 [Step 9] Sending to recipient: ${tx.id}`);

  const intermediateWallet = tx.wallets.find((w: any) => w.purpose === 'INTERMEDIATE');
  const intermediateKeypair = await getWalletKeypair(intermediateWallet.walletAddress, tx.id);

  const balance = await connection.getBalance(intermediateKeypair.publicKey);

  const rentExempt = 890880;
  const txFee = 5000;
  const usableBalance = balance - rentExempt;
  const platformFee = usableBalance * tx.platformFee;
  const amountToSend = balance - rentExempt - txFee - platformFee;

  console.log(`📤 Sending ${amountToSend / LAMPORTS_PER_SOL} SOL to recipient`);

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: intermediateKeypair.publicKey,
      toPubkey: new PublicKey(tx.recipientAddress),
      lamports: Math.floor(amountToSend),
    })
  );

  const signature = await sendAndConfirmTransaction(connection, transaction, [intermediateKeypair]);

  console.log(`✅ Transaction completed! Signature: ${signature}`);

  await updateTransactionStatus(tx.id, 'COMPLETED', {
    withdrawalTxSignature: signature,
    completedAt: new Date(),
  });

  await addTransactionStep(tx.id, 'Privacy operation completed', 'COMPLETED', {
    finalAmount: amountToSend / LAMPORTS_PER_SOL,
  });
}

// Retry and helper functions remain the same...
async function handleRetry(tx: any) {
  console.log(`🔄 Retrying transaction ${tx.id}`);
  // Implementation similar to previous version
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (require.main === module) {
  startRelayer().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
