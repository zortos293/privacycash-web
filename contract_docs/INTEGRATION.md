# AnonBNB Integration Guide

**Version:** 1.0.0
**Last Updated:** 30 October 2025

## Table of Contents

1. [Quick Start](#quick-start)
2. [Frontend Integration (TypeScript + Viem)](#frontend-integration-typescript--viem)
3. [Deposit Flow Implementation](#deposit-flow-implementation)
4. [Withdrawal Flow Implementation](#withdrawal-flow-implementation)
5. [Merkle Tree Management](#merkle-tree-management)
6. [Note Management](#note-management)
7. [Event Listening](#event-listening)
8. [Multi-Deposit Withdrawals](#multi-deposit-withdrawals)
9. [Error Handling](#error-handling)
10. [Security Best Practices](#security-best-practices)
11. [Testing](#testing)

---

## Quick Start

### Installation

```bash
npm install viem@^2.38 wagmi@^2.19 @tanstack/react-query@^5.90
```

### Basic Setup

```typescript
import { createPublicClient, createWalletClient, http, parseEther } from 'viem';
import { bsc, bscTestnet } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Contract ABI (import your full ABI)
import { ANONBNB_ABI } from './abi';

// Contract address
const CONTRACT_ADDRESS = '0x...'; // Your deployed contract

// Create clients
const publicClient = createPublicClient({
  chain: bscTestnet,
  transport: http()
});

const walletClient = createWalletClient({
  chain: bscTestnet,
  transport: http()
});
```

---

## Frontend Integration (TypeScript + Viem)

### Complete Integration Example

```typescript
import { keccak256, encodePacked, parseEther, formatEther, type Hex } from 'viem';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';

// Field size for BN254 curve (used in contract)
const FIELD_SIZE = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/**
 * Generate random 32-byte hex string
 */
function generateRandom32Bytes(): Hex {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `0x${Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')}` as Hex;
}

/**
 * Generate commitment from nullifier and secret
 */
function generateCommitment(nullifier: Hex, secret: Hex): Hex {
  const hash = keccak256(encodePacked(['bytes32', 'bytes32'], [nullifier, secret]));
  const hashBigInt = BigInt(hash);
  const commitment = hashBigInt % FIELD_SIZE;
  return `0x${commitment.toString(16).padStart(64, '0')}` as Hex;
}

/**
 * Generate nullifier hash (used in withdrawal)
 */
function generateNullifierHash(nullifier: Hex): Hex {
  const hash = keccak256(encodePacked(['bytes32'], [nullifier]));
  const hashBigInt = BigInt(hash);
  const nullifierHash = hashBigInt % FIELD_SIZE;
  return `0x${nullifierHash.toString(16).padStart(64, '0')}` as Hex;
}

/**
 * Deposit note structure
 */
interface DepositNote {
  nullifier: Hex;
  secret: Hex;
  commitment: Hex;
  amount: string; // In BNB (e.g., "0.1")
  timestamp: number;
  txHash?: string;
  leafIndex?: number;
}

/**
 * React component for deposit
 */
function DepositComponent() {
  const { address } = useAccount();
  const { writeContract, data: hash } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleDeposit = async () => {
    // 1. Generate credentials
    const nullifier = generateRandom32Bytes();
    const secret = generateRandom32Bytes();
    const commitment = generateCommitment(nullifier, secret);

    // 2. Create deposit note
    const note: DepositNote = {
      nullifier,
      secret,
      commitment,
      amount: "0.1",
      timestamp: Date.now()
    };

    // 3. Store note locally (before transaction)
    const notes = JSON.parse(localStorage.getItem('anonbnb_notes') || '[]');
    notes.push(note);
    localStorage.setItem('anonbnb_notes', JSON.stringify(notes));

    // 4. Execute deposit transaction
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: ANONBNB_ABI,
      functionName: 'deposit',
      args: [commitment],
      value: parseEther('0.1')
    });
  };

  // 5. Update note with transaction hash after success
  useEffect(() => {
    if (isSuccess && hash) {
      const notes = JSON.parse(localStorage.getItem('anonbnb_notes') || '[]');
      const note = notes[notes.length - 1];
      if (note) {
        note.txHash = hash;
        localStorage.setItem('anonbnb_notes', JSON.stringify(notes));
      }
    }
  }, [isSuccess, hash]);

  return (
    <button onClick={handleDeposit}>
      Deposit 0.1 BNB
    </button>
  );
}
```

---

## Deposit Flow Implementation

### Step-by-Step Deposit

```typescript
/**
 * Complete deposit flow with error handling
 */
async function executeDeposit(
  amount: string, // "0.01", "0.1", "1.0"
  walletClient: any,
  publicClient: any
): Promise<DepositNote> {
  try {
    // Step 1: Generate credentials
    console.log('Generating credentials...');
    const nullifier = generateRandom32Bytes();
    const secret = generateRandom32Bytes();
    const commitment = generateCommitment(nullifier, secret);

    console.log('Nullifier:', nullifier);
    console.log('Secret:', secret);
    console.log('Commitment:', commitment);

    // Step 2: Check minimum deposit (0.01 BNB)
    const amountWei = parseEther(amount);
    const minDeposit = parseEther('0.01');

    if (amountWei < minDeposit) {
      throw new Error('Minimum deposit is 0.01 BNB');
    }

    // Step 3: Check if commitment already exists
    const depositInfo = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: ANONBNB_ABI,
      functionName: 'getDepositInfo',
      args: [commitment]
    });

    if (depositInfo.status !== 0) { // 0 = None
      throw new Error('This commitment already exists. Generate new credentials.');
    }

    // Step 4: Execute deposit transaction
    console.log('Submitting deposit transaction...');
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: ANONBNB_ABI,
      functionName: 'deposit',
      args: [commitment],
      value: amountWei
    });

    console.log('Transaction hash:', hash);

    // Step 5: Wait for confirmation
    console.log('Waiting for confirmation...');
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status !== 'success') {
      throw new Error('Transaction failed');
    }

    // Step 6: Get leaf index from event
    const depositEvent = receipt.logs.find(
      (log: any) => log.topics[0] === keccak256(encodePacked(['string'], ['Deposit(bytes32,uint32,uint256)']))
    );

    let leafIndex: number | undefined;
    if (depositEvent) {
      // Parse leaf index from event data
      const eventData = depositEvent.data;
      // leafIndex is the second parameter (uint32)
      leafIndex = parseInt(eventData.slice(66, 74), 16);
    }

    // Step 7: Create and store note
    const note: DepositNote = {
      nullifier,
      secret,
      commitment,
      amount,
      timestamp: Date.now(),
      txHash: hash,
      leafIndex
    };

    const notes = JSON.parse(localStorage.getItem('anonbnb_notes') || '[]');
    notes.push(note);
    localStorage.setItem('anonbnb_notes', JSON.stringify(notes));

    console.log('Deposit successful!');
    console.log('Leaf index:', leafIndex);

    return note;

  } catch (error) {
    console.error('Deposit failed:', error);
    throw error;
  }
}
```

### Reading Deposit Balance

```typescript
/**
 * Get balance for a specific deposit (requires credentials)
 */
async function getDepositBalance(
  nullifier: Hex,
  secret: Hex,
  publicClient: any
): Promise<{ amount: bigint; status: number }> {
  const result = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: ANONBNB_ABI,
    functionName: 'getPrivateBalance',
    args: [nullifier, secret]
  });

  return {
    amount: result[0],
    status: result[1]
  };
}

/**
 * Get total balance across all deposits
 */
async function getTotalBalance(
  notes: DepositNote[],
  publicClient: any
): Promise<string> {
  const nullifiers = notes.map(n => n.nullifier);
  const secrets = notes.map(n => n.secret);

  const result = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: ANONBNB_ABI,
    functionName: 'getTotalPrivateBalance',
    args: [nullifiers, secrets]
  });

  return formatEther(result[0]); // Returns total in BNB
}
```

---

## Withdrawal Flow Implementation

### Step-by-Step Withdrawal

```typescript
/**
 * Complete withdrawal flow with Merkle proof generation
 */
async function executeWithdrawal(
  note: DepositNote,
  recipient: string,
  withdrawAmount: string, // In BNB
  delayMinutes: number,
  merkleTree: MerkleTree, // See Merkle Tree section
  walletClient: any,
  publicClient: any
): Promise<string> {
  try {
    // Step 1: Verify note ownership and get current balance
    console.log('Verifying deposit...');
    const { amount, status } = await getDepositBalance(
      note.nullifier,
      note.secret,
      publicClient
    );

    if (status === 0) {
      throw new Error('Deposit not found');
    }

    if (status !== 1) { // 1 = Deposited
      throw new Error('Deposit already queued or completed');
    }

    // Step 2: Validate withdrawal amount
    const depositAmountWei = amount;
    const withdrawAmountWei = parseEther(withdrawAmount);

    if (withdrawAmountWei > depositAmountWei) {
      throw new Error(`Insufficient balance. Available: ${formatEther(depositAmountWei)} BNB`);
    }

    // Step 3: Generate Merkle proof
    console.log('Generating Merkle proof...');
    const leafIndex = note.leafIndex;

    if (leafIndex === undefined) {
      throw new Error('Leaf index not found. Cannot generate proof.');
    }

    const proof = merkleTree.getProof(leafIndex);
    const merkleProof = proof.pathElements; // Array of 20 hashes
    const pathIndices = proof.pathIndices;  // Array of 20 booleans

    // Step 4: Handle partial withdrawal (generate change commitment)
    let changeCommitment: Hex = '0x0000000000000000000000000000000000000000000000000000000000000000';

    if (withdrawAmountWei < depositAmountWei) {
      // Partial withdrawal - generate new commitment for remaining funds
      const newNullifier = generateRandom32Bytes();
      const newSecret = generateRandom32Bytes();
      changeCommitment = generateCommitment(newNullifier, newSecret);

      // Store change note
      const changeNote: DepositNote = {
        nullifier: newNullifier,
        secret: newSecret,
        commitment: changeCommitment,
        amount: formatEther(depositAmountWei - withdrawAmountWei),
        timestamp: Date.now()
      };

      const notes = JSON.parse(localStorage.getItem('anonbnb_notes') || '[]');
      notes.push(changeNote);
      localStorage.setItem('anonbnb_notes', JSON.stringify(notes));
    }

    // Step 5: Queue withdrawal transaction
    console.log('Queueing withdrawal...');
    const hash = await walletClient.writeContract({
      address: CONTRACT_ADDRESS,
      abi: ANONBNB_ABI,
      functionName: 'queueWithdrawal',
      args: [
        note.nullifier,
        note.secret,
        recipient as `0x${string}`,
        withdrawAmountWei,
        changeCommitment,
        delayMinutes,
        merkleProof,
        pathIndices
      ]
    });

    console.log('Queue transaction hash:', hash);

    // Step 6: Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    if (receipt.status !== 'success') {
      throw new Error('Transaction failed');
    }

    console.log('Withdrawal queued successfully!');
    console.log(`Will be processed after ${delayMinutes} minute(s)`);

    return hash;

  } catch (error) {
    console.error('Withdrawal failed:', error);
    throw error;
  }
}
```

---

## Merkle Tree Management

### MerkleTree Class Implementation

```typescript
/**
 * Merkle Tree for tracking deposits
 * Based on contract implementation
 */
class MerkleTree {
  private levels: number = 20;
  private zeros: Hex[] = [];
  private filledSubtrees: Hex[] = [];
  private leaves: Hex[] = [];
  private root: Hex;
  private tree: Hex[][] = [];

  constructor() {
    // Zero value (keccak256("anonbnb") % FIELD_SIZE)
    const ZERO_VALUE = 21663839004416932945382355908790599225266501822907911457504978515578255421292n;
    this.zeros[0] = `0x${ZERO_VALUE.toString(16).padStart(64, '0')}` as Hex;

    // Generate zero values for each level
    for (let i = 1; i < this.levels; i++) {
      this.zeros[i] = this.hashLeftRight(this.zeros[i - 1], this.zeros[i - 1]);
    }

    this.filledSubtrees = [...this.zeros];

    // Initialize tree levels
    for (let i = 0; i <= this.levels; i++) {
      this.tree[i] = [];
    }

    // Calculate initial root
    this.root = this.hashLeftRight(this.zeros[this.levels - 1], this.zeros[this.levels - 1]);
  }

  /**
   * Hash two values using keccak256 modulo FIELD_SIZE
   */
  private hashLeftRight(left: Hex, right: Hex): Hex {
    const hash = keccak256(encodePacked(['bytes32', 'bytes32'], [left, right]));
    const hashBigInt = BigInt(hash);
    const result = hashBigInt % FIELD_SIZE;
    return `0x${result.toString(16).padStart(64, '0')}` as Hex;
  }

  /**
   * Insert a leaf (commitment) into the tree
   */
  insert(leaf: Hex): number {
    const index = this.leaves.length;

    if (index >= 2 ** this.levels) {
      throw new Error('Merkle tree is full');
    }

    this.leaves.push(leaf);
    this.tree[0][index] = leaf;

    let currentIndex = index;
    let currentLevelHash = leaf;

    for (let i = 0; i < this.levels; i++) {
      const isLeft = currentIndex % 2 === 0;

      if (isLeft) {
        this.filledSubtrees[i] = currentLevelHash;
        currentLevelHash = this.hashLeftRight(currentLevelHash, this.zeros[i]);
      } else {
        currentLevelHash = this.hashLeftRight(this.filledSubtrees[i], currentLevelHash);
      }

      currentIndex = Math.floor(currentIndex / 2);
      this.tree[i + 1][currentIndex] = currentLevelHash;
    }

    this.root = currentLevelHash;
    return index;
  }

  /**
   * Generate Merkle proof for a leaf at given index
   */
  getProof(index: number): { pathElements: Hex[]; pathIndices: boolean[] } {
    if (index >= this.leaves.length) {
      throw new Error('Index out of bounds');
    }

    const pathElements: Hex[] = [];
    const pathIndices: boolean[] = [];

    let currentIndex = index;

    for (let i = 0; i < this.levels; i++) {
      const isRight = currentIndex % 2 === 1;
      pathIndices.push(isRight);

      const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;

      let sibling: Hex;
      if (this.tree[i] && this.tree[i][siblingIndex]) {
        sibling = this.tree[i][siblingIndex];
      } else {
        sibling = this.zeros[i];
      }

      pathElements.push(sibling);
      currentIndex = Math.floor(currentIndex / 2);
    }

    return { pathElements, pathIndices };
  }

  /**
   * Verify a Merkle proof
   */
  verify(
    leaf: Hex,
    pathElements: Hex[],
    pathIndices: boolean[],
    root: Hex
  ): boolean {
    let computedHash = leaf;

    for (let i = 0; i < pathElements.length; i++) {
      if (pathIndices[i]) {
        computedHash = this.hashLeftRight(pathElements[i], computedHash);
      } else {
        computedHash = this.hashLeftRight(computedHash, pathElements[i]);
      }
    }

    return computedHash.toLowerCase() === root.toLowerCase();
  }

  getRoot(): Hex {
    return this.root;
  }

  getLeaves(): Hex[] {
    return [...this.leaves];
  }
}
```

### Syncing Merkle Tree with Contract

```typescript
/**
 * Sync local Merkle tree with on-chain state
 * Listens to Deposit events and rebuilds tree
 */
async function syncMerkleTree(
  publicClient: any,
  fromBlock?: bigint
): Promise<MerkleTree> {
  const tree = new MerkleTree();

  // Get all Deposit events
  const logs = await publicClient.getLogs({
    address: CONTRACT_ADDRESS,
    event: {
      type: 'event',
      name: 'Deposit',
      inputs: [
        { type: 'bytes32', name: 'commitment', indexed: true },
        { type: 'uint32', name: 'leafIndex', indexed: false },
        { type: 'uint256', name: 'timestamp', indexed: false }
      ]
    },
    fromBlock: fromBlock || 0n,
    toBlock: 'latest'
  });

  // Sort by leaf index and insert into tree
  const deposits = logs.map(log => ({
    commitment: log.args.commitment as Hex,
    leafIndex: log.args.leafIndex as number,
    timestamp: log.args.timestamp as bigint
  })).sort((a, b) => a.leafIndex - b.leafIndex);

  for (const deposit of deposits) {
    const index = tree.insert(deposit.commitment);
    if (index !== deposit.leafIndex) {
      console.error('Merkle tree sync mismatch!');
    }
  }

  // Verify root matches contract
  const contractRoot = await publicClient.readContract({
    address: CONTRACT_ADDRESS,
    abi: ANONBNB_ABI,
    functionName: 'getLastRoot'
  });

  if (tree.getRoot().toLowerCase() !== contractRoot.toLowerCase()) {
    console.warn('Merkle root mismatch! Tree may be out of sync.');
  }

  console.log(`Synced ${deposits.length} deposits`);
  return tree;
}
```

---

## Note Management

### LocalStorage Note Manager

```typescript
/**
 * Note manager for storing and retrieving deposit notes
 */
class NoteManager {
  private storageKey = 'anonbnb_notes';

  /**
   * Save a deposit note
   */
  saveNote(note: DepositNote): void {
    const notes = this.getAllNotes();
    notes.push(note);
    localStorage.setItem(this.storageKey, JSON.stringify(notes));
  }

  /**
   * Get all notes
   */
  getAllNotes(): DepositNote[] {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Get notes by status
   */
  getNotesByStatus(status: number): DepositNote[] {
    // You'll need to query contract for each note's status
    return this.getAllNotes(); // Implement filtering based on contract status
  }

  /**
   * Update note with transaction hash
   */
  updateNoteWithTxHash(commitment: Hex, txHash: string): void {
    const notes = this.getAllNotes();
    const note = notes.find(n => n.commitment === commitment);

    if (note) {
      note.txHash = txHash;
      localStorage.setItem(this.storageKey, JSON.stringify(notes));
    }
  }

  /**
   * Update note with leaf index
   */
  updateNoteWithLeafIndex(commitment: Hex, leafIndex: number): void {
    const notes = this.getAllNotes();
    const note = notes.find(n => n.commitment === commitment);

    if (note) {
      note.leafIndex = leafIndex;
      localStorage.setItem(this.storageKey, JSON.stringify(notes));
    }
  }

  /**
   * Delete a note
   */
  deleteNote(commitment: Hex): void {
    const notes = this.getAllNotes();
    const filtered = notes.filter(n => n.commitment !== commitment);
    localStorage.setItem(this.storageKey, JSON.stringify(filtered));
  }

  /**
   * Export notes (for backup)
   */
  exportNotes(): string {
    return JSON.stringify(this.getAllNotes(), null, 2);
  }

  /**
   * Import notes (from backup)
   */
  importNotes(jsonString: string): void {
    const notes = JSON.parse(jsonString);
    localStorage.setItem(this.storageKey, JSON.stringify(notes));
  }

  /**
   * Clear all notes
   */
  clearAllNotes(): void {
    localStorage.removeItem(this.storageKey);
  }
}
```

---

## Event Listening

### Listen for Contract Events

```typescript
/**
 * Listen for Deposit events
 */
function watchDepositEvents(
  publicClient: any,
  onDeposit: (commitment: Hex, leafIndex: number, timestamp: bigint) => void
) {
  return publicClient.watchEvent({
    address: CONTRACT_ADDRESS,
    event: {
      type: 'event',
      name: 'Deposit',
      inputs: [
        { type: 'bytes32', name: 'commitment', indexed: true },
        { type: 'uint32', name: 'leafIndex', indexed: false },
        { type: 'uint256', name: 'timestamp', indexed: false }
      ]
    },
    onLogs: (logs) => {
      for (const log of logs) {
        onDeposit(
          log.args.commitment as Hex,
          log.args.leafIndex as number,
          log.args.timestamp as bigint
        );
      }
    }
  });
}

/**
 * Listen for WithdrawalQueued events
 */
function watchWithdrawalQueuedEvents(
  publicClient: any,
  onQueued: (queueId: bigint, commitment: Hex, executeAfter: bigint) => void
) {
  return publicClient.watchEvent({
    address: CONTRACT_ADDRESS,
    event: {
      type: 'event',
      name: 'WithdrawalQueued',
      inputs: [
        { type: 'uint256', name: 'queueId', indexed: true },
        { type: 'bytes32', name: 'commitment', indexed: true },
        { type: 'bytes32', name: 'nullifierHash', indexed: false },
        { type: 'address', name: 'recipient', indexed: false },
        { type: 'uint256', name: 'executeAfter', indexed: false },
        { type: 'uint256', name: 'withdrawAmount', indexed: false },
        { type: 'bytes32', name: 'changeCommitment', indexed: false }
      ]
    },
    onLogs: (logs) => {
      for (const log of logs) {
        onQueued(
          log.args.queueId as bigint,
          log.args.commitment as Hex,
          log.args.executeAfter as bigint
        );
      }
    }
  });
}

/**
 * Listen for WithdrawalProcessed events
 */
function watchWithdrawalProcessedEvents(
  publicClient: any,
  onProcessed: (queueId: bigint, recipient: string, amount: bigint) => void
) {
  return publicClient.watchEvent({
    address: CONTRACT_ADDRESS,
    event: {
      type: 'event',
      name: 'WithdrawalProcessed',
      inputs: [
        { type: 'uint256', name: 'queueId', indexed: true },
        { type: 'bytes32', name: 'commitment', indexed: true },
        { type: 'address', name: 'recipient', indexed: false },
        { type: 'uint256', name: 'amount', indexed: false },
        { type: 'bytes32', name: 'txHash', indexed: false }
      ]
    },
    onLogs: (logs) => {
      for (const log of logs) {
        onProcessed(
          log.args.queueId as bigint,
          log.args.recipient as string,
          log.args.amount as bigint
        );
      }
    }
  });
}
```

---

## Multi-Deposit Withdrawals

### Combining Multiple Deposits

```typescript
/**
 * Withdraw from multiple deposits in a single transaction
 */
async function executeMultiWithdrawal(
  notes: DepositNote[],
  recipient: string,
  totalWithdrawAmount: string,
  delayMinutes: number,
  merkleTree: MerkleTree,
  walletClient: any,
  publicClient: any
): Promise<string> {
  if (notes.length === 0 || notes.length > 10) {
    throw new Error('Must provide 1-10 deposits');
  }

  // Gather all parameters
  const nullifiers: Hex[] = [];
  const secrets: Hex[] = [];
  const merkleProofs: Hex[][] = [];
  const pathIndices: boolean[][] = [];
  let totalAvailable = 0n;

  for (const note of notes) {
    // Verify note
    const { amount, status } = await getDepositBalance(note.nullifier, note.secret, publicClient);

    if (status !== 1) {
      throw new Error(`Deposit ${note.commitment} is not available`);
    }

    totalAvailable += amount;

    // Get proof
    const proof = merkleTree.getProof(note.leafIndex!);

    nullifiers.push(note.nullifier);
    secrets.push(note.secret);
    merkleProofs.push(proof.pathElements);
    pathIndices.push(proof.pathIndices);
  }

  // Validate withdrawal amount
  const withdrawAmountWei = parseEther(totalWithdrawAmount);

  if (withdrawAmountWei > totalAvailable) {
    throw new Error(`Insufficient balance. Available: ${formatEther(totalAvailable)} BNB`);
  }

  // Generate change commitment if needed
  let changeCommitment: Hex = '0x0000000000000000000000000000000000000000000000000000000000000000';

  if (withdrawAmountWei < totalAvailable) {
    const newNullifier = generateRandom32Bytes();
    const newSecret = generateRandom32Bytes();
    changeCommitment = generateCommitment(newNullifier, newSecret);

    // Store change note
    const changeNote: DepositNote = {
      nullifier: newNullifier,
      secret: newSecret,
      commitment: changeCommitment,
      amount: formatEther(totalAvailable - withdrawAmountWei),
      timestamp: Date.now()
    };

    const allNotes = JSON.parse(localStorage.getItem('anonbnb_notes') || '[]');
    allNotes.push(changeNote);
    localStorage.setItem('anonbnb_notes', JSON.stringify(allNotes));
  }

  // Execute transaction
  const hash = await walletClient.writeContract({
    address: CONTRACT_ADDRESS,
    abi: ANONBNB_ABI,
    functionName: 'queueMultiWithdrawal',
    args: [
      nullifiers,
      secrets,
      recipient as `0x${string}`,
      withdrawAmountWei,
      changeCommitment,
      delayMinutes,
      merkleProofs,
      pathIndices
    ]
  });

  await publicClient.waitForTransactionReceipt({ hash });

  return hash;
}
```

---

## Error Handling

### Common Errors and Solutions

```typescript
/**
 * Handle common contract errors
 */
function handleContractError(error: any): string {
  const errorMessage = error.message || error.toString();

  // Map contract errors to user-friendly messages
  if (errorMessage.includes('Commitment already exists')) {
    return 'This commitment already exists. Please generate new credentials.';
  }

  if (errorMessage.includes('Deposit not found')) {
    return 'Deposit not found. Verify your nullifier and secret.';
  }

  if (errorMessage.includes('Invalid nullifier hash')) {
    return 'Invalid nullifier hash. Check your credentials.';
  }

  if (errorMessage.includes('Merkle proof verification failed')) {
    return 'Merkle proof verification failed. Try syncing your Merkle tree.';
  }

  if (errorMessage.includes('Deposit already queued or completed')) {
    return 'This deposit has already been queued or completed.';
  }

  if (errorMessage.includes('Insufficient withdraw amount')) {
    return 'Withdrawal amount must cover fees (minimum ~0.001 BNB).';
  }

  if (errorMessage.includes('Withdraw amount exceeds deposit')) {
    return 'Withdrawal amount exceeds available balance.';
  }

  if (errorMessage.includes('Contract is paused')) {
    return 'Contract is currently paused. Please try again later.';
  }

  if (errorMessage.includes('user rejected')) {
    return 'Transaction rejected by user.';
  }

  if (errorMessage.includes('insufficient funds')) {
    return 'Insufficient BNB balance for transaction.';
  }

  return 'Transaction failed. Please try again.';
}

/**
 * Retry logic for failed transactions
 */
async function executeWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 2000
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${i + 1} failed:`, error);

      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError;
}
```

---

## Security Best Practices

### 1. **Credential Management**

```typescript
// ✅ GOOD: Generate truly random values
const nullifier = generateRandom32Bytes(); // Uses crypto.getRandomValues

// ❌ BAD: Predictable values
const nullifier = keccak256(encodePacked(['string'], ['my_password']));
```

### 2. **Note Storage**

```typescript
// ✅ GOOD: Store notes locally, never transmit
localStorage.setItem('anonbnb_notes', JSON.stringify(notes));

// ❌ BAD: Storing notes on centralized server
await fetch('/api/store-note', { method: 'POST', body: JSON.stringify(note) });
```

### 3. **Merkle Tree Sync**

```typescript
// ✅ GOOD: Verify root matches contract
const contractRoot = await publicClient.readContract({ functionName: 'getLastRoot' });
if (treeRoot !== contractRoot) {
  throw new Error('Merkle tree out of sync');
}

// ❌ BAD: Trusting local tree without verification
```

### 4. **Transaction Validation**

```typescript
// ✅ GOOD: Validate all parameters before transaction
if (withdrawAmountWei > depositAmountWei) {
  throw new Error('Insufficient balance');
}
if (!isValidAddress(recipient)) {
  throw new Error('Invalid recipient address');
}

// ❌ BAD: Submitting without validation
```

### 5. **Privacy Protection**

```typescript
// ✅ GOOD: Use different recipient address
const recipient = '0x...'; // Fresh address, not connected to depositor

// ❌ BAD: Withdrawing to same address
const recipient = address; // Same as depositor
```

### 6. **Backup Notes**

```typescript
// ✅ GOOD: Regular backups
const backup = noteManager.exportNotes();
// Save to encrypted file or secure location

// ❌ BAD: No backup (loss of notes = loss of funds)
```

---

## Testing

### Test Checklist

```typescript
/**
 * Comprehensive test suite
 */
describe('AnonBNB Integration', () => {
  let tree: MerkleTree;
  let noteManager: NoteManager;

  beforeEach(() => {
    tree = new MerkleTree();
    noteManager = new NoteManager();
  });

  it('should generate valid credentials', () => {
    const nullifier = generateRandom32Bytes();
    const secret = generateRandom32Bytes();
    const commitment = generateCommitment(nullifier, secret);

    expect(nullifier).toMatch(/^0x[0-9a-f]{64}$/);
    expect(secret).toMatch(/^0x[0-9a-f]{64}$/);
    expect(commitment).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('should execute deposit successfully', async () => {
    const note = await executeDeposit('0.1', walletClient, publicClient);

    expect(note.commitment).toBeDefined();
    expect(note.txHash).toBeDefined();
    expect(note.amount).toBe('0.1');
  });

  it('should sync Merkle tree correctly', async () => {
    const tree = await syncMerkleTree(publicClient);
    const contractRoot = await publicClient.readContract({
      functionName: 'getLastRoot'
    });

    expect(tree.getRoot()).toBe(contractRoot);
  });

  it('should generate valid Merkle proof', () => {
    const commitment = generateCommitment(
      generateRandom32Bytes(),
      generateRandom32Bytes()
    );

    const index = tree.insert(commitment);
    const proof = tree.getProof(index);

    expect(proof.pathElements).toHaveLength(20);
    expect(proof.pathIndices).toHaveLength(20);

    const isValid = tree.verify(
      commitment,
      proof.pathElements,
      proof.pathIndices,
      tree.getRoot()
    );

    expect(isValid).toBe(true);
  });

  it('should execute withdrawal with valid proof', async () => {
    // Execute deposit first
    const note = await executeDeposit('0.1', walletClient, publicClient);

    // Sync tree
    const tree = await syncMerkleTree(publicClient);

    // Execute withdrawal
    const hash = await executeWithdrawal(
      note,
      '0x...', // Recipient
      '0.1',
      0, // Instant
      tree,
      walletClient,
      publicClient
    );

    expect(hash).toBeDefined();
  });

  it('should handle partial withdrawal correctly', async () => {
    const note = await executeDeposit('0.1', walletClient, publicClient);
    const tree = await syncMerkleTree(publicClient);

    // Withdraw only 0.05 BNB
    await executeWithdrawal(
      note,
      '0x...',
      '0.05',
      0,
      tree,
      walletClient,
      publicClient
    );

    // Check change note was created
    const notes = noteManager.getAllNotes();
    const changeNote = notes.find(n => n.amount === '0.05');

    expect(changeNote).toBeDefined();
  });
});
```

### Manual Testing Steps

1. **Deposit Test:**
   - Connect wallet with testnet BNB
   - Execute deposit transaction
   - Verify deposit event emitted
   - Check note stored locally
   - Verify balance readable via `getPrivateBalance`

2. **Withdrawal Test:**
   - Sync Merkle tree
   - Generate valid proof
   - Queue withdrawal with different recipient
   - Wait for delay period
   - Verify relayer processes withdrawal
   - Confirm funds received

3. **Multi-Deposit Test:**
   - Create 3-5 deposits
   - Combine into single withdrawal
   - Verify all nullifiers marked as used
   - Check change note created correctly

4. **Error Handling Test:**
   - Try depositing with existing commitment (should fail)
   - Try withdrawing with invalid proof (should fail)
   - Try withdrawing more than balance (should fail)
   - Verify user-friendly error messages

---

## Support

For integration help:
- **Documentation**: Full docs at [contract_docs/README.md](./README.md)
- **Issues**: Report issues at [GitLab](https://gitlab.com/AnonBNB/AnonBNB-contract/issues)
- **Telegram**: Join [t.me/anonbnbfun](https://t.me/anonbnbfun)
- **X (Twitter)**: [@anonbnb_fun](https://x.com/anonbnb_fun)

---

**Last Updated:** 30 October 2025
