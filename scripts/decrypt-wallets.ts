import 'dotenv/config';
import { prisma } from '../lib/db';
import { decryptPrivateKey } from '../lib/encryption';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import fs from 'fs';

/**
 * Decrypt all wallets in database
 *
 * Usage: bun run scripts/decrypt-wallets.ts [transaction-id]
 *
 * If transaction-id provided: Shows only wallets for that transaction
 * If no transaction-id: Shows all wallets
 */
async function decryptAllWallets() {
  const transactionIdArg = process.argv[2];

  try {
    console.log('🔓 Decrypting wallets from database...\n');

    // Fetch wallets with transaction info
    const wallets = await prisma.wallet.findMany({
      where: transactionIdArg ? { transactionId: transactionIdArg } : undefined,
      include: {
        transaction: {
          select: {
            id: true,
            status: true,
            depositAddress: true,
            recipientAddress: true,
            amount: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (wallets.length === 0) {
      console.log('❌ No wallets found in database');
      if (transactionIdArg) {
        console.log(`   Transaction ID: ${transactionIdArg}`);
      }
      return;
    }

    console.log(`📊 Found ${wallets.length} wallet(s)\n`);
    console.log('='.repeat(100));

    for (const wallet of wallets) {
      try {
        // Decrypt private key
        const decryptedKey = decryptPrivateKey(
          wallet.encryptedPrivateKey,
          wallet.transactionId
        );

        // Convert to Keypair to verify and get base58 format
        const keypair = Keypair.fromSecretKey(decryptedKey);
        const privateKeyBase58 = bs58.encode(decryptedKey);

        console.log(`\n📝 Wallet ID: ${wallet.id}`);
        console.log(`   Transaction ID: ${wallet.transactionId}`);
        console.log(`   Purpose: ${wallet.purpose}`);
        console.log(`   Public Address: ${wallet.walletAddress}`);
        console.log(`   Private Key (Base58): ${privateKeyBase58}`);
        console.log(`   Private Key (Hex): ${Buffer.from(decryptedKey).toString('hex')}`);
        console.log(`   Created: ${wallet.createdAt.toISOString()}`);

        console.log(`\n   Transaction Details:`);
        console.log(`   - Status: ${wallet.transaction.status}`);
        console.log(`   - Deposit Address: ${wallet.transaction.depositAddress}`);
        console.log(`   - Recipient: ${wallet.transaction.recipientAddress}`);
        console.log(`   - Amount: ${wallet.transaction.amount} SOL`);
        console.log(`   - Created: ${wallet.transaction.createdAt.toISOString()}`);

        // Verify keypair matches
        if (keypair.publicKey.toString() === wallet.walletAddress) {
          console.log(`   ✅ Decryption verified - public key matches`);
        } else {
          console.log(`   ⚠️ WARNING: Decrypted key doesn't match stored public key!`);
        }

        console.log('\n' + '-'.repeat(100));
      } catch (error) {
        console.error(`\n❌ Failed to decrypt wallet ${wallet.id}:`, error);
        console.log(`   Transaction ID: ${wallet.transactionId}`);
        console.log(`   Public Address: ${wallet.walletAddress}`);
        console.log(`   Purpose: ${wallet.purpose}`);
        console.log('\n' + '-'.repeat(100));
      }
    }

    console.log(`\n✅ Decryption complete - processed ${wallets.length} wallet(s)`);
    console.log('\n⚠️  SECURITY WARNING:');
    console.log('   Private keys are highly sensitive!');
    console.log('   Never share or commit these keys to version control.');
    console.log('   Clear your terminal history after using this script.');

  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Export wallet data to JSON (optional)
async function exportWalletsToJson() {
  const transactionIdArg = process.argv[3];

  const wallets = await prisma.wallet.findMany({
    where: transactionIdArg ? { transactionId: transactionIdArg } : undefined,
    include: { transaction: true },
  });

  const decryptedData = wallets.map(wallet => {
    try {
      const decryptedKey = decryptPrivateKey(
        wallet.encryptedPrivateKey,
        wallet.transactionId
      );
      const privateKeyBase58 = bs58.encode(decryptedKey);

      return {
        walletId: wallet.id,
        transactionId: wallet.transactionId,
        purpose: wallet.purpose,
        publicAddress: wallet.walletAddress,
        privateKeyBase58,
        privateKeyHex: Buffer.from(decryptedKey).toString('hex'),
        createdAt: wallet.createdAt,
        transaction: {
          status: wallet.transaction.status,
          depositAddress: wallet.transaction.depositAddress,
          recipientAddress: wallet.transaction.recipientAddress,
          amount: wallet.transaction.amount,
        },
      };
    } catch (error) {
      return {
        walletId: wallet.id,
        transactionId: wallet.transactionId,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  return decryptedData;
}

// Check if export flag is used
if (process.argv.includes('--export-json')) {
  exportWalletsToJson()
    .then(data => {
      const filename = `wallet-export-${Date.now()}.json`;
      fs.writeFileSync(filename, JSON.stringify(data, null, 2));
      console.log(`✅ Exported to ${filename}`);
      console.log('⚠️  DELETE THIS FILE AFTER USE - Contains private keys!');
    })
    .catch(console.error)
    .finally(() => prisma.$disconnect());
} else {
  decryptAllWallets();
}
