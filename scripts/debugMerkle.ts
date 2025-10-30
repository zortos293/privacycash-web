import { ethers } from "hardhat";
import { PRIVACY_POOL_ABI } from "../lib/contractABI";

const PRIVACY_POOL_ADDRESS = process.env.NEXT_PUBLIC_PRIVACY_POOL_ADDRESS;

async function main() {
  if (!PRIVACY_POOL_ADDRESS) {
    console.error("❌ Contract address not set");
    process.exit(1);
  }

  console.log("🔍 Debugging Merkle Tree State\n");
  console.log(`📍 Contract: ${PRIVACY_POOL_ADDRESS}\n`);

  const contract = new ethers.Contract(
    PRIVACY_POOL_ADDRESS,
    PRIVACY_POOL_ABI,
    ethers.provider
  );

  // Get pool stats
  const stats = await contract.getPoolStats();
  console.log("📊 Pool Stats:");
  console.log(`   Total Deposits: ${ethers.formatEther(stats[0])} BNB`);
  console.log(`   Total Withdrawals: ${ethers.formatEther(stats[1])} BNB`);
  console.log(`   Deposit Count: ${stats[3]}`);
  console.log(`   Queue Length: ${stats[5]}`);
  console.log(`   Pending Count: ${stats[6]}\n`);

  // Get current merkle root
  const currentRoot = await contract.getLastRoot();
  console.log(`🌳 Current Merkle Root: ${currentRoot}\n`);

  // Get next index
  const nextIndex = await contract.nextIndex();
  console.log(`📍 Next Leaf Index: ${nextIndex}\n`);

  // Fetch all Deposit events
  console.log("📥 Fetching Deposit events...");
  const filter = contract.filters.Deposit();
  const events = await contract.queryFilter(filter, 0, "latest");

  console.log(`   Found ${events.length} deposit(s)\n`);

  for (let i = 0; i < events.length; i++) {
    const event = events[i] as any;
    console.log(`   Deposit ${i}:`);
    console.log(`      Commitment: ${event.args?.commitment}`);
    console.log(`      Leaf Index: ${event.args?.leafIndex}`);
    console.log(`      Timestamp: ${new Date(Number(event.args?.timestamp) * 1000).toLocaleString()}`);
    console.log(`      Block: ${event.blockNumber}`);
  }

  console.log("\n📋 Withdrawal Queue:");
  const queueHead = await contract.queueHead();
  const queueTail = await contract.queueTail();
  console.log(`   Queue Head: ${queueHead}`);
  console.log(`   Queue Tail: ${queueTail}\n`);

  // Check each queued withdrawal
  for (let i = Number(queueHead); i < Number(queueTail); i++) {
    const withdrawal = await contract.withdrawalQueue(i);
    console.log(`   Queue ID ${i}:`);
    console.log(`      Nullifier Hash: ${withdrawal.nullifierHash}`);
    console.log(`      Recipient: ${withdrawal.recipient}`);
    console.log(`      Root: ${withdrawal.root}`);
    console.log(`      Request Time: ${new Date(Number(withdrawal.requestTime) * 1000).toLocaleString()}`);
    console.log(`      Processed: ${withdrawal.processed}`);

    // Check if withdrawal is ready
    const isReady = await contract.isWithdrawalReady(i);
    console.log(`      Ready to Process: ${isReady}\n`);
  }

  // Check if the withdrawal root is known
  if (queueTail > queueHead) {
    const firstWithdrawal = await contract.withdrawalQueue(queueHead);
    const rootIsKnown = await contract.isKnownRoot(firstWithdrawal.root);
    console.log(`🔍 Root from first withdrawal is known: ${rootIsKnown}`);
    console.log(`   Withdrawal Root: ${firstWithdrawal.root}`);
    console.log(`   Current Root: ${currentRoot}`);
    console.log(`   Match: ${firstWithdrawal.root === currentRoot}\n`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
