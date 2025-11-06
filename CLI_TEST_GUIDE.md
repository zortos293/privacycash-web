# CLI Privacy Mixer Test Guide

## 🎯 Quick Start

The CLI app will:
1. ✅ Generate deposit and recipient wallets
2. ✅ Show you private keys (save them!)
3. ✅ Wait for you to deposit 0.1 SOL
4. ✅ Execute complete privacy mixing flow
5. ✅ Monitor until recipient receives funds

## 🚀 Usage

### Run the CLI Test

```bash
bun run test-privacy-flow
```

### What Happens

#### 1. Wallet Generation

The app will generate two wallets and display their info:

```
📦 Deposit Wallet:
   Address: FdTbEP8SjAmJ5tfepw5vSMoXekuzN9H1pN2m7d3jFW4k
   Private Key: 3x7K...xyz
   ⚠️  Save this private key!

📦 Recipient Wallet:
   Address: BTitHZUpoDMuJPc2LcgHkwqD4dTCwATRy94btLxifVeU
   Private Key: 5k9L...abc

💾 Wallet info saved to: test-wallets.json
```

**IMPORTANT**: The wallet info is automatically saved to `test-wallets.json` for safekeeping.

#### 2. Deposit SOL

The app will wait for you to send 0.1 SOL to the deposit wallet:

```
💰 Please send exactly 0.1 SOL to:
   FdTbEP8SjAmJ5tfepw5vSMoXekuzN9H1pN2m7d3jFW4k

✋ Press Enter after you've sent the SOL...

⏳ Monitoring for deposits...
   Current balance: 0 SOL
   Current balance: 0.1 SOL

✅ Deposit detected: 0.1 SOL
```

#### 3. Create Privacy Mix Plan

```
🎭 Creating privacy mix plan...
   Amount: 0.1 SOL
   Recipient: BTitHZUpoDMuJPc2LcgHkwqD4dTCwATRy94btLxifVeU

✅ Privacy mix plan created!
   Total hops: 2
   Estimated time: ~12 minutes
   Estimated output: 0.099513 SOL
```

#### 4. Execute HOP 1 (SOL → ZEC)

```
📤 Sending 0.1 SOL to NEAR Intents...
   Deposit address: 3vLNkq1RZpxD9h3GbtD4G5NqpUVcTAWVUejyS1G3RUEK
   Expected output: 0.02926707 ZEC

⏳ Sending transaction...

✅ Transaction sent!
   Signature: 2x9K...xyz
   Explorer: https://solscan.io/tx/2x9K...xyz

✅ NEAR Intents notified

⏳ Waiting for HOP 1 to complete...
   Status: PENDING
   Status: SUCCESS

✅ HOP 1 completed!
   Amount out: 0.02926707 ZEC
```

#### 5. Time Delay (Privacy Enhancement)

```
⏰ Waiting 2.5 minutes before HOP 2...
   This breaks temporal correlation for enhanced privacy

   Time remaining: 2m 30s
   Time remaining: 2m 29s
   ...
   Time remaining: 0m 0s

✅ Time delay complete!
```

#### 6. HOP 2 (ZEC → SOL) - Automatic

```
🔄 NEAR Intents will automatically execute HOP 2
   ZEC → SOL swap will be processed
   Funds will be delivered to recipient

⚠️  NOTE: HOP 2 requires relayer or manual triggering
   In production, the relayer service handles this automatically
```

#### 7. Monitor Recipient Wallet

```
👀 Monitoring recipient wallet for incoming SOL...
   Address: BTitHZUpoDMuJPc2LcgHkwqD4dTCwATRy94btLxifVeU
   Expected: ~0.099513 SOL

💰 Current balance: 0 SOL
💰 Current balance: 0.099512 SOL
```

#### 8. Final Results

```
═════════════════════════════════════════════════════
🎉 PRIVACY MIX TEST COMPLETE!
═════════════════════════════════════════════════════

📊 Final Results:
   Input: 0.1 SOL
   Output: 0.099512 SOL
   Actual fee: 0.49%

✅ SUCCESS!
   Recipient received: 0.099512 SOL
   Privacy: HIGH (SOL → ZEC → SOL routing)

📁 Wallet Info:
   Saved to: test-wallets.json

🔗 Useful Links:
   Deposit wallet: https://solscan.io/account/FdTbEP8SjAmJ5tfepw5vSMoXekuzN9H1pN2m7d3jFW4k
   Recipient wallet: https://solscan.io/account/BTitHZUpoDMuJPc2LcgHkwqD4dTCwATRy94btLxifVeU
   Transaction: https://solscan.io/tx/2x9K...xyz
```

## 📋 Output Files

### test-wallets.json

This file contains all wallet information:

```json
{
  "depositAddress": "FdTbEP8SjAmJ5tfepw5vSMoXekuzN9H1pN2m7d3jFW4k",
  "depositPrivateKey": "3x7K...xyz",
  "recipientAddress": "BTitHZUpoDMuJPc2LcgHkwqD4dTCwATRy94btLxifVeU",
  "recipientPrivateKey": "5k9L...abc",
  "timestamp": "2025-11-06T20:30:00.000Z"
}
```

**⚠️ IMPORTANT**: Keep this file secure! It contains private keys.

## 🛠️ Troubleshooting

### HOP 2 Not Completing

If HOP 2 doesn't complete automatically, you have two options:

1. **Start the Relayer** (Recommended for production):
   ```bash
   bun run relayer:near
   ```

2. **Manual Triggering**:
   - HOP 2 requires initiating a swap from the NEAR Intents account
   - The relayer handles this automatically
   - For manual testing, you'd need to call the NEAR Intents API directly

### Recipient Not Receiving Funds

If the recipient wallet doesn't receive funds:

1. **Check HOP 1 Status**:
   - Visit: https://solscan.io/tx/YOUR_TRANSACTION_SIGNATURE
   - Verify the transaction completed successfully

2. **Check NEAR Intents Status**:
   - The CLI app monitors status automatically
   - Look for "SUCCESS" status for HOP 1

3. **Wait Longer**:
   - HOP 2 might still be processing
   - Total time can be up to 15 minutes
   - Check recipient balance manually: https://solscan.io/account/RECIPIENT_ADDRESS

4. **Check Relayer**:
   - If using the relayer, ensure it's running
   - Check relayer logs for errors

### Transaction Failed

If a transaction fails:

1. **Check Solana RPC**:
   - Ensure your RPC endpoint is working
   - Try switching to a different RPC

2. **Check Balance**:
   - Ensure you sent at least 0.1 SOL
   - Account for transaction fees

3. **Check NEAR Intents**:
   - NEAR Intents API might be down
   - Visit: https://1click.chaindefuser.com/v0/tokens
   - Should return list of supported tokens

## 💡 Tips

### For Testing

1. **Start Small**: Use exactly 0.1 SOL for first test
2. **Save Keys**: Always keep test-wallets.json safe
3. **Monitor**: Use Solscan to watch transactions in real-time
4. **Be Patient**: Full flow takes ~13 minutes

### For Production

1. **Run Relayer**: Always have relayer running for HOP 2
2. **Use PM2**: Keep relayer alive with PM2
3. **Monitor Logs**: Watch relayer logs for issues
4. **Database**: Ensure PostgreSQL is running

## 🔗 Useful Commands

```bash
# Run CLI test
bun run test-privacy-flow

# Run simple API test (no deposit needed)
bun run test-privacy-mixer

# Start relayer
bun run relayer:near

# Check wallet balances
solana balance WALLET_ADDRESS

# View transaction
https://solscan.io/tx/SIGNATURE
```

## 📞 Support

If you encounter issues:

1. **Check Logs**: Look at the CLI output for errors
2. **Verify Configuration**: Ensure .env is properly configured
3. **Test API**: Run `bun run test-privacy-mixer` first
4. **NEAR Intents**: Contact https://t.me/near_intents_support

## 🎯 Success Metrics

A successful test will show:

- ✅ Wallets generated
- ✅ Deposit detected
- ✅ Privacy plan created
- ✅ HOP 1 completed (SOL → ZEC)
- ✅ Time delay passed
- ✅ Recipient received funds
- ✅ Total fees ~0.5%
- ✅ Privacy level: HIGH

## 🚀 Next Steps

After successful CLI test:

1. **Integrate Frontend**: Update app/page.tsx
2. **Deploy Relayer**: Run on VPS with PM2
3. **Test More**: Try different amounts
4. **Go Live**: Open to users!

---

**Ready to test? Run:** `bun run test-privacy-flow`
