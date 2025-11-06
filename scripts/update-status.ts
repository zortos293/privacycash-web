import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const txId = 'cmhnrm2b90006xjfg780jokm2';
  
  // Update to HOP_1_DELAY to trigger HOP 2
  await prisma.transaction.update({
    where: { id: txId },
    data: { 
      status: 'HOP_1_DELAY',
      updatedAt: new Date()
    }
  });
  
  console.log(`✅ Updated transaction ${txId} to status: HOP_1_DELAY`);
  console.log('🚀 Relayer will now process HOP 2');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
