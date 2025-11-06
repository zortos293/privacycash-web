import { Keypair } from '@solana/web3.js';
import { encryptPrivateKey, decryptPrivateKey } from '../lib/encryption';
import bs58 from 'bs58';

console.log('🧪 Testing encryption/decryption cycle...\n');

try {
  // Generate a test keypair
  const testKeypair = Keypair.generate();
  const testTransactionId = 'test-transaction-123';

  console.log('1️⃣ Original Keypair:');
  console.log('   Public Key:', testKeypair.publicKey.toString());
  console.log('   Private Key (Base58):', bs58.encode(testKeypair.secretKey));
  console.log('   Private Key (Hex):', Buffer.from(testKeypair.secretKey).toString('hex'));

  // Encrypt the private key
  console.log('\n2️⃣ Encrypting...');
  const encrypted = encryptPrivateKey(testKeypair.secretKey, testTransactionId);
  console.log('   Encrypted (Base64):', encrypted);
  console.log('   Length:', encrypted.length);

  // Decrypt the private key
  console.log('\n3️⃣ Decrypting...');
  const decrypted = decryptPrivateKey(encrypted, testTransactionId);
  console.log('   Decrypted (Hex):', Buffer.from(decrypted).toString('hex'));
  console.log('   Decrypted (Base58):', bs58.encode(decrypted));

  // Verify it works
  const recoveredKeypair = Keypair.fromSecretKey(decrypted);
  console.log('   Recovered Public Key:', recoveredKeypair.publicKey.toString());

  console.log('\n✅ SUCCESS!');
  console.log('   Original and recovered public keys match:',
    testKeypair.publicKey.toString() === recoveredKeypair.publicKey.toString());

} catch (error) {
  console.error('\n❌ ERROR:', error);
  console.error('Full error:', error);
}
