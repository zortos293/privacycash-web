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
  createZcashAddress,
  getWalletKeypair,
  addTransactionStep,
  updateTransactionStatus,
  updateStepStatus,
  getPendingTransactions,
  checkForDeposits,
  getTransactionDetails,
} from '../lib/db';
import * as zcash from '../lib/zcash';
import * as zolana from '../lib/zolana-bridge';

const NETWORK = 'mainnet';
const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet.solana.com';

const connection = new Connection(RPC_URL, 'confirmed');

const POLLING_INTERVAL = 15000; // 15 seconds
const MIN_BALANCE_FOR_DEPOSIT = 0.001 * LAMPORTS_PER_SOL;

/**
 * PRODUCTION RELAYER WITH ZOLANA BRIDGE
 *
 * Flow:
 * 1. User deposits SOL
 * 2. Bridge SOL → ZEC (Zolana/NEAR Intents)
 * 3. Shield: t-address → z-address #1
 * 4. Shielded transfer: z-address #1 → z-address #2 (FULLY ENCRYPTED)
 * 5. Deshield: z-address #2 → t-address
 * 6. Bridge ZEC → SOL (Zolana)
 * 7. Send SOL to recipient
 */

export async function startRelayer() {
  console.log('🚀 Privacy Cash Relayer (Zolana Bridge + Zcash Z-Addresses)');
  console.log(`📡 Solana RPC: ${RPC_URL}`);

  // Check Zcash RPC connection
  try {
    const zcashReady = await zcash.isNodeReady();
    if (zcashReady) {
      const info = await zcash.getBlockchainInfo();
      console.log(`✅ Zcash RPC connected (blocks: ${info.blocks})`);
    } else {
      console.log(`⚠️  Zcash RPC not available`);
    }
  } catch (error) {
    console.log(`⚠️  Zcash RPC error:`, error);
  }

  // Check Zolana bridge
  try {
    const tokens = await zolana.getSupportedTokens();
    console.log(`✅ Zolana bridge connected (${tokens.length || 0} tokens supported)`);
  } catch (error) {
    console.log(`⚠️  Zolana bridge check failed:`, error);
  }

  console.log('\n🔁 Starting main loop...\n');

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

      const balance = await connection.getBalance(
        new PublicKey(depositWallet.walletAddress)
      );

      if (balance >= MIN_BALANCE_FOR_DEPOSIT) {
        console.log(`\n💰 NEW DEPOSIT: ${balance / LAMPORTS_PER_SOL} SOL (tx: ${tx.id})`);

        await updateTransactionStatus(tx.id, 'DEPOSIT_RECEIVED');

        const depositStep = tx.steps.find(
          (s) => s.stepName === 'Waiting for deposit'
        );
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
      await handleStep1_BridgeToZcash(tx);
      break;
    case 'BRIDGING_TO_ZEC_MAINNET':
      await handleStep2_WaitForBridge(tx);
      break;
    case 'SHIELDING_TO_ZADDRESS':
      await handleStep3_ShieldToZAddress(tx);
      break;
    case 'SHIELDED_TRANSFER':
      await handleStep4_ShieldedTransfer(tx);
      break;
    case 'DESHIELDING_FROM_ZADDRESS':
      await handleStep5_Deshield(tx);
      break;
    case 'BRIDGING_TO_SOLANA':
      await handleStep6_BridgeToSolana(tx);
      break;
    case 'SENDING_TO_RECIPIENT':
      await handleStep7_SendToRecipient(tx);
      break;
  }
}

/**
 * STEP 1: Bridge SOL → ZEC using Zolana
 */
async function handleStep1_BridgeToZcash(tx: any) {
  console.log(`\n━━━ STEP 1: Bridge SOL → ZEC (Zolana) ━━━`);
  console.log(`Transaction: ${tx.id}`);

  // Get or create Zcash t-address
  let zcashTAddr = tx.wallets.find((w: any) => w.purpose === 'ZEC_T_ADDRESS');

  if (!zcashTAddr) {
    const newTAddr = await zcash.generateTAddress();
    const privateKey = await zcash.exportPrivateKey(newTAddr);

    zcashTAddr = await createZcashAddress(tx.id, newTAddr, privateKey, 'ZEC_T_ADDRESS');
    await addTransactionStep(tx.id, `Generated Zcash t-address: ${newTAddr}`, 'COMPLETED');
    console.log(`📬 Generated t-address: ${newTAddr}`);
  }

  // Get deposit wallet
  const depositWallet = tx.wallets.find((w: any) => w.purpose === 'DEPOSIT');
  if (!depositWallet) throw new Error('Deposit wallet not found');

  const depositKeypair = await getWalletKeypair(depositWallet.walletAddress, tx.id);

  // Calculate amount after relayer fee
  const depositBalance = await connection.getBalance(depositKeypair.publicKey);
  const depositAmount = depositBalance / LAMPORTS_PER_SOL;
  const relayerFee = tx.relayerFee;
  const amountTobridge = depositAmount - relayerFee;

  console.log(`💰 Deposit: ${depositAmount} SOL`);
  console.log(`💸 Relayer fee: ${relayerFee} SOL`);
  console.log(`🌉 Amount to bridge: ${amountTobridge} SOL`);

  // Update status
  await updateTransactionStatus(tx.id, 'BRIDGING_TO_ZEC_MAINNET');

  // Initiate Zolana bridge
  const bridgeStep = await addTransactionStep(
    tx.id,
    'Bridging SOL → ZEC via Zolana',
    'IN_PROGRESS'
  );

  try {
    const bridgeResult = await zolana.bridgeSOLtoZEC(
      connection,
      depositKeypair,
      amountTobridge,
      zcashTAddr.walletAddress
    );

    await updateStepStatus(bridgeStep.id, 'COMPLETED', {
      bridgeStatus: bridgeResult.status,
      depositAddress: bridgeResult.depositAddress,
      txHash: bridgeResult.txHash,
    });

    console.log(`✅ Bridge initiated successfully`);

    // Move to next step (waiting for bridge to complete)
    await updateTransactionStatus(tx.id, 'BRIDGING_TO_ZEC_MAINNET');
  } catch (error) {
    await updateStepStatus(bridgeStep.id, 'FAILED', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * STEP 2: Wait for Zolana bridge to complete
 */
async function handleStep2_WaitForBridge(tx: any) {
  console.log(`\n━━━ STEP 2: Waiting for Zolana bridge ━━━`);

  const bridgeStep = tx.steps.find(
    (s: any) => s.stepName.includes('Bridging SOL → ZEC') && s.status === 'COMPLETED'
  );

  if (!bridgeStep) {
    throw new Error('Bridge step not found');
  }

  const details = JSON.parse(bridgeStep.details || '{}');
  const depositAddress = details.depositAddress;

  if (!depositAddress) {
    throw new Error('Deposit address not found in bridge step');
  }

  // Check bridge status
  const status = await zolana.checkBridgeStatus(depositAddress);

  console.log(`📊 Bridge status: ${status.status}`);

  if (status.status === 'SUCCESS') {
    console.log(`✅ ZEC received on Zcash mainnet!`);

    // Verify ZEC balance
    const zcashTAddr = tx.wallets.find((w: any) => w.purpose === 'ZEC_T_ADDRESS');
    const zecBalance = await zcash.getBalance(zcashTAddr.walletAddress);

    console.log(`💰 ZEC balance: ${zecBalance} ZEC`);

    await addTransactionStep(tx.id, `Bridge completed: ${zecBalance} ZEC received`, 'COMPLETED');
    await updateTransactionStatus(tx.id, 'SHIELDING_TO_ZADDRESS');
  } else if (status.status === 'FAILED' || status.status === 'REFUNDED') {
    throw new Error(`Bridge ${status.status}: ${status.failureReason || 'Unknown'}`);
  } else {
    console.log(`⏳ Still waiting... (${status.status})`);
  }
}

/**
 * STEP 3: Shield ZEC to z-address
 */
async function handleStep3_ShieldToZAddress(tx: any) {
  console.log(`\n━━━ STEP 3: Shield to Z-Address ━━━`);

  const zcashTAddr = tx.wallets.find((w: any) => w.purpose === 'ZEC_T_ADDRESS');
  if (!zcashTAddr) throw new Error('T-address not found');

  // Generate first z-address
  let zAddress1 = tx.wallets.find((w: any) => w.purpose === 'ZEC_Z_ADDRESS_1');

  if (!zAddress1) {
    const newZAddr = await zcash.generateZAddress();
    const privateKey = await zcash.exportPrivateKey(newZAddr);

    zAddress1 = await createZcashAddress(tx.id, newZAddr, privateKey, 'ZEC_Z_ADDRESS_1');
    console.log(`🔐 Generated z-address #1: ${newZAddr.substring(0, 25)}...`);
  }

  // Shield funds
  const shieldStep = await addTransactionStep(tx.id, 'Shielding to z-address', 'IN_PROGRESS');

  try {
    const tBalance = await zcash.getBalance(zcashTAddr.walletAddress);
    const amountToShield = tBalance - 0.0001; // Reserve for fee

    console.log(`🛡️  Shielding ${amountToShield} ZEC...`);

    const txid = await zcash.shieldFunds(
      zcashTAddr.walletAddress,
      zAddress1.walletAddress,
      amountToShield,
      `Privacy Mixer ${tx.id}`
    );

    console.log(`✅ Shielded! Txid: ${txid}`);

    await updateStepStatus(shieldStep.id, 'COMPLETED', { txid }, txid);

    // Move directly to shielded transfer (no delay)
    await updateTransactionStatus(tx.id, 'SHIELDED_TRANSFER');
    console.log(`➡️  Moving to shielded transfer immediately`);
  } catch (error) {
    await updateStepStatus(shieldStep.id, 'FAILED', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * STEP 4: Shielded z-to-z transfer (FULLY ENCRYPTED!)
 */
async function handleStep4_ShieldedTransfer(tx: any) {
  console.log(`\n━━━ STEP 4: Shielded Transfer (Z→Z) ━━━`);
  console.log(`🔒 THIS IS THE MAGIC STEP - FULLY ENCRYPTED!`);

  const zAddress1 = tx.wallets.find((w: any) => w.purpose === 'ZEC_Z_ADDRESS_1');
  if (!zAddress1) throw new Error('Z-address #1 not found');

  // Generate second z-address
  let zAddress2 = tx.wallets.find((w: any) => w.purpose === 'ZEC_Z_ADDRESS_2');

  if (!zAddress2) {
    const newZAddr = await zcash.generateZAddress();
    const privateKey = await zcash.exportPrivateKey(newZAddr);

    zAddress2 = await createZcashAddress(tx.id, newZAddr, privateKey, 'ZEC_Z_ADDRESS_2');
    console.log(`🔐 Generated z-address #2: ${newZAddr.substring(0, 25)}...`);
  }

  // Shielded transfer
  const transferStep = await addTransactionStep(tx.id, 'Shielded z-to-z transfer', 'IN_PROGRESS');

  try {
    const z1Balance = await zcash.getBalance(zAddress1.walletAddress);
    const amountToTransfer = z1Balance - 0.0001;

    console.log(`💸 Transferring ${amountToTransfer} ZEC (encrypted)`);
    console.log(`   Sender: HIDDEN`);
    console.log(`   Receiver: HIDDEN`);
    console.log(`   Amount: HIDDEN`);

    const txid = await zcash.shieldedTransfer(
      zAddress1.walletAddress,
      zAddress2.walletAddress,
      amountToTransfer
    );

    console.log(`✅ Shielded transfer complete! Txid: ${txid}`);
    console.log(`🔒 On-chain observers see: "A transaction occurred" - that's it!`);

    await updateStepStatus(transferStep.id, 'COMPLETED', { txid }, txid);
    await updateTransactionStatus(tx.id, 'DESHIELDING_FROM_ZADDRESS');
  } catch (error) {
    await updateStepStatus(transferStep.id, 'FAILED', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * STEP 5: Deshield for bridge return
 */
async function handleStep5_Deshield(tx: any) {
  console.log(`\n━━━ STEP 5: Deshield to T-Address ━━━`);

  const zAddress2 = tx.wallets.find((w: any) => w.purpose === 'ZEC_Z_ADDRESS_2');
  const zcashTAddr = tx.wallets.find((w: any) => w.purpose === 'ZEC_T_ADDRESS');

  if (!zAddress2 || !zcashTAddr) throw new Error('Addresses not found');

  const deshieldStep = await addTransactionStep(tx.id, 'Deshielding to t-address', 'IN_PROGRESS');

  try {
    const z2Balance = await zcash.getBalance(zAddress2.walletAddress);
    const amountToDeshield = z2Balance - 0.0001;

    console.log(`🔓 Deshielding ${amountToDeshield} ZEC...`);

    const txid = await zcash.deshieldFunds(
      zAddress2.walletAddress,
      zcashTAddr.walletAddress,
      amountToDeshield
    );

    console.log(`✅ Deshielded! Txid: ${txid}`);

    await updateStepStatus(deshieldStep.id, 'COMPLETED', { txid }, txid);
    await updateTransactionStatus(tx.id, 'BRIDGING_TO_SOLANA');
  } catch (error) {
    await updateStepStatus(deshieldStep.id, 'FAILED', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * STEP 6: Bridge ZEC → SOL using Zolana
 */
async function handleStep6_BridgeToSolana(tx: any) {
  console.log(`\n━━━ STEP 6: Bridge ZEC → SOL (Zolana) ━━━`);

  const zcashTAddr = tx.wallets.find((w: any) => w.purpose === 'ZEC_T_ADDRESS');
  if (!zcashTAddr) throw new Error('T-address not found');

  // Create intermediate Solana wallet to receive bridged SOL
  let intermediateWallet = tx.wallets.find((w: any) => w.purpose === 'INTERMEDIATE');

  if (!intermediateWallet) {
    const created = await createWallet(tx.id, 'INTERMEDIATE');
    intermediateWallet = created.wallet;
    console.log(`📬 Created intermediate wallet: ${intermediateWallet.walletAddress}`);
  }

  const bridgeStep = await addTransactionStep(tx.id, 'Bridging ZEC → SOL via Zolana', 'IN_PROGRESS');

  try {
    const tBalance = await zcash.getBalance(zcashTAddr.walletAddress);
    const amountToBridge = tBalance - 0.0001;

    console.log(`🌉 Bridging ${amountToBridge} ZEC → SOL...`);

    // Note: This requires the Zcash RPC client to support sendtoaddress
    // The zolana.bridgeZECtoSOL function will handle the actual bridging
    const bridgeResult = await zolana.bridgeZECtoSOL(
      zcash as any, // Pass zcash module as RPC client
      zcashTAddr.walletAddress,
      amountToBridge,
      intermediateWallet.walletAddress
    );

    console.log(`✅ Bridge completed! SOL received on Solana`);

    await updateStepStatus(bridgeStep.id, 'COMPLETED', {
      bridgeStatus: bridgeResult.status,
      txHash: bridgeResult.txHash,
    });

    await updateTransactionStatus(tx.id, 'SENDING_TO_RECIPIENT');
  } catch (error) {
    await updateStepStatus(bridgeStep.id, 'FAILED', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * STEP 7: Send SOL to recipient
 */
async function handleStep7_SendToRecipient(tx: any) {
  console.log(`\n━━━ STEP 7: Send to Recipient ━━━`);

  const intermediateWallet = tx.wallets.find((w: any) => w.purpose === 'INTERMEDIATE');
  if (!intermediateWallet) throw new Error('Intermediate wallet not found');

  const intermediateKeypair = await getWalletKeypair(intermediateWallet.walletAddress, tx.id);

  const balance = await connection.getBalance(intermediateKeypair.publicKey);

  // Reserve amounts
  const rentExempt = 890880; // Keep account open
  const txFee = 5000; // Transaction fee
  const usableBalance = balance - rentExempt;
  const platformFee = usableBalance * tx.platformFee;
  const amountToSend = balance - rentExempt - txFee - platformFee;

  console.log(`💰 Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
  console.log(`🏦 Rent reserve: ${rentExempt / LAMPORTS_PER_SOL} SOL`);
  console.log(`💸 Platform fee: ${platformFee / LAMPORTS_PER_SOL} SOL`);
  console.log(`📤 Sending: ${amountToSend / LAMPORTS_PER_SOL} SOL`);
  console.log(`👤 Recipient: ${tx.recipientAddress}`);

  const sendStep = await addTransactionStep(tx.id, 'Sending SOL to recipient', 'IN_PROGRESS');

  try {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: intermediateKeypair.publicKey,
        toPubkey: new PublicKey(tx.recipientAddress),
        lamports: Math.floor(amountToSend),
      })
    );

    const signature = await sendAndConfirmTransaction(connection, transaction, [intermediateKeypair]);

    console.log(`\n✅ TRANSACTION COMPLETE!`);
    console.log(`   Signature: ${signature}`);
    console.log(`   Recipient received: ${amountToSend / LAMPORTS_PER_SOL} SOL`);

    await updateStepStatus(sendStep.id, 'COMPLETED', {
      amount: amountToSend / LAMPORTS_PER_SOL,
      signature,
    }, signature);

    await updateTransactionStatus(tx.id, 'COMPLETED', {
      withdrawalTxSignature: signature,
      completedAt: new Date(),
    });

    await addTransactionStep(tx.id, 'Privacy operation completed successfully', 'COMPLETED', {
      finalAmount: amountToSend / LAMPORTS_PER_SOL,
      recipient: tx.recipientAddress,
    });
  } catch (error) {
    await updateStepStatus(sendStep.id, 'FAILED', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Handle retries
 */
async function handleRetry(tx: any) {
  console.log(`🔄 Retrying transaction ${tx.id} (attempt ${tx.retryCount + 1}/${tx.maxRetries})`);

  // Increment retry count
  await prisma.transaction.update({
    where: { id: tx.id },
    data: {
      retryCount: tx.retryCount + 1,
      status: 'DEPOSIT_RECEIVED', // Start from beginning
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
