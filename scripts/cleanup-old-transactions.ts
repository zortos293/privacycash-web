import { prisma } from '../lib/db';

async function cleanupOldTransactions() {
  console.log('🧹 Cleaning up old transactions with incorrect encryption...');

  // Delete all pending and failed transactions (they may have old encryption format)
  const result = await prisma.transaction.deleteMany({
    where: {
      OR: [
        { status: 'PENDING_DEPOSIT' },
        { status: 'FAILED' },
      ],
    },
  });

  console.log(`✅ Deleted ${result.count} old transactions`);
  console.log('✨ Database cleaned! You can now create new swaps.');
}

cleanupOldTransactions()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
