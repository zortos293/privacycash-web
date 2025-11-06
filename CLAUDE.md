# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Solana-based cryptocurrency privacy mixer that uses ZCASH as a routing mechanism. Built with Next.js 15, Rust/Anchor smart programs, and TypeScript. It enables fully untraceable SOL transfers by routing through wrapped ZCASH pools, using commitment-based privacy with automated withdrawal processing.

**Privacy Flow:** SOL → ZEC (via Jupiter) → Privacy Pool → ZEC → SOL (to recipient)

## Package Manager

Always use the bun package manager for everything like installing packages, running scripts, etc.

## Development Commands

```bash
# Frontend Development
bun install              # Install dependencies
bun run dev             # Run Next.js dev server (localhost:3000) - DO NOT RUN, let user run this
bun run build           # Build for production
bun run start           # Start production server
bun run lint            # Run linter

# Solana Program (Smart Contract)
bun run anchor:build    # Build Anchor program (Rust)
bun run anchor:test     # Run Anchor tests
bun run deploy:devnet   # Deploy to Solana Devnet
bun run deploy:mainnet  # Deploy to Solana Mainnet

# Relayer Service (Background Processing)
bun run relayer         # Run relayer on Devnet
bun run relayer:mainnet # Run relayer on Mainnet
```

## Architecture Overview

### Three-Tier System Architecture

1. **Frontend (Next.js)**: User interface for deposits and withdrawal queueing
2. **Solana Program (Rust/Anchor)**: On-chain privacy pool logic with Jupiter integration
3. **Relayer Service (TypeScript)**: Automated background withdrawal processor

### Privacy Mechanism: ZCASH Routing

**Why ZCASH?**
- Adds extra privacy layer beyond simple pooling
- Breaks direct SOL → SOL transaction link
- Leverages ZCASH's privacy-focused design
- Makes chain analysis significantly harder

**Flow:**
```
Deposit:  SOL → Jupiter Swap → wrapped ZEC → Privacy Pool (with commitment)
Withdraw: Privacy Pool → Jupiter Swap → ZEC → SOL (to recipient address)
```

**Commitment Scheme:**
- `commitment = keccak256(nullifier || secret)` - stored on-chain
- `nullifierHash = keccak256(nullifier)` - revealed only at withdrawal
- Proves ownership without revealing deposit identity

### Frontend Structure (Next.js 15 App Router)

- **`app/page.tsx`**: Main UI (NEEDS UPDATE - still uses wagmi/BNB)
- **`components/WalletProvider.tsx`**: Solana wallet adapter configuration (Phantom, Solflare, etc.)
- **`components/ClientProviders.tsx`**: SSR-compatible client wrapper
- **`components/ui/`**: shadcn/ui component library
- **`lib/privacyPool.ts`**: Cryptographic utilities (commitment generation, note management)
- **`lib/utils.ts`**: Utility functions

**SSR Handling**: Uses two-layer provider pattern for browser-only Web3 wallets

### Solana Program Architecture

**Location:** `programs/privacy-pool/src/`

**Main Files:**
- `lib.rs` - Core program logic (deposit, queue, process)
- `jupiter.rs` - Jupiter swap integration (CPI calls)

**Key Features:**
- Fixed 0.1 SOL deposits (100,000,000 lamports)
- Commitment-based privacy (keccak256 of nullifier + secret)
- Withdrawal queue with time delays (5 min - 24 hours)
- Automated relayer processing
- Jupiter CPI for SOL ↔ ZEC swaps

**Program Structure:**
```rust
pub mod privacy_pool {
    pub fn initialize(relayer: Pubkey) -> Result<()>
    pub fn deposit(commitment: [u8; 32]) -> Result<()>
    pub fn queue_withdrawal(nullifier, secret, recipient, delay) -> Result<()>
    pub fn process_withdrawals(batch_size: u8) -> Result<()>  // Relayer only
}
```

**State:**
- `PrivacyPool` account (PDA)
  - Commitments: Vec<[u8; 32]>
  - NullifierHashes: Vec<[u8; 32]>
  - WithdrawalQueue: Vec<WithdrawalRequest>
  - Stats: deposits, withdrawals, fees

**Security:**
- Nullifier prevents double-spending
- Time delays break temporal correlation
- Relayer authorization check
- Input validation on all parameters

### Jupiter Integration

**Purpose:** Swap SOL ↔ wrapped ZEC

**Implementation:** `programs/privacy-pool/src/jupiter.rs`

**Status:** ⚠️ PLACEHOLDER - Needs full implementation

**Required:**
1. Get quote from Jupiter API (off-chain)
2. Build proper swap instruction with all accounts
3. Execute CPI call to Jupiter program
4. Handle slippage and partial fills

**Jupiter Program ID:** `JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4`

### Relayer Service

**Location:** `scripts/relayer.ts`

**Function:** Automated background daemon that monitors withdrawal queue and processes ready withdrawals

**Key Features:**
- Runs continuously (60-second polling)
- Batch processes up to 10 withdrawals per transaction
- Uses Anchor provider and program
- Monitors Solana program state
- Calls `processWithdrawals` via CPI

**Requirements:**
- Must be funded with SOL for transaction fees
- Requires `RELAYER_PRIVATE_KEY` (Solana keypair, base58 encoded)
- Must be registered as authorized relayer in program

**Usage:**
```bash
# Devnet
bun run relayer

# Mainnet
bun run relayer:mainnet
```

### Cryptographic Library

**Location:** `lib/privacyPool.ts`

**Key Functions:**
- `createDepositNote()`: Generate nullifier, secret, and commitment
- `generateCommitment(nullifier, secret)`: keccak256(nullifier || secret)
- `generateNullifierHash(nullifier)`: keccak256(nullifier)
- `storeDepositNote()`: Save to localStorage
- `getAllDepositNotes()`: Retrieve user's deposits

**Security Model:**
- Nullifier + secret prove ownership without revealing identity
- Commitment stored on-chain links to deposit
- NullifierHash prevents double-spending (revealed only at withdrawal)
- ZCASH routing breaks on-chain transaction link
- No direct link between deposit address and withdrawal address

### State Management

Frontend uses React hooks:
- `useWallet()`: Solana wallet connection
- `useConnection()`: Solana RPC connection
- `useProgram()`: Anchor program interface (TODO)

Local state in `app/page.tsx` manages:
- Two-stage transaction flow (deposit → queue)
- Current deposit note during processing
- Form inputs (amount, recipient, delay)
- Loading/error/success states

## Environment Configuration

**Required `.env` variables:**
```bash
# Network (devnet or mainnet)
NEXT_PUBLIC_NETWORK=devnet

# Solana RPC Endpoint (optional - uses public if not set)
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Program Address (set after deployment)
NEXT_PUBLIC_PRIVACY_POOL_ADDRESS=H5YJ3bKqXJErzyNLz8M6vJ7H5W8jF9MjKYPzN8xhG7YK

# Relayer private key (Solana keypair, base58)
# Generate with: solana-keygen new
RELAYER_PRIVATE_KEY=your_solana_private_key_here

# Wrapped ZEC mint address on Solana (via Zolana bridge)
# Real address from Oct 16, 2025 launch
ZEC_MINT_ADDRESS=DS3C5XPbPLPypQuYyK1F22PGyHP8wRvZwt9DaMEd4vir

# Jupiter API (optional)
JUPITER_API_URL=https://quote-api.jup.ag/v6
```

## Network Configuration

**Current network**: Solana Devnet

**Configured in:**
- **Frontend**: `components/WalletProvider.tsx`
- **Anchor**: `Anchor.toml`

**Devnet Faucet:** https://faucet.solana.com

**To switch to mainnet:**
```bash
# .env
NEXT_PUBLIC_NETWORK=mainnet
```

## Deployment Workflow

1. Install Anchor CLI: `cargo install --git https://github.com/coral-xyz/anchor anchor-cli`
2. Generate Solana keypair: `solana-keygen new`
3. Fund keypair: `solana airdrop 2` (devnet) or send real SOL (mainnet)
4. Build program: `bun run anchor:build`
5. Deploy: `bun run deploy:devnet` or `bun run deploy:mainnet`
6. Copy program ID to `.env` as `NEXT_PUBLIC_PRIVACY_POOL_ADDRESS`
7. Initialize program with relayer address
8. Start relayer: `bun run relayer` (separate terminal/VPS)
9. User runs frontend: `bun run dev`

**Production Relayer Setup** (VPS with PM2):
```bash
pm2 start "bun run relayer:mainnet" --name privacy-relayer
pm2 save
pm2 startup
```

## TypeScript/Rust Configuration

**TypeScript:**
- Target: ES2020 (BigInt support)
- Path aliases: `@/*` maps to root
- Strict mode: Enabled

**Rust (Anchor):**
- Edition: 2021
- Anchor version: 0.32.1
- Dependencies: anchor-lang, anchor-spl, solana-program, spl-token

## Key Dependencies

**Frontend:**
- `@solana/web3.js@1.98`: Solana JavaScript SDK
- `@solana/wallet-adapter-*`: Wallet integration
- `@coral-xyz/anchor@0.32`: Anchor client
- `@jup-ag/api` + `@jup-ag/react-hook`: Jupiter integration
- `@noble/hashes`: Cryptographic functions (keccak256)
- `bs58`: Base58 encoding/decoding
- `next@16` + `react@19.2`: React framework
- `shadcn/ui`: UI component system

**Backend (Rust):**
- `anchor-lang@0.32`: Anchor framework
- `anchor-spl@0.32`: SPL token utilities
- `solana-program@2.1`: Solana program primitives
- `spl-token@6.0`: Token program

**Relayer:**
- `@solana/web3.js`: Transaction sending
- `@coral-xyz/anchor`: Program interaction
- `bs58`: Private key decoding

## Important Files

- **`programs/privacy-pool/src/lib.rs`**: Main Solana program
- **`programs/privacy-pool/src/jupiter.rs`**: Jupiter swap integration
- **`scripts/relayer.ts`**: Automated withdrawal processor
- **`lib/privacyPool.ts`**: Cryptographic utilities
- **`components/WalletProvider.tsx`**: Solana wallet configuration
- **`Anchor.toml`**: Anchor configuration
- **`.env`**: Environment variables

## Privacy Features

**Anonymity Set:** Larger pool = better privacy (more possible senders per withdrawal)

**ZCASH Routing:** Extra privacy layer - all funds go through ZEC conversion

**Time Delays:** Configurable 5 min - 24 hours breaks temporal correlation

**Fixed Denomination:** All deposits are 0.1 SOL (uniformity prevents amount tracking)

**Relayer System:** Third-party processes withdrawals, breaking direct link

**Commitment Scheme:** Zero-knowledge proof of ownership without revealing deposit identity

## Fees

- **Platform fee**: 0.25% (25 basis points) on withdrawal
- **Relayer fee**: 0.001 SOL per withdrawal (covers transaction costs)
- **Jupiter swap fees**: ~0.01-0.02% per swap (market rates)
- **Net received**: ~0.097 SOL per 0.1 SOL deposit (after all fees)

## Security Considerations

**Solana Program:**
- Nullifier hash prevents double-spending
- Secret verification prevents unauthorized withdrawals
- Commitment verification proves ownership
- Time-locked withdrawals (can't rush)
- Relayer authorization check
- Pausable emergency mechanism

**Frontend:**
- Deposit notes stored in localStorage (client-side only)
- Never transmit nullifier/secret except in withdrawal transaction
- Address validation before transactions

**Relayer:**
- Should run on secure VPS (not local machine)
- Private key should be separate from deployer
- Monitor for failures and maintain sufficient SOL balance

## Testing

**Devnet Testing:**
1. Get devnet SOL from faucet
2. Deploy program to devnet
3. Test deposit flow
4. Test withdrawal queue
5. Test relayer processing
6. Verify Jupiter swaps (if implemented)
7. Check privacy (no on-chain link between addresses)

**Integration Tests:**
```bash
anchor test
```

## Known Issues / TODO

### Critical
- [x] **Wrapped ZEC address found** - `DS3C5XPbPLPypQuYyK1F22PGyHP8wRvZwt9DaMEd4vir` (Oct 16, 2025 launch)
- [ ] **Frontend `app/page.tsx`** - Skeleton created, needs full implementation with Anchor
- [ ] **Jupiter integration is placeholder** - needs full CPI implementation for SOL ↔ ZEC swaps

### Important
- [ ] Generate and import proper Anchor IDL (after build)
- [ ] Test Jupiter swaps on devnet with real ZEC token
- [x] Verify ZEC liquidity on Jupiter - $56.6M on Raydium, available on Jupiter
- [ ] Full E2E testing on devnet

### Nice to Have
- [ ] UI updates for Solana explorer links
- [ ] Better error handling for failed swaps
- [ ] Transaction monitoring dashboard
- [ ] Automated tests for Rust program

## Resources

- **Solana Docs**: https://docs.solana.com
- **Anchor Book**: https://book.anchor-lang.com
- **Jupiter Docs**: https://docs.jup.ag
- **Solana Cookbook**: https://solanacookbook.com
- **Zolana Bridge**: (Wrapped ZEC provider)
- **Conversion Summary**: See `CONVERSION_SUMMARY.md` for detailed migration notes

## Styling

- **Tailwind CSS**: All styling via utility classes
- **Color palette**: Solana-themed (can adjust)
  - Primary: Purple/Blue (Solana brand colors)
  - Consider updating from BNB gold theme
- **Wallet adapter theme**: Default dark theme (customizable)

## Contract Address Pattern

All program interactions use:
```typescript
const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PRIVACY_POOL_ADDRESS!);
```

Must be set in `.env` after deployment for frontend to work.

## Notes

- This is a conversion from BNB → Solana, some files may still reference BNB
- The commitment scheme (keccak256) is intentionally kept the same
- Using ZCASH routing is the key differentiator from simple mixers
- See `CONVERSION_SUMMARY.md` for complete migration details
