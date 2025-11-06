import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function viewTransactions() {
  console.log('📋 Current Transactions:\n');

  const transactions = await prisma.transaction.findMany({
    include: {
      wallets: true,
      steps: true,
    },
  });

  if (transactions.length === 0) {
    console.log('No transactions found.');
  } else {
    for (const tx of transactions) {
      console.log(`Transaction ID: ${tx.id}`);
      console.log(`Status: ${tx.status}`);
      console.log(`Deposit Address: ${tx.depositAddress}`);
      console.log(`Recipient: ${tx.recipientAddress}`);
      console.log(`Amount: ${tx.amount} SOL`);
      console.log(`Created: ${tx.createdAt}`);
      console.log(`Wallets: ${tx.wallets.length}`);
      console.log(`Steps: ${tx.steps.length}`);
      console.log('---');
    }
  }

  await prisma.$disconnect();
}

viewTransactions().catch(console.error);
