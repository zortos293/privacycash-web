import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying PrivacyPoolZK contract...\n");

  const PrivacyPoolZK = await ethers.getContractFactory("PrivacyPoolZK");

  console.log("📝 Deploying contract with gas limit: 6M");
  // Deploy with manual gas limit (increased for Merkle tree initialization)
  const privacyPool = await PrivacyPoolZK.deploy({
    gasLimit: 6000000, // 6M gas limit for Merkle tree
  });

  console.log("⏳ Waiting for deployment confirmation...");
  await privacyPool.waitForDeployment();

  const address = await privacyPool.getAddress();

  console.log(`\n✅ PrivacyPoolZK deployed to: ${address}`);
  console.log("\n📋 Save this address to your .env file:");
  console.log(`NEXT_PUBLIC_PRIVACY_POOL_ADDRESS=${address}`);

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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
