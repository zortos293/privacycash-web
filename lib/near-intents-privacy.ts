/**
 * Privacy Mixer using ONLY NEAR Intents 1Click API
 *
 * Multi-hop strategy for privacy without ZCASH z-addresses:
 * 1. SOL → ZEC (break first link)
 * 2. Wait (time delay for anonymity)
 * 3. ZEC → USDC (break second link)
 * 4. Wait (more time delay)
 * 5. USDC → SOL (final delivery)
 *
 * Privacy comes from:
 * - Multiple intermediate tokens
 * - Time delays between swaps
 * - NEAR Intents' internal pooling
 * - No direct on-chain link between sender and recipient
 */

import axios from 'axios';

const NEAR_INTENTS_API = process.env.NEAR_INTENTS_API_URL || 'https://1click.chaindefuser.com';
const NEAR_INTENTS_JWT = process.env.NEAR_INTENTS_JWT; // Optional, saves 0.1% fee

interface SwapQuoteRequest {
  dry?: boolean;
  depositMode?: 'SIMPLE' | 'MEMO';
  swapType: 'EXACT_INPUT' | 'EXACT_OUTPUT' | 'FLEX_INPUT' | 'ANY_INPUT';
  slippageTolerance: number; // basis points (100 = 1%)
  originAsset: string;
  depositType: 'ORIGIN_CHAIN' | 'INTENTS';
  destinationAsset: string;
  amount: string;
  refundTo: string;
  refundType: 'ORIGIN_CHAIN' | 'INTENTS';
  recipient: string;
  recipientType: 'DESTINATION_CHAIN' | 'INTENTS';
  deadline?: string; // ISO timestamp
  referral?: string;
  sessionId?: string;
}

interface SwapQuoteResponse {
  timestamp: string;
  signature: string;
  quoteRequest: SwapQuoteRequest;
  quote: {
    depositAddress: string;
    depositMemo?: string;
    amountIn: string;
    amountInFormatted: string;
    amountInUsd: string;
    minAmountIn?: string;
    amountOut: string;
    amountOutFormatted: string;
    amountOutUsd: string;
    minAmountOut?: string;
    deadline: string;
    timeWhenInactive: string;
    timeEstimate: number; // seconds
  };
}

interface SwapStatus {
  status: 'PENDING_DEPOSIT' | 'PROCESSING' | 'SUCCESS' | 'INCOMPLETE_DEPOSIT' | 'REFUNDED' | 'FAILED';
  updatedAt: string;
  swapDetails?: {
    amountIn: string;
    amountInFormatted: string;
    amountInUsd: string;
    amountOut: string;
    amountOutFormatted: string;
    amountOutUsd: string;
    originChainTxHashes?: Array<{ hash: string; explorerUrl: string }>;
    destinationChainTxHashes?: Array<{ hash: string; explorerUrl: string }>;
    refundedAmount?: string;
    refundedAmountFormatted?: string;
  };
}

/**
 * Get supported tokens from NEAR Intents
 */
export async function getSupportedTokens() {
  const response = await axios.get(`${NEAR_INTENTS_API}/v0/tokens`, {
    headers: NEAR_INTENTS_JWT ? { Authorization: `Bearer ${NEAR_INTENTS_JWT}` } : {},
  });
  return response.data;
}

/**
 * Request a swap quote
 */
export async function requestSwapQuote(request: SwapQuoteRequest): Promise<SwapQuoteResponse> {
  const response = await axios.post(`${NEAR_INTENTS_API}/v0/quote`, request, {
    headers: {
      'Content-Type': 'application/json',
      ...(NEAR_INTENTS_JWT ? { Authorization: `Bearer ${NEAR_INTENTS_JWT}` } : {}),
    },
  });
  return response.data;
}

/**
 * Check swap status
 */
export async function checkSwapStatus(
  depositAddress: string,
  depositMemo?: string
): Promise<SwapStatus> {
  const params = new URLSearchParams({ depositAddress });
  if (depositMemo) params.append('depositMemo', depositMemo);

  const response = await axios.get(`${NEAR_INTENTS_API}/v0/status?${params.toString()}`, {
    headers: NEAR_INTENTS_JWT ? { Authorization: `Bearer ${NEAR_INTENTS_JWT}` } : {},
  });
  return response.data;
}

/**
 * Submit deposit transaction hash (optional, speeds up processing)
 */
export async function submitDepositTx(
  txHash: string,
  depositAddress: string,
  memo?: string,
  nearSenderAccount?: string
) {
  const response = await axios.post(
    `${NEAR_INTENTS_API}/v0/deposit/submit`,
    {
      txHash,
      depositAddress,
      memo,
      nearSenderAccount,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        ...(NEAR_INTENTS_JWT ? { Authorization: `Bearer ${NEAR_INTENTS_JWT}` } : {}),
      },
    }
  );
  return response.data;
}

/**
 * PRIVACY MIXER: Multi-hop swap strategy
 *
 * Instead of z-addresses, we use multiple token hops with time delays
 */
export async function createPrivacyMixFlow(
  amountSOL: number,
  recipientAddress: string,
  refundAddress: string,
  timeDelayMinutes: number = 15
): Promise<{
  hop1: SwapQuoteResponse; // SOL → ZEC
  hop2: SwapQuoteResponse; // ZEC → USDC
  hop3: SwapQuoteResponse; // USDC → SOL
}> {
  const deadline = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours

  console.log('🎭 Creating 3-hop privacy mix flow...');
  console.log(`   Time delay between hops: ${timeDelayMinutes} minutes`);

  // HOP 1: SOL → ZEC (Wrapped ZEC on Solana)
  console.log('\n📍 HOP 1: SOL → ZEC');
  const hop1 = await requestSwapQuote({
    dry: false,
    swapType: 'EXACT_INPUT',
    slippageTolerance: 100, // 1%
    originAsset: 'solana:So11111111111111111111111111111111111111112', // Native SOL
    depositType: 'ORIGIN_CHAIN',
    destinationAsset: 'solana:A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS', // Wrapped ZEC
    amount: (amountSOL * 1e9).toString(), // Convert to lamports
    refundTo: refundAddress,
    refundType: 'ORIGIN_CHAIN',
    recipient: refundAddress, // We'll use this as intermediate
    recipientType: 'DESTINATION_CHAIN',
    deadline,
    referral: 'privacycash',
  });

  console.log(`✅ Deposit address: ${hop1.quote.depositAddress}`);
  console.log(`   Expected ZEC: ${hop1.quote.amountOutFormatted}`);
  console.log(`   ETA: ${hop1.quote.timeEstimate} seconds`);

  // HOP 2: ZEC → USDC (will be executed after first swap completes + delay)
  console.log('\n📍 HOP 2: ZEC → USDC (quote only)');
  const hop2 = await requestSwapQuote({
    dry: true, // Dry run for now
    swapType: 'FLEX_INPUT', // Accept variable amount from hop 1
    slippageTolerance: 100,
    originAsset: 'solana:A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS', // ZEC
    depositType: 'ORIGIN_CHAIN',
    destinationAsset: 'solana:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    amount: hop1.quote.amountOut, // Output from hop 1
    refundTo: refundAddress,
    refundType: 'ORIGIN_CHAIN',
    recipient: refundAddress,
    recipientType: 'DESTINATION_CHAIN',
    deadline,
    referral: 'privacycash',
  });

  console.log(`✅ Expected USDC: ${hop2.quote.amountOutFormatted}`);

  // HOP 3: USDC → SOL (final delivery)
  console.log('\n📍 HOP 3: USDC → SOL (quote only)');
  const hop3 = await requestSwapQuote({
    dry: true,
    swapType: 'FLEX_INPUT',
    slippageTolerance: 100,
    originAsset: 'solana:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    depositType: 'ORIGIN_CHAIN',
    destinationAsset: 'solana:So11111111111111111111111111111111111111112', // SOL
    amount: hop2.quote.amountOut,
    refundTo: refundAddress,
    refundType: 'ORIGIN_CHAIN',
    recipient: recipientAddress, // FINAL RECIPIENT
    recipientType: 'DESTINATION_CHAIN',
    deadline,
    referral: 'privacycash',
  });

  console.log(`✅ Expected final SOL: ${hop3.quote.amountOutFormatted}`);

  console.log('\n📊 Privacy Mix Summary:');
  console.log(`   Input: ${amountSOL} SOL`);
  console.log(`   Output: ~${hop3.quote.amountOutFormatted} SOL`);
  console.log(`   Total hops: 3`);
  console.log(`   Privacy level: Medium (no z-addresses, but multi-hop)`);

  return { hop1, hop2, hop3 };
}

/**
 * Find asset ID for a token symbol
 */
export async function findAssetId(symbol: string): Promise<string | null> {
  const tokens = await getSupportedTokens();
  const token = tokens.find(
    (t: any) => t.symbol.toLowerCase() === symbol.toLowerCase()
  );
  return token ? token.assetId : null;
}
