# AnonBNB Smart Contract Documentation

**Version:** 1.0.0
**License:** MIT
**Blockchain:** BNB Smart Chain (BSC)
**Language:** Solidity ^0.8.20

## Overview

AnonBNB is a privacy-preserving cryptocurrency mixer that enables fully anonymous BNB transfers on the BNB Smart Chain. It uses cryptographic commitments, Merkle tree proofs, and a relayer system to break on-chain links between depositors and recipients.

## Table of Contents

1. [Key Features](#key-features)
2. [Architecture](#architecture)
3. [How It Works](#how-it-works)
4. [Contract Functions](#contract-functions)
5. [Security Model](#security-model)
6. [Deployment Guide](#deployment-guide)
7. [Integration Guide](#integration-guide)
8. [Gas Costs](#gas-costs)
9. [Audit Status](#audit-status)

---

## Key Features

### ✅ Privacy Mechanisms
- **Commitment Scheme**: Uses `keccak256(nullifier, secret)` to create unlinkable deposits
- **Merkle Tree Proofs**: O(log n) verification complexity with 20-level binary tree
- **Nullifier System**: Prevents double-spending while maintaining anonymity
- **Time Delays**: Configurable delays (0-24 hours) break temporal correlation
- **Relayer System**: Third-party processes withdrawals, obscuring sender

### ✅ Technical Features
- **Partial Withdrawals**: Withdraw less than deposited, remaining balance automatically returns
- **Multi-Deposit Withdrawals**: Combine multiple deposits into single withdrawal
- **Emergency Controls**: Owner-controlled pause/unpause functionality
- **Fee System**: 0.25% platform fee + 0.001 BNB relayer fee
- **Status Tracking**: Full lifecycle tracking of each deposit

### ✅ Security Features
- **ReentrancyGuard**: Protection against reentrancy attacks
- **Field Size Validation**: All hashes modulo BN254 curve field size
- **Merkle Proof Verification**: Cryptographic proof of deposit membership
- **Duplicate Prevention**: Commitments and nullifiers cannot be reused

---

## Architecture

### Contract Inheritance
```
AnonBNB
├── ReentrancyGuard (OpenZeppelin)
├── Ownable (OpenZeppelin)
├── Pausable (OpenZeppelin)
└── MerkleTreeWithHistory (Custom)
```

### Data Structures

#### DepositStatus Enum
```solidity
enum DepositStatus {
    None,        // Default state (no deposit)
    Deposited,   // Funds deposited, not queued yet
    Queued,      // Withdrawal queued, waiting for delay
    Processing,  // Being processed by relayer
    Completed    // Withdrawal completed successfully
}
```

#### DepositInfo Struct
```solidity
struct DepositInfo {
    bytes32 commitment;        // Commitment hash
    uint32 leafIndex;          // Position in Merkle tree
    uint256 depositTime;       // Timestamp of deposit
    uint256 amount;            // Deposit amount in wei
    uint256 queueId;           // Queue ID when withdrawal queued
    DepositStatus status;      // Current status
    address recipient;         // Recipient when queued
    uint256 executeAfter;      // Execute time when queued
    bytes32 withdrawalTxHash;  // Tx hash of completed withdrawal
}
```

#### WithdrawalRequest Struct
```solidity
struct WithdrawalRequest {
    bytes32 nullifierHash;     // Hash of nullifier (prevents double-spend)
    address payable recipient; // Withdrawal recipient
    bytes32 root;              // Merkle root at time of request
    uint256 requestTime;       // Timestamp for execution
    uint256 withdrawAmount;    // Actual withdrawal amount
    bytes32 changeCommitment;  // New commitment for remaining funds
    bool processed;            // Processing status
}
```

---

## How It Works

### 1. Deposit Flow

```
User → Generate (nullifier, secret) → commitment = keccak256(nullifier, secret)
     → Send BNB + commitment → Contract stores in Merkle tree
     → User saves (nullifier, secret) locally
```

**Code Example:**
```solidity
// 1. Generate random 32-byte values (client-side)
bytes32 nullifier = 0x7a3f89b2c4d1e6f8...
bytes32 secret = 0x4e8d1a6f2c9b5e7a...

// 2. Compute commitment (client-side)
bytes32 commitment = keccak256(abi.encodePacked(nullifier, secret))

// 3. Deposit (on-chain)
contract.deposit{value: 0.1 ether}(commitment)
```

### 2. Withdrawal Flow

```
User → Provide (nullifier, secret, recipient, amount, delay)
     → Contract verifies commitment = keccak256(nullifier, secret) exists
     → Contract generates nullifierHash = keccak256(nullifier)
     → Contract verifies Merkle proof
     → Withdrawal queued
     → Relayer processes after delay
     → BNB sent to recipient
```

**Code Example:**
```solidity
// 1. Generate Merkle proof (client-side)
bytes32[20] memory proof = getMerkleProof(commitment)
bool[20] memory indices = getPathIndices(commitment)

// 2. Queue withdrawal (on-chain)
contract.queueWithdrawal(
    nullifier,
    secret,
    payable(recipientAddress),
    0.05 ether,           // Withdraw 0.05 BNB
    changeCommitment,     // New commitment for remaining 0.05 BNB
    30,                   // 30 minute delay
    proof,
    indices
)

// 3. Relayer processes (automatic)
contract.processWithdrawals(10) // Process up to 10 withdrawals
```

### 3. Privacy Mechanism

**Commitment Scheme:**
```
commitment = keccak256(nullifier || secret) % FIELD_SIZE
```

**Nullifier Hash:**
```
nullifierHash = keccak256(nullifier) % FIELD_SIZE
```

**Why This Provides Privacy:**
- **Deposit**: Only `commitment` is revealed on-chain
- **Withdrawal**: Only `nullifierHash` is revealed on-chain
- **Link Breaking**: Cannot link `nullifierHash` to `commitment` without knowing `secret`
- **Observer View**: Sees deposits and withdrawals as independent events

---

## Contract Functions

### Public Functions

#### `deposit(bytes32 _commitment)`
Deposit BNB into the privacy pool.

**Parameters:**
- `_commitment`: Commitment hash (keccak256 of nullifier and secret)

**Requirements:**
- Minimum 0.01 BNB
- Commitment must be unique
- Commitment < FIELD_SIZE

**Events:**
- `Deposit(commitment, leafIndex, timestamp)`
- `StatusUpdated(commitment, None, Deposited)`

---

#### `queueWithdrawal(...)`
Queue a withdrawal with cryptographic proof. Supports partial withdrawals.

**Parameters:**
- `_nullifier`: The nullifier (kept secret until withdrawal)
- `_secret`: The secret used in commitment
- `_recipient`: Address to receive funds
- `_withdrawAmount`: Amount to withdraw (can be less than deposit)
- `_changeCommitment`: New commitment for remaining funds (0 if full withdrawal)
- `_delayMinutes`: Delay before execution (0-1440 minutes)
- `_merkleProof`: Merkle proof (20 sibling hashes)
- `_pathIndices`: Path through tree (false=left, true=right)

**Requirements:**
- Valid nullifier and secret
- Commitment exists in Merkle tree
- Nullifier not previously used
- Valid Merkle proof
- Withdraw amount ≤ deposit amount

**Events:**
- `WithdrawalQueued(queueId, commitment, nullifierHash, recipient, executeAfter, withdrawAmount, changeCommitment)`
- `StatusUpdated(commitment, Deposited, Queued)`

---

#### `queueMultiWithdrawal(...)`
Combine multiple deposits into a single withdrawal.

**Parameters:**
- `_nullifiers`: Array of nullifiers (one per deposit)
- `_secrets`: Array of secrets (one per deposit)
- `_recipient`: Address to receive combined funds
- `_withdrawAmount`: Total amount to withdraw
- `_changeCommitment`: New commitment for remaining funds
- `_delayMinutes`: Delay before execution
- `_merkleProofs`: Array of Merkle proofs
- `_pathIndices`: Array of path indices

**Requirements:**
- 1-10 deposits per withdrawal
- All arrays must match in length
- Each deposit verified independently
- Total withdraw amount ≤ total deposit amount

---

#### `processWithdrawals(uint256 _count)`
Process queued withdrawals (called by relayer).

**Parameters:**
- `_count`: Number of withdrawals to process (max 50)

**Requirements:**
- Only callable by relayer or owner
- Processes withdrawals where `block.timestamp ≥ requestTime`

**Events:**
- `WithdrawalProcessed(queueId, commitment, recipient, amount, txHash)`
- `StatusUpdated(commitment, Processing, Completed)`
- `ChangeDeposit(oldCommitment, newCommitment, changeAmount, leafIndex)` (if partial)

---

### View Functions

#### `getPrivateBalance(bytes32 _nullifier, bytes32 _secret)`
Get balance for a specific deposit (requires proof of ownership).

**Returns:**
- `amount`: Deposit balance
- `status`: Current deposit status

**Security:**
- Only works with correct nullifier + secret
- Gas-free when called off-chain (eth_call)
- No on-chain record of query

---

#### `getTotalPrivateBalance(bytes32[] _nullifiers, bytes32[] _secrets)`
Get total balance across multiple deposits.

**Returns:**
- `totalBalance`: Sum of all available balances
- `depositCount`: Number of active deposits

---

#### `getPoolStats()`
Get overall pool statistics.

**Returns:**
- Total deposits (wei)
- Total withdrawals (wei)
- Collected fees (wei)
- Deposit count
- Pool balance (wei)
- Queue length
- Pending withdrawal count

---

#### `getDepositInfo(bytes32 _commitment)`
Get full information about a specific deposit.

**Returns:**
- `commitment`: Commitment hash
- `leafIndex`: Position in Merkle tree
- `depositTime`: Timestamp
- `amount`: Deposit amount
- `queueId`: Queue ID (if queued)
- `status`: Current status
- `recipient`: Recipient address (if queued)
- `executeAfter`: Execution time (if queued)
- `withdrawalTxHash`: Transaction hash (if completed)

---

### Admin Functions

#### `setRelayer(address _newRelayer)`
Update relayer address (owner only).

#### `setRelayerFee(uint256 _newFee)`
Update relayer fee (owner only, max 0.01 BNB).

#### `pause()` / `unpause()`
Emergency pause/unpause (owner only).

#### `withdrawFees()`
Withdraw collected platform fees (owner only).

---

## Security Model

### Cryptographic Security

**Hash Function:** Keccak-256 (SHA-3)
- 256-bit output (32 bytes)
- Collision-resistant
- Pre-image resistant

**Field Size:** BN254 curve (for ZK compatibility)
```
FIELD_SIZE = 21888242871839275222246405745257275088548364400416034343698204186575808495617
```

**Merkle Tree:**
- 20 levels (supports 1,048,576 deposits)
- Binary tree (left/right branching)
- Each level: `parent = keccak256(left || right)`

### Attack Resistance

✅ **Reentrancy**: Protected by OpenZeppelin `ReentrancyGuard`
✅ **Double-Spending**: Nullifier hash prevents reuse
✅ **Replay Attacks**: Each commitment is unique
✅ **Front-Running**: Time delays mitigate timing attacks
✅ **Merkle Proof Forgery**: Cryptographically verified
✅ **Integer Overflow**: Solidity 0.8+ has built-in checks

### Privacy Guarantees

**Anonymity Set:** Privacy strength = 1/N (where N = pool size)
**Temporal Unlinkability:** Time delays break correlation
**Transaction Graph Analysis:** Relayer breaks direct links

---

## Deployment Guide

### Prerequisites

```bash
npm install --save-dev hardhat @openzeppelin/contracts
```

### Deployment Script

```javascript
const { ethers } = require("hardhat");

async function main() {
  // Deploy MerkleTreeWithHistory first
  const MerkleTree = await ethers.getContractFactory("MerkleTreeWithHistory");
  const merkleTree = await MerkleTree.deploy();
  await merkleTree.deployed();
  console.log("MerkleTree deployed to:", merkleTree.address);

  // Deploy AnonBNB
  const AnonBNB = await ethers.getContractFactory("AnonBNB");
  const anonBNB = await AnonBNB.deploy();
  await anonBNB.deployed();
  console.log("AnonBNB deployed to:", anonBNB.address);

  // Set relayer address
  const relayerAddress = "0x...";
  await anonBNB.setRelayer(relayerAddress);
  console.log("Relayer set to:", relayerAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```

### Network Configuration

**BSC Testnet:**
```javascript
{
  network: "bscTestnet",
  chainId: 97,
  rpc: "https://data-seed-prebsc-1-s1.binance.org:8545/",
  explorer: "https://testnet.bscscan.com"
}
```

**BSC Mainnet:**
```javascript
{
  network: "bsc",
  chainId: 56,
  rpc: "https://bsc-dataseed1.binance.org/",
  explorer: "https://bscscan.com"
}
```

---

## Integration Guide

### Frontend Integration

See [INTEGRATION.md](./INTEGRATION.md) for complete integration guide.

**Quick Start:**
```typescript
import { parseEther, keccak256, encodePacked } from 'viem'

// Generate credentials
const nullifier = crypto.getRandomValues(new Uint8Array(32))
const secret = crypto.getRandomValues(new Uint8Array(32))

// Compute commitment
const commitment = keccak256(
  encodePacked(['bytes32', 'bytes32'], [nullifier, secret])
)

// Deposit
await contract.write.deposit([commitment], {
  value: parseEther('0.1')
})

// Store credentials securely
localStorage.setItem('deposit_note', JSON.stringify({
  nullifier,
  secret,
  commitment
}))
```

---

## Gas Costs

| Operation | Gas Cost (approx) |
|-----------|-------------------|
| Deposit | ~150,000 gas |
| Queue Withdrawal (single) | ~200,000 gas |
| Queue Multi-Withdrawal (5 deposits) | ~600,000 gas |
| Process Withdrawal | ~120,000 gas |
| Get Private Balance (off-chain) | 0 gas |

---


## License

MIT License - see [LICENSE](../LICENSE) file for details.

---

## Support

- **Documentation**: [Full docs](./INTEGRATION.md)
- **Issues**: [GitLab Issues](https://gitlab.com/AnonBNB/AnonBNB-contract/issues)
- **Website**: [anonbnb.fun](https://anonbnb.fun)
- **Twitter**: [@anonbnb_fun](https://x.com/anonbnb_fun)
- **Telegram**: [t.me/anonbnbfun](https://t.me/anonbnbfun)

---

**Last Updated:** 30 Oct 2025
