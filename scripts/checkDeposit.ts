import { ethers } from "hardhat";

async function main() {
  const contractAddress = "0xc73e10627b00Ba3903f781aC62907D51eC92A742";
  const contract = await ethers.getContractAt("PrivacyPoolZK", contractAddress);

  console.log("📊 Checking contract status...\n");

  const stats = await contract.getPoolStats();
  console.log("Pool Stats:");
  console.log(`  Total Deposits: ${ethers.formatEther(stats[0])} BNB`);
  console.log(`  Total Withdrawals: ${ethers.formatEther(stats[1])} BNB`);
  console.log(`  Collected Fees: ${ethers.formatEther(stats[2])} BNB`);
  console.log(`  Deposit Count: ${stats[3].toString()}`);
  console.log(`  Pool Balance: ${ethers.formatEther(stats[4])} BNB`);
  console.log(`  Queue Length: ${stats[5].toString()}\n`);

  const nextIndex = await contract.nextIndex();
  console.log(`Next Leaf Index: ${nextIndex.toString()}`);

  if (nextIndex > 0n) {
    console.log("\n📝 Deposits:");
    const commitments = await contract.getCommitments(0, Number(nextIndex));
    for (let i = 0; i < commitments.length; i++) {
      console.log(`  [${i}] ${commitments[i]}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
