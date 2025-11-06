import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  console.log('📊 Checking database contents...\n');

  const transactionCount = await prisma.transaction.count();
  const walletCount = await prisma.wallet.count();
  const stepCount = await prisma.transactionStep.count();

  console.log(`Transaction records: ${transactionCount}`);
  console.log(`Wallet records: ${walletCount}`);
  console.log(`TransactionStep records: ${stepCount}`);
  console.log();

  if (transactionCount === 0 && walletCount === 0 && stepCount === 0) {
    console.log('✅ Database is empty - all tables cleared successfully!');
  } else {
    console.log('⚠️ Database still contains data');
  }

  await prisma.$disconnect();
}

checkDatabase().catch(console.error);
