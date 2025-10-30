import { ethers } from "hardhat";
import { PRIVACY_POOL_ABI } from "../lib/contractABI";

/**
 * Automated Relayer Service
 * Runs in background to process withdrawal queue automatically
 */

const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY || process.env.PRIVATE_KEY;
const PRIVACY_POOL_ADDRESS = process.env.NEXT_PUBLIC_PRIVACY_POOL_ADDRESS;
const NETWORK = process.env.NETWORK || "bscTestnet";
const PROCESS_INTERVAL = 60 * 1000; // Check every 60 seconds
const BATCH_SIZE = 10; // Process up to 10 withdrawals per batch

async function main() {
  if (!RELAYER_PRIVATE_KEY) {
    console.error("❌ RELAYER_PRIVATE_KEY not set in .env");
    process.exit(1);
  }

  if (!PRIVACY_POOL_ADDRESS) {
    console.error("❌ NEXT_PUBLIC_PRIVACY_POOL_ADDRESS not set in .env");
    process.exit(1);
  }

  console.log("🤖 Starting Privacy Pool Relayer Service...");
  console.log(`📍 Contract: ${PRIVACY_POOL_ADDRESS}`);
  console.log(`🌐 Network: ${NETWORK}`);
  console.log(`⏱️  Check Interval: ${PROCESS_INTERVAL / 1000}s`);
  console.log(`📦 Batch Size: ${BATCH_SIZE}`);
  console.log("");

  // Connect to network
  const provider = ethers.provider;
  const wallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);

  console.log(`💼 Relayer Address: ${wallet.address}`);

  const balance = await provider.getBalance(wallet.address);
  console.log(`💰 Relayer Balance: ${ethers.formatEther(balance)} BNB`);
  console.log("");

  // Connect to contract
  const contract = new ethers.Contract(
    PRIVACY_POOL_ADDRESS,
    PRIVACY_POOL_ABI,
    wallet
  );

  let processedCount = 0;

  // Main processing loop
  async function processQueue() {
    try {
      // Check pending withdrawals
      const pending = await contract.getPendingWithdrawals();

      if (pending > 0) {
        console.log(`\n⏳ Found ${pending} pending withdrawal(s)`);
        console.log(`📤 Processing batch of ${Math.min(BATCH_SIZE, Number(pending))}...`);

        // Process withdrawals
        const tx = await contract.processWithdrawals(BATCH_SIZE, {
          gasLimit: 500000 * BATCH_SIZE, // Estimate gas per withdrawal
        });

        console.log(`📝 Transaction sent: ${tx.hash}`);
        const receipt = await tx.wait();

        // Count successful withdrawals from events
        const events = receipt?.logs || [];
        const processedEvents = events.filter((log: any) => {
          try {
            const parsed = contract.interface.parseLog(log);
            return parsed?.name === "WithdrawalProcessed";
          } catch {
            return false;
          }
        });

        processedCount += processedEvents.length;

        console.log(`✅ Processed ${processedEvents.length} withdrawal(s)`);
        console.log(`📊 Total processed this session: ${processedCount}`);
        console.log(`⛽ Gas used: ${receipt?.gasUsed.toString()}`);

        // Show details of processed withdrawals
        for (const log of processedEvents) {
          const parsed = contract.interface.parseLog(log);
          if (parsed && parsed.args) {
            // WithdrawalProcessed(queueId, commitment, recipient, amount, txHash)
            // args[0] = queueId, args[1] = commitment, args[2] = recipient, args[3] = amount, args[4] = txHash
            const recipient = parsed.args[2];
            const amount = parsed.args[3];
            console.log(`   → Sent ${ethers.formatEther(amount)} BNB to ${recipient}`);
          }
        }
      } else {
        process.stdout.write(`\r⏸️  Waiting for withdrawals... (processed: ${processedCount})`);
      }

      // Get updated stats
      const stats = await contract.getPoolStats();
      const queueLength = Number(stats[5]);
      const pendingNow = Number(stats[6]);

      if (queueLength > 0) {
        console.log(`\n📋 Queue Status: ${queueLength} total, ${pendingNow} ready to process`);
      }

    } catch (error: any) {
      console.error("\n❌ Error processing withdrawals:", error);

      // Try to decode the error
      if (error.data) {
        console.error("Error data:", error.data);
      }
      if (error.reason) {
        console.error("Error reason:", error.reason);
      }
      if (error.transaction) {
        console.error("Failed transaction:", {
          to: error.transaction.to,
          from: error.transaction.from,
          data: error.transaction.data?.slice(0, 100) + "..."
        });
      }
    }
  }

  // Run immediately
  await processQueue();

  // Run on interval
  setInterval(processQueue, PROCESS_INTERVAL);

  console.log("\n✨ Relayer service is running...");
  console.log("Press Ctrl+C to stop\n");
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\n👋 Shutting down relayer service...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n\n👋 Shutting down relayer service...");
  process.exit(0);
});

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
