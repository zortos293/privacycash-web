'use client';

import { useState } from 'react';
import { Shield, ChevronRight, BookOpen, DollarSign, Activity } from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';

const documentation = {
  relayer: `# Relayer System

## What is the Relayer?

The relayer is an automated background service that processes privacy swaps for mert.cash. It monitors pending transactions and executes the multi-step privacy flow without any manual intervention.

## How It Works

### Continuous Monitoring

The relayer runs 24/7 and checks for new transactions every 15 seconds:
- Monitors the database for pending swaps
- Tracks the status of each transaction
- Processes transactions in the correct order
- Handles errors and retries automatically

### Transaction Processing Flow

#### Step 1: Waiting for Deposit
- User creates a swap and sends SOL
- Relayer monitors the Solana blockchain
- When deposit is detected, moves to next step

#### Step 2: HOP 1 (SOL → ZEC)
- Gets quote from NEAR Intents API
- Swaps SOL to ZEC via NEAR bridge
- ZEC deposited into NEAR mt-token pool
- Records transaction hash on-chain

#### Step 3: Privacy Delay
- Fixed 2.5 minute waiting period
- Breaks temporal correlation between deposits and withdrawals
- Makes timing analysis harder for blockchain analysts

#### Step 4: HOP 2 (ZEC → SOL)
- Transfers ZEC from mt-token balance to deposit address
- Gets quote from NEAR Intents API for reverse swap
- Swaps ZEC back to SOL
- Delivers SOL to recipient address

#### Step 5: Completion
- Marks transaction as completed
- Records all transaction hashes
- Updates database with final status

## Relayer Fees

### Why Fees are Needed

The relayer incurs costs for:
- Solana transaction fees (gas)
- NEAR transaction fees (gas)
- Server hosting costs
- Bandwidth and storage

### Fee Structure

- **Relayer Fee**: 0.001 SOL per transaction
- Covers all operational costs
- Ensures sustainable operation
- Separate from platform fee (0.25%)

## Monitoring & Logs

### Transaction Tracking

Every step is logged and tracked:
- Database records for all transactions
- Transaction hashes stored for verification
- Step-by-step progress updates
- Error logs for failed operations

### Real-Time Updates

Users can track their swaps:
- Visit \`/swap/[transaction-id]\`
- Auto-refreshes every 5 seconds
- Shows current step and status
- Links to blockchain explorers

## Error Handling

### Automatic Retries

If a transaction fails:
- Relayer retries up to 3 times
- Exponential backoff between retries
- Logs error details for debugging
- Updates transaction status to FAILED if all retries fail

### Common Errors

**Insufficient Balance**
- Relayer needs SOL and NEAR for gas
- Monitor balances regularly
- Auto-alerts when balance is low

**Network Issues**
- RPC endpoint failures
- NEAR Intents API downtime
- Blockchain congestion

**Quote Expiry**
- NEAR Intents quotes expire after 5 minutes
- Relayer gets fresh quotes automatically
- Ensures best exchange rates

## Performance

### Processing Speed

Average transaction times:
- HOP 1 (SOL → ZEC): ~30-60 seconds
- Privacy delay: 2.5 minutes (fixed)
- HOP 2 (ZEC → SOL): ~30-60 seconds
- **Total time**: ~5-10 minutes

### Throughput

The relayer can handle:
- Multiple transactions simultaneously
- Up to 100+ swaps per day
- Scales with infrastructure

## Maintenance

### Regular Tasks

**Daily**
- Monitor relayer uptime
- Check transaction success rate
- Review error logs

**Weekly**
- Update dependencies
- Backup database
- Review performance metrics

**Monthly**
- Security updates
- Infrastructure optimization
- Cost analysis

## Architecture

### Database Schema

Transactions table tracks:
- ID, status, amounts
- Deposit and recipient addresses
- Timestamps (created, completed)
- Fee calculations

Steps table records:
- Step name and status
- Metadata (tx hashes, amounts)
- Timestamps for each step

## Benefits

### For Users
- **Fully Automated** - No manual steps required
- **Fast Processing** - Completes in 5-10 minutes
- **Transparent** - Track every step in real-time
- **Reliable** - Automatic retries on failure

### For the Platform
- **Scalable** - Handles growing transaction volume
- **Maintainable** - Clean, documented code
- **Monitored** - Full logging and error tracking
- **Sustainable** - Fees cover operational costs

## Future Improvements

### Planned Features
- Multiple relayer instances for redundancy
- Advanced error recovery mechanisms
- Real-time notifications (Telegram/Discord)
- Analytics dashboard for operators
- Automated balance management

### Decentralization
Long-term goal: Decentralized relayer network
- Multiple independent operators
- Stake-based participation
- Automated failover
- Rewards for reliable operation
`,

  overview: `# mert.cash - Overview

**mert.cash** is a cross-chain privacy mixer for Solana that breaks on-chain transaction links by routing SOL through ZEC (Zcash) on NEAR Protocol. This creates an untraceable path between sender and recipient, providing true transaction privacy.

## How It Works

### The Three-Step Privacy Process

#### Step 1: Cross-Chain Swap (SOL → ZEC)
When you initiate a privacy swap:
1. You send SOL from your Solana wallet
2. Our automated relayer deposits SOL to NEAR Intents 1Click API
3. NEAR Intents swaps your SOL to ZEC (Zcash)
4. ZEC is deposited into NEAR's internal multi-token (mt-token) ledger

**Privacy Benefit:** The transaction is now on NEAR Protocol, completely separate from Solana's blockchain. No direct link exists between your Solana wallet and the ZEC pool.

#### Step 2: Privacy Pool (NEAR mt-token)
Your ZEC sits in NEAR's internal multi-token system:
- **Multi-Token Ledger**: NEAR Protocol's \`intents.near\` contract manages an internal balance sheet
- **Not On-Chain**: Your ZEC balance is stored in the contract's internal state, not as traditional on-chain tokens
- **Pooled Anonymity**: Multiple users' ZEC is stored in the same system, creating an anonymity pool
- **No Direct Link**: Your Solana address has no connection to this ZEC

**Privacy Benefit:** The ZEC pool breaks the transaction graph. Anyone analyzing the blockchain sees:
- Solana: Wallet A → Deposit Address (dead end)
- NEAR: ZEC in internal pool (no public link to Wallet A or B)
- Solana: Final recipient receives from NEAR bridge (no link to Wallet A)

#### Step 3: Final Delivery (ZEC → SOL)
After a 2.5-minute privacy delay:
1. Our relayer creates a new NEAR Intents swap quote
2. ZEC is transferred from your mt-token balance to a deposit address
3. NEAR Intents swaps ZEC back to SOL
4. SOL is delivered directly to your recipient's Solana address

**Privacy Benefit:** The recipient receives SOL with no traceable link to the original sender.

### Privacy Delay

A fixed **2.5-minute delay** is enforced between receiving ZEC and sending SOL. This breaks temporal correlation:
- Prevents timing analysis attacks
- Mixes your transaction with others in the time window
- Makes it harder to correlate input/output transactions

## Privacy Features

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

## Fee Structure

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

## Security Considerations

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

## Getting Started

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
`,

  tokenomics: `# $MEC Tokenomics

## Token Overview

**$MEC** is the native utility token of mert.cash, the cross-chain privacy mixer for Solana. The token captures value through a deflationary buyback and burn mechanism powered by platform fees.

## Revenue Model

### Fee Structure

mert.cash generates revenue through platform fees:

#### Platform Fee: 0.25%
- Charged on each privacy swap
- Applied to withdrawal amount
- Collected in SOL
- 100% used for $MEC buyback and burn

#### Relayer Fee: 0.001 SOL
- Fixed operational fee
- Covers blockchain transaction costs
- Not used for buyback (operational expenses)

## Buyback & Burn Mechanism

100% of platform fees collected are used to buyback $MEC tokens from the market and burn them permanently.

- Platform fees are collected in SOL
- Fees are used to buy $MEC from DEXes (Jupiter/Raydium)
- Bought tokens are sent to burn address: \`1nc1nerator11111111111111111111111111111111\`
- Tokens are permanently removed from circulation
- All burns are verifiable on-chain

## Value Accrual Model

### Supply-Demand Dynamics

#### Deflationary Pressure
As platform usage grows:
1. **More transactions** → More fees collected
2. **More fees** → More SOL for buybacks
3. **More buybacks** → Increased buy pressure
4. **More burns** → Reduced supply
5. **Supply ↓ + Demand ↑** → Price appreciation

#### Supply Reduction Formula
\`\`\`
Burned per day = (Daily volume × 0.0025) / $MEC price

Example:
Daily volume: 1,000 SOL
Fee collected: 1,000 × 0.0025 = 2.5 SOL
$MEC price: $0.10
Burned: 2.5 / 0.10 = 25 $MEC/day
Annual: 25 × 365 = 9,125 $MEC/year
\`\`\`

### Growth Scenarios

#### Scenario 1: Low Volume
\`\`\`
Daily volume: 100 SOL
Daily fees: 0.25 SOL
Annual fees: 91.25 SOL
At $MEC = $0.10: 912.5 $MEC burned/year
\`\`\`

#### Scenario 2: Medium Volume
\`\`\`
Daily volume: 1,000 SOL
Daily fees: 2.5 SOL
Annual fees: 912.5 SOL
At $MEC = $0.10: 9,125 $MEC burned/year
\`\`\`

#### Scenario 3: High Volume
\`\`\`
Daily volume: 10,000 SOL
Daily fees: 25 SOL
Annual fees: 9,125 SOL
At $MEC = $0.10: 91,250 $MEC burned/year
\`\`\`

#### Scenario 4: Massive Adoption
\`\`\`
Daily volume: 100,000 SOL
Daily fees: 250 SOL
Annual fees: 91,250 SOL
At $MEC = $0.10: 912,500 $MEC burned/year
\`\`\`

## Token Utility

### Current Utility

#### 1. Fee Discounts (Coming Soon)
Hold $MEC to reduce platform fees:
- **Tier 1**: Hold 1,000 $MEC → 10% fee discount
- **Tier 2**: Hold 10,000 $MEC → 25% fee discount
- **Tier 3**: Hold 100,000 $MEC → 50% fee discount
- **Tier 4**: Hold 1,000,000 $MEC → 75% fee discount

#### 2. Governance Rights (Coming Soon)
$MEC holders can vote on:
- Platform fee adjustments
- Buyback frequency and thresholds
- New feature implementations
- Treasury management
- Partnership proposals

#### 3. Revenue Sharing (Future)
Potential revenue sharing model:
- Staked $MEC earns yield from platform fees
- Proportional to stake size and lock duration
- Alternative to full buyback model

#### 4. Exclusive Features (Future)
Premium features for holders:
- Priority transaction processing
- Higher transaction limits
- Advanced privacy options
- API access for developers

## Investment Thesis

### Bull Case for $MEC

#### 1. Growing Privacy Demand
- Increasing blockchain surveillance
- Regulatory pressure on exchanges
- User desire for financial privacy
- Institutional privacy needs

#### 2. Deflationary Model
- Constant supply reduction
- No inflation risk
- Scarcity increases over time
- Mathematical price support

#### 3. Revenue-Backed
- Real platform revenue
- 100% goes to token
- Sustainable long-term
- Not dependent on hype

#### 4. First-Mover Advantage
- First Solana privacy mixer with token
- Proven technology
- Growing user base
- Network effects

### Risk Factors

#### Regulatory Risk
- Privacy tools face scrutiny
- Potential regulatory changes
- Compliance requirements

#### Competition Risk
- Other mixers may launch
- Better technology could emerge
- Price competition

#### Technical Risk
- Smart contract bugs
- Relayer downtime
- Bridge failures

#### Market Risk
- Crypto market volatility
- SOL price fluctuations
- Liquidity concerns
`,
};

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<'overview' | 'relayer' | 'tokenomics'>('overview');

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-full overflow-hidden">
                <img src="/mertcashlogo.png" alt="mert.cash logo" className="w-10 h-10 object-cover" />
              </div>
              <Link href="/" className="text-xl font-bold text-[#efb62f] hover:underline">
                mert.cash
              </Link>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <span className="text-gray-600">Documentation</span>
            </div>
            <Link
              href="/"
              className="px-4 py-2 text-gray-700 hover:text-[#efb62f] transition-colors font-medium"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 border-r border-gray-200 min-h-screen sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto">
          <nav className="p-4 space-y-2">
            <button
              onClick={() => setActiveSection('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeSection === 'overview'
                  ? 'bg-[#efb62f] text-black font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BookOpen className="h-5 w-5" />
              <span>Documentation</span>
            </button>

            <button
              onClick={() => setActiveSection('relayer')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeSection === 'relayer'
                  ? 'bg-[#efb62f] text-black font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Activity className="h-5 w-5" />
              <span>Relayer</span>
            </button>

            <button
              onClick={() => setActiveSection('tokenomics')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeSection === 'tokenomics'
                  ? 'bg-[#efb62f] text-black font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <DollarSign className="h-5 w-5" />
              <span>Tokenomics</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <article className="prose prose-lg max-w-none text-gray-800">
              <ReactMarkdown
                components={{
                  h1: ({ node, ...props }) => (
                    <h1 className="text-4xl font-bold mb-6 text-black mt-8" {...props} />
                  ),
                  h2: ({ node, ...props }) => (
                    <h2 className="text-3xl font-bold mt-8 mb-4 text-[#efb62f]" {...props} />
                  ),
                  h3: ({ node, ...props }) => (
                    <h3 className="text-2xl font-semibold mt-6 mb-3 text-black" {...props} />
                  ),
                  h4: ({ node, ...props }) => (
                    <h4 className="text-xl font-semibold mt-4 mb-2 text-gray-800" {...props} />
                  ),
                  p: ({ node, ...props }) => (
                    <p className="my-3 text-gray-700 leading-relaxed" {...props} />
                  ),
                  ul: ({ node, ...props }) => (
                    <ul className="list-disc ml-6 my-4 space-y-2" {...props} />
                  ),
                  ol: ({ node, ...props }) => (
                    <ol className="list-decimal ml-6 my-4 space-y-2" {...props} />
                  ),
                  li: ({ node, ...props }) => (
                    <li className="text-gray-700" {...props} />
                  ),
                  code: ({ node, inline, ...props }: any) =>
                    inline ? (
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm text-gray-800" {...props} />
                    ) : (
                      <code className="block bg-gray-100 p-4 rounded-lg my-4 overflow-x-auto text-sm" {...props} />
                    ),
                  pre: ({ node, ...props }) => (
                    <pre className="bg-gray-100 p-4 rounded-lg my-4 overflow-x-auto" {...props} />
                  ),
                  strong: ({ node, ...props }) => (
                    <strong className="font-bold text-gray-900" {...props} />
                  ),
                }}
              >
                {documentation[activeSection]}
              </ReactMarkdown>
            </article>
          </div>
        </main>
      </div>
    </div>
  );
}
