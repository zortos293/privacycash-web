import { keccak256, toHex, fromHex, encodePacked } from "viem";

/**
 * BN254 curve field size - same as in smart contract
 * This is the maximum value for elements in the field
 */
const FIELD_SIZE = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");

/**
 * Generate a random 32-byte value
 */
export function randomBytes32(): `0x${string}` {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return toHex(arr);
}

/**
 * Generate commitment for deposit
 * commitment = keccak256(nullifier, secret) % FIELD_SIZE
 *
 * IMPORTANT: Must match contract's generateCommitment function
 */
export function generateCommitment(
  nullifier: `0x${string}`,
  secret: `0x${string}`
): `0x${string}` {
  const hash = keccak256(encodePacked(["bytes32", "bytes32"], [nullifier, secret]));
  const hashBigInt = BigInt(hash);
  const modResult = hashBigInt % FIELD_SIZE;
  return `0x${modResult.toString(16).padStart(64, '0')}` as `0x${string}`;
}

/**
 * Generate nullifier hash for withdrawal
 * nullifierHash = keccak256(nullifier) % FIELD_SIZE
 *
 * IMPORTANT: Must match contract's generateNullifierHash function
 */
export function generateNullifierHash(nullifier: `0x${string}`): `0x${string}` {
  const hash = keccak256(encodePacked(["bytes32"], [nullifier]));
  const hashBigInt = BigInt(hash);
  const modResult = hashBigInt % FIELD_SIZE;
  return `0x${modResult.toString(16).padStart(64, '0')}` as `0x${string}`;
}

/**
 * Deposit note structure
 */
export interface DepositNote {
  nullifier: `0x${string}`;
  secret: `0x${string}`;
  commitment: `0x${string}`;
  nullifierHash: `0x${string}`;
  amount?: string; // Amount in BNB (e.g., "0.01", "0.1")
  leafIndex?: number;
  timestamp?: number;
  status?: 'pending' | 'deposited' | 'queued' | 'processing' | 'failed' | 'completed';
  failureReason?: string;
  depositTxHash?: string;
  queueTxHash?: string;
  withdrawalTxHash?: string;
  recipient?: string;
  executeAfter?: number;
  queueId?: number;
  txFetchAttempted?: boolean;
  walletAddress?: string; // Wallet address that created this deposit
}

/**
 * Create a new deposit note
 */
export function createDepositNote(): DepositNote {
  const nullifier = randomBytes32();
  const secret = randomBytes32();
  const commitment = generateCommitment(nullifier, secret);
  const nullifierHash = generateNullifierHash(nullifier);

  return {
    nullifier,
    secret,
    commitment,
    nullifierHash,
  };
}

/**
 * Create change note for partial withdrawals
 * When withdrawing less than the full deposit, remaining balance is returned as new deposit
 */
export function createChangeNote(
  originalNote: DepositNote,
  withdrawAmount: string
): {
  changeNote: DepositNote | null;
  changeCommitment: `0x${string}`;
} {
  const depositAmount = parseFloat(originalNote.amount || '0');
  const withdrawAmt = parseFloat(withdrawAmount);
  const changeAmount = depositAmount - withdrawAmt;

  // If no change needed (full withdrawal or invalid amounts)
  if (changeAmount <= 0 || changeAmount < 0.0001) {
    return {
      changeNote: null,
      changeCommitment: `0x${'0'.repeat(64)}` as `0x${string}`
    };
  }

  // Generate new credentials for change
  const changeNullifier = randomBytes32();
  const changeSecret = randomBytes32();
  const changeCommitment = generateCommitment(changeNullifier, changeSecret);
  const changeNullifierHash = generateNullifierHash(changeNullifier);

  const changeNote: DepositNote = {
    nullifier: changeNullifier,
    secret: changeSecret,
    commitment: changeCommitment,
    nullifierHash: changeNullifierHash,
    amount: changeAmount.toFixed(4),
    timestamp: Date.now(),
    status: 'pending', // Will become 'deposited' after relayer processes
    walletAddress: originalNote.walletAddress
  };

  console.log(`💰 Created change note: ${changeAmount.toFixed(4)} BNB (${changeCommitment.slice(0, 10)}...)`);

  return { changeNote, changeCommitment };
}

/**
 * Encode deposit note to string for storage
 * Excludes temporary runtime properties to avoid circular references
 */
export function encodeDepositNote(note: DepositNote): string {
  // Create a clean copy without runtime-only properties
  const { multiDepositNotes, changeCommitment, ...cleanNote } = note as any;
  return JSON.stringify(cleanNote);
}

/**
 * Decode deposit note from string
 */
export function decodeDepositNote(noteString: string): DepositNote {
  return JSON.parse(noteString) as DepositNote;
}

/**
 * Simplified Merkle proof generation
 * In production, use proper Merkle tree implementation
 */
export function generateMerkleProof(
  commitment: `0x${string}`,
  allCommitments: `0x${string}`[]
): `0x${string}`[] {
  // Simplified: return empty proof
  // In production, generate full Merkle path
  return [];
}

/**
 * Store deposit note in localStorage
 */
export function storeDepositNote(note: DepositNote): void {
  if (typeof window === 'undefined') return; // SSR guard

  const key = `deposit_note_${note.commitment}`;
  localStorage.setItem(key, encodeDepositNote(note));

  // Also add/update in list of all notes
  const allNotes = getAllDepositNotes();
  const existingIndex = allNotes.findIndex((n) => n.commitment === note.commitment);

  // Clean the note before adding to array (remove circular references)
  const { multiDepositNotes, changeCommitment, ...cleanNote } = note as any;

  if (existingIndex === -1) {
    allNotes.push(cleanNote);
  } else {
    allNotes[existingIndex] = cleanNote;
  }

  localStorage.setItem("all_deposit_notes", JSON.stringify(allNotes));
}

/**
 * Get all deposit notes from localStorage
 */
export function getAllDepositNotes(): DepositNote[] {
  if (typeof window === 'undefined') return []; // SSR guard
  const notesJson = localStorage.getItem("all_deposit_notes");
  if (!notesJson) return [];
  return JSON.parse(notesJson) as DepositNote[];
}

/**
 * Get deposit note by commitment
 */
export function getDepositNote(commitment: `0x${string}`): DepositNote | null {
  if (typeof window === 'undefined') return null; // SSR guard
  const key = `deposit_note_${commitment}`;
  const noteJson = localStorage.getItem(key);
  if (!noteJson) return null;
  return decodeDepositNote(noteJson);
}

/**
 * Delete deposit note (after withdrawal)
 */
export function deleteDepositNote(commitment: `0x${string}`): void {
  if (typeof window === 'undefined') return; // SSR guard
  const key = `deposit_note_${commitment}`;
  localStorage.removeItem(key);

  // Remove from list
  const allNotes = getAllDepositNotes();
  const filtered = allNotes.filter((n) => n.commitment !== commitment);
  localStorage.setItem("all_deposit_notes", JSON.stringify(filtered));
}

/**
 * Update deposit note status
 */
export function updateDepositNoteStatus(
  commitment: `0x${string}`,
  status: DepositNote['status'],
  additionalData?: Partial<DepositNote>
): void {
  const note = getDepositNote(commitment);
  if (!note) return;

  note.status = status;
  if (additionalData) {
    Object.assign(note, additionalData);
  }

  storeDepositNote(note);
}

/**
 * Get failed deposit notes (deposits that succeeded but withdrawal failed)
 */
export function getFailedNotes(): DepositNote[] {
  const allNotes = getAllDepositNotes();
  return allNotes.filter(n => n.status === 'failed');
}

/**
 * Get notes ready for retry (deposited but not queued)
 */
export function getRetryableNotes(): DepositNote[] {
  const allNotes = getAllDepositNotes();
  return allNotes.filter(n =>
    n.status === 'failed' ||
    (n.status === 'deposited' && n.depositTxHash && !n.queueTxHash)
  );
}

/**
 * Withdrawal transaction structure
 */
export interface WithdrawalTransaction {
  id: string; // Unique ID for this withdrawal
  commitment: `0x${string}`; // Link to original deposit
  amount: string; // Amount withdrawn (BNB)
  recipient: string; // Recipient address
  delayMinutes: number; // Selected delay
  queueTxHash?: string; // Transaction hash for queue
  withdrawalTxHash?: string; // Transaction hash for final withdrawal
  timestamp: number; // When queued
  executeAfter?: number; // When it can be executed
  status: 'queued' | 'processing' | 'completed' | 'failed';
  failureReason?: string;
  queueId?: number; // Queue ID from contract
  walletAddress?: string; // Wallet address that created this withdrawal
}

/**
 * Store withdrawal transaction in localStorage
 */
export function storeWithdrawalTransaction(withdrawal: WithdrawalTransaction): void {
  if (typeof window === 'undefined') return; // SSR guard
  const key = `withdrawal_${withdrawal.id}`;
  localStorage.setItem(key, JSON.stringify(withdrawal));

  // Add/update in list of all withdrawals
  const allWithdrawals = getAllWithdrawalTransactions();
  const existingIndex = allWithdrawals.findIndex((w) => w.id === withdrawal.id);

  if (existingIndex === -1) {
    // New withdrawal - add it
    allWithdrawals.push(withdrawal);
  } else {
    // Existing withdrawal - update it
    allWithdrawals[existingIndex] = withdrawal;
  }

  localStorage.setItem("all_withdrawals", JSON.stringify(allWithdrawals));
}

/**
 * Get all withdrawal transactions from localStorage
 */
export function getAllWithdrawalTransactions(): WithdrawalTransaction[] {
  if (typeof window === 'undefined') return []; // SSR guard
  const withdrawalsJson = localStorage.getItem("all_withdrawals");
  if (!withdrawalsJson) return [];
  return JSON.parse(withdrawalsJson) as WithdrawalTransaction[];
}

/**
 * Clean up duplicate withdrawal transactions
 * Keeps only the latest entry for each commitment
 */
export function cleanupDuplicateWithdrawals(): number {
  if (typeof window === 'undefined') return 0;

  const allWithdrawals = getAllWithdrawalTransactions();

  // Group by commitment
  const byCommitment = new Map<string, WithdrawalTransaction[]>();
  for (const w of allWithdrawals) {
    const existing = byCommitment.get(w.commitment) || [];
    existing.push(w);
    byCommitment.set(w.commitment, existing);
  }

  // Keep only the latest for each commitment (highest timestamp)
  const cleaned: WithdrawalTransaction[] = [];
  let duplicatesRemoved = 0;

  for (const [commitment, withdrawals] of byCommitment.entries()) {
    if (withdrawals.length > 1) {
      // Sort by timestamp descending and keep the latest
      withdrawals.sort((a, b) => b.timestamp - a.timestamp);
      cleaned.push(withdrawals[0]);
      duplicatesRemoved += withdrawals.length - 1;

      // Remove old entries from individual storage
      for (let i = 1; i < withdrawals.length; i++) {
        const key = `withdrawal_${withdrawals[i].id}`;
        localStorage.removeItem(key);
      }
    } else {
      cleaned.push(withdrawals[0]);
    }
  }

  // Update the all_withdrawals list
  localStorage.setItem("all_withdrawals", JSON.stringify(cleaned));

  return duplicatesRemoved;
}

/**
 * Update withdrawal transaction status
 */
export function updateWithdrawalStatus(
  id: string,
  status: WithdrawalTransaction['status'],
  additionalData?: Partial<WithdrawalTransaction>
): void {
  if (typeof window === 'undefined') return; // SSR guard

  console.log(`[updateWithdrawalStatus] Updating withdrawal ${id.slice(0, 10)}... to status: ${status}`);

  const key = `withdrawal_${id}`;
  const withdrawalJson = localStorage.getItem(key);
  if (!withdrawalJson) {
    console.log(`[updateWithdrawalStatus] ⚠️ Withdrawal not found in individual storage`);
    return;
  }

  const withdrawal = JSON.parse(withdrawalJson) as WithdrawalTransaction;
  console.log(`[updateWithdrawalStatus] Current status: ${withdrawal.status}, new status: ${status}`);

  withdrawal.status = status;
  if (additionalData) {
    Object.assign(withdrawal, additionalData);
  }

  localStorage.setItem(key, JSON.stringify(withdrawal));
  console.log(`[updateWithdrawalStatus] ✅ Updated individual storage`);

  // Update in the list
  const allWithdrawals = getAllWithdrawalTransactions();
  console.log(`[updateWithdrawalStatus] Found ${allWithdrawals.length} withdrawals in list`);

  const index = allWithdrawals.findIndex((w) => w.id === id);
  if (index !== -1) {
    console.log(`[updateWithdrawalStatus] Found at index ${index}, updating...`);
    allWithdrawals[index] = withdrawal;
    localStorage.setItem("all_withdrawals", JSON.stringify(allWithdrawals));
    console.log(`[updateWithdrawalStatus] ✅ Updated all_withdrawals list`);
  } else {
    console.log(`[updateWithdrawalStatus] ⚠️ Withdrawal not found in list!`);
  }
}

/**
 * Get deposit notes for a specific wallet address
 * Returns only deposits created by this wallet
 */
export function getDepositNotesForWallet(walletAddress: string): DepositNote[] {
  if (typeof window === 'undefined') return [];
  if (!walletAddress) return [];

  const allNotes = getAllDepositNotes();
  // Filter by wallet address if available, otherwise assume all local notes belong to user
  return allNotes.filter(note =>
    !note.walletAddress || note.walletAddress.toLowerCase() === walletAddress.toLowerCase()
  );
}

/**
 * Get withdrawal transactions for a specific wallet address
 * Returns only withdrawals created by this wallet
 */
export function getWithdrawalsForWallet(walletAddress: string): WithdrawalTransaction[] {
  if (typeof window === 'undefined') return [];
  if (!walletAddress) return [];

  const allWithdrawals = getAllWithdrawalTransactions();
  // Filter by wallet address if available, otherwise assume all local withdrawals belong to user
  return allWithdrawals.filter(withdrawal =>
    !withdrawal.walletAddress || withdrawal.walletAddress.toLowerCase() === walletAddress.toLowerCase()
  );
}

/**
 * Combined transaction type for history display
 */
export interface CombinedTransaction {
  type: 'deposit' | 'withdrawal';
  timestamp: number;
  amount: string;
  status: string;
  txHash?: string;
  commitment: `0x${string}`;
  recipient?: string;
  depositData?: DepositNote;
  withdrawalData?: WithdrawalTransaction;
}

/**
 * Get combined transaction history (deposits + withdrawals)
 * Sorted by timestamp (newest first)
 * @param walletAddress Optional wallet address to filter by
 */
export function getCombinedTransactionHistory(walletAddress?: string): CombinedTransaction[] {
  // Use wallet-filtered functions if address provided, otherwise get all
  const deposits = walletAddress ? getDepositNotesForWallet(walletAddress) : getAllDepositNotes();
  const withdrawals = walletAddress ? getWithdrawalsForWallet(walletAddress) : getAllWithdrawalTransactions();

  const combined: CombinedTransaction[] = [];

  // Add deposits
  deposits.forEach((deposit) => {
    combined.push({
      type: 'deposit',
      timestamp: deposit.timestamp || 0,
      amount: deposit.amount || '0.01',
      status: deposit.status || 'pending',
      txHash: deposit.depositTxHash,
      commitment: deposit.commitment,
      depositData: deposit,
    });
  });

  // Add withdrawals
  withdrawals.forEach((withdrawal) => {
    combined.push({
      type: 'withdrawal',
      timestamp: withdrawal.timestamp,
      amount: withdrawal.amount,
      status: withdrawal.status,
      txHash: withdrawal.withdrawalTxHash || withdrawal.queueTxHash,
      commitment: withdrawal.commitment,
      recipient: withdrawal.recipient,
      withdrawalData: withdrawal,
    });
  });

  // Sort by timestamp (newest first)
  return combined.sort((a, b) => b.timestamp - a.timestamp);
}
