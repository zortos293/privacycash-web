import { PrismaClient } from '@prisma/client';
import { Keypair, PublicKey } from '@solana/web3.js';
import { encryptPrivateKey, decryptPrivateKey } from './encryption';

// Singleton Prisma client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Creates a new transaction record with deposit wallet
 */
export async function createTransaction(
  recipientAddress: string,
  amount: number,
  delayMinutes: number = 60,
  relayerFee: number = 0.008  // 0.008 SOL relayer service fee
) {
  // Generate deposit wallet
  const depositWallet = Keypair.generate();

  // Create transaction
  const transaction = await prisma.transaction.create({
    data: {
      depositAddress: depositWallet.publicKey.toString(),
      recipientAddress,
      amount,
      delayMinutes,
      relayerFee,
      status: 'PENDING_DEPOSIT',
      wallets: {
        create: {
          walletAddress: depositWallet.publicKey.toString(),
          encryptedPrivateKey: encryptPrivateKey(
            depositWallet.secretKey,
            'temp' // Will update after transaction is created
          ),
          purpose: 'DEPOSIT',
        },
      },
      steps: {
        create: {
          stepName: 'Waiting for deposit',
          status: 'IN_PROGRESS',
          details: JSON.stringify({
            depositAddress: depositWallet.publicKey.toString(),
            amount,
          }),
        },
      },
    },
    include: {
      wallets: true,
      steps: true,
    },
  });

  // Re-encrypt with actual transaction ID
  const reencryptedKey = encryptPrivateKey(
    depositWallet.secretKey,
    transaction.id
  );

  await prisma.wallet.update({
    where: { walletAddress: depositWallet.publicKey.toString() },
    data: { encryptedPrivateKey: reencryptedKey },
  });

  return transaction;
}

/**
 * Get wallet keypair from encrypted storage
 */
export async function getWalletKeypair(
  walletAddress: string,
  transactionId: string
): Promise<Keypair> {
  const wallet = await prisma.wallet.findUnique({
    where: { walletAddress },
  });

  if (!wallet) {
    throw new Error(`Wallet not found: ${walletAddress}`);
  }

  const decryptedKey = decryptPrivateKey(
    wallet.encryptedPrivateKey,
    transactionId
  );

  return Keypair.fromSecretKey(decryptedKey);
}

/**
 * Create a new wallet for a transaction
 */
export async function createWallet(
  transactionId: string,
  purpose: 'DEPOSIT' | 'INTERMEDIATE' | 'ZEC_T_ADDRESS' | 'ZEC_Z_ADDRESS_1' | 'ZEC_Z_ADDRESS_2'
) {
  const keypair = Keypair.generate();

  const wallet = await prisma.wallet.create({
    data: {
      transactionId,
      walletAddress: keypair.publicKey.toString(),
      encryptedPrivateKey: encryptPrivateKey(keypair.secretKey, transactionId),
      purpose,
    },
  });

  return { wallet, keypair };
}

/**
 * Create a Zcash address for a transaction
 */
export async function createZcashAddress(
  transactionId: string,
  address: string,
  privateKey: string,
  purpose: 'ZEC_T_ADDRESS' | 'ZEC_Z_ADDRESS_1' | 'ZEC_Z_ADDRESS_2'
) {
  const wallet = await prisma.wallet.create({
    data: {
      transactionId,
      walletAddress: address,
      encryptedPrivateKey: encryptPrivateKey(
        Buffer.from(privateKey, 'utf-8'),
        transactionId
      ),
      purpose,
    },
  });

  return wallet;
}

/**
 * Add a step to transaction
 */
export async function addTransactionStep(
  transactionId: string,
  stepName: string,
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED',
  details?: any,
  txSignature?: string
) {
  return prisma.transactionStep.create({
    data: {
      transactionId,
      stepName,
      status,
      details: details ? JSON.stringify(details) : null,
      txSignature,
    },
  });
}

/**
 * Update transaction status
 */
export async function updateTransactionStatus(
  transactionId: string,
  status: any,
  updates?: Partial<{
    errorMessage: string;
    depositTxSignature: string;
    zecSwapTxSignature: string;
    solSwapTxSignature: string;
    withdrawalTxSignature: string;
    completedAt: Date;
  }>
) {
  return prisma.transaction.update({
    where: { id: transactionId },
    data: {
      status,
      ...updates,
    },
  });
}

/**
 * Update step status
 */
export async function updateStepStatus(
  stepId: string,
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED',
  details?: any,
  txSignature?: string
) {
  return prisma.transactionStep.update({
    where: { id: stepId },
    data: {
      status,
      details: details ? JSON.stringify(details) : undefined,
      txSignature: txSignature || undefined,
    },
  });
}

/**
 * Get transaction with all related data
 */
export async function getTransactionDetails(transactionId: string) {
  return prisma.transaction.findUnique({
    where: { id: transactionId },
    include: {
      wallets: true,
      steps: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });
}

/**
 * Get transactions pending processing (includes retryable failed transactions)
 */
export async function getPendingTransactions() {
  // Get all transactions that are in active states or failed but retryable
  const allTransactions = await prisma.transaction.findMany({
    where: {
      status: {
        in: [
          'DEPOSIT_RECEIVED',
          'SWAPPING_TO_ZEC',
          'WAITING_DELAY',
          'SWAPPING_TO_SOL',
          'SENDING_TO_RECIPIENT',
          // NEAR Intents flow statuses
          'HOP_1_DEPOSITING',
          'HOP_1_DELAY',
          'HOP_2_DEPOSITING',
          'FAILED',
        ],
      },
    },
    include: {
      wallets: true,
      steps: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Filter to only include FAILED transactions that haven't exceeded max retries
  return allTransactions.filter(tx =>
    tx.status !== 'FAILED' || tx.retryCount < tx.maxRetries
  );
}

/**
 * Check if deposit has been received
 */
export async function checkForDeposits() {
  return prisma.transaction.findMany({
    where: { status: 'PENDING_DEPOSIT' },
    include: { wallets: true, steps: true },
  });
}
