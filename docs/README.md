# AnonBNB Documentation

**Official documentation for AnonBNB - Privacy Mixer for BNB Smart Chain**

**Last Updated:** 30 October 2025

---

## 📚 Welcome

This repository contains comprehensive user documentation for [AnonBNB](https://anonbnb.fun), a privacy-preserving cryptocurrency mixer that enables fully anonymous BNB transfers on the BNB Smart Chain.

AnonBNB breaks on-chain links between depositors and recipients using cryptographic commitments, Merkle tree proofs, and an automated relayer system.

---

## 📖 Available Documentation

### [HOW-IT-WORKS.md](./HOW-IT-WORKS.md)
**Complete User Guide** (~1,200 lines)

The ultimate guide for AnonBNB users covering:
- ✅ What is AnonBNB and how it provides privacy
- ✅ Getting started with wallet setup
- ✅ Step-by-step deposit guide
- ✅ Step-by-step withdrawal guide
- ✅ Understanding privacy mechanisms (anonymity sets, time delays, relayer system)
- ✅ Complete fee breakdown with examples
- ✅ Security best practices
- ✅ Transaction history explained
- ✅ Troubleshooting common issues
- ✅ 30+ FAQ questions

**Target Audience:** End users, first-time users, anyone wanting to understand the platform

**Start here if:** You want to learn how to use AnonBNB safely and effectively

---

### [FAQ.md](./FAQ.md)
**Quick Reference** (~350 lines)

Fast answers to frequently asked questions, organized by category:
- Getting Started (7 Q&A)
- Deposits (5 Q&A)
- Withdrawals (5 Q&A)
- Privacy (4 Q&A)
- Fees (4 Q&A)
- Security (5 Q&A)
- Technical (4 Q&A)
- Troubleshooting (4 Q&A)
- Use Cases (3 Q&A)
- Legal (3 Q&A)
- Best Practices

**Target Audience:** Users looking for quick answers

**Start here if:** You have a specific question and need a fast answer

---

## 🔗 Related Documentation

### Technical Documentation

For developers, smart contract documentation, and integration guides, see the **contract documentation repository**:

📦 **[AnonBNB Smart Contract Docs](https://gitlab.com/AnonBNB/AnonBNB-contract)**

Contains:
- Smart contract architecture
- Integration guide (TypeScript + Viem)
- Technical specifications
- Deployment guide
- API reference
- Security analysis

---

## 🚀 Quick Links

### Website & Platform
- **Website:** [anonbnb.fun](https://anonbnb.fun)
- **App:** [anonbnb.fun](https://anonbnb.fun) (use the main interface)

### Community & Support
- **X (Twitter):** [@anonbnb_fun](https://x.com/anonbnb_fun) - Announcements and updates
- **Telegram:** [t.me/anonbnbfun](https://t.me/anonbnbfun) - Community support and discussion

### Development
- **Smart Contracts:** [gitlab.com/AnonBNB/AnonBNB-contract](https://gitlab.com/AnonBNB/AnonBNB-contract)
- **Documentation:** [gitlab.com/AnonBNB/AnonBNB-docs](https://gitlab.com/AnonBNB/AnonBNB-docs) (this repository)
- **Issues:** Report bugs and request features on GitLab

---

## 📋 Documentation Structure

```
docs/
├── README.md              # This file - Documentation overview
├── HOW-IT-WORKS.md       # Complete user guide (start here!)
└── FAQ.md                # Quick reference Q&A
```

---

## 🎯 What is AnonBNB?

### The Problem

Every blockchain transaction is public. Anyone can trace:
- Who sent funds → Who received funds
- Amounts transferred
- Transaction timing
- Wallet balances

This creates a **complete transparent financial history**.

### The Solution

AnonBNB breaks the on-chain link between sender and receiver:

```
Without AnonBNB:
Your Wallet ──────────────────→ Recipient Wallet
           (100% traceable)

With AnonBNB:
Your Wallet → [Privacy Pool] → Relayer → Recipient Wallet
           (untraceable connection)
```

### How It Works (30-Second Version)

1. **Deposit:** You deposit BNB with a secret cryptographic commitment
2. **Pool:** Your BNB mixes with other users' funds in a smart contract
3. **Prove:** You prove you deposited without revealing which deposit is yours
4. **Withdraw:** Automated relayer sends BNB to your chosen recipient
5. **Result:** No one can link your deposit to the withdrawal!

### Key Features

- 🔒 **Cryptographic Privacy** - Commitment-based zero-knowledge proofs
- 🌳 **Merkle Tree Proofs** - Efficient O(log n) verification
- ⏰ **Time Delays** - Configurable delays (0-24 hours) break timing correlation
- 🤖 **Automated Relayer** - Third-party processes withdrawals for privacy
- 💰 **Low Fees** - 0.25% platform fee + 0.001 BNB relayer fee
- 🔓 **Open Source** - Fully auditable smart contracts
- 🚫 **Non-Custodial** - You control your funds with your secrets

---

## 💰 Fee Structure

AnonBNB has transparent, minimal fees:

### Platform Fee: **0.25%**
- Calculated on withdrawal amount
- Goes to protocol development and maintenance
- Fixed in smart contract (cannot change)

### Relayer Fee: **0.001 BNB**
- Fixed fee per withdrawal
- Compensates relayer for gas costs and 24/7 operation
- Adjustable (max 0.01 BNB)

### Gas Fees: **~$0.35 total**
- Paid to BSC network (not to AnonBNB)
- Deposit: ~$0.15
- Queue withdrawal: ~$0.20

### Example: Withdraw 0.1 BNB

```
Withdrawal amount:    0.1 BNB
Platform fee (0.25%): 0.00025 BNB
Relayer fee:          0.001 BNB
─────────────────────────────────
Total fees:           0.00125 BNB
You receive:          0.09875 BNB (98.75%)
```

---

## 🛡️ Security & Privacy

### Privacy Mechanisms

**1. Anonymity Set**
- Your privacy = 1/N where N = pool size
- 100 deposits → 1% identification probability
- 1,000 deposits → 0.1% identification probability

**2. Cryptographic Commitments**
```
commitment = keccak256(nullifier, secret) % FIELD_SIZE
```
- Cryptographically hiding
- Computationally binding
- Cannot be linked to withdrawals without secrets

**3. Relayer System**
- Third-party processes your withdrawal
- Sends from relayer wallet (not yours)
- Breaks direct transaction link

**4. Time Delays**
- Optional delays: 0 min to 24 hours
- Longer delays = More transactions in between
- Breaks timing correlation

### Security Features

- ✅ **ReentrancyGuard** - Protection against reentrancy attacks
- ✅ **OpenZeppelin Contracts** - Battle-tested security libraries
- ✅ **Input Validation** - All parameters validated on-chain
- ✅ **Emergency Pause** - Owner can pause in case of emergency
- ✅ **Nullifier Tracking** - Prevents double-spending
- ✅ **Non-Custodial** - Only you control your funds

---

## 🚦 Getting Started (Quick Start)

### 1. Prerequisites

- Web3 wallet (MetaMask, Trust Wallet, etc.)
- BNB on BNB Smart Chain
- Minimum 0.01 BNB to start

### 2. Basic Flow

**Deposit:**
1. Go to [anonbnb.fun](https://anonbnb.fun)
2. Connect wallet
3. Enter amount (min 0.01 BNB)
4. Click "Deposit into Pool"
5. Your credentials are automatically saved in browser

**Withdraw:**
1. Go to "Send Privately" tab
2. Select your deposit
3. Enter recipient address (use different address!)
4. Choose delay (30+ minutes recommended)
5. Click "Send Privately"
6. Wait for processing

### 3. Read the Guide

For detailed instructions, security practices, and troubleshooting:

👉 **[Read HOW-IT-WORKS.md](./HOW-IT-WORKS.md)**

---

## ⚠️ Important Warnings

### Backup Your Credentials

Your deposit secrets are stored **only in your browser**.

❌ **If you clear browser data → You lose access to your funds**

✅ **Always backup your credentials to encrypted storage**

### Use Different Addresses

❌ **Never withdraw to the same address you deposited from**

This defeats the purpose and exposes you!

✅ **Always use a fresh recipient address**

### Test First

❌ **Don't start with large amounts**

✅ **Test with 0.01-0.05 BNB first**

### Legal Compliance

Privacy is legal, but:
- ❌ Don't use for illegal activities
- ✅ Comply with your local regulations
- ✅ Understand your legal responsibilities

---

## 📊 Use Cases

### ✅ Legitimate Use Cases

**Personal Privacy:**
- Send gifts without revealing your balance
- Separate public and private wallets
- Protect financial history from stalkers/doxxers

**Business Privacy:**
- Private supplier payments
- Protect business transaction patterns
- Confidential payroll

**General:**
- Break transaction history for privacy
- Prevent front-running attacks
- Enhance overall financial privacy

### ❌ Prohibited Uses

- Money laundering
- Tax evasion
- Funding illegal activities
- Anything against local laws

**Note:** AnonBNB is a tool for privacy, like cash. Users are responsible for legal use.

---

## 🤝 Contributing

### Found an Error?

Documentation can always be improved! If you find:
- Typos or grammar issues
- Outdated information
- Unclear explanations
- Missing information

Please:
1. Open an issue on [GitLab](https://gitlab.com/AnonBNB/AnonBNB-docs/issues)
2. Submit a merge request with fixes
3. Discuss in [Telegram](https://t.me/anonbnbfun)

### Contribution Guidelines

1. **Clarity First** - Write for users, not experts
2. **Accuracy** - Verify all technical details
3. **Examples** - Include real-world examples
4. **Safety** - Emphasize security best practices
5. **Up-to-date** - Update the "Last Updated" date

---

## 📞 Support

### Need Help?

**Community Support (Fastest):**
- Telegram: [t.me/anonbnbfun](https://t.me/anonbnbfun)

**Official Channels:**
- X (Twitter): [@anonbnb_fun](https://x.com/anonbnb_fun)
- GitLab Issues: [Report bugs](https://gitlab.com/AnonBNB/AnonBNB-docs/issues)

**Documentation:**
- User Guide: [HOW-IT-WORKS.md](./HOW-IT-WORKS.md)
- Quick Answers: [FAQ.md](./FAQ.md)
- Technical Docs: [Smart Contract Docs](https://gitlab.com/AnonBNB/AnonBNB-contract)

---

## 📜 License

This documentation is licensed under [MIT License](../LICENSE).

The AnonBNB smart contracts are also open source under MIT License.

---

## 🔗 Official Links

### Main Project
- **Website:** https://anonbnb.fun
- **Smart Contracts:** https://gitlab.com/AnonBNB/AnonBNB-contract
- **Documentation:** https://gitlab.com/AnonBNB/AnonBNB-docs (this repo)

### Social
- **X (Twitter):** https://x.com/anonbnb_fun
- **Telegram:** https://t.me/anonbnbfun

### Blockchain
- **Network:** BNB Smart Chain (BSC)
- **Chain ID:** 56 (mainnet) / 97 (testnet)
- **Explorer:** https://bscscan.com

---

## 📈 Documentation Statistics

- **Total Pages:** 2 main documents
- **Total Lines:** ~1,500+ lines
- **Topics Covered:** 50+ major topics
- **FAQ Answers:** 40+ questions answered
- **Last Update:** 30 October 2025
- **Language:** English
- **Format:** Markdown

---

## 🎓 Learn More

### For Users
1. Start with [HOW-IT-WORKS.md](./HOW-IT-WORKS.md)
2. Reference [FAQ.md](./FAQ.md) for quick answers
3. Join [Telegram](https://t.me/anonbnbfun) for community support

### For Developers
1. Read the [Smart Contract Documentation](https://gitlab.com/AnonBNB/AnonBNB-contract)
2. Review the Integration Guide
3. Check out the Technical Specifications

### For Researchers
1. Study the cryptographic mechanisms in HOW-IT-WORKS.md
2. Review the smart contract code on GitLab
3. Analyze the security model in Technical Specs

---

## 💬 Feedback

We value your feedback! Help us improve the documentation:

- 📧 Questions? Ask in [Telegram](https://t.me/anonbnbfun)
- 🐛 Found a bug? [Report it](https://gitlab.com/AnonBNB/AnonBNB-docs/issues)
- 💡 Suggestion? Open a discussion on GitLab
- 🌟 Like AnonBNB? Star us on GitLab!

---

**Thank you for using AnonBNB! Stay private, stay safe.** 🛡️

---

**Last Updated:** 30 October 2025

**Repository:** [gitlab.com/AnonBNB/AnonBNB-docs](https://gitlab.com/AnonBNB/AnonBNB-docs)

**Website:** [anonbnb.fun](https://anonbnb.fun)
