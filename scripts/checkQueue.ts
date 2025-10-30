import { ethers } from "hardhat";
import { PRIVACY_POOL_ABI } from "../lib/contractABI";

const PRIVACY_POOL_ADDRESS = process.env.NEXT_PUBLIC_PRIVACY_POOL_ADDRESS;

async function main() {
  if (!PRIVACY_POOL_ADDRESS) {
    console.error("❌ Contract address not set");
    process.exit(1);
  }

  console.log("🔍 Checking Withdrawal Queue\n");

  const contract = new ethers.Contract(
    PRIVACY_POOL_ADDRESS,
    PRIVACY_POOL_ABI,
    ethers.provider
  );

  const queueHead = await contract.queueHead();
  const queueTail = await contract.queueTail();

  console.log(`Queue Head: ${queueHead}`);
  console.log(`Queue Tail: ${queueTail}`);
  console.log(`Queue Length: ${Number(queueTail) - Number(queueHead)}\n`);

  if (queueHead >= queueTail) {
    console.log("✅ Queue is empty");
    return;
  }

  // Check first withdrawal
  const withdrawal = await contract.withdrawalQueue(queueHead);
  const isReady = await contract.isWithdrawalReady(queueHead);

  const currentBlock = await ethers.provider.getBlock('latest');
  const currentTime = currentBlock ? currentBlock.timestamp : Math.floor(Date.now() / 1000);

  console.log("📦 Withdrawal Details:");
  console.log(`   Recipient: ${withdrawal.recipient}`);
  console.log(`   Request Time: ${Number(withdrawal.requestTime)} (${new Date(Number(withdrawal.requestTime) * 1000).toLocaleString()})`);
  console.log(`   Current Time: ${currentTime} (${new Date(currentTime * 1000).toLocaleString()})`);
  console.log(`   Processed: ${withdrawal.processed}`);
  console.log(`   Is Ready: ${isReady}\n`);

  if (!isReady && !withdrawal.processed) {
    const timeLeft = Number(withdrawal.requestTime) - currentTime;
    console.log(`⏳ Time Remaining: ${timeLeft} seconds (${Math.ceil(timeLeft / 60)} minutes)`);
  } else if (isReady && !withdrawal.processed) {
    console.log("✅ READY TO PROCESS!");
  }

  // Get pool balance
  const balance = await ethers.provider.getBalance(PRIVACY_POOL_ADDRESS);
  console.log(`\n💰 Pool Balance: ${ethers.formatEther(balance)} BNB`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
