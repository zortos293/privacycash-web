# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AnonBNB is an automated cryptocurrency privacy mixer built with Next.js 15, Solidity smart contracts, and Hardhat. It enables fully untraceable BNB transfers using a commitment-based privacy pool system with automated background processing via a relayer service. The system achieves privacy by breaking on-chain links between senders and recipients through pooled deposits and time-delayed withdrawals.

## Package Manager

Always use the bun package manager for everything like installing packages, running scripts, etc.

## Development Commands

```bash
# Frontend Development
bun install              # Install dependencies
bun run dev             # Run Next.js dev server (localhost:3000) - DO NOT RUN, let user run this
bun run build           # Build for production
bun run start               # Start production server
bun run lint            # Run linter

# Smart Contract Deployment
bun run deploy:testnet  # Deploy to BSC Testnet (runs scripts/deployV6.ts)
bun run deploy:mainnet  # Deploy to BSC Mainnet (runs scripts/deployV6.ts)

# Relayer Service (Background Processing)
bun run relayer         # Run relayer on BSC Testnet
bun run relayer:mainnet # Run relayer on BSC Mainnet

# Utility Scripts (run with: hardhat run scripts/<script>.ts --network bscTestnet)
# - check-balance.ts: Check relayer wallet balance
# - checkDeposit.ts: Verify specific deposit commitment
# - checkQueue.ts: View current withdrawal queue
# - debugMerkle.ts: Debug Merkle tree state
# - testMerkleTree.ts: Test Merkle tree operations
# - verifyMerkleProof.ts: Verify Merkle proof validity
```

## Architecture Overview

### Three-Tier System Architecture

1. **Frontend (Next.js)**: User interface for deposits and withdrawal queueing
2. **Smart Contracts (Solidity)**: On-chain privacy pool logic
3. **Relayer Service (TypeScript)**: Automated background withdrawal processor

### Frontend Structure (Next.js 15 App Router)

- **`app/page.tsx`**: Main UI with two-stage flow (deposit → queue withdrawal)
- **`components/WalletProvider.tsx`**: Web3 provider configuration (wagmi + RainbowKit)
- **`components/ClientProviders.tsx`**: SSR-compatible client wrapper
- **`components/ui/`**: shadcn/ui component library (button, dialog, card, input, badge, alert, separator, scroll-area, sonner)
- **`components/HowItWorks.tsx`**: Educational section explaining privacy mechanism
- **`lib/privacyPool.ts`**: Cryptographic utilities (commitment generation, note management)
- **`lib/contractABI.ts`**: Contract ABI for frontend interactions
- **`lib/utils.ts`**: Utility functions (cn helper for Tailwind class merging)

**SSR Handling**: Uses two-layer provider pattern because Web3 wallet adapters require browser APIs:
1. `ClientProviders` marks tree as client-only
2. `WalletProvider` contains wagmi/RainbowKit providers

**UI Component System**: Uses shadcn/ui (configured in `components.json`) with "new-york" style, zinc base color, and CSS variables for theming

### Smart Contract Architecture

**Primary Contract**: `contracts/PrivacyPool.sol`
- Fixed denomination deposits (0.1 BNB)
- Commitment-based privacy (keccak256 of nullifier + secret)
- Withdrawal queue with configurable time delays (5 min - 24 hours)
- Automated relayer processing system
- Security features: ReentrancyGuard, Pausable, input validation

**Additional Contracts**:
- `contracts/MerkleTreeWithHistory.sol`: Merkle tree for deposit tracking
- `contracts/PrivacyPoolZK.sol`: Advanced ZK-SNARK version (future enhancement)

**Key Contract Functions**:
- `deposit(bytes32 commitment)`: Deposit 0.1 BNB with commitment
- `queueWithdrawal(bytes32 nullifier, bytes32 secret, address recipient, uint256 delayMinutes)`: Queue withdrawal proving ownership
- `processWithdrawals(uint256 batchSize)`: Relayer-only function to execute ready withdrawals
- `getPoolStats()`: Returns [deposits, withdrawals, fees, activeDeposits, poolBalance, queueLength]

### Privacy Mechanism Flow

```
1. USER DEPOSITS:
   - Generate random nullifier and secret (client-side)
   - commitment = keccak256(nullifier, secret)
   - Deposit 0.1 BNB with commitment
   - Store note locally (localStorage)

2. USER QUEUES WITHDRAWAL:
   - Provide nullifier + secret to prove ownership
   - Contract verifies: keccak256(nullifier, secret) == stored commitment
   - Queue withdrawal with recipient address and delay
   - nullifierHash stored to prevent double-spending

3. RELAYER PROCESSES (AUTOMATED):
   - Background service checks queue every 60 seconds
   - Process withdrawals where block.timestamp >= requestTime + delay
   - Sends from pool to recipient (no link to depositor)
   - Batch processing up to 10 withdrawals per transaction
```

### Relayer Service

**Location**: `scripts/relayer.ts`

**Function**: Automated background daemon that monitors withdrawal queue and processes ready withdrawals

**Key Features**:
- Runs continuously (60-second polling interval)
- Batch processes up to 10 withdrawals per transaction
- Gas estimation and balance checking
- Event logging for processed withdrawals
- Designed for 24/7 operation on VPS with PM2

**Requirements**:
- Must be funded with BNB for gas fees
- Requires `RELAYER_PRIVATE_KEY` (can be same as deployer or separate wallet)
- Must be registered as authorized relayer in contract

### Cryptographic Library

**Location**: `lib/privacyPool.ts`

**Key Functions**:
- `createDepositNote()`: Generate nullifier, secret, and commitment
- `generateCommitment(nullifier, secret)`: keccak256(nullifier, secret)
- `generateNullifierHash(nullifier)`: keccak256(nullifier)
- `storeDepositNote()`: Save to localStorage
- `getAllDepositNotes()`: Retrieve user's deposits

**Security Model**:
- Nullifier + secret prove ownership without revealing identity
- Commitment stored on-chain links to deposit
- NullifierHash prevents double-spending (revealed only at withdrawal)
- No direct on-chain link between deposit address and withdrawal address

### State Management

Frontend uses React hooks only (no Redux/Zustand):
- `useAccount()`: Wallet connection state
- `useBalance()`: Wallet balance
- `useReadContract()`: Read pool stats
- `useWriteContract()`: Execute transactions (deposit, queueWithdrawal)
- `useWaitForTransactionReceipt()`: Monitor transaction confirmation

Local state in `app/page.tsx` manages:
- Two-stage transaction flow (deposit → queue)
- Current deposit note during processing
- Form inputs (amount, recipient, delay)
- Loading/error/success states

## Environment Configuration

**Required `.env` variables**:
```bash
# WalletConnect (get from https://cloud.walletconnect.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# Deployer private key (for contract deployment)
PRIVATE_KEY=your_private_key

# Relayer private key (can be same as PRIVATE_KEY or separate)
RELAYER_PRIVATE_KEY=your_relayer_private_key

# Contract address (set after deployment)
NEXT_PUBLIC_PRIVACY_POOL_ADDRESS=0x...
```

## Network Configuration

**Current network**: BSC Testnet (Chain ID: 97)

Networks configured in:
- **Frontend**: `components/WalletProvider.tsx` (wagmi chains: `[bscTestnet, bsc]`)
- **Hardhat**: `hardhat.config.ts` (networks: `bscTestnet`, `bsc`)

To switch to mainnet-only:
```typescript
// WalletProvider.tsx
chains: [bsc]  // Remove bscTestnet
```

Get testnet BNB: https://testnet.bnbchain.org/faucet-smart

## Deployment Workflow

1. Set environment variables in `.env`
2. Deploy contract: `bun run deploy:testnet` (runs `scripts/deployV6.ts`)
3. Copy deployed address to `.env` as `NEXT_PUBLIC_PRIVACY_POOL_ADDRESS`
4. Start relayer service: `bun run relayer` (separate terminal/VPS)
5. Start frontend: User runs `bun run dev` (DO NOT auto-run this)

**Production Relayer Setup** (VPS with PM2):
```bash
pm2 start "bun run relayer:mainnet" --name privacy-relayer
pm2 save
pm2 startup
```

## TypeScript Configuration

- **Target**: ES2020 (for BigInt support)
- **Module**: CommonJS (required for Hardhat scripts)
- **Path aliases**:
  - `@/*` maps to root directory
  - `@/components` and `@/lib/utils` (shadcn/ui convention)
- **Strict mode**: Enabled
- **ts-node**: Configured for Hardhat script execution

## Solidity Compiler Configuration

**Hardhat settings** (`hardhat.config.ts`):
- **Version**: 0.8.20
- **Optimizer**: Enabled with 200 runs (balances deployment cost vs. execution cost)
- **viaIR**: Enabled (uses Yul intermediate representation for better optimization, required for complex contracts)

## Key Dependencies

**Frontend**:
- `wagmi@2.19`: Type-safe React hooks for Ethereum
- `viem@2.38`: Ethereum library (parseEther, formatEther, keccak256, encodePacked)
- `@rainbow-me/rainbowkit@2.2`: Wallet connection UI
- `@tanstack/react-query@5.90`: Required by wagmi for caching
- `next@16` + `react@19.2`: React framework
- `circomlibjs@0.1.7`: Cryptographic utilities (Poseidon hash for ZK circuits)
- `shadcn/ui`: UI component system via Radix UI primitives (`@radix-ui/react-*`)
- `lucide-react@0.548`: Icon library
- `sonner@2.0`: Toast notifications
- `next-themes@0.4`: Dark mode support
- `class-variance-authority@0.7` + `clsx@2.1` + `tailwind-merge@3.3`: Component styling utilities

**Smart Contracts**:
- `hardhat@3.0`: Ethereum development environment
- `ethers@6.15`: Contract interaction (used in scripts only)
- `@openzeppelin/contracts@5.4`: Security contracts (ReentrancyGuard, Ownable, Pausable)
- `@nomicfoundation/hardhat-toolbox@6.1`: Hardhat plugin bundle

**Relayer**:
- `hardhat` + `ethers`: For script execution and contract interaction

**Additional Tools**:
- `snarkjs@0.7`: ZK-SNARK proof generation and verification
- `circom_tester@0.0.24`: Testing framework for Circom circuits
- `tailwindcss@4.1`: Utility-first CSS framework
- `pino-pretty@13.1`: Log formatting for development

## Important Files

- **`app/page.tsx`**: Main UI logic (handles two-stage deposit+queue flow)
- **`contracts/PrivacyPool.sol`**: Core privacy pool contract
- **`scripts/relayer.ts`**: Automated withdrawal processor
- **`scripts/deployV6.ts`**: Current contract deployment script (v6 is active version)
- **`scripts/deploy.ts`**: Legacy deployment script
- **`lib/privacyPool.ts`**: Cryptographic utilities and note management
- **`lib/utils.ts`**: Tailwind utility helpers
- **`hardhat.config.ts`**: Network configuration and compiler settings
- **`components.json`**: shadcn/ui configuration

## Privacy Features

**Anonymity Set**: Larger pool = better privacy (more possible senders per withdrawal)

**Time Delays**: Configurable 5 min - 24 hours breaks temporal correlation

**Fixed Denomination**: All deposits are 0.1 BNB (uniformity prevents amount-based tracking)

**Relayer System**: Third-party processes withdrawals, breaking direct transaction link

**Commitment Scheme**: Zero-knowledge proof of ownership without revealing deposit identity

## Fees

- **Platform fee**: 0.25% (25 basis points) on withdrawal
- **Relayer fee**: 0.001 BNB per withdrawal (covers gas)
- **Net received**: ~0.0996 BNB per 0.1 BNB deposit

## Security Considerations

**Smart Contract**:
- ReentrancyGuard on all state-changing functions
- Input validation on all parameters (addresses, amounts, delays)
- Pausable emergency stop mechanism
- Nullifier hash prevents double-spending
- Secret verification prevents unauthorized withdrawals

**Frontend**:
- Deposit notes stored in localStorage (client-side only)
- Never transmit nullifier/secret except in withdrawal transaction
- Address validation before transactions

**Relayer**:
- Should run on secure VPS (not local machine)
- Private key should be separate from deployer (optional but recommended)
- Monitor for failures and maintain sufficient gas balance

## ZK-SNARK Implementation (Circuits)

**Current Status**: Basic commitment-based system is production-ready. Full ZK-SNARK circuits are prepared for future enhancement.

**Circuit Location**: `circuits/withdraw.circom`

**Purpose**: Tornado Cash-style Groth16 proofs for stronger privacy (hide commitment verification on-chain)

**Current System**: Uses simple nullifier+secret verification (sufficient for basic privacy)

**Future Enhancement**: Implement full ZK-SNARK to hide which commitment is being withdrawn

## Testing Notes

Always test on BSC Testnet before mainnet:
1. Get testnet BNB from faucet
2. Deploy contract to testnet
3. Test full flow: deposit → queue → relayer processing
4. Verify privacy (check block explorer shows no link between addresses)
5. Monitor relayer logs for errors

## Styling

- **Tailwind CSS**: All styling via utility classes
- **Color palette**: BNB-themed dark mode
  - Primary: `#F0B90B` (BNB gold)
  - Secondary: `#F8D12F` (light gold)
  - Backgrounds: `#342E37`, `#423C45`, `#2D272F`
  - Borders: `#554D58`
- **RainbowKit theme**: Default dark theme (can customize in `WalletProvider.tsx`)

## Contract Address Pattern

All contract interactions use:
```typescript
const PRIVACY_POOL_ADDRESS = process.env.NEXT_PUBLIC_PRIVACY_POOL_ADDRESS as `0x${string}`;
```

Must be set in `.env` after deployment for frontend to work.
