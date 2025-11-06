import {
  Connection,
  Keypair,
  PublicKey,
  VersionedTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

const JUPITER_API_URL = process.env.JUPITER_API_URL || 'https://lite-api.jup.ag/swap/v1';
const ZEC_MINT = new PublicKey(
  process.env.ZEC_MINT_ADDRESS || 'A7bdiYdS5GjqGFtxf17ppRHtDKPkkRqbKtR27dxvQXaS'
);
const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112'); // Wrapped SOL

interface SwapResult {
  txSignature: string;
  inputAmount: number;
  outputAmount: number;
  inputMint: string;
  outputMint: string;
}

/**
 * Swap SOL to ZEC using Jupiter
 * Note: This swaps SOL from the payer's wallet to ZEC in the payer's wallet
 */
export async function swapSolToZec(
  connection: Connection,
  payerKeypair: Keypair,
  amountInLamports: number
): Promise<SwapResult> {
  console.log(`🔄 Swapping ${amountInLamports / LAMPORTS_PER_SOL} SOL → ZEC`);

  try {
    // Check actual wallet balance and use available amount
    const balance = await connection.getBalance(payerKeypair.publicKey);

    // Reserve for:
    // - Transaction fees: ~0.00001 SOL
    // - Wrapped SOL account rent: ~0.00204 SOL
    // - ZEC token account rent: ~0.00204 SOL
    // - Priority fees: included in Jupiter's calculation
    // - Safety margin: 0.001 SOL
    const reserveForFees = 5500000; // 0.0055 SOL total reserve
    const availableAmount = balance - reserveForFees;

    if (availableAmount <= 0) {
      throw new Error(`Insufficient balance. Wallet has ${balance / LAMPORTS_PER_SOL} SOL, needs at least ${reserveForFees / LAMPORTS_PER_SOL} SOL for fees`);
    }

    // Use the smaller of requested amount or available amount
    const actualAmount = Math.min(amountInLamports, availableAmount);

    console.log(`💰 Wallet balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    console.log(`💸 Reserved for fees: ${reserveForFees / LAMPORTS_PER_SOL} SOL`);
    console.log(`📊 Amount to swap: ${actualAmount / LAMPORTS_PER_SOL} SOL`);

    if (actualAmount < amountInLamports * 0.95) {
      console.log(`⚠️ Using available balance ${actualAmount / LAMPORTS_PER_SOL} SOL instead of requested ${amountInLamports / LAMPORTS_PER_SOL} SOL`);
    }

    // Build quote URL
    const quoteUrl = `${JUPITER_API_URL}/quote?inputMint=${SOL_MINT.toString()}&outputMint=${ZEC_MINT.toString()}&amount=${actualAmount}&slippageBps=300`;

    console.log(`📡 Fetching Jupiter quote: ${quoteUrl}`);

    // Get quote from Jupiter with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const quoteResponse = await fetch(quoteUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!quoteResponse.ok) {
      const errorText = await quoteResponse.text();
      throw new Error(`Jupiter quote failed (${quoteResponse.status}): ${errorText}`);
    }

    const quoteData = await quoteResponse.json();

    console.log(`📊 Quote: ${quoteData.outAmount} ZEC tokens (${quoteData.otherAmountThreshold} min)`);

    // Get swap transaction - ZEC will go to payer's ATA automatically
    const swapResponse = await fetch(`${JUPITER_API_URL}/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse: quoteData,
        userPublicKey: payerKeypair.publicKey.toString(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: {
          priorityLevelWithMaxLamports: {
            maxLamports: 10000000, // Max 0.01 SOL for priority fees
            priorityLevel: 'high',
          },
        },
      }),
    });

    if (!swapResponse.ok) {
      throw new Error(`Jupiter swap failed: ${await swapResponse.text()}`);
    }

    const swapData = await swapResponse.json();

    // Deserialize transaction
    const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

    // Sign transaction
    transaction.sign([payerKeypair]);

    // Send transaction
    const rawTransaction = transaction.serialize();
    const txSignature = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: false,
      maxRetries: 3,
    });

    // Confirm transaction
    await connection.confirmTransaction(txSignature, 'confirmed');

    console.log(`✅ SOL → ZEC swap completed: ${txSignature}`);

    return {
      txSignature,
      inputAmount: actualAmount / LAMPORTS_PER_SOL,
      outputAmount: Number(quoteData.outAmount),
      inputMint: SOL_MINT.toString(),
      outputMint: ZEC_MINT.toString(),
    };
  } catch (error: any) {
    console.error('❌ Swap SOL → ZEC failed:', error);

    // Provide more helpful error messages
    if (error.name === 'AbortError') {
      throw new Error('Jupiter API request timed out after 30 seconds. Check your internet connection.');
    }
    if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      throw new Error('Cannot reach Jupiter API. Check your internet connection and DNS settings.');
    }
    if (error.message?.includes('fetch failed')) {
      throw new Error('Network error connecting to Jupiter API. Check your firewall/proxy settings.');
    }

    throw error;
  }
}

/**
 * Swap ZEC to SOL using Jupiter
 * Note: This swaps ZEC from the payer's wallet to SOL in the payer's wallet
 */
export async function swapZecToSol(
  connection: Connection,
  payerKeypair: Keypair
): Promise<SwapResult> {
  console.log(`🔄 Swapping ZEC → SOL`);

  try {
    // Get ZEC token account and balance
    const { getAssociatedTokenAddress, getAccount } = await import('@solana/spl-token');

    const zecTokenAccount = await getAssociatedTokenAddress(
      ZEC_MINT,
      payerKeypair.publicKey
    );

    const tokenAccountInfo = await getAccount(connection, zecTokenAccount);
    const zecAmount = tokenAccountInfo.amount;

    console.log(`📊 ZEC balance: ${zecAmount} tokens`);

    // Build quote URL
    const quoteUrl = `${JUPITER_API_URL}/quote?inputMint=${ZEC_MINT.toString()}&outputMint=${SOL_MINT.toString()}&amount=${zecAmount}&slippageBps=300`;

    console.log(`📡 Fetching Jupiter quote: ${quoteUrl}`);

    // Get quote from Jupiter with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const quoteResponse = await fetch(quoteUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!quoteResponse.ok) {
      const errorText = await quoteResponse.text();
      throw new Error(`Jupiter quote failed (${quoteResponse.status}): ${errorText}`);
    }

    const quoteData = await quoteResponse.json();

    console.log(`📊 Quote: ${quoteData.outAmount / LAMPORTS_PER_SOL} SOL (${quoteData.otherAmountThreshold / LAMPORTS_PER_SOL} min)`);

    // Get swap transaction - SOL will be unwrapped to payer's wallet automatically
    const swapResponse = await fetch(`${JUPITER_API_URL}/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse: quoteData,
        userPublicKey: payerKeypair.publicKey.toString(),
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: {
          priorityLevelWithMaxLamports: {
            maxLamports: 10000000, // Max 0.01 SOL for priority fees
            priorityLevel: 'high',
          },
        },
      }),
    });

    if (!swapResponse.ok) {
      throw new Error(`Jupiter swap failed: ${await swapResponse.text()}`);
    }

    const swapData = await swapResponse.json();

    // Deserialize transaction
    const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);

    // Sign transaction
    transaction.sign([payerKeypair]);

    // Send transaction
    const rawTransaction = transaction.serialize();
    const txSignature = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: false,
      maxRetries: 3,
    });

    // Confirm transaction
    await connection.confirmTransaction(txSignature, 'confirmed');

    console.log(`✅ ZEC → SOL swap completed: ${txSignature}`);

    return {
      txSignature,
      inputAmount: Number(zecAmount),
      outputAmount: Number(quoteData.outAmount) / LAMPORTS_PER_SOL,
      inputMint: ZEC_MINT.toString(),
      outputMint: SOL_MINT.toString(),
    };
  } catch (error: any) {
    console.error('❌ Swap ZEC → SOL failed:', error);

    // Provide more helpful error messages
    if (error.name === 'AbortError') {
      throw new Error('Jupiter API request timed out after 30 seconds. Check your internet connection.');
    }
    if (error.code === 'ENOTFOUND' || error.code === 'EAI_AGAIN') {
      throw new Error('Cannot reach Jupiter API. Check your internet connection and DNS settings.');
    }
    if (error.message?.includes('fetch failed')) {
      throw new Error('Network error connecting to Jupiter API. Check your firewall/proxy settings.');
    }

    throw error;
  }
}
