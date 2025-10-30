import { ethers } from "hardhat";
import { PRIVACY_POOL_ABI } from "../lib/contractABI";

const PRIVACY_POOL_ADDRESS = process.env.NEXT_PUBLIC_PRIVACY_POOL_ADDRESS;

// The data from your console logs
const COMMITMENT = "0x282caa5d085de2e332940a1f4df77dc52ea8cdb9cacbf1e08af1216f52aef872";
const LEAF_INDEX = 1;
const MERKLE_PROOF = [
  "0x1d3791942fc3f96f5f9d6cd3b0e4755dc179892a1cfd85ca2e3dd5cbb9ab39f4",
  "0x1f5eb01ea370bf1b163d95a8b0e5c76dbea5e0165d575108690d211926b29910",
  "0x0d8ef6e2f91fdf040691bcd02b551ca93b71b4b6f06f7e6b7b819c61166139b5",
  "0x0173a4c8b0020300fa8913076264165574baacfbd1c2248ea2087bf1f2b2e6cd",
  "0x1e03b259fb1ebbf752ca21c214fa0a619fdf2676265cc81da81c58cc05366ba6",
  "0x0000000000000000000000000000000000000000000000000000000000000000",
  "0x0000000000000000000000000000000000000000000000000000000000000000",
  "0x0000000000000000000000000000000000000000000000000000000000000000",
  "0x0000000000000000000000000000000000000000000000000000000000000000",
  "0x0000000000000000000000000000000000000000000000000000000000000000",
  "0x0000000000000000000000000000000000000000000000000000000000000000",
  "0x0000000000000000000000000000000000000000000000000000000000000000",
  "0x0000000000000000000000000000000000000000000000000000000000000000",
  "0x0000000000000000000000000000000000000000000000000000000000000000",
  "0x0000000000000000000000000000000000000000000000000000000000000000",
  "0x0000000000000000000000000000000000000000000000000000000000000000",
  "0x0000000000000000000000000000000000000000000000000000000000000000",
  "0x0000000000000000000000000000000000000000000000000000000000000000",
  "0x0000000000000000000000000000000000000000000000000000000000000000",
  "0x0000000000000000000000000000000000000000000000000000000000000000"
];
const PATH_INDICES = [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false];

async function main() {
  if (!PRIVACY_POOL_ADDRESS) {
    console.error("❌ Contract address not set");
    process.exit(1);
  }

  console.log("🧪 Testing Merkle Proof Against Contract\n");

  const contract = new ethers.Contract(
    PRIVACY_POOL_ADDRESS,
    PRIVACY_POOL_ABI,
    ethers.provider
  );

  // Get contract state
  console.log("📊 Contract State:");
  const lastRoot = await contract.getLastRoot();
  console.log(`   Last Root: ${lastRoot}`);

  const nextIndex = await contract.nextIndex();
  console.log(`   Next Index: ${nextIndex}`);

  const stats = await contract.getPoolStats();
  console.log(`   Deposit Count: ${stats[3]}\n`);

  // Fetch all deposits
  console.log("📥 Fetching all deposits...");
  const filter = contract.filters.Deposit();
  const events = await contract.queryFilter(filter, 0, "latest");
  console.log(`   Found ${events.length} deposits\n`);

  for (let i = 0; i < events.length; i++) {
    const event = events[i] as any;
    console.log(`   Deposit ${i}:`);
    console.log(`      Commitment: ${event.args.commitment}`);
    console.log(`      Leaf Index: ${event.args.leafIndex}`);
  }

  // Test proof verification
  console.log("\n🔍 Testing Proof Verification:");
  console.log(`   Commitment: ${COMMITMENT}`);
  console.log(`   Leaf Index: ${LEAF_INDEX}\n`);

  try {
    const isValid = await contract.verifyMerkleProof(
      COMMITMENT,
      MERKLE_PROOF,
      PATH_INDICES
    );

    console.log(`   ✅ Contract says proof is: ${isValid ? "VALID ✅" : "INVALID ❌"}\n`);

    if (!isValid) {
      console.log("🔧 Debugging info:");
      console.log(`   Frontend computed root: 0x094d44e35296c700b846546416652348381a97ad30445b81e651c3da27365ef6`);
      console.log(`   Contract last root: ${lastRoot}`);
      console.log(`   Roots match: ${lastRoot.toLowerCase() === "0x094d44e35296c700b846546416652348381a97ad30445b81e651c3da27365ef6"}`);
    }
  } catch (error: any) {
    console.error(`   ❌ Error: ${error.message}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
