import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import axios from 'axios';
import * as zcash from './zcash';

/**
 * COMPLETE PRIVACY MIXER - SOL → ZEC → SOL
 *
 * Powered by:
 * - NEAR Intents 1Click API (SOL ↔ ZEC bridge)
 * - Tatum ZCASH RPC (z-address privacy operations)
 *
 * Privacy Flow:
 * 1. User deposits SOL on Solana
 * 2. NEAR bridge swaps SOL → ZEC (to t-address wallet A)
 * 3. ZCASH: Shield funds from t-address A → z-address B (PRIVATE)
 * 4. ZCASH: Shielded transfer z-address B → z-address C (FULLY PRIVATE)
 * 5. ZCASH: Deshield funds from z-address C → t-address D
 * 6. NEAR bridge swaps ZEC → SOL (from t-address D to recipient)
 *
 * Result: Complete unlinkability between sender and recipient
 */

const NEAR_INTENTS_API_URL = 'https://1click.chaindefuser.com';
const NEAR_INTENTS_JWT = process.env.NEAR_INTENTS_JWT; // Optional: Saves 0.1% fee

export interface BridgeQuote {
  quoteId: string;
  depositAddress: string;
  amount: string;
  estimatedOutput: string;
  exchangeRate: string;
  fees: {
    bridgeFee: string;
    nearIntent: string;
  };
  deadline: string;
}

export interface BridgeStatus {
  status: 'PENDING_DEPOSIT' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'INCOMPLETE_DEPOSIT';
  depositAddress: string;
  txHash?: string;
  outputTxHash?: string;
  completedAt?: string;
  failureReason?: string;
}

/**
 * Get quote for SOL → ZEC swap (Solana to Zcash mainnet)
 */
export async function getSOLtoZECQuote(
  amountSOL: number,
  recipientZcashTAddress: string,
  refundSolanaAddress: string
): Promise<BridgeQuote> {
  console.log(`🌉 Getting Zolana quote: ${amountSOL} SOL → ZEC`);
  console.log(`   Recipient (Zcash): ${recipientZcashTAddress}`);

  const headers: any = {
    'Content-Type': 'application/json',
  };

  if (NEAR_INTENTS_JWT) {
    headers['Authorization'] = `Bearer ${NEAR_INTENTS_JWT}`;
  }

  const deadline = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes from now

  const request = {
    swapType: 'EXACT_INPUT',
    slippageTolerance: 300, // 3% slippage (300 basis points)
    originAsset: {
      blockchain: 'solana',
      address: 'native', // SOL
    },
    destinationAsset: {
      blockchain: 'zcash',
      address: recipientZcashTAddress,
    },
    amount: (amountSOL * LAMPORTS_PER_SOL).toString(), // Convert to lamports
    refundTo: refundSolanaAddress,
    recipient: recipientZcashTAddress,
    deadline: deadline.toISOString(),
  };

  try {
    const response = await axios.post(
      `${NEAR_INTENTS_API_URL}/v0/quote`,
      request,
      { headers }
    );

    const quote = response.data;

    console.log(`✅ Quote received:`);
    console.log(`   Deposit to: ${quote.depositAddress}`);
    console.log(`   Expected output: ${quote.estimatedOutput} ZEC`);
    console.log(`   Rate: ${quote.exchangeRate}`);

    return {
      quoteId: quote.id || quote.quoteId,
      depositAddress: quote.depositAddress,
      amount: request.amount,
      estimatedOutput: quote.estimatedOutput,
      exchangeRate: quote.exchangeRate,
      fees: {
        bridgeFee: quote.fees?.bridgeFee || '0',
        nearIntent: quote.fees?.nearIntent || '0',
      },
      deadline: deadline.toISOString(),
    };
  } catch (error: any) {
    console.error('❌ Failed to get Zolana quote:', error.response?.data || error.message);
    throw new Error(`Zolana quote failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Get quote for ZEC → SOL swap (Zcash mainnet to Solana)
 */
export async function getZECtoSOLQuote(
  amountZEC: number,
  recipientSolanaAddress: string,
  refundZcashTAddress: string
): Promise<BridgeQuote> {
  console.log(`🌉 Getting Zolana quote: ${amountZEC} ZEC → SOL`);
  console.log(`   Recipient (Solana): ${recipientSolanaAddress}`);

  const headers: any = {
    'Content-Type': 'application/json',
  };

  if (NEAR_INTENTS_JWT) {
    headers['Authorization'] = `Bearer ${NEAR_INTENTS_JWT}`;
  }

  const deadline = new Date(Date.now() + 30 * 60 * 1000);

  const request = {
    swapType: 'EXACT_INPUT',
    slippageTolerance: 300, // 3%
    originAsset: {
      blockchain: 'zcash',
      address: refundZcashTAddress, // Source t-address
    },
    destinationAsset: {
      blockchain: 'solana',
      address: 'native', // SOL
    },
    amount: (amountZEC * 1e8).toString(), // ZEC in zatoshis (8 decimals)
    refundTo: refundZcashTAddress,
    recipient: recipientSolanaAddress,
    deadline: deadline.toISOString(),
  };

  try {
    const response = await axios.post(
      `${NEAR_INTENTS_API_URL}/v0/quote`,
      request,
      { headers }
    );

    const quote = response.data;

    console.log(`✅ Quote received:`);
    console.log(`   Deposit ZEC to: ${quote.depositAddress}`);
    console.log(`   Expected output: ${quote.estimatedOutput / LAMPORTS_PER_SOL} SOL`);

    return {
      quoteId: quote.id || quote.quoteId,
      depositAddress: quote.depositAddress,
      amount: request.amount,
      estimatedOutput: quote.estimatedOutput,
      exchangeRate: quote.exchangeRate,
      fees: {
        bridgeFee: quote.fees?.bridgeFee || '0',
        nearIntent: quote.fees?.nearIntent || '0',
      },
      deadline: deadline.toISOString(),
    };
  } catch (error: any) {
    console.error('❌ Failed to get Zolana quote:', error.response?.data || error.message);
    throw new Error(`Zolana quote failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Submit deposit notification (optional but recommended for faster processing)
 */
export async function submitDepositNotification(
  depositAddress: string,
  txHash: string
): Promise<void> {
  console.log(`📝 Submitting deposit notification for ${depositAddress}`);

  const headers: any = {
    'Content-Type': 'application/json',
  };

  if (NEAR_INTENTS_JWT) {
    headers['Authorization'] = `Bearer ${NEAR_INTENTS_JWT}`;
  }

  try {
    await axios.post(
      `${NEAR_INTENTS_API_URL}/v0/deposit/submit`,
      {
        depositAddress,
        txHash,
      },
      { headers }
    );

    console.log(`✅ Deposit notification submitted`);
  } catch (error: any) {
    console.warn(`⚠️ Failed to submit deposit notification:`, error.response?.data || error.message);
    // Non-critical - the bridge will detect the deposit anyway
  }
}

/**
 * Check bridge transaction status
 */
export async function checkBridgeStatus(depositAddress: string): Promise<BridgeStatus> {
  try {
    const response = await axios.get(
      `${NEAR_INTENTS_API_URL}/v0/status?depositAddress=${depositAddress}`
    );

    const status = response.data;

    return {
      status: status.status,
      depositAddress,
      txHash: status.depositTxHash,
      outputTxHash: status.outputTxHash,
      completedAt: status.completedAt,
      failureReason: status.failureReason,
    };
  } catch (error: any) {
    console.error(`❌ Failed to check bridge status:`, error.response?.data || error.message);
    throw new Error(`Status check failed: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Wait for bridge operation to complete
 */
export async function waitForBridgeCompletion(
  depositAddress: string,
  maxWaitTime: number = 600000, // 10 minutes default
  pollInterval: number = 15000 // 15 seconds
): Promise<BridgeStatus> {
  const startTime = Date.now();

  console.log(`⏳ Waiting for bridge completion (max ${maxWaitTime / 1000}s)...`);

  while (Date.now() - startTime < maxWaitTime) {
    const status = await checkBridgeStatus(depositAddress);

    console.log(`   Status: ${status.status}`);

    if (status.status === 'SUCCESS') {
      console.log(`✅ Bridge completed!`);
      return status;
    }

    if (status.status === 'FAILED' || status.status === 'REFUNDED') {
      throw new Error(`Bridge ${status.status}: ${status.failureReason || 'Unknown reason'}`);
    }

    if (status.status === 'INCOMPLETE_DEPOSIT') {
      throw new Error('Bridge failed: Incomplete deposit');
    }

    await sleep(pollInterval);
  }

  throw new Error(`Bridge timeout after ${maxWaitTime / 1000}s`);
}

/**
 * Execute SOL → ZEC bridge (with automatic deposit)
 */
export async function bridgeSOLtoZEC(
  connection: Connection,
  payerKeypair: Keypair,
  amountSOL: number,
  recipientZcashTAddress: string
): Promise<BridgeStatus> {
  console.log(`\n🌉 Bridging ${amountSOL} SOL → ZEC (Zolana)`);

  // Step 1: Get quote
  const quote = await getSOLtoZECQuote(
    amountSOL,
    recipientZcashTAddress,
    payerKeypair.publicKey.toString()
  );

  // Step 2: Send SOL to deposit address
  console.log(`💸 Sending ${amountSOL} SOL to deposit address...`);

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payerKeypair.publicKey,
      toPubkey: new PublicKey(quote.depositAddress),
      lamports: Math.floor(amountSOL * LAMPORTS_PER_SOL),
    })
  );

  const txSignature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payerKeypair]
  );

  console.log(`✅ Deposit sent: ${txSignature}`);

  // Step 3: Submit notification
  await submitDepositNotification(quote.depositAddress, txSignature);

  // Step 4: Wait for completion
  console.log(`⏳ Waiting for Zolana bridge to process...`);
  const result = await waitForBridgeCompletion(quote.depositAddress);

  console.log(`✅ Bridge completed! ZEC sent to ${recipientZcashTAddress}`);

  return result;
}

/**
 * Execute ZEC → SOL bridge (requires Zcash RPC to send ZEC)
 */
export async function bridgeZECtoSOL(
  zcashRPC: any, // Zcash RPC client
  fromZcashTAddress: string,
  amountZEC: number,
  recipientSolanaAddress: string
): Promise<BridgeStatus> {
  console.log(`\n🌉 Bridging ${amountZEC} ZEC → SOL (Zolana)`);

  // Step 1: Get quote
  const quote = await getZECtoSOLQuote(
    amountZEC,
    recipientSolanaAddress,
    fromZcashTAddress
  );

  // Step 2: Send ZEC to deposit address
  console.log(`💸 Sending ${amountZEC} ZEC to deposit address: ${quote.depositAddress}`);

  // Use Zcash RPC to send ZEC
  const zcashTxId = await zcashRPC.sendToAddress(
    quote.depositAddress,
    amountZEC,
    '', // comment
    '', // comment_to
    false // subtract fee from amount
  );

  console.log(`✅ ZEC deposit sent: ${zcashTxId}`);

  // Step 3: Submit notification
  await submitDepositNotification(quote.depositAddress, zcashTxId);

  // Step 4: Wait for completion
  console.log(`⏳ Waiting for Zolana bridge to process...`);
  const result = await waitForBridgeCompletion(quote.depositAddress);

  console.log(`✅ Bridge completed! SOL sent to ${recipientSolanaAddress}`);

  return result;
}

/**
 * Get list of supported tokens
 */
export async function getSupportedTokens() {
  try {
    const response = await axios.get(`${NEAR_INTENTS_API_URL}/v0/tokens`);
    return response.data;
  } catch (error: any) {
    console.error('Failed to get supported tokens:', error.message);
    return [];
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================
// COMPLETE PRIVACY MIXER IMPLEMENTATION
// ============================================

export interface PrivacyMixWallets {
  // Entry point: receives ZEC from NEAR bridge
  tAddress_A: string;

  // First z-address: receives shielded funds from A
  zAddress_B: string;
  zAddress_B_PrivateKey: string;

  // Second z-address: receives shielded transfer from B
  zAddress_C: string;
  zAddress_C_PrivateKey: string;

  // Exit point: receives deshielded funds from C, sends to NEAR bridge
  tAddress_D: string;
  tAddress_D_PrivateKey: string;
}

export interface PrivacyMixStatus {
  stage: 'init' | 'sol_to_zec' | 'shield' | 'shielded_transfer' | 'deshield' | 'zec_to_sol' | 'completed' | 'failed';
  currentStep: string;
  progress: number; // 0-100
  wallets: PrivacyMixWallets;
  amountSOL: number;
  amountZEC?: number;
  recipientSOL: string;
  txHashes: {
    solDeposit?: string;
    nearBridge1?: string;
    shieldTx?: string;
    shieldedTransferTx?: string;
    deshieldTx?: string;
    nearBridge2?: string;
    solOutput?: string;
  };
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

/**
 * Generate all wallets needed for privacy mix
 */
export async function generatePrivacyWallets(): Promise<PrivacyMixWallets> {
  console.log('🔐 Generating privacy mix wallets...');

  // Generate t-addresses
  const tAddress_A = await zcash.generateTAddress();
  const tAddress_D = await zcash.generateTAddress();
  const tAddress_D_PrivateKey = await zcash.exportPrivateKey(tAddress_D);

  // Generate z-addresses (shielded Sapling addresses)
  const zAddress_B = await zcash.generateZAddress();
  const zAddress_B_PrivateKey = await zcash.exportPrivateKey(zAddress_B);

  const zAddress_C = await zcash.generateZAddress();
  const zAddress_C_PrivateKey = await zcash.exportPrivateKey(zAddress_C);

  console.log('✅ Wallets generated:');
  console.log(`   t-address A (entry): ${tAddress_A}`);
  console.log(`   z-address B: ${zAddress_B.substring(0, 20)}...`);
  console.log(`   z-address C: ${zAddress_C.substring(0, 20)}...`);
  console.log(`   t-address D (exit): ${tAddress_D}`);

  return {
    tAddress_A,
    zAddress_B,
    zAddress_B_PrivateKey,
    zAddress_C,
    zAddress_C_PrivateKey,
    tAddress_D,
    tAddress_D_PrivateKey,
  };
}

/**
 * COMPLETE PRIVACY MIX: SOL → ZEC → Z-addresses → ZEC → SOL
 *
 * This is the main function that orchestrates the entire privacy flow
 */
export async function executePrivacyMix(
  connection: Connection,
  payerKeypair: Keypair,
  amountSOL: number,
  recipientSolanaAddress: string,
  statusCallback?: (status: PrivacyMixStatus) => void
): Promise<PrivacyMixStatus> {

  const status: PrivacyMixStatus = {
    stage: 'init',
    currentStep: 'Initializing privacy mix',
    progress: 0,
    wallets: {} as PrivacyMixWallets,
    amountSOL,
    recipientSOL: recipientSolanaAddress,
    txHashes: {},
    startedAt: new Date(),
  };

  const updateStatus = (updates: Partial<PrivacyMixStatus>) => {
    Object.assign(status, updates);
    if (statusCallback) statusCallback(status);
  };

  try {
    console.log('\n🎭 ========================================');
    console.log('🎭 PRIVACY MIX: SOL → ZEC → SOL');
    console.log('🎭 ========================================\n');

    // STEP 1: Generate wallets
    updateStatus({
      stage: 'init',
      currentStep: 'Generating ZCASH wallets',
      progress: 5,
    });

    const wallets = await generatePrivacyWallets();
    updateStatus({ wallets, progress: 10 });

    // STEP 2: Bridge SOL → ZEC (NEAR Intents)
    updateStatus({
      stage: 'sol_to_zec',
      currentStep: `Bridging ${amountSOL} SOL → ZEC via NEAR`,
      progress: 15,
    });

    console.log('\n📍 STEP 1/5: SOL → ZEC (NEAR Bridge)');
    const bridge1Quote = await getSOLtoZECQuote(
      amountSOL,
      wallets.tAddress_A,
      payerKeypair.publicKey.toString()
    );

    // Send SOL to deposit address
    console.log(`💸 Sending ${amountSOL} SOL to NEAR deposit address...`);
    const solDepositTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payerKeypair.publicKey,
        toPubkey: new PublicKey(bridge1Quote.depositAddress),
        lamports: Math.floor(amountSOL * LAMPORTS_PER_SOL),
      })
    );

    const solDepositSig = await sendAndConfirmTransaction(
      connection,
      solDepositTx,
      [payerKeypair]
    );

    console.log(`✅ SOL deposited: ${solDepositSig}`);
    updateStatus({
      txHashes: { ...status.txHashes, solDeposit: solDepositSig },
      progress: 20,
    });

    // Notify NEAR and wait for bridge
    await submitDepositNotification(bridge1Quote.depositAddress, solDepositSig);

    console.log(`⏳ Waiting for NEAR bridge to complete...`);
    updateStatus({
      currentStep: 'Waiting for NEAR bridge SOL → ZEC',
      progress: 25,
    });

    const bridge1Result = await waitForBridgeCompletion(bridge1Quote.depositAddress);
    const amountZEC = parseFloat(bridge1Quote.estimatedOutput);

    console.log(`✅ Bridge 1 completed! ${amountZEC} ZEC received at ${wallets.tAddress_A}`);
    updateStatus({
      amountZEC,
      txHashes: { ...status.txHashes, nearBridge1: bridge1Result.outputTxHash },
      progress: 35,
    });

    // Wait for ZEC to confirm (60 seconds)
    console.log('⏳ Waiting 60s for ZEC confirmations...');
    await sleep(60000);

    // STEP 3: Shield funds (t-address A → z-address B)
    updateStatus({
      stage: 'shield',
      currentStep: 'Shielding ZEC (t-address → z-address)',
      progress: 40,
    });

    console.log('\n📍 STEP 2/5: Shield funds (t-address → z-address)');
    const shieldTxId = await zcash.shieldFunds(
      wallets.tAddress_A,
      wallets.zAddress_B,
      amountZEC * 0.9999, // Leave tiny amount for fees
      'Privacy Mix Shield'
    );

    console.log(`✅ Funds shielded: ${shieldTxId}`);
    updateStatus({
      txHashes: { ...status.txHashes, shieldTx: shieldTxId },
      progress: 50,
    });

    // STEP 4: Shielded transfer (z-address B → z-address C) - FULLY PRIVATE
    updateStatus({
      stage: 'shielded_transfer',
      currentStep: 'Executing shielded transfer (FULLY PRIVATE)',
      progress: 60,
    });

    console.log('\n📍 STEP 3/5: Shielded transfer (z-address → z-address) 🔒');
    console.log('   🔐 This transaction is FULLY PRIVATE on the blockchain');

    const shieldedTxId = await zcash.shieldedTransfer(
      wallets.zAddress_B,
      wallets.zAddress_C,
      amountZEC * 0.9997, // Account for fees
      'Privacy Mix Transfer'
    );

    console.log(`✅ Shielded transfer completed: ${shieldedTxId}`);
    updateStatus({
      txHashes: { ...status.txHashes, shieldedTransferTx: shieldedTxId },
      progress: 70,
    });

    // STEP 5: Deshield funds (z-address C → t-address D)
    updateStatus({
      stage: 'deshield',
      currentStep: 'Deshielding ZEC (z-address → t-address)',
      progress: 75,
    });

    console.log('\n📍 STEP 4/5: Deshield funds (z-address → t-address)');
    const deshieldTxId = await zcash.deshieldFunds(
      wallets.zAddress_C,
      wallets.tAddress_D,
      amountZEC * 0.9995 // Final amount after all fees
    );

    console.log(`✅ Funds deshielded: ${deshieldTxId}`);
    updateStatus({
      txHashes: { ...status.txHashes, deshieldTx: deshieldTxId },
      progress: 80,
    });

    // Wait for confirmations
    console.log('⏳ Waiting 60s for ZEC confirmations...');
    await sleep(60000);

    // STEP 6: Bridge ZEC → SOL (NEAR Intents)
    updateStatus({
      stage: 'zec_to_sol',
      currentStep: `Bridging ZEC → SOL via NEAR to recipient`,
      progress: 85,
    });

    console.log('\n📍 STEP 5/5: ZEC → SOL (NEAR Bridge to recipient)');
    const finalZECAmount = amountZEC * 0.9995;

    const bridge2Quote = await getZECtoSOLQuote(
      finalZECAmount,
      recipientSolanaAddress,
      wallets.tAddress_D
    );

    // Send ZEC from t-address D to NEAR deposit address
    console.log(`💸 Sending ${finalZECAmount} ZEC to NEAR deposit address...`);

    // Use the zcashd RPC to send from t-address D
    // Note: We need to import the private key first
    await zcash.importPrivateKey(wallets.tAddress_D_PrivateKey);

    // Now send the ZEC (this uses z_sendmany under the hood)
    const params: any[] = [
      wallets.tAddress_D,
      [{ address: bridge2Quote.depositAddress, amount: finalZECAmount }],
      1, // minconf
      0.0001, // fee
    ];

    // Execute the send
    const zecDepositOpId = await zcash.rpcCall('z_sendmany', params);
    const zecDepositTxId = await zcash.waitForOperation(zecDepositOpId);

    console.log(`✅ ZEC deposited to NEAR: ${zecDepositTxId}`);
    updateStatus({ progress: 90 });

    // Notify NEAR and wait for bridge
    await submitDepositNotification(bridge2Quote.depositAddress, zecDepositTxId);

    console.log(`⏳ Waiting for NEAR bridge to complete...`);
    updateStatus({
      currentStep: 'Waiting for NEAR bridge ZEC → SOL',
      progress: 92,
    });

    const bridge2Result = await waitForBridgeCompletion(bridge2Quote.depositAddress);

    console.log(`✅ Bridge 2 completed! SOL sent to ${recipientSolanaAddress}`);
    console.log(`   Final output: ${parseFloat(bridge2Quote.estimatedOutput) / LAMPORTS_PER_SOL} SOL`);

    updateStatus({
      txHashes: {
        ...status.txHashes,
        nearBridge2: bridge2Result.outputTxHash,
        solOutput: bridge2Result.outputTxHash,
      },
      progress: 100,
    });

    // COMPLETE!
    console.log('\n✅ ========================================');
    console.log('✅ PRIVACY MIX COMPLETED SUCCESSFULLY!');
    console.log('✅ ========================================\n');
    console.log(`📊 Summary:`);
    console.log(`   Input: ${amountSOL} SOL`);
    console.log(`   Output: ~${parseFloat(bridge2Quote.estimatedOutput) / LAMPORTS_PER_SOL} SOL`);
    console.log(`   Privacy: COMPLETE (untraceable link)`);
    console.log(`   Time: ${Math.round((Date.now() - status.startedAt.getTime()) / 1000)}s`);

    updateStatus({
      stage: 'completed',
      currentStep: 'Privacy mix completed!',
      completedAt: new Date(),
    });

    return status;

  } catch (error: any) {
    console.error('\n❌ Privacy mix failed:', error.message);

    updateStatus({
      stage: 'failed',
      currentStep: 'Privacy mix failed',
      error: error.message,
    });

    throw error;
  }
}

/**
 * Helper: Estimate total fees for privacy mix
 */
export function estimatePrivacyMixFees(amountSOL: number): {
  nearBridgeFees: number; // SOL
  zcashNetworkFees: number; // ZEC
  totalFeeSOL: number;
  estimatedOutputSOL: number;
} {
  const solToZecRate = 0.0155; // Approximate: 1 SOL ≈ 0.0155 ZEC
  const zecToSolRate = 64.5; // Approximate: 1 ZEC ≈ 64.5 SOL

  // NEAR bridge fees (~0.3% each way)
  const nearFee1 = amountSOL * 0.003;
  const nearFee2 = (amountSOL - nearFee1) * solToZecRate * 0.003 * zecToSolRate;

  // ZCASH network fees (3 transactions × 0.0001 ZEC)
  const zcashFees = 0.0003 * zecToSolRate;

  const totalFeeSOL = nearFee1 + nearFee2 + zcashFees;
  const estimatedOutputSOL = amountSOL - totalFeeSOL;

  return {
    nearBridgeFees: nearFee1 + nearFee2,
    zcashNetworkFees: zcashFees,
    totalFeeSOL,
    estimatedOutputSOL,
  };
}
