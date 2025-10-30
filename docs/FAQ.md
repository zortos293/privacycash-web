# AnonBNB - Frequently Asked Questions

**Last Updated:** 30 October 2025

Quick answers to common questions about AnonBNB.

---

## Getting Started

### What is AnonBNB?

AnonBNB is a privacy mixer for BNB on BNB Smart Chain. It breaks the on-chain link between deposit and withdrawal addresses, providing financial privacy.

### How do I start using AnonBNB?

1. Visit [anonbnb.fun](https://anonbnb.fun)
2. Connect your Web3 wallet (MetaMask, Trust Wallet, etc.)
3. Make sure you're on BNB Smart Chain
4. Deposit BNB
5. Withdraw to any address privately

### Do I need to create an account?

No! AnonBNB is 100% decentralized. Just connect your Web3 wallet.

---

## Deposits

### What's the minimum deposit?

**0.01 BNB** minimum.

### What's the maximum deposit?

No maximum, but we recommend testing with small amounts first.

### Can I deposit tokens (not BNB)?

No, currently only BNB is supported.

### Where are my deposit credentials stored?

Your browser's localStorage. **Back them up** - if you clear browser data, you lose access to your funds!

### Can I make multiple deposits?

Yes! You can make as many deposits as you want.

---

## Withdrawals

### How do I withdraw?

1. Go to "Send Privately" tab
2. Select a deposit
3. Enter recipient address (use different address!)
4. Enter amount
5. Choose privacy delay
6. Click "Send Privately"

### How long does withdrawal take?

Your chosen delay + up to 60 seconds for relayer processing.

Examples:
- Instant: ~1-2 minutes total
- 30 min delay: ~31-32 minutes total
- 24 hour delay: ~24 hours + 1 minute

### Can I withdraw part of my deposit?

Yes! Partial withdrawals automatically create a new deposit for the remaining balance.

### Can I cancel a queued withdrawal?

No, withdrawals cannot be cancelled once queued on blockchain.

### My withdrawal is stuck "Queued" - what do I do?

Wait 5 minutes after the delay expires. Relayer checks queue every 60 seconds. If still stuck, contact support on Telegram.

---

## Privacy

### How private is it really?

Privacy depends on:
- **Pool size** (more deposits = better privacy)
- **Your behavior** (use delays, different addresses)
- **Time delays** (longer = more private)

With proper use, linking deposits to withdrawals is computationally infeasible.

### Should I use instant withdrawal or delays?

**For maximum privacy:** Use 30+ minute delays

**For speed:** Instant is fine for smaller amounts or if privacy isn't critical

Delays let more transactions happen between yours, increasing anonymity.

### Can I withdraw to the same address I deposited from?

Technically yes, but **don't do this!** It defeats the purpose and exposes you.

Always use a different address for withdrawals.

### What's an anonymity set?

The number of deposits that could be the source of your withdrawal.

- 10 deposits → 10% chance of identification
- 100 deposits → 1% chance
- 1,000 deposits → 0.1% chance

**More users = better privacy for everyone.**

---

## Fees

### What are the fees?

**Platform fee:** 0.25% of withdrawal amount
**Relayer fee:** 0.001 BNB per withdrawal
**Gas fees:** ~$0.35 total (paid to BSC network)

### Example: Withdraw 0.1 BNB

```
Withdrawal:      0.1 BNB
Platform fee:    0.00025 BNB (0.25%)
Relayer fee:     0.001 BNB
─────────────────────────────
You receive:     0.09875 BNB (98.75%)
```

### Why is there a relayer fee?

The relayer:
- Runs 24/7 to process your withdrawals
- Pays gas fees for processing
- Provides the privacy benefit (sends from its wallet, not yours)

### Can fees change?

- Platform fee (0.25%): **Fixed in contract, cannot change**
- Relayer fee: Can be adjusted, max 0.01 BNB

---

## Security

### Is AnonBNB safe?

AnonBNB uses:
- Battle-tested OpenZeppelin contracts
- Reentrancy protection
- Input validation
- Emergency pause functionality

However, all smart contracts carry risk. **Always test with small amounts first.**

### What if I lose my browser data?

If you have your nullifier and secret backed up: You can recover access.

If you don't have them: **Funds are unrecoverable** (by design, for privacy).

**Always backup your credentials!**

### What if the website goes down?

Your funds are in the smart contract (not controlled by the website). You can interact directly with the contract using your credentials.

### Can AnonBNB access my funds?

**No!** Your secrets are stored only in your browser. The AnonBNB team cannot access or see your deposits.

### Is it audited?

Check contract_docs/README.md for current audit status.

---

## Technical

### What blockchain is this on?

BNB Smart Chain (BSC) - both mainnet and testnet.

### What wallets work with AnonBNB?

Any WalletConnect-compatible wallet:
- MetaMask
- Trust Wallet
- Binance Wallet
- WalletConnect mobile wallets
- And more!

### Can I use AnonBNB programmatically?

Yes! Full API documentation in contract_docs/INTEGRATION.md.

### Is the code open source?

Yes! View on GitLab: [gitlab.com/AnonBNB/AnonBNB-contract](https://gitlab.com/AnonBNB/AnonBNB-contract)

---

## Troubleshooting

### "Wrong Network" error

Switch your wallet to BNB Smart Chain (Chain ID: 56 for mainnet, 97 for testnet).

### Transaction failed

Common causes:
- Insufficient gas
- Network congestion
- Already queued withdrawal
- Invalid recipient address

Try increasing gas limit or wait and retry.

### Deposit not showing in history

1. Wait 30-60 seconds for confirmation
2. Click "Refresh" button
3. Check transaction on BscScan
4. Make sure you're using same browser/device

### Can't select deposit in Send tab

Possible reasons:
- No deposits made yet
- Deposit already has pending withdrawal
- Deposit already completed

---

## Use Cases

### When should I use AnonBNB?

✅ **Good use cases:**
- Sending gifts without revealing your balance
- Paying for services privately
- Breaking transaction history for privacy
- Separating your public and private wallets
- Protecting business transaction privacy

❌ **Don't use for:**
- Illegal activities
- Money laundering
- Tax evasion
- Anything against your local laws

### Can I use it for payments?

Yes! Deposit BNB, then withdraw directly to merchant's address with privacy.

### Can businesses use AnonBNB?

Yes, businesses can use AnonBNB for:
- Private supplier payments
- Employee payroll privacy
- Protecting business transaction patterns

But must comply with all applicable regulations.

---

## Legal

### Is privacy illegal?

No! Privacy is a fundamental right. Using AnonBNB is like using cash - it's a tool for financial privacy.

### Am I doing something wrong by using this?

No, but **you're responsible for compliance with your local laws**. Privacy tools can be used legally or illegally - it's your responsibility to use them legally.

### Do you report to authorities?

AnonBNB is decentralized and cannot report anything because:
- No central authority controls it
- No one (including the team) knows who deposited what
- All transactions are on-chain and public (but unlinkable)

---

## Pool Statistics

### What do the pool stats mean?

**Total Deposits:** All BNB ever deposited
**Total Withdrawals:** All BNB ever withdrawn
**Active Deposits:** Number of deposits available for withdrawal
**Pool Balance:** Current BNB in the contract

### Why is pool balance important?

Shows the contract has sufficient liquidity to process withdrawals.

---

## Best Practices

### ✅ DO:

- Back up your credentials securely
- Use different recipient addresses
- Test with small amounts first
- Use time delays for better privacy
- Verify you're on the official website

### ❌ DON'T:

- Share your nullifier or secret
- Withdraw to deposit address
- Use suspicious/phishing websites
- Clear browser data without backup
- Use for illegal activities

---

## Getting Help

### Where can I get support?

**Telegram:** [t.me/anonbnbfun](https://t.me/anonbnbfun) - Fast community support

**X (Twitter):** [@anonbnb_fun](https://x.com/anonbnb_fun) - Announcements

**GitLab Issues:** Report bugs and technical issues

### How do I report a bug?

1. Check if it's known on GitLab
2. Report on Telegram or create GitLab issue
3. Include: Browser, wallet, steps to reproduce, error messages

---

## More Questions?

**Full Guide:** Read docs/HOW-IT-WORKS.md for detailed explanations

**Technical Docs:** See contract_docs/ for developer documentation

**Community:** Join our Telegram for quick answers: [t.me/anonbnbfun](https://t.me/anonbnbfun)

---

**Last Updated:** 30 October 2025
