import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning up test data...');

  // Delete all transactions and related wallets
  const deletedSteps = await prisma.transactionStep.deleteMany({});
  console.log(`✅ Deleted ${deletedSteps.count} transaction steps`);

  const deletedWallets = await prisma.wallet.deleteMany({});
  console.log(`✅ Deleted ${deletedWallets.count} wallets`);

  const deletedTransactions = await prisma.transaction.deleteMany({});
  console.log(`✅ Deleted ${deletedTransactions.count} transactions`);

  console.log('✅ Database cleaned successfully!');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
