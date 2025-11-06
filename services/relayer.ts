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
  getWalletKeypair,
  addTransactionStep,
  updateTransactionStatus,
  updateStepStatus,
  getPendingTransactions,
  checkForDeposits,
  getTransactionDetails,
} from '../lib/db';
import { swapSolToZec, swapZecToSol } from '../lib/jupiter';

const NETWORK = 'mainnet';
const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  'https://api.mainnet.solana.com';

const connection = new Connection(RPC_URL, 'confirmed');

const POLLING_INTERVAL = 15000; // 15 seconds
const MIN_BALANCE_FOR_DEPOSIT = 0.001 * LAMPORTS_PER_SOL; // Minimum to consider as deposit

/**
 * Main relayer loop
 */
export async function startRelayer() {
  console.log('🚀 Privacy Cash Relayer Starting...');
  console.log(`📡 Network: Solana Mainnet`);
  console.log(`🔗 RPC: ${RPC_URL}`);

  // Main processing loop
  while (true) {
    try {
      await processDeposits();
      await processPendingTransactions();

      // Wait before next iteration
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

      // Check balance
      const balance = await connection.getBalance(
        new PublicKey(depositWallet.walletAddress)
      );

      if (balance >= MIN_BALANCE_FOR_DEPOSIT) {
        console.log(`💰 Deposit received for transaction ${tx.id}: ${balance / LAMPORTS_PER_SOL} SOL`);

        // Update transaction status
        await updateTransactionStatus(tx.id, 'DEPOSIT_RECEIVED', {
          depositTxSignature: 'detected', // Could fetch actual tx signature
        });

        // Complete the deposit step
        const depositStep = tx.steps.find(
          (s) => s.stepName === 'Waiting for deposit'
        );
        if (depositStep) {
          await updateStepStatus(depositStep.id, 'COMPLETED', {
            balance: balance / LAMPORTS_PER_SOL,
          });
        }

        // Add next step
        await addTransactionStep(tx.id, 'Preparing to swap SOL → ZEC', 'PENDING');
      }
    } catch (error) {
      console.error(`Error processing deposit for ${tx.id}:`, error);
    }
  }
}

/**
 * Handle retry of failed transaction - reset to appropriate status
 */
async function handleRetry(tx: any) {
  console.log(`🔄 Retrying failed transaction ${tx.id} (attempt ${tx.retryCount + 1}/${tx.maxRetries})`);

  // Determine which step failed by looking at the last completed step
  const completedSteps = tx.steps.filter((s: any) => s.status === 'COMPLETED');
  const lastCompletedStep = completedSteps[completedSteps.length - 1];

  let resetStatus: string = 'DEPOSIT_RECEIVED'; // Default fallback

  // Determine appropriate status based on progress
  if (!lastCompletedStep) {
    // No steps completed yet, start from beginning
    resetStatus = 'DEPOSIT_RECEIVED';
  } else if (lastCompletedStep.stepName.includes('intermediate wallet')) {
    // Failed during or after intermediate wallet creation
    resetStatus = 'SWAPPING_TO_ZEC';
  } else if (lastCompletedStep.stepName.includes('privacy delay')) {
    // Failed during or after delay
    resetStatus = 'SWAPPING_TO_SOL';
  } else if (lastCompletedStep.stepName.includes('SOL → ZEC')) {
    // Completed ZEC swap, wait for delay
    resetStatus = 'WAITING_DELAY';
  } else if (lastCompletedStep.stepName.includes('ZEC → SOL')) {
    // Completed SOL swap, send to recipient
    resetStatus = 'SENDING_TO_RECIPIENT';
  }

  await addTransactionStep(
    tx.id,
    `Retrying transaction (attempt ${tx.retryCount + 1}/${tx.maxRetries})`,
    'IN_PROGRESS',
    { resetTo: resetStatus }
  );

  await prisma.transaction.update({
    where: { id: tx.id },
    data: {
      status: resetStatus as any,
      errorMessage: null,
    },
  });

  console.log(`✅ Transaction ${tx.id} reset to ${resetStatus} for retry`);
}

/**
 * Process transactions through the mixing flow
 */
async function processPendingTransactions() {
  const pending = await getPendingTransactions();

  for (const tx of pending) {
    try {
      // Handle retry logic for FAILED transactions
      if (tx.status === 'FAILED') {
        await handleRetry(tx);
        // After retry, reload transaction and process it
        const retried = await getTransactionDetails(tx.id);
        if (!retried) continue;

        // Process the retried transaction based on its reset status
        switch (retried.status) {
          case 'DEPOSIT_RECEIVED':
            await handleDepositReceived(retried);
            break;
          case 'SWAPPING_TO_ZEC':
            await handleSwappingToZec(retried);
            break;
          case 'WAITING_DELAY':
            await handleWaitingDelay(retried);
            break;
          case 'SWAPPING_TO_SOL':
            await handleSwappingToSol(retried);
            break;
          case 'SENDING_TO_RECIPIENT':
            await handleSendingToRecipient(retried);
            break;
        }
        continue;
      }

      switch (tx.status) {
        case 'DEPOSIT_RECEIVED':
          await handleDepositReceived(tx);
          break;
        case 'SWAPPING_TO_ZEC':
          await handleSwappingToZec(tx);
          break;
        case 'WAITING_DELAY':
          await handleWaitingDelay(tx);
          break;
        case 'SWAPPING_TO_SOL':
          await handleSwappingToSol(tx);
          break;
        case 'SENDING_TO_RECIPIENT':
          await handleSendingToRecipient(tx);
          break;
      }
    } catch (error) {
      console.error(`Error processing transaction ${tx.id}:`, error);

      // Increment retry count
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

      if (isPermanentFailure) {
        console.error(`❌ Transaction ${tx.id} permanently failed after ${newRetryCount} attempts`);
      } else {
        console.warn(`⚠️ Transaction ${tx.id} failed, will retry (${newRetryCount}/${tx.maxRetries})`);
      }
    }
  }
}

/**
 * Handle DEPOSIT_RECEIVED status
 */
async function handleDepositReceived(tx: any) {
  console.log(`🔄 Processing deposit for ${tx.id}: Swapping SOL → ZEC`);

  // Check if intermediate wallet already exists (in case of retry)
  let intermediateWallet = tx.wallets.find((w: any) => w.purpose === 'INTERMEDIATE');
  let intermediateKeypair: any;

  if (intermediateWallet) {
    console.log(`♻️ Reusing existing intermediate wallet: ${intermediateWallet.walletAddress}`);
    intermediateKeypair = await getWalletKeypair(intermediateWallet.walletAddress, tx.id);
  } else {
    // Create single intermediate wallet for both swaps
    const created = await createWallet(tx.id, 'INTERMEDIATE');
    intermediateWallet = created.wallet;
    intermediateKeypair = created.keypair;

    await addTransactionStep(
      tx.id,
      'Created intermediate wallet',
      'COMPLETED',
      { walletAddress: intermediateWallet.walletAddress }
    );
  }

  // Update status
  await updateTransactionStatus(tx.id, 'SWAPPING_TO_ZEC');

  // Get deposit wallet keypair
  const depositWallet = tx.wallets.find((w: any) => w.purpose === 'DEPOSIT');
  if (!depositWallet) throw new Error('Deposit wallet not found');

  const depositKeypair = await getWalletKeypair(
    depositWallet.walletAddress,
    tx.id
  );

  // Calculate amount after deducting relayer fee
  const depositAmount = tx.amount * LAMPORTS_PER_SOL;
  const relayerFee = tx.relayerFee * LAMPORTS_PER_SOL;
  const amountAfterRelayerFee = depositAmount - relayerFee;

  console.log(`💰 Deposit: ${tx.amount} SOL`);
  console.log(`💸 Relayer fee: ${tx.relayerFee} SOL`);
  console.log(`📊 Amount to transfer: ${amountAfterRelayerFee / LAMPORTS_PER_SOL} SOL`);

  // Transfer SOL from deposit wallet to intermediate wallet
  const transferStep = await addTransactionStep(
    tx.id,
    'Transferring SOL to intermediate wallet',
    'IN_PROGRESS'
  );

  try {
    // Transfer SOL (after deducting relayer fee)
    const transferTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: depositKeypair.publicKey,
        toPubkey: intermediateKeypair.publicKey,
        lamports: Math.floor(amountAfterRelayerFee),
      })
    );

    const transferSig = await sendAndConfirmTransaction(
      connection,
      transferTx,
      [depositKeypair]
    );

    console.log(`✅ Transferred ${amountAfterRelayerFee / LAMPORTS_PER_SOL} SOL to intermediate wallet: ${transferSig}`);

    await updateStepStatus(transferStep.id, 'COMPLETED', {
      amount: amountAfterRelayerFee / LAMPORTS_PER_SOL,
      signature: transferSig
    }, transferSig);
  } catch (error) {
    await updateStepStatus(transferStep.id, 'FAILED', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  // Add swap step
  const swapStep = await addTransactionStep(
    tx.id,
    'Swapping SOL → ZEC via Jupiter',
    'IN_PROGRESS'
  );

  try {
    // Execute swap from intermediate wallet (which now has the SOL)
    // swapSolToZec will automatically reserve fees internally
    const swapResult = await swapSolToZec(
      connection,
      intermediateKeypair,
      amountAfterRelayerFee // Function will reserve fees automatically
    );

    await updateStepStatus(swapStep.id, 'COMPLETED', swapResult, swapResult.txSignature);

    await updateTransactionStatus(tx.id, 'WAITING_DELAY', {
      zecSwapTxSignature: swapResult.txSignature,
    });

    await addTransactionStep(
      tx.id,
      `Waiting ${tx.delayMinutes} minutes for privacy delay`,
      'IN_PROGRESS',
      { delayUntil: new Date(Date.now() + tx.delayMinutes * 60 * 1000) }
    );
  } catch (error) {
    await updateStepStatus(swapStep.id, 'FAILED', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Handle SWAPPING_TO_ZEC status
 * This is called when retrying after a failed swap or if the swap step was interrupted
 */
async function handleSwappingToZec(tx: any) {
  console.log(`🔄 Continuing SOL → ZEC swap for ${tx.id}`);

  // Get intermediate wallet (should already exist)
  const intermediateWallet = tx.wallets.find((w: any) => w.purpose === 'INTERMEDIATE');
  if (!intermediateWallet) {
    throw new Error('Intermediate wallet not found - cannot continue swap');
  }

  const intermediateKeypair = await getWalletKeypair(intermediateWallet.walletAddress, tx.id);

  // Check if we need to transfer SOL first
  const depositWallet = tx.wallets.find((w: any) => w.purpose === 'DEPOSIT');
  if (!depositWallet) throw new Error('Deposit wallet not found');

  const depositKeypair = await getWalletKeypair(depositWallet.walletAddress, tx.id);

  // Check balances
  const depositBalance = await connection.getBalance(depositKeypair.publicKey);
  const intermediateBalance = await connection.getBalance(intermediateKeypair.publicKey);

  console.log(`💰 Deposit wallet balance: ${depositBalance / LAMPORTS_PER_SOL} SOL`);
  console.log(`💰 Intermediate wallet balance: ${intermediateBalance / LAMPORTS_PER_SOL} SOL`);

  // Calculate expected amount after relayer fee
  const depositAmount = tx.amount * LAMPORTS_PER_SOL;
  const relayerFee = tx.relayerFee * LAMPORTS_PER_SOL;
  const amountAfterRelayerFee = depositAmount - relayerFee;

  // If deposit wallet still has SOL, transfer it first
  if (depositBalance >= amountAfterRelayerFee * 0.9) { // Allow 10% margin for fees already deducted
    console.log(`📤 Transferring SOL from deposit to intermediate wallet first...`);

    const transferStep = await addTransactionStep(
      tx.id,
      'Transferring SOL to intermediate wallet (retry)',
      'IN_PROGRESS'
    );

    try {
      const transferTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: depositKeypair.publicKey,
          toPubkey: intermediateKeypair.publicKey,
          lamports: Math.floor(amountAfterRelayerFee),
        })
      );

      const transferSig = await sendAndConfirmTransaction(
        connection,
        transferTx,
        [depositKeypair]
      );

      console.log(`✅ Transferred ${amountAfterRelayerFee / LAMPORTS_PER_SOL} SOL: ${transferSig}`);

      await updateStepStatus(transferStep.id, 'COMPLETED', {
        amount: amountAfterRelayerFee / LAMPORTS_PER_SOL,
        signature: transferSig
      }, transferSig);
    } catch (error) {
      await updateStepStatus(transferStep.id, 'FAILED', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // Now perform the swap
  const swapStep = await addTransactionStep(
    tx.id,
    'Swapping SOL → ZEC via Jupiter (retry)',
    'IN_PROGRESS'
  );

  try {
    // Get fresh balance after transfer
    const balanceToSwap = await connection.getBalance(intermediateKeypair.publicKey);

    console.log(`🔄 Attempting to swap from ${balanceToSwap / LAMPORTS_PER_SOL} SOL balance`);

    // swapSolToZec will automatically reserve fees internally
    const swapResult = await swapSolToZec(
      connection,
      intermediateKeypair,
      balanceToSwap // Function will reserve fees automatically
    );

    await updateStepStatus(swapStep.id, 'COMPLETED', swapResult, swapResult.txSignature);

    await updateTransactionStatus(tx.id, 'WAITING_DELAY', {
      zecSwapTxSignature: swapResult.txSignature,
    });

    await addTransactionStep(
      tx.id,
      `Waiting ${tx.delayMinutes} minutes for privacy delay`,
      'IN_PROGRESS',
      { delayUntil: new Date(Date.now() + tx.delayMinutes * 60 * 1000) }
    );
  } catch (error) {
    await updateStepStatus(swapStep.id, 'FAILED', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Handle WAITING_DELAY status
 */
async function handleWaitingDelay(tx: any) {
  const delayStep = tx.steps.find(
    (s: any) => s.stepName.includes('privacy delay') && s.status === 'IN_PROGRESS'
  );

  if (!delayStep) {
    // Move to next step
    await updateTransactionStatus(tx.id, 'SWAPPING_TO_SOL');
    return;
  }

  const details = JSON.parse(delayStep.details || '{}');
  const delayUntil = new Date(details.delayUntil);

  if (Date.now() >= delayUntil.getTime()) {
    console.log(`⏰ Delay completed for ${tx.id}, proceeding to swap ZEC → SOL`);

    await updateStepStatus(delayStep.id, 'COMPLETED');
    await updateTransactionStatus(tx.id, 'SWAPPING_TO_SOL');
  }
}

/**
 * Handle SWAPPING_TO_SOL status
 */
async function handleSwappingToSol(tx: any) {
  console.log(`🔄 Swapping ZEC → SOL for ${tx.id}`);

  // Get the same intermediate wallet (it already holds ZEC from previous swap)
  const intermediateWallet = tx.wallets.find((w: any) => w.purpose === 'INTERMEDIATE');
  if (!intermediateWallet) throw new Error('Intermediate wallet not found');

  const intermediateKeypair = await getWalletKeypair(intermediateWallet.walletAddress, tx.id);

  const swapStep = await addTransactionStep(
    tx.id,
    'Swapping ZEC → SOL via Jupiter',
    'IN_PROGRESS'
  );

  try {
    // Execute swap - ZEC from intermediate wallet back to same wallet as SOL
    const swapResult = await swapZecToSol(
      connection,
      intermediateKeypair
    );

    await updateStepStatus(swapStep.id, 'COMPLETED', swapResult, swapResult.txSignature);

    await updateTransactionStatus(tx.id, 'SENDING_TO_RECIPIENT', {
      solSwapTxSignature: swapResult.txSignature,
    });
  } catch (error) {
    await updateStepStatus(swapStep.id, 'FAILED', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Handle SENDING_TO_RECIPIENT status
 */
async function handleSendingToRecipient(tx: any) {
  console.log(`📤 Sending SOL to recipient for ${tx.id}`);

  // Get intermediate wallet (now contains SOL after swap)
  const intermediateWallet = tx.wallets.find((w: any) => w.purpose === 'INTERMEDIATE');
  if (!intermediateWallet) throw new Error('Intermediate wallet not found');

  const intermediateKeypair = await getWalletKeypair(intermediateWallet.walletAddress, tx.id);

  const sendStep = await addTransactionStep(
    tx.id,
    'Sending SOL to recipient',
    'IN_PROGRESS'
  );

  try {
    // Get balance
    const balance = await connection.getBalance(intermediateKeypair.publicKey);

    // Reserve amounts:
    // - Rent-exempt minimum: 890,880 lamports (~0.00089 SOL) - accounts need this to stay open
    // - Transaction fee: ~5,000 lamports
    const rentExempt = 890880; // Minimum balance for account rent exemption
    const txFee = 5000; // Transaction fee

    // Calculate usable balance (after reserving rent-exempt amount)
    const usableBalance = balance - rentExempt;

    if (usableBalance <= 0) {
      throw new Error(`Insufficient balance. Wallet has ${balance / LAMPORTS_PER_SOL} SOL, needs ${rentExempt / LAMPORTS_PER_SOL} SOL for rent`);
    }

    // Calculate platform fee and amount to send
    const platformFee = usableBalance * tx.platformFee; // 0.25% platform fee
    const totalReserved = rentExempt + txFee + platformFee;
    const amountToSend = balance - totalReserved;

    console.log(`💰 Intermediate wallet balance: ${balance / LAMPORTS_PER_SOL} SOL`);
    console.log(`🏦 Rent-exempt reserve: ${rentExempt / LAMPORTS_PER_SOL} SOL`);
    console.log(`💸 Platform fee (${tx.platformFee * 100}%): ${platformFee / LAMPORTS_PER_SOL} SOL`);
    console.log(`💳 Transaction fee: ${txFee / LAMPORTS_PER_SOL} SOL`);
    console.log(`📤 Sending to recipient: ${amountToSend / LAMPORTS_PER_SOL} SOL`);

    if (amountToSend <= 0) {
      throw new Error('Insufficient balance after fees and rent reserve');
    }

    // Create transfer transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: intermediateKeypair.publicKey,
        toPubkey: new PublicKey(tx.recipientAddress),
        lamports: Math.floor(amountToSend),
      })
    );

    // Send transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [intermediateKeypair]
    );

    console.log(`✅ Transaction ${tx.id} completed! Signature: ${signature}`);

    await updateStepStatus(sendStep.id, 'COMPLETED', {
      amount: amountToSend / LAMPORTS_PER_SOL,
      signature,
    }, signature);

    await updateTransactionStatus(tx.id, 'COMPLETED', {
      withdrawalTxSignature: signature,
      completedAt: new Date(),
    });

    await addTransactionStep(
      tx.id,
      'Transaction completed successfully',
      'COMPLETED',
      {
        finalAmount: amountToSend / LAMPORTS_PER_SOL,
        recipient: tx.recipientAddress,
      }
    );
  } catch (error) {
    await updateStepStatus(sendStep.id, 'FAILED', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Helper: Sleep for ms
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Start relayer if running directly
if (require.main === module) {
  startRelayer().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
