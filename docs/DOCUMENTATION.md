# mert.cash - Complete Documentation

## 🎯 Overview

**mert.cash** is a cross-chain privacy mixer for Solana that breaks on-chain transaction links by routing SOL through ZEC (Zcash) on NEAR Protocol. This creates an untraceable path between sender and recipient, providing true transaction privacy.

## 🔐 How It Works

### The Three-Step Privacy Process

#### Step 1: Cross-Chain Swap (SOL → ZEC)
When you initiate a privacy swap:
1. You send SOL from your Solana wallet
2. Our automated relayer deposits SOL to NEAR Intents 1Click API
3. NEAR Intents swaps your SOL to ZEC (Zcash)
4. ZEC is deposited into NEAR's internal multi-token (mt-token) ledger

**Technical Details:**
- Uses NEAR Intents 1Click API for seamless cross-chain swaps
- SOL is sent to a unique deposit address on Solana
- NEAR Intents handles the bridge and swap automatically
- ZEC is stored as `nep141:zec.omft.near` in the `intents.near` contract

**Privacy Benefit:**
The transaction is now on NEAR Protocol, completely separate from Solana's blockchain. No direct link exists between your Solana wallet and the ZEC pool.

#### Step 2: Privacy Pool (NEAR mt-token)
Your ZEC sits in NEAR's internal multi-token system:
- **Multi-Token Ledger**: NEAR Protocol's `intents.near` contract manages an internal balance sheet
- **Not On-Chain**: Your ZEC balance is stored in the contract's internal state, not as traditional on-chain tokens
- **Pooled Anonymity**: Multiple users' ZEC is stored in the same system, creating an anonymity pool
- **No Direct Link**: Your Solana address has no connection to this ZEC

**Technical Details:**
- Token ID: `nep141:zec.omft.near`
- Contract: `intents.near`
- Storage: Internal mt-token balance (not NEP-141 wallet balance)
- Verification: Check balance via `mt_batch_balance_of` function

**Privacy Benefit:**
The ZEC pool breaks the transaction graph. Anyone analyzing the blockchain sees:
- Solana: Wallet A → Deposit Address (dead end)
- NEAR: ZEC in internal pool (no public link to Wallet A or B)
- Solana: Final recipient receives from NEAR bridge (no link to Wallet A)

#### Step 3: Final Delivery (ZEC → SOL)
After a 2.5-minute privacy delay:
1. Our relayer creates a new NEAR Intents swap quote
2. ZEC is transferred from your mt-token balance to a deposit address
3. NEAR Intents swaps ZEC back to SOL
4. SOL is delivered directly to your recipient's Solana address

**Technical Details:**
- Automated by relayer service (runs on VPS)
- Uses `mt_transfer` to move ZEC from internal balance
- NEAR Intents handles the swap and bridge back to Solana
- Recipient receives SOL from NEAR bridge, not from original sender

**Privacy Benefit:**
The recipient receives SOL with no traceable link to the original sender. Blockchain analysis shows:
- Recipient received SOL from NEAR bridge
- No connection to the original sender's wallet

### Privacy Delay

A fixed **2.5-minute delay** is enforced between receiving ZEC and sending SOL. This breaks temporal correlation:
- Prevents timing analysis attacks
- Mixes your transaction with others in the time window
- Makes it harder to correlate input/output transactions

## 🛡️ Privacy Features

### 1. Cross-Chain Routing
- **Multiple Blockchains**: Solana → NEAR → Solana
- **Different Tokens**: SOL → ZEC → SOL
- **Separate Networks**: Transaction graphs are completely isolated

### 2. Internal Pooling
- ZEC stored in NEAR's internal ledger, not on-chain
- Multiple users share the same mt-token pool
- No public transaction history visible

### 3. Non-Custodial
- We never hold your funds
- Everything is automated via smart contracts
- Your ZEC is in NEAR's decentralized contract

### 4. Automated Processing
- Relayer handles all complex operations
- No manual intervention required
- Fast processing (typically 5-10 minutes total)

### 5. Full Transparency
- Track every step of your transaction
- View all transaction hashes
- Verify on blockchain explorers

## 💰 Fee Structure

### Platform Fee: 0.25% (25 basis points)
- Applied to withdrawal amount
- Calculated when swapping ZEC back to SOL
- Example: 0.1 SOL → ~0.0975 SOL received (after all fees)

### Relayer Fee: 0.001 SOL
- Fixed fee per transaction
- Covers Solana and NEAR transaction costs
- Ensures relayer sustainability

### NEAR Intents Fees
- **Swap Fees**: ~0.01-0.02% per swap (market rates)
- **Bridge Fees**: Built into swap quotes
- **Slippage**: 1% tolerance (100 basis points)

### Total Cost Example
Starting amount: 0.1 SOL
- HOP 1 (SOL → ZEC): ~0.0001 SOL swap fee
- Platform fee: 0.00025 SOL (0.25%)
- Relayer fee: 0.001 SOL
- HOP 2 (ZEC → SOL): ~0.0001 SOL swap fee
- **Net received**: ~0.097 SOL (97% of original)

## 🔥 Tokenomics: $MEC Token

### The $MEC Token
**$MEC** is the native token powering the mert.cash ecosystem. Token holders benefit from the platform's success through a deflationary buyback and burn mechanism.

### Revenue Model

#### Fee Collection
All platform fees (0.25% per transaction) are collected in SOL:
```
Transaction Volume → Platform Fees → Buyback Pool
```

#### Automatic Buyback & Burn
100% of collected fees are used for $MEC:
1. **Accumulation**: Fees accumulate in treasury wallet
2. **Buyback**: Automated bot buys $MEC from DEX (Jupiter/Raydium)
3. **Burn**: Bought tokens are sent to burn address permanently
4. **Deflationary**: Total supply decreases over time

### Tokenomics Breakdown

| Metric | Value |
|--------|-------|
| **Platform Fee** | 0.25% per transaction |
| **Fee Allocation** | 100% to buyback & burn |
| **Burn Frequency** | Automatic (threshold-based) |
| **Burn Address** | `1nc1nerator11111111111111111111111111111111` |

### Value Accrual
As transaction volume grows:
1. **More fees collected** → More SOL in treasury
2. **More buybacks** → Increased buy pressure on $MEC
3. **More burns** → Reduced circulating supply
4. **Supply/Demand** → Price appreciation potential

### Deflationary Pressure
Unlike inflationary tokens, $MEC supply constantly decreases:
- Every transaction reduces total supply
- No new tokens can be minted
- Scarcity increases over time
- Holders benefit from reduced dilution

### Example Calculation
Scenario: 1000 SOL daily volume
- Platform fees: 1000 × 0.0025 = 2.5 SOL/day
- Annual fees: 2.5 × 365 = 912.5 SOL/year
- All used for $MEC buyback and burn
- At $MEC price of $0.10: 9,125 $MEC burned/year
- At 10,000 SOL daily volume: 91,250 $MEC burned/year

## 🔧 Technical Architecture

### System Components

#### 1. Frontend (Next.js)
- **Location**: `app/page.tsx`
- User interface for initiating swaps
- Real-time transaction tracking
- Wallet connection (Solana wallet adapters)

#### 2. Relayer Service (Node.js/TypeScript)
- **Location**: `services/relayer-near-intents.ts`
- Automated background daemon
- Monitors deposits and processes swaps
- Runs 24/7 on VPS with PM2

#### 3. Database (PostgreSQL + Prisma)
- Stores transaction records
- Tracks swap progress
- Logs all steps and metadata

#### 4. External Services
- **NEAR Intents 1Click API**: Cross-chain swaps
- **Jupiter**: SOL/ZEC liquidity
- **NEAR Protocol**: ZEC multi-token pool
- **Solana RPC**: Transaction monitoring

### Transaction Flow (Technical)

```
User Wallet (Solana)
    ↓
Deposit Address (auto-generated)
    ↓
NEAR Intents API (/v0/quote)
    ↓
SOL → ZEC Swap (via Jupiter on NEAR)
    ↓
intents.near contract (mt-token storage)
    ↓
[2.5 min privacy delay]
    ↓
mt_transfer (ZEC to deposit address)
    ↓
NEAR Intents API (/v0/quote)
    ↓
ZEC → SOL Swap (via Jupiter on NEAR)
    ↓
Recipient Address (Solana)
```

### Smart Contracts

#### NEAR Intents Contract (`intents.near`)
- Manages multi-token balances
- Handles cross-chain swaps
- Coordinates with market makers
- Mainnet address: `intents.near`

#### ZEC Token Contract (`zec.omft.near`)
- Wrapped ZEC on NEAR
- NEP-141 compatible
- Bridged via Zolana/OmniBridge
- Mainnet address: `zec.omft.near`

## 📊 Transaction Tracking

Every swap gets a unique ID and dedicated tracking page:
```
https://mert.cash/swap/{transaction-id}
```

### Real-Time Updates
- Auto-refreshes every 5 seconds
- Shows current step and status
- Displays transaction hashes
- Links to blockchain explorers

### Transaction Steps Displayed
1. **Waiting for deposit** - Awaiting your SOL
2. **HOP 1: SOL → ZEC** - Cross-chain swap initiated
3. **Privacy delay** - 2.5 minute waiting period
4. **HOP 2: ZEC → SOL** - Final swap to recipient
5. **Completed** - SOL delivered to recipient

### Explorer Links
- **Solana**: Solscan.io
- **NEAR**: NEARBlocks.io
- **Transaction hashes**: Click to view on-chain

## 🔒 Security Considerations

### Smart Contract Security
- Uses audited NEAR Protocol contracts
- NEAR Intents is battle-tested
- No custom smart contracts (reduces risk)

### Relayer Security
- Private keys stored encrypted
- Runs on secure VPS
- Monitored 24/7
- Rate limiting and error handling

### User Security
- Non-custodial (we never hold funds)
- No account creation required
- No KYC or personal information
- Connect wallet only, no private keys shared

### Privacy Limitations
- **On-Chain Data**: All blockchain data is public
- **Timing Analysis**: Large amounts may be correlatable
- **Volume**: Low volume reduces anonymity set
- **IP Addresses**: Use VPN for additional privacy
- **Wallet Analysis**: Reuse addresses can reduce privacy

### Best Practices
1. Use fresh recipient addresses
2. Vary transaction amounts
3. Don't mix immediately after receiving
4. Use VPN or Tor for web access
5. Consider multiple small transactions vs one large

## 🚀 Getting Started

### For Users

1. **Visit mert.cash**
2. **Connect Solana Wallet**
   - Phantom, Solflare, or any Solana wallet
3. **Enter Details**
   - Amount to mix (SOL)
   - Recipient Solana address
4. **Start Private Swap**
   - Approve transaction in wallet
5. **Track Progress**
   - Automatically redirected to tracking page
   - Bookmark the URL for later reference
6. **Receive SOL**
   - Wait ~5-10 minutes for completion
   - SOL delivered to recipient address

### For Developers

#### Run Relayer
```bash
# Install dependencies
bun install

# Configure environment
cp .env.example .env
# Set NEAR_ACCOUNT and NEAR_PRIVATE_KEY

# Register with ZEC contract (one-time)
bun run check-balance

# Start relayer
bun run relayer:near

# Or use PM2 for production
pm2 start "bun run relayer:near" --name mert-cash-relayer
pm2 save
pm2 startup
```

#### Check Balances
```bash
# Check mt-token ZEC balance
bun run check-balance

# Check database
bun run check-db

# View transaction history
bun run view-transactions
```

## 🛠️ Configuration

### Environment Variables
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/mertcash

# Solana
NEXT_PUBLIC_SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=xxx

# NEAR
NEAR_NETWORK=mainnet
NEAR_ACCOUNT=your-account.near
NEAR_PRIVATE_KEY=ed25519:YourPrivateKeyHere

# NEAR Intents
NEAR_INTENTS_API_URL=https://1click.chaindefuser.com
NEAR_INTENTS_JWT=optional_jwt_token

# App
NEXT_PUBLIC_APP_URL=https://mert.cash
```

### Relayer Configuration
- **Polling Interval**: 15 seconds
- **Privacy Delay**: 2.5 minutes (150 seconds)
- **Slippage Tolerance**: 1% (100 basis points)
- **Max Retries**: 3 attempts per transaction

## 📈 Roadmap

### Phase 1: Core Functionality ✅
- [x] Cross-chain mixer implementation
- [x] NEAR Intents integration
- [x] Automated relayer service
- [x] Transaction tracking UI
- [x] $MEC tokenomics

### Phase 2: Enhancement 🚧
- [ ] Multi-amount support
- [ ] Batch transactions
- [ ] Mobile app
- [ ] Additional chains (Ethereum, BSC)
- [ ] Governance features for $MEC holders

### Phase 3: Advanced Features 🔮
- [ ] zk-SNARK implementation
- [ ] Decentralized relayer network
- [ ] Cross-chain token mixing
- [ ] Privacy pools for specific tokens
- [ ] DAO governance

## 💡 FAQ

**Q: Is mert.cash truly anonymous?**
A: While we break the direct on-chain link, complete anonymity depends on many factors. Use best practices and understand the limitations.

**Q: How long does a mix take?**
A: Typically 5-10 minutes total, including the 2.5-minute privacy delay.

**Q: What if something goes wrong?**
A: All transactions are tracked and reversible via refund. Contact support with your transaction ID.

**Q: Can I mix any amount?**
A: Minimum 0.01 SOL, no maximum limit. Larger amounts may take longer due to liquidity.

**Q: Is it legal?**
A: Privacy is not a crime. However, check your local laws and regulations.

**Q: How is $MEC burned?**
A: Automated smart contract sends bought tokens to Solana's burn address (incinerator).

**Q: When do buybacks happen?**
A: Automatically when fee accumulation reaches threshold (typically daily).

**Q: Can I see burn history?**
A: Yes, all burns are on-chain and viewable on Solscan.

## 📞 Support

- **Website**: https://mert.cash
- **Documentation**: https://mert.cash/docs
- **Twitter**: @mertcash
- **Telegram**: t.me/mertcash

## ⚠️ Disclaimer

mert.cash is provided "as is" without warranties. Users are responsible for:
- Understanding risks involved
- Complying with local laws
- Securing their wallets
- Verifying recipient addresses

Privacy tools can be misused. We do not condone illegal activity.

---

**Built with ❤️ by the mert.cash team**

*Untraceable transactions powered by $MEC*
