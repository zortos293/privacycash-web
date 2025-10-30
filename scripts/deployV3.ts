import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying PrivacyPoolZK (V3) with Merkle Proofs...\n");

  const PrivacyPoolZK = await ethers.getContractFactory("PrivacyPoolZK");

  // Deploy with manual gas limit
  const privacyPoolZK = await PrivacyPoolZK.deploy({
    gasLimit: 6000000, // 6M gas limit for merkle tree contract
  });

  await privacyPoolZK.waitForDeployment();

  const address = await privacyPoolZK.getAddress();

  console.log("✅ PrivacyPoolZK (V3) deployed successfully!");
  console.log(`📍 Contract Address: ${address}`);
  console.log("\n📋 Save this address to your .env file:");
  console.log(`NEXT_PUBLIC_PRIVACY_POOL_ADDRESS=${address}`);

  // Get initial stats
  console.log("\n📊 Initial Pool Stats:");
  const stats = await privacyPoolZK.getPoolStats();
  console.log(`   Total Deposits: ${ethers.formatEther(stats[0])} BNB`);
  console.log(`   Total Withdrawals: ${ethers.formatEther(stats[1])} BNB`);
  console.log(`   Collected Fees: ${ethers.formatEther(stats[2])} BNB`);
  console.log(`   Deposit Count: ${stats[3]}`);
  console.log(`   Pool Balance: ${ethers.formatEther(stats[4])} BNB`);
  console.log(`   Queue Length: ${stats[5]}`);
  console.log(`   Pending Count: ${stats[6]}`);

  // Get merkle root
  const root = await privacyPoolZK.getLastRoot();
  console.log(`\n🌳 Initial Merkle Root: ${root}`);

  // Get relayer info
  const relayer = await privacyPoolZK.relayer();
  const relayerFee = await privacyPoolZK.relayerFee();
  console.log(`\n🤖 Relayer Configuration:`);
  console.log(`   Relayer Address: ${relayer}`);
  console.log(`   Relayer Fee: ${ethers.formatEther(relayerFee)} BNB`);

  console.log("\n✨ V3 Features Enabled:");
  console.log("   ✅ Merkle Tree (20 levels = 1M deposits)");
  console.log("   ✅ Set Membership Proofs");
  console.log("   ✅ Unlinkable Deposits/Withdrawals");
  console.log("   ✅ 95% Privacy Level");
  console.log("   ✅ O(log n) Verification");

  console.log("\n🔗 View on BSCScan:");
  console.log(`   https://testnet.bscscan.com/address/${address}`);

  console.log("\n📖 Next Steps:");
  console.log("   1. Update .env with new contract address");
  console.log("   2. Restart relayer service");
  console.log("   3. Restart web application");
  console.log("   4. Test deposit with merkle proof");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
