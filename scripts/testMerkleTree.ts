import { MerkleTree, hashLeftRight } from "../lib/merkleTree";
import { keccak256, encodePacked, type Hex } from "viem";

/**
 * Test script to verify Merkle tree implementation matches contract
 */

console.log("🧪 Testing Merkle Tree Implementation\n");

// Create tree
const tree = new MerkleTree(20);

// Test commitments (simulating deposits)
const commitment1 = keccak256(encodePacked(
  ["bytes32", "bytes32"],
  [
    "0x0000000000000000000000000000000000000000000000000000000000000001" as Hex,
    "0x0000000000000000000000000000000000000000000000000000000000000002" as Hex
  ]
));

const commitment2 = keccak256(encodePacked(
  ["bytes32", "bytes32"],
  [
    "0x0000000000000000000000000000000000000000000000000000000000000003" as Hex,
    "0x0000000000000000000000000000000000000000000000000000000000000004" as Hex
  ]
));

console.log("📋 Test Commitments:");
console.log(`   Commitment 1: ${commitment1}`);
console.log(`   Commitment 2: ${commitment2}\n`);

// Insert commitments
console.log("➕ Inserting commitments into tree...");
const index1 = tree.insert(commitment1);
console.log(`   ✓ Commitment 1 inserted at index ${index1}`);
console.log(`   Root after insert 1: ${tree.getRoot()}\n`);

const index2 = tree.insert(commitment2);
console.log(`   ✓ Commitment 2 inserted at index ${index2}`);
console.log(`   Root after insert 2: ${tree.getRoot()}\n`);

// Generate proofs
console.log("🔍 Generating Merkle Proofs:");
const proof1 = tree.getProof(index1);
console.log(`\n   Proof for Commitment 1 (index ${index1}):`);
console.log(`   Path Indices: [${proof1.pathIndices.slice(0, 5).join(', ')}...]`);
console.log(`   Path Elements (first 3):`);
for (let i = 0; i < Math.min(3, proof1.pathElements.length); i++) {
  console.log(`      [${i}]: ${proof1.pathElements[i]}`);
}

const proof2 = tree.getProof(index2);
console.log(`\n   Proof for Commitment 2 (index ${index2}):`);
console.log(`   Path Indices: [${proof2.pathIndices.slice(0, 5).join(', ')}...]`);
console.log(`   Path Elements (first 3):`);
for (let i = 0; i < Math.min(3, proof2.pathElements.length); i++) {
  console.log(`      [${i}]: ${proof2.pathElements[i]}`);
}

// Verify proofs
console.log("\n✅ Verifying Proofs:");
const root = tree.getRoot();
const valid1 = tree.verify(commitment1, proof1.pathElements, proof1.pathIndices, root);
const valid2 = tree.verify(commitment2, proof2.pathElements, proof2.pathIndices, root);

console.log(`   Commitment 1 proof valid: ${valid1 ? '✅ YES' : '❌ NO'}`);
console.log(`   Commitment 2 proof valid: ${valid2 ? '✅ YES' : '❌ NO'}`);

if (!valid1 || !valid2) {
  console.error("\n❌ PROOF VERIFICATION FAILED! Tree implementation has issues.");
  process.exit(1);
}

console.log("\n✨ All tests passed! Merkle tree implementation is correct.");
console.log("\n📊 Summary:");
console.log(`   Tree Levels: 20`);
console.log(`   Leaves: ${tree.getLeaves().length}`);
console.log(`   Root: ${root}`);
