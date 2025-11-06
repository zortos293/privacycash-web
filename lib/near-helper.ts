/**
 * NEAR Helper - Handles NEAR account operations for HOP 2
 *
 * This module provides utilities to:
 * 1. Authenticate with NEAR account using private key
 * 2. Execute HOP 2 swaps (ZEC → SOL) from NEAR Intents account
 * 3. Check NEAR account balances
 */

// Suppress NEAR deprecation warnings
process.env.NEAR_NO_LOGS = 'true';

import { keyStores, KeyPair, connect, Account } from 'near-api-js';

const NEAR_NETWORK = process.env.NEAR_NETWORK || 'mainnet';
const NEAR_ACCOUNT_ID = process.env.NEAR_ACCOUNT || 'mertcash.near';
const NEAR_PRIVATE_KEY = process.env.NEAR_PRIVATE_KEY;

interface NearConfig {
  networkId: string;
  nodeUrl: string;
  walletUrl: string;
  helperUrl: string;
}

const NEAR_CONFIGS: { [key: string]: NearConfig } = {
  mainnet: {
    networkId: 'mainnet',
    nodeUrl: 'https://rpc.mainnet.near.org',
    walletUrl: 'https://wallet.near.org',
    helperUrl: 'https://helper.mainnet.near.org',
  },
  testnet: {
    networkId: 'testnet',
    nodeUrl: 'https://rpc.testnet.near.org',
    walletUrl: 'https://wallet.testnet.near.org',
    helperUrl: 'https://helper.testnet.near.org',
  },
};

/**
 * Get NEAR connection with configured account
 */
export async function getNearConnection(): Promise<{ connection: any; account: Account }> {
  if (!NEAR_PRIVATE_KEY) {
    throw new Error('NEAR_PRIVATE_KEY not configured in .env');
  }

  const config = NEAR_CONFIGS[NEAR_NETWORK];
  if (!config) {
    throw new Error(`Invalid NEAR network: ${NEAR_NETWORK}`);
  }

  // Create keystore and add the key
  const keyStore = new keyStores.InMemoryKeyStore();
  const keyPair = KeyPair.fromString(NEAR_PRIVATE_KEY as any);
  await keyStore.setKey(config.networkId, NEAR_ACCOUNT_ID, keyPair);

  // Connect to NEAR
  const connection = await connect({
    networkId: config.networkId,
    keyStore,
    nodeUrl: config.nodeUrl,
    walletUrl: config.walletUrl,
    helperUrl: config.helperUrl,
  });

  // Get account
  const account = await connection.account(NEAR_ACCOUNT_ID);

  return { connection, account };
}

/**
 * Check NEAR account balance
 */
export async function checkNearBalance(): Promise<string> {
  try {
    const { account } = await getNearConnection();
    const balance = await account.getAccountBalance();

    return balance.available;
  } catch (error) {
    console.error('Error checking NEAR balance:', error);
    throw error;
  }
}

/**
 * Get NEAR account info
 */
export async function getNearAccountInfo(): Promise<any> {
  try {
    const { account } = await getNearConnection();
    const state = await account.state();

    return {
      accountId: NEAR_ACCOUNT_ID,
      balance: state.amount,
      storage: state.storage_usage,
      locked: state.locked,
    };
  } catch (error) {
    console.error('Error getting NEAR account info:', error);
    throw error;
  }
}

/**
 * Execute HOP 2 withdrawal from NEAR Intents
 *
 * This creates a new swap quote from the NEAR account's ZEC balance
 * and initiates the swap to SOL
 */
export async function executeHop2Withdrawal(params: {
  zecAmount: string; // Amount of ZEC (decimal string like "0.02728")
  recipientSolanaAddress: string;
  refundNearAccount: string;
  slippageTolerance: number;
  referral?: string;
}): Promise<any> {
  const {
    zecAmount,
    recipientSolanaAddress,
    refundNearAccount,
    slippageTolerance,
    referral = 'privacycash'
  } = params;

  // Import NEAR Intents API helper
  const axios = require('axios');
  const NEAR_INTENTS_API = process.env.NEAR_INTENTS_API_URL || 'https://1click.chaindefuser.com';
  const NEAR_INTENTS_JWT = process.env.NEAR_INTENTS_JWT;

  const headers: any = {
    'Content-Type': 'application/json',
  };

  if (NEAR_INTENTS_JWT) {
    headers.Authorization = `Bearer ${NEAR_INTENTS_JWT}`;
  }

  const deadline = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  // Convert ZEC to zatoshis (1 ZEC = 100,000,000 zatoshis)
  const zecAmountFloat = parseFloat(zecAmount);
  const zatoshis = Math.floor(zecAmountFloat * 1e8).toString();

  console.log(`   Converting ${zecAmount} ZEC → ${zatoshis} zatoshis`);

  // Create quote for HOP 2: ZEC → SOL
  const quoteRequest = {
    dry: false,
    depositMode: 'SIMPLE',
    swapType: 'FLEX_INPUT',
    slippageTolerance,
    originAsset: 'nep141:zec.omft.near', // ZEC on NEAR
    depositType: 'INTENTS', // Depositing from NEAR Intents account
    destinationAsset: 'nep141:sol.omft.near', // SOL
    amount: zatoshis, // Amount in zatoshis (integer string)
    refundTo: refundNearAccount, // Refund to NEAR account (since depositing from INTENTS)
    refundType: 'INTENTS',
    recipient: recipientSolanaAddress, // Final delivery to Solana
    recipientType: 'DESTINATION_CHAIN',
    deadline,
    referral,
    quoteWaitingTimeMs: 3000,
  };

  try {
    const response = await axios.post(
      `${NEAR_INTENTS_API}/v0/quote`,
      quoteRequest,
      { headers }
    );

    console.log('✅ HOP 2 quote created successfully');
    console.log(`   Deposit address: ${response.data.quote.depositAddress}`);
    console.log(`   Expected output: ${response.data.quote.amountOutFormatted} SOL`);

    return response.data;
  } catch (error: any) {
    console.error('❌ Error creating HOP 2 quote:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Register NEAR account with ZEC token contract
 * This is required before you can hold or transfer ZEC tokens
 */
export async function registerZecAccount(): Promise<void> {
  try {
    const { account } = await getNearConnection();
    const ZEC_TOKEN_CONTRACT = 'zec.omft.near';

    console.log(`📝 Registering ${NEAR_ACCOUNT_ID} with ${ZEC_TOKEN_CONTRACT}...`);

    // Call storage_deposit to register the account
    // Typically requires ~0.00125 NEAR for storage
    const result = await account.functionCall({
      contractId: ZEC_TOKEN_CONTRACT,
      methodName: 'storage_deposit',
      args: {
        account_id: NEAR_ACCOUNT_ID,
        registration_only: true,
      },
      gas: BigInt('300000000000000'), // 300 TGas
      attachedDeposit: BigInt('1250000000000000000000'), // 0.00125 NEAR in yoctoNEAR
    });

    console.log('✅ Account registered successfully');
    console.log(`   Transaction: ${result.transaction.hash}`);
  } catch (error: any) {
    // Check if already registered
    if (error.message?.includes('already registered') || error.message?.includes('The account is already registered')) {
      console.log('ℹ️  Account already registered');
      return;
    }
    console.error('❌ Error registering account:', error.message);
    throw error;
  }
}

/**
 * Check if account is registered with ZEC token contract
 */
export async function isZecAccountRegistered(): Promise<boolean> {
  try {
    const { account } = await getNearConnection();
    const ZEC_TOKEN_CONTRACT = 'zec.omft.near';

    const result = await account.viewFunction({
      contractId: ZEC_TOKEN_CONTRACT,
      methodName: 'storage_balance_of',
      args: {
        account_id: NEAR_ACCOUNT_ID,
      },
    });

    return result !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Transfer ZEC from NEAR Intents mt-token balance to deposit address
 * This is used for HOP 2 when ZEC is stored in intents.near internal system
 */
export async function transferZecFromIntents(params: {
  depositAddress: string;
  zecAmountZatoshis: string; // Amount in zatoshis (integer)
}): Promise<string> {
  const { depositAddress, zecAmountZatoshis } = params;

  try {
    const { account } = await getNearConnection();

    const INTENTS_CONTRACT = 'intents.near';
    const ZEC_MT_TOKEN_ID = 'nep141:zec.omft.near';

    const result = await account.functionCall({
      contractId: INTENTS_CONTRACT,
      methodName: 'mt_transfer',
      args: {
        token_id: ZEC_MT_TOKEN_ID,
        receiver_id: depositAddress,
        amount: zecAmountZatoshis,
        memo: null,
      },
      gas: BigInt('300000000000000'), // 300 TGas
      attachedDeposit: BigInt('1'), // 1 yoctoNEAR for security
    });

    return result.transaction.hash;
  } catch (error: any) {
    console.error('❌ MT-token transfer error:', error.message);
    throw error;
  }
}

/**
 * Transfer ZEC from NEAR account to NEAR Intents deposit address
 * (For regular NEP-141 token transfers, not mt-tokens)
 */
export async function transferZecFromNearAccount(params: {
  depositAddress: string;
  zecAmountZatoshis: string; // Amount in zatoshis (integer)
}): Promise<string> {
  const { depositAddress, zecAmountZatoshis } = params;

  try {
    const { account } = await getNearConnection();

    // ZEC token contract on NEAR
    const ZEC_TOKEN_CONTRACT = 'zec.omft.near';

    // Check if account is registered first
    const isRegistered = await isZecAccountRegistered();
    if (!isRegistered) {
      console.log('⚠️  Account not registered with ZEC contract. Registering now...');
      await registerZecAccount();
    }

    console.log(`   Transferring ${zecAmountZatoshis} zatoshis to ${depositAddress}`);

    // Call ft_transfer on the ZEC token contract
    const result = await account.functionCall({
      contractId: ZEC_TOKEN_CONTRACT,
      methodName: 'ft_transfer',
      args: {
        receiver_id: depositAddress,
        amount: zecAmountZatoshis,
        memo: null,
      },
      gas: BigInt('300000000000000'), // 300 TGas
      attachedDeposit: BigInt('1'), // 1 yoctoNEAR for security
    });

    const txHash = result.transaction.hash;
    console.log(`   Transfer tx hash: ${txHash}`);

    return txHash;
  } catch (error: any) {
    console.error('❌ Error transferring ZEC from NEAR:', error.message);
    throw error;
  }
}

/**
 * Check if NEAR credentials are properly configured
 */
export function checkNearCredentials(): boolean {
  if (!NEAR_ACCOUNT_ID) {
    console.error('❌ NEAR_ACCOUNT not configured in .env');
    return false;
  }

  if (!NEAR_PRIVATE_KEY) {
    console.error('❌ NEAR_PRIVATE_KEY not configured in .env');
    return false;
  }

  // Check if private key has correct format
  if (!NEAR_PRIVATE_KEY.startsWith('ed25519:')) {
    console.error('❌ NEAR_PRIVATE_KEY must be in format: ed25519:Base58Key');
    return false;
  }

  return true;
}

/**
 * Test NEAR connection
 */
export async function testNearConnection(): Promise<boolean> {
  try {
    if (!checkNearCredentials()) {
      return false;
    }

    const { account } = await getNearConnection();
    const state = await account.state();

    console.log('✅ NEAR connection successful');
    console.log(`   Account: ${NEAR_ACCOUNT_ID}`);
    console.log(`   Balance: ${(BigInt(state.amount) / BigInt(1e24)).toString()} NEAR`);

    return true;
  } catch (error: any) {
    console.error('❌ NEAR connection failed:', error.message);
    return false;
  }
}
