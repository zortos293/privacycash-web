/**
 * PRIVACY MIXER - NEAR Intents ONLY
 *
 * 2-Hop Privacy Strategy with ZEC:
 * 1. User deposits SOL to deposit wallet
 * 2. HOP 1: SOL → ZEC (via NEAR), store in NEAR Intents account
 * 3. Time delay (2.5 minutes)
 * 4. HOP 2: ZEC → SOL (from NEAR Intents account), deliver to recipient
 *
 * Privacy features:
 * - Cross-chain routing through NEAR network
 * - ZEC (privacy coin) as intermediate token for enhanced anonymity
 * - Intermediate ZEC stored in NEAR Intents system (not on-chain)
 * - Time delays break temporal correlation
 * - NEAR Intents pooling breaks on-chain link
 * - No direct SOL→SOL link on-chain
 */

import axios from 'axios';
import { Keypair } from '@solana/web3.js';

const NEAR_INTENTS_API = process.env.NEAR_INTENTS_API_URL || 'https://1click.chaindefuser.com';
const NEAR_INTENTS_JWT = process.env.NEAR_INTENTS_JWT;
const NEAR_ACCOUNT = process.env.NEAR_ACCOUNT || 'privacycash.near';

// Token asset IDs from NEAR Intents OmniBridge
// Using ZEC as privacy-focused intermediate token
const TOKENS = {
  SOL: 'nep141:sol.omft.near', // SOL via NEAR OmniBridge
  ZEC: 'nep141:zec.omft.near', // ZEC via NEAR OmniBridge (privacy coin)
};

export interface PrivacyMixConfig {
  amountSOL: number;
  recipientAddress: string;
  refundAddress: string;
  timeDelayMinutes?: number; // Default: 2.5
  numIntermediateWallets?: number; // Default: 3 (A, B, C)
  slippageTolerance?: number; // Default: 100 (1%)
  referral?: string;
}

export interface SwapHop {
  hopNumber: number;
  fromToken: string;
  toToken: string;
  fromWallet: string; // Wallet address that will send
  toWallet: string; // Wallet address that will receive
  depositAddress: string; // NEAR Intents deposit address
  depositMemo?: string;
  expectedAmountIn: string;
  expectedAmountOut: string;
  deadline: string;
  delayAfterMs: number;
  status: 'pending' | 'depositing' | 'processing' | 'completed' | 'failed';
}

export interface PrivacyMixPlan {
  transactionId: string;
  totalHops: number;
  estimatedTotalTimeMinutes: number;
  estimatedFinalAmount: number;
  intermediateWallets: Array<{
    keypair: Keypair;
    address: string;
    purpose: string;
  }>;
  hops: SwapHop[];
  createdAt: Date;
}

/**
 * API call helper
 */
async function nearIntentsAPI(method: 'GET' | 'POST', endpoint: string, data?: any) {
  const headers: any = {
    'Content-Type': 'application/json',
  };

  if (NEAR_INTENTS_JWT) {
    headers.Authorization = `Bearer ${NEAR_INTENTS_JWT}`;
  }

  const config: any = {
    method,
    url: `${NEAR_INTENTS_API}${endpoint}`,
    headers,
  };

  if (data) {
    config.data = data;
  }

  const response = await axios(config);
  return response.data;
}

/**
 * Create a swap quote
 */
async function createSwapQuote(params: {
  dry?: boolean;
  originAsset: string;
  destinationAsset: string;
  amountIn: string; // In smallest unit (lamports, etc.)
  refundAddress: string;
  recipientAddress: string;
  deadline: string;
  slippageTolerance: number;
  referral?: string;
  useIntentsRecipient?: boolean; // For intermediate hops on NEAR
  useIntentsDeposit?: boolean; // For depositing from NEAR Intents account
}) {
  const depositType = params.useIntentsDeposit ? 'INTENTS' : 'ORIGIN_CHAIN';
  const refundType = params.useIntentsDeposit ? 'INTENTS' : 'ORIGIN_CHAIN';

  return nearIntentsAPI('POST', '/v0/quote', {
    dry: params.dry || false,
    depositMode: 'SIMPLE',
    swapType: 'FLEX_INPUT', // Accept variable amounts
    slippageTolerance: params.slippageTolerance,
    originAsset: params.originAsset,
    depositType,
    destinationAsset: params.destinationAsset,
    amount: params.amountIn,
    refundTo: params.refundAddress,
    refundType,
    recipient: params.recipientAddress,
    // Use INTENTS recipient for intermediate NEAR hops, DESTINATION_CHAIN for final delivery
    recipientType: params.useIntentsRecipient ? 'INTENTS' : 'DESTINATION_CHAIN',
    deadline: params.deadline,
    referral: params.referral || 'privacycash',
    quoteWaitingTimeMs: 3000,
  });
}

/**
 * Check swap status
 */
export async function checkSwapStatus(depositAddress: string, depositMemo?: string) {
  const params = new URLSearchParams({ depositAddress });
  if (depositMemo) params.append('depositMemo', depositMemo);

  return nearIntentsAPI('GET', `/v0/status?${params.toString()}`);
}

/**
 * Submit deposit transaction (optional, speeds up processing)
 */
export async function submitDepositTx(txHash: string, depositAddress: string) {
  return nearIntentsAPI('POST', '/v0/deposit/submit', {
    txHash,
    depositAddress,
  });
}

/**
 * Submit INTENTS deposit confirmation
 * Used when depositType is INTENTS to signal internal balance should be used
 *
 * According to docs: "nearSenderAccount - Sender account (used only for NEAR blockchain)"
 * When using internal INTENTS balance, no txHash is needed - system pulls automatically
 */
export async function confirmIntentsDeposit(depositAddress: string, nearAccount: string) {
  return nearIntentsAPI('POST', '/v0/deposit/submit', {
    depositAddress,
    nearSenderAccount: nearAccount,
    // No txHash - system automatically pulls from mt-token balance
  });
}

/**
 * Generate intermediate wallets for privacy mixing
 */
function generateIntermediateWallets(count: number) {
  const wallets = [];
  const labels = ['WALLET_A', 'WALLET_B', 'WALLET_C', 'WALLET_D', 'WALLET_E'];

  for (let i = 0; i < count; i++) {
    const keypair = Keypair.generate();
    wallets.push({
      keypair,
      address: keypair.publicKey.toBase58(),
      purpose: labels[i] || `WALLET_${i + 1}`,
    });
  }

  return wallets;
}

/**
 * CREATE PRIVACY MIX PLAN - 2-HOP WITH ZEC
 *
 * Flow: SOL → ZEC (stored in NEAR Intents) → wait → ZEC → SOL → recipient
 *
 * Privacy features:
 * - Cross-chain routing through NEAR OmniBridge
 * - ZEC (privacy coin) as intermediate token for enhanced anonymity
 * - ZEC stored in NEAR Intents system (not on-chain)
 * - 2.5 minute time delay between hops
 * - NEAR's internal pooling provides anonymity
 * - Breaks direct SOL→SOL link on-chain
 */
export async function createPrivacyMixPlan(
  config: PrivacyMixConfig,
  transactionId: string
): Promise<PrivacyMixPlan> {
  const {
    amountSOL,
    recipientAddress,
    refundAddress,
    timeDelayMinutes = 2.5,
    numIntermediateWallets = 1, // Only need 1 wallet for tracking (ZEC stored in NEAR Intents)
    slippageTolerance = 100,
    referral = 'privacycash',
  } = config;

  console.log('🎭 Creating Privacy Mix Plan (NEAR OmniBridge)...');
  console.log(`   Transaction ID: ${transactionId}`);
  console.log(`   Amount: ${amountSOL} SOL`);
  console.log(`   Flow: SOL → ZEC → SOL (via NEAR)`);
  console.log(`   NEAR Account: ${NEAR_ACCOUNT}`);
  console.log(`   Time delay: ${timeDelayMinutes} minutes`);

  // Generate tracking wallet
  const intermediateWallets = generateIntermediateWallets(numIntermediateWallets);

  console.log('\n📦 Generated tracking wallet:');
  intermediateWallets.forEach((w, i) => {
    console.log(`   ${i + 1}. ${w.purpose}: ${w.address}`);
  });

  const deadline = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours
  const delayMs = timeDelayMinutes * 60 * 1000;

  const hops: SwapHop[] = [];

  // HOP 1: SOL → ZEC (store in NEAR Intents account)
  console.log('\n🔄 HOP 1: SOL → ZEC (via NEAR)');
  const hop1Quote = await createSwapQuote({
    originAsset: TOKENS.SOL,
    destinationAsset: TOKENS.ZEC,
    amountIn: Math.floor(amountSOL * 1e9).toString(), // Convert to lamports (integer)
    refundAddress,
    recipientAddress: NEAR_ACCOUNT, // Store ZEC in NEAR Intents account
    deadline,
    slippageTolerance,
    referral,
    useIntentsRecipient: true, // Use INTENTS to store in NEAR account
  });

  hops.push({
    hopNumber: 1,
    fromToken: 'SOL',
    toToken: 'ZEC',
    fromWallet: 'DEPOSIT_WALLET', // User's deposit
    toWallet: NEAR_ACCOUNT, // Stored in NEAR Intents
    depositAddress: hop1Quote.quote.depositAddress,
    depositMemo: hop1Quote.quote.depositMemo,
    expectedAmountIn: hop1Quote.quote.amountInFormatted,
    expectedAmountOut: hop1Quote.quote.amountOutFormatted,
    deadline: hop1Quote.quote.deadline,
    delayAfterMs: delayMs,
    status: 'pending',
  });

  console.log(`   ✅ Deposit address: ${hop1Quote.quote.depositAddress}`);
  console.log(`   📊 Expected output: ${hop1Quote.quote.amountOutFormatted} ZEC`);
  console.log(`   📍 Stored in NEAR Intents account: ${NEAR_ACCOUNT}`);

  // HOP 2: ZEC → SOL (after delay, from NEAR Intents account to recipient)
  console.log(`\n🔄 HOP 2: ZEC → SOL (after ${timeDelayMinutes} min delay)`);
  const hop2Quote = await createSwapQuote({
    dry: true, // Dry run for now
    originAsset: TOKENS.ZEC,
    destinationAsset: TOKENS.SOL,
    amountIn: hop1Quote.quote.amountOut, // Use output from hop 1
    refundAddress: NEAR_ACCOUNT, // Refund to NEAR account (since we're depositing from INTENTS)
    recipientAddress, // Direct to final recipient on Solana
    deadline,
    slippageTolerance,
    referral,
    useIntentsRecipient: false, // Use DESTINATION_CHAIN for Solana delivery
    useIntentsDeposit: true, // Depositing from NEAR Intents account
  });

  hops.push({
    hopNumber: 2,
    fromToken: 'ZEC',
    toToken: 'SOL',
    fromWallet: NEAR_ACCOUNT, // From NEAR Intents account
    toWallet: recipientAddress, // Direct to recipient
    depositAddress: '', // Will be created when hop 1 completes
    expectedAmountIn: hop2Quote.quote.amountInFormatted,
    expectedAmountOut: hop2Quote.quote.amountOutFormatted,
    deadline: hop2Quote.quote.deadline,
    delayAfterMs: 0, // Last hop
    status: 'pending',
  });

  console.log(`   📊 Expected output: ${hop2Quote.quote.amountOutFormatted} SOL`);
  console.log(`   🎯 Direct delivery to recipient!`);
  console.log(`   🔒 Privacy: ZEC routing provides enhanced anonymity`);

  const estimatedFinalAmount = parseFloat(hop2Quote.quote.amountOutFormatted);
  const estimatedTotalTimeMinutes = timeDelayMinutes + 10; // Delay + swap processing time

  console.log('\n📊 Privacy Mix Plan Summary:');
  console.log(`   Total hops: ${hops.length}`);
  console.log(`   Estimated time: ~${estimatedTotalTimeMinutes} minutes`);
  console.log(`   Input: ${amountSOL} SOL ($${(amountSOL * 157.26).toFixed(2)})`);
  console.log(`   Expected output: ~${estimatedFinalAmount} SOL`);
  console.log(`   Fee/slippage: ~${((1 - estimatedFinalAmount / amountSOL) * 100).toFixed(2)}%`);
  console.log(`   Privacy: SOL → ZEC (NEAR) → SOL (breaks direct link + privacy coin)`);

  return {
    transactionId,
    totalHops: hops.length,
    estimatedTotalTimeMinutes,
    estimatedFinalAmount,
    intermediateWallets,
    hops,
    createdAt: new Date(),
  };
}

/**
 * Execute a specific hop in the privacy mix
 */
export async function executeHop(
  plan: PrivacyMixPlan,
  hopNumber: number,
  actualAmountIn?: string
): Promise<void> {
  const hop = plan.hops[hopNumber - 1];
  if (!hop) throw new Error(`Hop ${hopNumber} not found`);

  console.log(`\n🔄 Executing HOP ${hopNumber}: ${hop.fromToken} → ${hop.toToken}`);
  console.log(`   From: ${hop.fromWallet}`);
  console.log(`   To: ${hop.toWallet}`);

  // If this is hop 1, the deposit address is already created
  // If this is hop 2+, we need to create a new quote with actual amount
  if (hopNumber > 1 && !hop.depositAddress) {
    console.log('   Creating new swap quote with actual amount...');

    const deadline = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    const quote = await createSwapQuote({
      originAsset: TOKENS[hop.fromToken as keyof typeof TOKENS],
      destinationAsset: TOKENS[hop.toToken as keyof typeof TOKENS],
      amountIn: actualAmountIn || hop.expectedAmountIn,
      refundAddress: hop.fromWallet,
      recipientAddress: hop.toWallet,
      deadline,
      slippageTolerance: 100,
      referral: 'privacycash',
    });

    hop.depositAddress = quote.quote.depositAddress;
    hop.depositMemo = quote.quote.depositMemo;
    hop.expectedAmountOut = quote.quote.amountOutFormatted;

    console.log(`   ✅ New deposit address: ${hop.depositAddress}`);
    console.log(`   📊 Expected output: ${hop.expectedAmountOut} ${hop.toToken}`);
  }

  hop.status = 'depositing';
}

/**
 * Wait for a hop to complete
 */
export async function waitForHopCompletion(
  plan: PrivacyMixPlan,
  hopNumber: number,
  maxWaitMs: number = 10 * 60 * 1000 // 10 minutes
): Promise<boolean> {
  const hop = plan.hops[hopNumber - 1];
  if (!hop) throw new Error(`Hop ${hopNumber} not found`);

  console.log(`\n⏳ Waiting for HOP ${hopNumber} to complete...`);
  console.log(`   Deposit address: ${hop.depositAddress}`);

  const startTime = Date.now();
  const pollInterval = 10000; // 10 seconds

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const status = await checkSwapStatus(hop.depositAddress, hop.depositMemo);

      console.log(`   Status: ${status.status}`);

      if (status.status === 'SUCCESS') {
        hop.status = 'completed';
        console.log(`   ✅ HOP ${hopNumber} completed!`);

        if (status.swapDetails) {
          console.log(`   📊 Amount out: ${status.swapDetails.amountOutFormatted} ${hop.toToken}`);
          return true;
        }
      } else if (status.status === 'FAILED' || status.status === 'REFUNDED') {
        hop.status = 'failed';
        console.log(`   ❌ HOP ${hopNumber} failed: ${status.status}`);
        return false;
      }

      // Still pending/processing
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    } catch (error) {
      console.log(`   ⚠️  Error checking status: ${error}`);
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }
  }

  console.log(`   ⏱️  Timeout waiting for HOP ${hopNumber}`);
  return false;
}
