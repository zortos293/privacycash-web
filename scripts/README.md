# Scripts Documentation

## decrypt-wallets.ts

Decrypts all wallet private keys from the database for debugging, backup, or emergency access.

### Prerequisites

- `.env` file must contain valid `ENCRYPTION_MASTER_SECRET`
- Database connection configured properly
- Required dependencies installed (`bun install`)

### Usage

**Decrypt all wallets:**
```bash
bun run decrypt-wallets
```

**Decrypt wallets for specific transaction:**
```bash
bun run decrypt-wallets <transaction-id>
```

**Export to JSON file:**
```bash
bun run scripts/decrypt-wallets.ts --export-json
```

### Output Format

The script displays:
- Wallet ID
- Transaction ID
- Wallet purpose (DEPOSIT, INTERMEDIATE_ZEC, INTERMEDIATE_SOL)
- Public address
- Private key (Base58 format - for Phantom/Solflare import)
- Private key (Hex format)
- Transaction status and details
- Verification status

### Examples

**View all wallets:**
```bash
$ bun run decrypt-wallets

🔓 Decrypting wallets from database...

📊 Found 3 wallet(s)

====================================================================================================

📝 Wallet ID: clxy123abc
   Transaction ID: clxy456def
   Purpose: DEPOSIT
   Public Address: 7xK8Y9pZq1MnJ4vX2wR3gH5tL6sB8aD9cE0fF1gH2iJ
   Private Key (Base58): 3Xy9Z8a7B6c5D4e3F2g1H0i9J8k7L6m5N4o3P2q1R0s1T2u3V4w5X6y7Z8a9B0c
   Private Key (Hex): 1234567890abcdef...
   Created: 2025-01-15T10:30:00.000Z

   Transaction Details:
   - Status: COMPLETED
   - Deposit Address: 7xK8Y9pZq1MnJ4vX2wR3gH5tL6sB8aD9cE0fF1gH2iJ
   - Recipient: 9aB8c7D6e5F4g3H2i1J0k9L8m7N6o5P4q3R2s1T0u9V
   - Amount: 0.1 SOL
   - Created: 2025-01-15T10:25:00.000Z

   ✅ Decryption verified - public key matches
```

**View specific transaction:**
```bash
$ bun run decrypt-wallets clxy456def
```

**Export to JSON:**
```bash
$ bun run scripts/decrypt-wallets.ts --export-json
✅ Exported to wallet-export-1736936400000.json
⚠️  DELETE THIS FILE AFTER USE - Contains private keys!
```

### Security Warnings

⚠️ **CRITICAL SECURITY INFORMATION:**

1. **Private keys are highly sensitive** - Anyone with access to a private key has full control over the wallet
2. **Never commit to version control** - Ensure scripts output is not logged to git
3. **Clear terminal history** - Run `clear` (Linux/Mac) or `cls` (Windows) after use
4. **Delete JSON exports immediately** after copying needed keys
5. **Only run on secure machines** - Not on shared or public computers
6. **Review access logs** - Check who has access to your database
7. **Master secret protection** - Keep `ENCRYPTION_MASTER_SECRET` secure

### Troubleshooting

**"No wallets found in database"**
- Check database connection in `.env`
- Verify transaction ID is correct
- Ensure Prisma schema is up to date (`bun run db:push`)

**"Failed to decrypt wallet"**
- Verify `ENCRYPTION_MASTER_SECRET` matches the one used during wallet creation
- Check that transaction ID matches the wallet's transaction
- Ensure encryption key hasn't been rotated

**"Decrypted key doesn't match stored public key"**
- Critical error - indicates wrong encryption key or corrupted data
- Do NOT use this private key
- Contact administrator immediately

### Use Cases

1. **Emergency fund recovery** - Access funds if relayer fails
2. **Manual transaction processing** - Send funds manually if needed
3. **Debugging** - Verify encryption/decryption working correctly
4. **Backup** - Export keys before database migration
5. **Audit** - Review wallet generation and storage

### Related Scripts

- `relayer.ts` - Automated transaction processor
- `check-balance.ts` - Check wallet balances (if created)

---

**Remember:** With great power comes great responsibility. Handle private keys with extreme care.
