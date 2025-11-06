import { keccak_256 } from "@noble/hashes/sha3.js";
import bs58 from "bs58";

/**
 * Generate a random 32-byte value as Uint8Array
 */
export function randomBytes32(): Uint8Array {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return arr;
}

/**
 * Convert Uint8Array to hex string
 */
export function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

/**
 * Convert hex string to Uint8Array
 */
export function fromHex(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  return new Uint8Array(Buffer.from(cleanHex, 'hex'));
}

/**
 * Generate commitment for deposit
 * commitment = keccak256(nullifier || secret)
 *
 * IMPORTANT: Must match Solana program's generate_commitment function
 */
export function generateCommitment(
  nullifier: Uint8Array,
  secret: Uint8Array
): Uint8Array {
  const combined = new Uint8Array(64);
  combined.set(nullifier, 0);
  combined.set(secret, 32);
  return keccak_256(combined);
}

/**
 * Generate nullifier hash for withdrawal
 * nullifierHash = keccak256(nullifier)
 *
 * IMPORTANT: Must match Solana program's generate_nullifier_hash function
 */
export function generateNullifierHash(nullifier: Uint8Array): Uint8Array {
  return keccak_256(nullifier);
}

/**
 * Deposit note structure
 */
export interface DepositNote {
  nullifier: string; // hex string
  secret: string; // hex string
  commitment: string; // hex string
  nullifierHash: string; // hex string
  amount?: string; // Amount in SOL (e.g., "0.1")
  timestamp?: number;
  status?: 'pending' | 'deposited' | 'queued' | 'processing' | 'failed' | 'completed';
  failureReason?: string;
  depositTxHash?: string; // Solana transaction signature
  queueTxHash?: string; // Solana transaction signature
  withdrawalTxHash?: string; // Solana transaction signature
  recipient?: string; // Solana address (base58)
  executeAfter?: number;
  walletAddress?: string; // Solana wallet address that created this deposit
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
    nullifier: toHex(nullifier),
    secret: toHex(secret),
    commitment: toHex(commitment),
    nullifierHash: toHex(nullifierHash),
    amount: "0.1", // Fixed 0.1 SOL deposits
    status: 'pending',
  };
}

/**
 * Encode deposit note to string for storage
 */
export function encodeDepositNote(note: DepositNote): string {
  return JSON.stringify(note);
}

/**
 * Decode deposit note from string
 */
export function decodeDepositNote(noteString: string): DepositNote {
  return JSON.parse(noteString) as DepositNote;
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

  if (existingIndex === -1) {
    allNotes.push(note);
  } else {
    allNotes[existingIndex] = note;
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
export function getDepositNote(commitment: string): DepositNote | null {
  if (typeof window === 'undefined') return null; // SSR guard
  const key = `deposit_note_${commitment}`;
  const noteJson = localStorage.getItem(key);
  if (!noteJson) return null;
  return decodeDepositNote(noteJson);
}

/**
 * Delete deposit note (after withdrawal)
 */
export function deleteDepositNote(commitment: string): void {
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
  commitment: string,
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
 * Get failed deposit notes
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
  commitment: string; // Link to original deposit (hex string)
  amount: string; // Amount withdrawn (SOL)
  recipient: string; // Recipient Solana address (base58)
  delayMinutes: number; // Selected delay
  queueTxHash?: string; // Transaction signature for queue
  withdrawalTxHash?: string; // Transaction signature for final withdrawal
  timestamp: number; // When queued
  executeAfter?: number; // When it can be executed
  status: 'queued' | 'processing' | 'completed' | 'failed';
  failureReason?: string;
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
    allWithdrawals.push(withdrawal);
  } else {
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
 * Update withdrawal transaction status
 */
export function updateWithdrawalStatus(
  id: string,
  status: WithdrawalTransaction['status'],
  additionalData?: Partial<WithdrawalTransaction>
): void {
  if (typeof window === 'undefined') return; // SSR guard

  const key = `withdrawal_${id}`;
  const withdrawalJson = localStorage.getItem(key);
  if (!withdrawalJson) return;

  const withdrawal = JSON.parse(withdrawalJson) as WithdrawalTransaction;
  withdrawal.status = status;
  if (additionalData) {
    Object.assign(withdrawal, additionalData);
  }

  localStorage.setItem(key, JSON.stringify(withdrawal));

  // Update in the list
  const allWithdrawals = getAllWithdrawalTransactions();
  const index = allWithdrawals.findIndex((w) => w.id === id);
  if (index !== -1) {
    allWithdrawals[index] = withdrawal;
    localStorage.setItem("all_withdrawals", JSON.stringify(allWithdrawals));
  }
}

/**
 * Get deposit notes for a specific wallet address
 */
export function getDepositNotesForWallet(walletAddress: string): DepositNote[] {
  if (typeof window === 'undefined') return [];
  if (!walletAddress) return [];

  const allNotes = getAllDepositNotes();
  return allNotes.filter(note =>
    !note.walletAddress || note.walletAddress === walletAddress
  );
}

/**
 * Get withdrawal transactions for a specific wallet address
 */
export function getWithdrawalsForWallet(walletAddress: string): WithdrawalTransaction[] {
  if (typeof window === 'undefined') return [];
  if (!walletAddress) return [];

  const allWithdrawals = getAllWithdrawalTransactions();
  return allWithdrawals.filter(withdrawal =>
    !withdrawal.walletAddress || withdrawal.walletAddress === walletAddress
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
  commitment: string;
  recipient?: string;
  depositData?: DepositNote;
  withdrawalData?: WithdrawalTransaction;
}

/**
 * Get combined transaction history (deposits + withdrawals)
 * Sorted by timestamp (newest first)
 */
export function getCombinedTransactionHistory(walletAddress?: string): CombinedTransaction[] {
  const deposits = walletAddress ? getDepositNotesForWallet(walletAddress) : getAllDepositNotes();
  const withdrawals = walletAddress ? getWithdrawalsForWallet(walletAddress) : getAllWithdrawalTransactions();

  const combined: CombinedTransaction[] = [];

  // Add deposits
  deposits.forEach((deposit) => {
    combined.push({
      type: 'deposit',
      timestamp: deposit.timestamp || 0,
      amount: deposit.amount || '0.1',
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
