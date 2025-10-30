import { ethers } from "hardhat";

/**
 * Deploy PrivacyPoolZK V6
 * - Variable amounts (min 0.01 BNB)
 * - Custom delays (0-1440 minutes, including instant withdrawals)
 */

async function main() {
  console.log("🚀 Deploying AnonBNB V6 (Instant Withdrawals Enabled)...\n");

  const AnonBNB = await ethers.getContractFactory("AnonBNB");

  console.log("📝 Deploying contract with gas limit: 6M");
  const privacyPool = await AnonBNB.deploy({
    gasLimit: 6000000, // 6M gas limit for Merkle tree
  });

  console.log("⏳ Waiting for deployment confirmation...");
  await privacyPool.waitForDeployment();

  const address = await privacyPool.getAddress();

  console.log(`\n✅ AnonBNB V6 deployed to: ${address}`);
  console.log("\n📋 Save this address to your .env file:");
  console.log(`NEXT_PUBLIC_PRIVACY_POOL_ADDRESS=${address}`);

  // Verify contract constants
  const minDenom = await privacyPool.MIN_DENOMINATION();
  const minDelay = await privacyPool.MIN_DELAY();
  const maxDelay = await privacyPool.MAX_DELAY();

  console.log("\n⚙️  Contract Configuration:");
  console.log(`   Min Denomination: ${ethers.formatEther(minDenom)} BNB`);
  console.log(`   Min Delay: ${minDelay / 60n} minutes`);
  console.log(`   Max Delay: ${maxDelay / 60n} minutes`);

  // Get pool stats
  const stats = await privacyPool.getPoolStats();
  console.log("\n📊 Initial Pool Stats:");
  console.log(`   Total Deposits: ${ethers.formatEther(stats[0])} BNB`);
  console.log(`   Total Withdrawals: ${ethers.formatEther(stats[1])} BNB`);
  console.log(`   Collected Fees: ${ethers.formatEther(stats[2])} BNB`);
  console.log(`   Deposit Count: ${stats[3]}`);
  console.log(`   Pool Balance: ${ethers.formatEther(stats[4])} BNB`);
  console.log(`   Queue Length: ${stats[5]}`);
  console.log(`   Pending: ${stats[6]}`);

  // Get Merkle tree info
  const depositCount = await privacyPool.getDepositCount();
  const merkleRoot = await privacyPool.getLastRoot();
  console.log("\n🌳 Merkle Tree:");
  console.log(`   Root: ${merkleRoot}`);
  console.log(`   Total Leaves: ${depositCount}`);

  console.log("\n✨ Deployment complete!");
  console.log("\n📝 Next steps:");
  console.log("   1. Update NEXT_PUBLIC_PRIVACY_POOL_ADDRESS in .env");
  console.log("   2. Restart your Next.js dev server");
  console.log("   3. Start the relayer: npm run relayer:mainnet");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
