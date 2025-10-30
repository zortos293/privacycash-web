# How AnonBNB Works - Complete User Guide

**Last Updated:** 30 October 2025

## Welcome to AnonBNB

AnonBNB is a privacy mixer for BNB on the BNB Smart Chain. It allows you to send BNB anonymously by breaking the on-chain link between sender and recipient addresses.

**What does this mean?** When you use AnonBNB, observers cannot trace which deposit corresponds to which withdrawal, giving you financial privacy.

---

## Table of Contents

1. [Quick Overview](#quick-overview)
2. [Getting Started](#getting-started)
3. [Using the Website](#using-the-website)
4. [How to Deposit](#how-to-deposit)
5. [How to Withdraw](#how-to-withdraw)
6. [Understanding Privacy](#understanding-privacy)
7. [Fees and Costs](#fees-and-costs)
8. [Security Best Practices](#security-best-practices)
9. [Transaction History](#transaction-history)
10. [Troubleshooting](#troubleshooting)
11. [FAQ](#faq)

---

## Quick Overview

### The Problem

Every blockchain transaction is public. Anyone can see:
- Who sent money
- Who received money
- How much was sent
- When it was sent

This means your financial activity is completely transparent.

### The Solution

AnonBNB breaks the link between your deposit address and withdrawal address using:

1. **Privacy Pool** - Your BNB mixes with other users' funds
2. **Cryptographic Proofs** - Prove you deposited without revealing which deposit is yours
3. **Relayer Service** - Third-party processes withdrawals so observers can't link transactions
4. **Time Delays** - Optional delays break timing correlations

### How It Works (Simple Version)

```
Step 1: You deposit BNB with a secret code
        ↓
Step 2: Your BNB goes into the privacy pool
        ↓
Step 3: You prove you deposited (without revealing which deposit)
        ↓
Step 4: Our relayer sends BNB to your chosen recipient
        ↓
Result: No one can link your deposit to the withdrawal!
```

---

## Getting Started

### What You Need

1. **Web3 Wallet** - MetaMask, Trust Wallet, or any WalletConnect-compatible wallet
2. **BNB on BSC** - For deposits and gas fees
3. **BSC Network** - Make sure your wallet is on BNB Smart Chain

### Network Setup

**BNB Smart Chain (Mainnet)**
- Network Name: BNB Smart Chain
- RPC URL: https://bsc-dataseed1.binance.org/
- Chain ID: 56
- Currency Symbol: BNB
- Block Explorer: https://bscscan.com

**BNB Smart Chain Testnet** (for testing)
- Network Name: BSC Testnet
- RPC URL: https://data-seed-prebsc-1-s1.binance.org:8545/
- Chain ID: 97
- Currency Symbol: BNB
- Block Explorer: https://testnet.bscscan.com

### First Time Setup

1. Visit [anonbnb.fun](https://anonbnb.fun)
2. Click "Connect Wallet"
3. Select your wallet provider
4. Approve the connection
5. Make sure you're on BSC network

---

## Using the Website

### Main Interface

The AnonBNB website has a clean, dark interface with three main tabs:

#### 1. **Deposit Tab** (Default)
- Deposit BNB into the privacy pool
- Generates your secret credentials automatically
- Shows pool statistics

#### 2. **Send Privately Tab**
- Queue withdrawals to any address
- Set privacy delay (instant to 24 hours)
- Prove ownership of your deposit

#### 3. **Transaction History Tab**
- View your deposit history
- Check withdrawal status
- Refresh to see updates

### Pool Statistics (Top Right)

Real-time stats displayed on every tab:
- **Total Deposits** - Total BNB deposited in pool
- **Total Withdrawals** - Total BNB withdrawn
- **Active Deposits** - Number of deposits available
- **Pool Balance** - Current BNB in contract

### Footer Links

- **X (formerly Twitter)** - [@anonbnb_fun](https://x.com/anonbnb_fun)
- **Telegram** - [t.me/anonbnbfun](https://t.me/anonbnbfun)
- **Docs** - Technical documentation
- **GitLab** - Open source smart contracts

---

## How to Deposit

Depositing BNB into the privacy pool is simple and takes about 30-60 seconds.

### Step-by-Step Deposit Guide

**Step 1: Go to Deposit Tab**
- Make sure "Deposit" tab is selected (it's the default)
- You'll see your wallet balance at the top

**Step 2: Enter Amount**
- Minimum: **0.01 BNB**
- No maximum (but start small for testing)
- Type the amount in the input field

**Step 3: Click "Deposit into Pool"**
- Review the transaction in your wallet
- You'll need to pay a small gas fee (~$0.15)
- Confirm the transaction

**Step 4: Wait for Confirmation**
- The button will show "Depositing..."
- Wait for blockchain confirmation (~10-15 seconds)
- You'll see a success message when complete

**Step 5: Your Deposit is Saved**
- Your secret credentials are automatically saved in your browser
- You'll see a success toast notification
- Pool stats will update to reflect your deposit

### What Happens Behind the Scenes

When you deposit:

1. **Secret Generation** - The website generates two random 32-byte values:
   - **Nullifier** - Your secret identifier
   - **Secret** - Your password

2. **Commitment Creation** - These are hashed together to create your "commitment"
   ```
   commitment = hash(nullifier + secret)
   ```

3. **Blockchain Storage** - Only the commitment is stored on-chain (not your secrets!)

4. **Local Storage** - Your nullifier and secret are saved in your browser

**IMPORTANT:** Your secrets are ONLY stored in your browser. If you clear browser data, you'll lose access to your deposit!

### After Depositing

You can:
- ✅ Close the website and come back later
- ✅ Make multiple deposits
- ✅ Withdraw anytime to any address

---

## How to Withdraw

Withdrawing (called "Sending Privately") requires you to have an active deposit first.

### Step-by-Step Withdrawal Guide

**Step 1: Go to Send Privately Tab**
- Click "Send Privately" tab
- You must have at least one deposit to proceed

**Step 2: Select Your Deposit**
- Click the dropdown that says "Select a deposit"
- You'll see all your available deposits listed:
  ```
  0.1 BNB - Deposited 2 hours ago
  ```
- Click the deposit you want to withdraw from

**Step 3: Enter Recipient Address**
- **IMPORTANT:** Use a DIFFERENT address than your deposit address
- Paste the recipient's BNB address (starts with 0x...)
- The website validates the address format

**Step 4: Enter Withdrawal Amount**
- You can withdraw part or all of your deposit
- Minimum: Must cover fees (~0.0015 BNB)
- Maximum: Your deposit amount

**Partial Withdrawals:**
If you withdraw less than your full deposit:
- A new deposit is automatically created for the remaining balance
- Example: Deposit 0.1 BNB → Withdraw 0.05 BNB → You still have 0.05 BNB deposited

**Step 5: Choose Privacy Delay**
- **Instant (less private)** - Processed within 60 seconds
- **5-30 minutes** - Moderate privacy
- **1-24 hours** - Maximum privacy

**Why delays?** More deposits and withdrawals happen during the delay, making it harder to link your deposit to your withdrawal.

**Step 6: Click "Send Privately"**
- Review the transaction details
- Confirm in your wallet (you'll pay gas + fees)
- Wait for confirmation

**Step 7: Wait for Processing**
- Your withdrawal is queued on the blockchain
- After the delay expires, our automated relayer processes it
- Check Transaction History to see status

### Withdrawal Status Flow

```
Queued → Processing → Completed
  ↓          ↓           ↓
 [Wait]   [Relayer]  [Received]
```

**Status Meanings:**
- **Queued** - Waiting for delay to expire
- **Processing** - Relayer is sending your BNB
- **Completed** - BNB received by recipient

---

## Understanding Privacy

### How AnonBNB Provides Privacy

#### 1. **Anonymity Set**

Your privacy depends on how many deposits are in the pool:
- 10 deposits → 10% chance of identification
- 100 deposits → 1% chance
- 1,000 deposits → 0.1% chance

**More users = Better privacy for everyone**

#### 2. **Breaking On-Chain Links**

Without AnonBNB:
```
Your Wallet → Recipient Wallet
(Direct link, 100% traceable)
```

With AnonBNB:
```
Your Wallet → [Privacy Pool] → Relayer → Recipient Wallet
(No direct link, untraceable)
```

Observers see:
- Someone deposited (but not who withdrew)
- Someone withdrew (but not who deposited)
- **Cannot link the two transactions**

#### 3. **Cryptographic Proofs**

When you withdraw, you prove you made a deposit without revealing which one:
- You provide your secret nullifier and secret
- The smart contract verifies you own a deposit
- But observers only see a "nullifier hash" (cannot be linked to your commitment)

#### 4. **Relayer System**

The relayer is a third-party service that:
- Monitors the withdrawal queue
- Processes withdrawals when delays expire
- Sends from its own wallet to recipients

**Result:** Blockchain shows relayer → recipient (not you → recipient)

#### 5. **Time Delays**

Optional delays enhance privacy:
- **Instant (0 min)** - Lower privacy but fast
- **30 min** - Good balance
- **24 hours** - Maximum privacy

Longer delays = More transactions in between = Harder to correlate

### Privacy Best Practices

✅ **DO:**
- Use different recipient address than deposit address
- Use time delays (at least 30 minutes recommended)
- Wait for pool to have more deposits before withdrawing
- Use intermediate addresses for maximum privacy

❌ **DON'T:**
- Withdraw to same address you deposited from
- Use instant withdrawals if privacy is critical
- Withdraw immediately after depositing
- Deposit and withdraw the same exact unusual amount

### Real-World Privacy Example

**Bad Privacy:**
```
1. Alice deposits 0.12345 BNB at 10:00 AM
2. Alice withdraws 0.12345 BNB instantly to her other wallet
3. Observer sees: "Probably the same person"
```

**Good Privacy:**
```
1. Alice deposits 0.1 BNB at 10:00 AM
2. Alice waits 6 hours
3. 50 more deposits happen in that time
4. Alice withdraws 0.05 BNB to Bob's address
5. Alice later withdraws remaining 0.05 BNB to another address
6. Observer sees: "Could be anyone in the pool"
```

---

## Fees and Costs

### Transaction Fees Breakdown

Every withdrawal has two types of fees:

#### 1. **Platform Fee: 0.25%**
- Goes to AnonBNB protocol
- Calculated on withdrawal amount
- Used for development and maintenance

#### 2. **Relayer Fee: 0.001 BNB**
- Fixed fee per withdrawal
- Compensates relayer for gas costs
- Ensures your withdrawal gets processed

#### 3. **Gas Fees**
- Paid to BSC network (not to AnonBNB)
- Deposit: ~$0.15 (at normal gas prices)
- Queue withdrawal: ~$0.20
- Total: ~$0.35 per complete cycle

### Fee Examples

**Example 1: Withdraw 0.1 BNB**
```
Withdrawal amount:    0.1 BNB
Platform fee (0.25%): 0.00025 BNB
Relayer fee:          0.001 BNB
─────────────────────────────────
Total fees:           0.00125 BNB
You receive:          0.09875 BNB (98.75%)
```

**Example 2: Withdraw 1.0 BNB**
```
Withdrawal amount:    1.0 BNB
Platform fee (0.25%): 0.0025 BNB
Relayer fee:          0.001 BNB
─────────────────────────────────
Total fees:           0.0035 BNB
You receive:          0.9965 BNB (99.65%)
```

**Example 3: Withdraw 10 BNB**
```
Withdrawal amount:    10.0 BNB
Platform fee (0.25%): 0.025 BNB
Relayer fee:          0.001 BNB
─────────────────────────────────
Total fees:           0.026 BNB
You receive:          9.974 BNB (99.74%)
```

### Minimum Withdrawal

To ensure withdrawal covers fees, minimum withdrawal is approximately **0.0015 BNB**

---

## Security Best Practices

### Protecting Your Deposits

#### 1. **Backup Your Credentials**

Your browser stores your deposit credentials. If you clear browser data, **you lose access to your funds**.

**How to Backup:**
1. Go to Transaction History tab
2. Click "Export History" (if available) or manually note down:
   - Commitment hash
   - Deposit amount
   - Deposit date
3. Store in a secure location (password manager, encrypted file)

#### 2. **Never Share Your Secrets**

Your nullifier and secret are stored in your browser's localStorage. These are the keys to your deposit.

❌ **Never:**
- Share your nullifier or secret with anyone
- Send them over messaging apps
- Store them in plain text online
- Screenshot them and upload to cloud storage

✅ **Instead:**
- Keep them in browser localStorage
- Back up to encrypted storage only
- Use password managers with encryption

#### 3. **Use Fresh Recipient Addresses**

For maximum privacy:
- Generate a new wallet address for each withdrawal
- Don't reuse recipient addresses
- Consider using intermediate addresses

#### 4. **Verify Contract Address**

Always verify you're on the official AnonBNB website:
- **Official URL:** https://anonbnb.fun
- **Contract Address:** [Displayed on website]

Beware of phishing sites!

#### 5. **Test with Small Amounts**

First time using AnonBNB?
1. Deposit a small amount (0.01-0.05 BNB)
2. Wait a few hours
3. Withdraw to test address
4. Once comfortable, use larger amounts

#### 6. **Understand the Risks**

⚠️ **Important Disclaimers:**
- Smart contracts can have bugs (though AnonBNB is audited)
- Browser data loss = Loss of access to funds
- Privacy depends on pool size
- Use at your own risk

---

## Transaction History

### Viewing Your History

Click the "Transaction History" tab to see:
- All your deposits
- Current status of each deposit
- Withdrawal details (if applicable)
- Transaction hashes

### Deposit Cards

Each deposit shows:
- **Amount** - How much you deposited
- **Status** - Current state (Deposited, Queued, Completed)
- **Deposit Date** - When you made the deposit
- **Commitment Hash** - Your unique identifier (first 10 characters)

### Status Indicators

**🟢 Deposited (Green)**
- Deposit is active and available for withdrawal
- You can queue a withdrawal anytime

**🟡 Queued (Yellow)**
- Withdrawal has been queued
- Waiting for delay to expire
- Shows countdown timer or "Ready for processing"

**🔵 Processing (Blue)**
- Relayer is currently processing your withdrawal
- Should complete within 1-2 minutes

**✅ Completed (Green with checkmark)**
- Withdrawal successfully processed
- BNB sent to recipient
- Shows transaction hash (click to view on BscScan)

### Refreshing History

Click the "Refresh" button (🔄) to update status:
- Checks current state from blockchain
- Updates countdown timers
- Shows newly completed withdrawals

**Auto-refresh:** History automatically refreshes every 30 seconds when tab is open

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Wallet Not Connected"

**Solution:**
1. Click "Connect Wallet" button
2. Select your wallet provider
3. Approve connection in wallet popup
4. Make sure wallet is unlocked

---

#### Issue: "Wrong Network"

**Solution:**
1. Open your wallet
2. Switch to "BNB Smart Chain" network
3. If network not available, add it manually (see Network Setup section)

---

#### Issue: "Transaction Failed"

**Possible Causes:**
1. **Insufficient gas** - Increase gas limit in wallet
2. **Network congestion** - Wait and try again
3. **Already queued** - Check if withdrawal already processed
4. **Invalid address** - Verify recipient address format

---

#### Issue: "Deposit Not Showing in History"

**Solution:**
1. Wait 30-60 seconds for blockchain confirmation
2. Click "Refresh" button in Transaction History
3. Check transaction on BscScan using transaction hash
4. Make sure you're using the same browser/device

---

#### Issue: "Can't Select Deposit in Send Tab"

**Possible Causes:**
1. **No deposits** - Make a deposit first in Deposit tab
2. **Already queued** - Deposit already has pending withdrawal
3. **Already withdrawn** - Deposit was completed

---

#### Issue: "Withdrawal Still Queued After Delay"

**Normal Behavior:**
- Relayer checks queue every 60 seconds
- Your withdrawal processes when delay expires + up to 60 seconds
- Check Transaction History for status updates

**If stuck for >5 minutes:**
- Contact support on Telegram: [t.me/anonbnbfun](https://t.me/anonbnbfun)
- Provide transaction hash and queue ID

---

#### Issue: "Lost Access to Browser Storage"

**Problem:** You cleared browser data or switched devices

**Solution:**
If you have your commitment hash:
1. You can still prove ownership with nullifier + secret
2. Contact support for manual recovery assistance
3. **Prevention:** Always backup credentials before clearing browser data

If you don't have credentials:
- **Funds are unrecoverable** (by design, for privacy)
- This is why backups are critical

---

## FAQ

### General Questions

**Q: Is AnonBNB legal?**

A: Privacy is not illegal. AnonBNB is a tool for financial privacy, similar to using cash. However, laws vary by jurisdiction. Users are responsible for compliance with local regulations.

---

**Q: How is this different from a crypto mixer?**

A: AnonBNB IS a crypto mixer (also called a privacy pool). It uses advanced cryptography to break on-chain transaction links.

---

**Q: Can AnonBNB see my deposits?**

A: No. Your secrets are stored only in your browser. AnonBNB cannot access your funds or see which deposits belong to which users.

---

**Q: What happens if the website goes down?**

A: Your funds are safe in the smart contract (not controlled by the website). You can interact directly with the contract using ethers.js or web3.js with your stored credentials.

---

**Q: Is there a minimum or maximum deposit?**

A:
- **Minimum:** 0.01 BNB
- **Maximum:** No limit (but test with small amounts first)

---

**Q: Can I deposit any token?**

A: No, AnonBNB currently only supports BNB. Support for BEP-20 tokens may come in future versions.

---

### Privacy Questions

**Q: How private is AnonBNB really?**

A: Privacy depends on:
1. **Pool size** - More deposits = better privacy
2. **Your behavior** - Following best practices (delays, different addresses)
3. **Amount patterns** - Using common amounts vs unusual amounts

With good practices and a decent pool size, linking deposits to withdrawals is computationally infeasible.

---

**Q: Can the government trace my transactions?**

A: AnonBNB breaks on-chain links, but:
- Centralized exchanges track deposits/withdrawals to your account
- ISPs can see you visited the website
- For maximum privacy, use VPN and withdraw to non-custodial wallet
- AnonBNB provides transaction privacy, not complete anonymity

---

**Q: Should I use instant withdrawals?**

A: Instant withdrawals (0 delay) offer less privacy because:
- Timing correlation is easier
- Fewer transactions occur between deposit and withdrawal
- For strong privacy, use at least 30-minute delay

---

**Q: What if someone analyzes the blockchain?**

A: Advanced analysis might narrow down possibilities but cannot definitively link deposits to withdrawals because:
1. Cryptographic commitments are one-way functions
2. Nullifier hashes cannot be linked to commitments
3. Multiple users with similar timing creates plausible deniability
4. Larger pool = exponentially harder analysis

---

### Technical Questions

**Q: What blockchain does AnonBNB use?**

A: BNB Smart Chain (BSC), both testnet and mainnet.

---

**Q: How long does a withdrawal take?**

A:
- **Queue time:** Instant (transaction confirmation ~10-15 seconds)
- **Processing time:** Your chosen delay + up to 60 seconds
- **Total:** Delay + ~2 minutes

Example: 30-minute delay = ~32 minutes total

---

**Q: Can I cancel a queued withdrawal?**

A: No, once queued on blockchain, withdrawals cannot be cancelled. This is by design to prevent timing attacks.

---

**Q: What happens if I lose my browser data?**

A: If you have your nullifier and secret (backed up):
- You can still withdraw by recreating the deposit note
- Contact support for guidance

If you don't have credentials:
- **Funds are unrecoverable** (by design, for privacy)
- No one, including AnonBNB team, can recover them

---

**Q: Is the smart contract audited?**

A: Current audit status is displayed in the technical documentation. Always check the contract_docs/README.md for latest audit information.

---

**Q: Can I use AnonBNB programmatically?**

A: Yes! See contract_docs/INTEGRATION.md for full API documentation and TypeScript examples.

---

### Fee Questions

**Q: Why is there a relayer fee?**

A: The relayer is a third-party service that:
- Monitors the queue 24/7
- Pays gas fees to process your withdrawal
- Provides the privacy benefit (sends from its wallet, not yours)

The 0.001 BNB fee covers operational costs.

---

**Q: Can fees change?**

A:
- **Platform fee (0.25%):** Fixed in smart contract, cannot change
- **Relayer fee (0.001 BNB):** Can be adjusted by contract owner, max 0.01 BNB

Current fees always displayed on website.

---

**Q: Do I pay gas fees?**

A: Yes, you pay gas for:
1. **Deposit transaction** (~$0.15)
2. **Queue withdrawal transaction** (~$0.20)

The relayer pays gas for the actual withdrawal processing.

---

### Troubleshooting Questions

**Q: My withdrawal hasn't processed after the delay. What do I do?**

A:
1. Wait an additional 5 minutes (relayer checks every 60 seconds)
2. Check Transaction History for status updates
3. If still stuck, contact Telegram support with your queue ID

---

**Q: I accidentally withdrew to wrong address. Can I reverse it?**

A: No, blockchain transactions are irreversible. Always triple-check recipient addresses before confirming.

---

**Q: The website shows "Contract Paused" - what does this mean?**

A: The contract has been paused (emergency feature):
- New deposits and withdrawals are temporarily disabled
- Your funds are safe in the contract
- Queued withdrawals will process when unpaused
- Check X (Twitter) and Telegram for announcements

---

## Support and Community

### Get Help

**Telegram Community:**
- Join: [t.me/anonbnbfun](https://t.me/anonbnbfun)
- Active community support
- Announcements and updates

**X (Twitter):**
- Follow: [@anonbnb_fun](https://x.com/anonbnb_fun)
- Latest news and features

**Technical Documentation:**
- Contract Docs: contract_docs/README.md
- Integration Guide: contract_docs/INTEGRATION.md
- Technical Specs: contract_docs/TECHNICAL-SPECS.md

**GitLab:**
- Source Code: [gitlab.com/AnonBNB/AnonBNB-contract](https://gitlab.com/AnonBNB/AnonBNB-contract)
- Report Issues
- Contribute to development

### Report Bugs

Found a bug? Help us improve:
1. Check if it's a known issue on GitLab
2. Report on Telegram or create GitLab issue
3. Include: Browser, wallet, steps to reproduce, screenshots

---

## Security & Disclaimers

### Security Audits

AnonBNB smart contracts are designed with security best practices:
- OpenZeppelin battle-tested contracts
- Reentrancy protection
- Input validation
- Emergency pause functionality

Check contract_docs/README.md for current audit status.

### Disclaimers

⚠️ **IMPORTANT: Read Carefully**

**Use at Your Own Risk:**
- Cryptocurrency involves risk
- Smart contracts can have bugs
- No guarantee of privacy in all circumstances
- Test with small amounts first

**Your Responsibility:**
- Back up your credentials
- Verify all addresses before transactions
- Understand how the system works
- Comply with local regulations

**No Liability:**
- AnonBNB is provided "as is"
- No warranty of any kind
- Not responsible for user errors or losses
- Not responsible for third-party services (relayer)

**Privacy Limitations:**
- Not absolute anonymity
- Depends on user behavior and pool size
- May be subject to advanced analysis techniques
- Does not hide connection metadata (IP addresses, etc.)

### Best Practices Summary

✅ **Always:**
- Back up your credentials securely
- Use different recipient addresses
- Test with small amounts first
- Verify you're on official website
- Double-check all addresses

❌ **Never:**
- Share your nullifier or secret
- Use suspicious/phishing websites
- Withdraw to same address as deposit
- Clear browser data without backup
- Use for illegal activities

---

## Conclusion

AnonBNB provides a simple, secure way to achieve financial privacy on BNB Smart Chain. By following the best practices in this guide, you can maximize your privacy while using the platform safely.

### Key Takeaways

1. **Privacy** comes from pooling + cryptography + relayer system
2. **Backup** your credentials (browser storage can be lost)
3. **Use delays** for better privacy (30+ minutes recommended)
4. **Different addresses** - Never withdraw to deposit address
5. **Test first** with small amounts before larger transactions

### Ready to Get Started?

1. Visit [anonbnb.fun](https://anonbnb.fun)
2. Connect your wallet
3. Make a small test deposit (0.01 BNB)
4. Wait a few hours
5. Withdraw to test address
6. Once comfortable, use normally!

---

**Thank you for using AnonBNB! Stay private, stay safe.** 🛡️

---

**Last Updated:** 30 October 2025

**Website:** https://anonbnb.fun
**X (Twitter):** [@anonbnb_fun](https://x.com/anonbnb_fun)
**Telegram:** [t.me/anonbnbfun](https://t.me/anonbnbfun)
**GitLab:** [gitlab.com/AnonBNB/AnonBNB-contract](https://gitlab.com/AnonBNB/AnonBNB-contract)
