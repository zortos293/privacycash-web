# $MEC Tokenomics - Complete Guide

## 🪙 Token Overview

**$MEC** is the native utility token of mert.cash, the cross-chain privacy mixer for Solana. The token captures value through a deflationary buyback and burn mechanism powered by platform fees.

## 📊 Token Fundamentals

| Property | Details |
|----------|---------|
| **Token Name** | MEC Token |
| **Symbol** | $MEC |
| **Blockchain** | Solana (SPL Token) |
| **Total Supply** | Fixed (deflationary) |
| **Decimals** | 9 |
| **Token Type** | Utility + Value Accrual |

## 💰 Revenue Model

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

### Fee Examples

**Example 1: 0.1 SOL Swap**
```
Input: 0.100 SOL
Platform fee (0.25%): 0.00025 SOL
Relayer fee: 0.001 SOL
Swap fees: ~0.0002 SOL
Net output: ~0.0975 SOL

Fee to buyback: 0.00025 SOL
```

**Example 2: 1.0 SOL Swap**
```
Input: 1.000 SOL
Platform fee (0.25%): 0.0025 SOL
Relayer fee: 0.001 SOL
Swap fees: ~0.002 SOL
Net output: ~0.9745 SOL

Fee to buyback: 0.0025 SOL
```

**Example 3: 10.0 SOL Swap**
```
Input: 10.000 SOL
Platform fee (0.25%): 0.025 SOL
Relayer fee: 0.001 SOL
Swap fees: ~0.020 SOL
Net output: ~9.754 SOL

Fee to buyback: 0.025 SOL
```

## 🔥 Buyback & Burn Mechanism

### How It Works

#### Phase 1: Fee Accumulation
- Platform fees collected in SOL
- Stored in secure treasury wallet
- Accumulated until buyback threshold reached

#### Phase 2: Automated Buyback
- Bot monitors treasury balance
- When threshold hit (e.g., 10 SOL), buyback triggers
- Bot buys $MEC from Jupiter/Raydium DEX
- Uses optimal routing for best price
- Slippage protection: 2%

#### Phase 3: Permanent Burn
- Bought $MEC sent to Solana burn address
- Address: `1nc1nerator11111111111111111111111111111111`
- Tokens permanently removed from circulation
- Burn transaction publicly verifiable

#### Phase 4: Transparency
- All burns recorded on-chain
- Public dashboard shows burn history
- Real-time burn statistics
- Total burned always visible

### Buyback Frequency

Buybacks occur automatically based on:
- **Threshold-Based**: Every X SOL accumulated
- **Time-Based**: Minimum once per week
- **Volume-Based**: Proportional to transaction volume

Example thresholds:
- Low volume: 10 SOL = 1 buyback
- Medium volume: 25 SOL = 1 buyback
- High volume: 50 SOL = 1 buyback

## 📈 Value Accrual Model

### Supply-Demand Dynamics

#### Deflationary Pressure
As platform usage grows:
1. **More transactions** → More fees collected
2. **More fees** → More SOL for buybacks
3. **More buybacks** → Increased buy pressure
4. **More burns** → Reduced supply
5. **Supply ↓ + Demand ↑** → Price appreciation

#### Supply Reduction Formula
```
Burned per day = (Daily volume × 0.0025) / $MEC price

Example:
Daily volume: 1,000 SOL
Fee collected: 1,000 × 0.0025 = 2.5 SOL
$MEC price: $0.10
Burned: 2.5 / 0.10 = 25 $MEC/day
Annual: 25 × 365 = 9,125 $MEC/year
```

### Growth Scenarios

#### Scenario 1: Low Volume
```
Daily volume: 100 SOL
Daily fees: 0.25 SOL
Annual fees: 91.25 SOL
At $MEC = $0.10: 912.5 $MEC burned/year
```

#### Scenario 2: Medium Volume
```
Daily volume: 1,000 SOL
Daily fees: 2.5 SOL
Annual fees: 912.5 SOL
At $MEC = $0.10: 9,125 $MEC burned/year
```

#### Scenario 3: High Volume
```
Daily volume: 10,000 SOL
Daily fees: 25 SOL
Annual fees: 9,125 SOL
At $MEC = $0.10: 91,250 $MEC burned/year
```

#### Scenario 4: Massive Adoption
```
Daily volume: 100,000 SOL
Daily fees: 250 SOL
Annual fees: 91,250 SOL
At $MEC = $0.10: 912,500 $MEC burned/year
```

## 💎 Token Utility

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

### Long-Term Vision

The $MEC token will evolve into:
- **Governance Token**: Community-driven platform
- **Staking Rewards**: Earn from platform success
- **Collateral**: Use in DeFi protocols
- **Cross-Platform**: Expand beyond mert.cash

## 📊 Token Metrics

### Supply Dynamics

```
Initial Supply: TBD
Current Supply: Decreasing (burns)
Burned to Date: Track on-chain
Circulating Supply: Initial - Burned
Max Supply: Fixed (no inflation)
```

### Distribution (Example)

| Allocation | Percentage | Tokens | Vesting |
|------------|-----------|--------|---------|
| Public Sale | 40% | TBD | Immediate |
| Liquidity Pool | 20% | TBD | Immediate |
| Team | 15% | TBD | 12-month cliff, 24-month vest |
| Treasury | 15% | TBD | Used for development |
| Marketing | 10% | TBD | 12-month vest |

### Burn Schedule (Projected)

| Year | Est. Volume | Est. Fees | Est. Burned | Cumulative Burned |
|------|------------|-----------|-------------|-------------------|
| Year 1 | 100K SOL | 250 SOL | 2,500 $MEC | 2,500 $MEC |
| Year 2 | 500K SOL | 1,250 SOL | 12,500 $MEC | 15,000 $MEC |
| Year 3 | 2M SOL | 5,000 SOL | 50,000 $MEC | 65,000 $MEC |
| Year 5 | 10M SOL | 25,000 SOL | 250,000 $MEC | 500,000 $MEC |

*Assumes $MEC price of $0.10 and linear growth*

## 🎯 Comparison with Competitors

### Traditional Mixers

| Feature | mert.cash | Tornado Cash | Other Mixers |
|---------|-----------|--------------|--------------|
| **Blockchain** | Solana | Ethereum | Various |
| **Privacy Method** | Cross-chain | zk-SNARKs | Pool-based |
| **Token** | $MEC (deflationary) | TORN (governance) | None |
| **Value Accrual** | Buyback & Burn | Staking only | N/A |
| **Fees** | 0.25% | 0.3% | 0.5-3% |
| **Speed** | 5-10 min | 15+ min | Varies |

### Why $MEC is Better

1. **Deflationary**: Supply decreases, not dilutes
2. **Direct Value**: 100% fees → buyback
3. **Transparent**: All burns visible on-chain
4. **Sustainable**: Fee revenue funds development
5. **Community-Driven**: Future governance

## 🔮 Future Enhancements

### Q1 2025
- [ ] Fee discount tiers implementation
- [ ] $MEC holder dashboard
- [ ] Burn analytics and charts
- [ ] Volume leaderboard

### Q2 2025
- [ ] Governance portal launch
- [ ] Staking mechanism
- [ ] Revenue sharing model
- [ ] DAO formation

### Q3 2025
- [ ] Cross-chain expansion
- [ ] Additional token mixing
- [ ] NFT privacy features
- [ ] Mobile app with $MEC integration

### Q4 2025
- [ ] Decentralized relayer network
- [ ] Advanced privacy features
- [ ] Institutional features
- [ ] $MEC utility expansion

## 📈 Investment Thesis

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

#### 5. Utility Expansion
- Fee discounts drive holding
- Governance gives influence
- Staking provides yield
- Multi-faceted value

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

## 💼 Token Holder Benefits

### Short-Term (0-6 months)
1. **Buy Pressure**: Constant buybacks support price
2. **Deflationary**: Supply decreases daily
3. **Speculative Value**: Early adopter advantage
4. **Listing Gains**: Exchange listings drive demand

### Medium-Term (6-18 months)
1. **Fee Discounts**: Reduce mixer costs
2. **Governance Rights**: Shape platform future
3. **Growing Utility**: More use cases added
4. **Network Effects**: More users = more value

### Long-Term (18+ months)
1. **Staking Rewards**: Earn from platform revenue
2. **DAO Participation**: Community ownership
3. **Cross-Platform**: Use beyond mert.cash
4. **Ecosystem Value**: Part of privacy infrastructure

## 🎓 How to Acquire $MEC

### Methods

#### 1. DEX Trading
- **Jupiter**: Best liquidity and routing
- **Raydium**: Direct SOL/$MEC pool
- **Orca**: Alternative liquidity

#### 2. Liquidity Provision
- Provide SOL/$MEC liquidity
- Earn trading fees
- Support token health

#### 3. Community Rewards
- Early user incentives
- Referral program
- Bug bounties
- Community contributions

### Where to Store

- **Phantom Wallet**: Most popular
- **Solflare**: Feature-rich
- **Ledger**: Hardware security
- **Any SPL wallet**: Compatible

## 📱 Tracking Your $MEC

### Portfolio Tools
- **Solscan**: Transaction history
- **Step Finance**: Portfolio tracking
- **Jupiter**: Price charts
- **Birdeye**: Advanced analytics

### Burn Tracking
- **mert.cash/burns**: Official dashboard
- **Solscan (burn address)**: On-chain verification
- **Twitter**: Regular burn announcements

## 🤝 Community

### Get Involved
- **Hold**: Support the ecosystem
- **Use**: Mix SOL through mert.cash
- **Provide Liquidity**: Earn fees
- **Govern**: Vote on proposals
- **Spread**: Share with others

### Social Channels
- **Twitter**: @mertcash
- **Telegram**: t.me/mertcash
- **Discord**: discord.gg/mertcash
- **Medium**: medium.com/mertcash

## 📜 Legal & Compliance

### Token Classification
$MEC is a **utility token**:
- Used for platform services
- Governance rights
- Fee discounts
- Not a security

### Compliance
- KYC not required for token holders
- Platform complies with applicable laws
- No investment advice provided
- DYOR (Do Your Own Research)

## ⚠️ Disclaimer

This document is for informational purposes only. It does not constitute:
- Financial advice
- Investment recommendation
- Legal opinion
- Tax guidance

Cryptocurrency investments carry risk. Only invest what you can afford to lose. Past performance does not guarantee future results.

---

**$MEC: Powering Privacy on Solana**

*Deflationary. Value-Accruing. Community-Driven.*

📈 Track burns: https://mert.cash/burns
📖 Full docs: https://mert.cash/docs
🌐 Website: https://mert.cash
