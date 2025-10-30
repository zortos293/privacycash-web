import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const address = await deployer.getAddress();
  const balance = await ethers.provider.getBalance(address);

  console.log("Deployer Address:", address);
  console.log("Balance:", ethers.formatEther(balance), "BNB");

  if (balance === 0n) {
    console.log("\n⚠️  WARNING: Your deployer wallet has no BNB!");
    console.log("Get testnet BNB from: https://testnet.bnbchain.org/faucet-smart");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
