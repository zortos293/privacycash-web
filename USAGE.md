# Privacy Cash Usage Guide

## Prerequisites

Before using Privacy Cash, make sure you have:

1. A Solana wallet browser extension installed:
   - [Phantom Wallet](https://phantom.app/) (Recommended)
   - [Solflare Wallet](https://solflare.com/)

2. Some SOL in your wallet:
   - For testing on devnet: Get free test SOL from [Solana Faucet](https://faucet.solana.com/)
   - For mainnet: Purchase SOL from exchanges

## Step-by-Step Guide

### 1. Starting the Application

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:3000`

### 2. Connecting Your Wallet

1. Click the **"Connect Wallet"** button in the center of the screen
2. A modal will appear showing available wallets
3. Select your preferred wallet (Phantom or Solflare)
4. Approve the connection in your wallet extension
5. Your wallet address and balance will appear at the top

### 3. Sending SOL

#### Enter Amount
- Type the amount of SOL you want to send
- Or click **MAX** to send your maximum balance (reserves 0.01 SOL for fees)

#### Enter Recipient Address
- Paste the recipient's Solana wallet address
- The address should be a valid base58-encoded Solana public key
- Example: `7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU`

#### Review Transaction Details
- **Transaction Fee**: 0.25% of the amount
- **Privacy Level**: Maximum (displayed for reference)
- The total amount including fees will be deducted from your balance

#### Send Transaction
1. Click **"Send Privately"** button
2. Approve the transaction in your wallet popup
3. Wait for the transaction to be confirmed (button shows "Sending...")
4. Success message appears with transaction signature

### 4. After Transaction

- Your balance automatically updates
- Success message displays the transaction signature
- You can view the transaction on [Solana Explorer](https://explorer.solana.com/)
  - Copy the signature from the success message
  - Paste it in the explorer search (make sure to select correct network)

## Troubleshooting

### Wallet Won't Connect
- Refresh the page and try again
- Make sure your wallet extension is unlocked
- Check that you're using a supported wallet (Phantom or Solflare)

### Transaction Fails
- **"Insufficient balance"**: You don't have enough SOL (remember the 0.25% fee)
- **Invalid recipient address**: Check the address format is correct
- **Network issues**: Wait a moment and try again

### Balance Not Showing
- Make sure you're connected to the correct network (devnet/mainnet)
- Try disconnecting and reconnecting your wallet
- Refresh the page

## Network Information

### Current Network: Devnet

The application is currently configured to use **Solana Devnet** for testing.

- Network transactions are free (except for blockchain fees)
- Use test SOL from the faucet
- No real money is involved

### Switching to Mainnet

To use real SOL on mainnet, edit `components/WalletProvider.tsx`:

```typescript
const network = clusterApiUrl("mainnet-beta");
```

**⚠️ Warning**: On mainnet, you'll be using real SOL. Double-check recipient addresses!

## Security Best Practices

1. **Always verify recipient addresses** before sending
2. **Start with small test amounts** on devnet
3. **Never share your private keys or seed phrase**
4. **Bookmark the official site** to avoid phishing
5. **Keep your wallet extension updated**

## Transaction Fees Explained

- **0.25% Privacy Fee**: Goes to the Privacy Cash protocol
- **Blockchain Fee**: ~0.000005 SOL (Solana network fee)
- **Total**: Amount + 0.25% + blockchain fee

Example:
- Sending: 1 SOL
- Privacy Fee: 0.0025 SOL
- Blockchain Fee: ~0.000005 SOL
- Total Deducted: ~1.002505 SOL

## Getting Help

If you encounter issues:

1. Check the browser console for error messages
2. Verify you're on the correct network
3. Make sure you have enough SOL for fees
4. Try disconnecting and reconnecting your wallet

## Privacy Features (Coming Soon)

The current implementation provides basic SOL transfers. Future updates will include:

- **Zero-Knowledge Proofs**: Full privacy via ZK-SNARKs
- **Privacy Pools**: Break on-chain transaction links
- **Stealth Addresses**: Enhanced recipient privacy
- **Compliance Tools**: OFAC-compliant selective disclosure
