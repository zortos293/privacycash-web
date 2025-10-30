pragma circom 2.1.0;

// Note: This circuit uses simplified Poseidon for demonstration
// In production, use circomlib: https://github.com/iden3/circomlib

/**
 * Withdrawal Circuit for Privacy Pool
 *
 * This circuit proves:
 * 1. Knowledge of nullifier and secret that hash to a valid commitment
 * 2. The nullifier hasn't been used before (checked in contract)
 * 3. The recipient is correctly specified
 *
 * Public Inputs:
 * - root: Merkle root of all deposits
 * - nullifierHash: Hash of nullifier (prevents double-spending)
 * - recipient: Address receiving the withdrawal
 *
 * Private Inputs:
 * - nullifier: Secret random value (kept private)
 * - secret: Secret random value (kept private)
 * - pathElements[20]: Merkle proof path
 * - pathIndices[20]: Merkle proof indices
 */

template Withdraw() {
    // Public inputs
    signal input root;
    signal input nullifierHash;
    signal input recipient;

    // Private inputs
    signal input nullifier;
    signal input secret;
    signal input pathElements[20];
    signal input pathIndices[20];

    // 1. Compute commitment = Hash(nullifier, secret)
    component commitmentHasher = Poseidon(2);
    commitmentHasher.inputs[0] <== nullifier;
    commitmentHasher.inputs[1] <== secret;
    signal commitment <== commitmentHasher.out;

    // 2. Verify nullifierHash = Hash(nullifier)
    component nullifierHasher = Poseidon(1);
    nullifierHasher.inputs[0] <== nullifier;
    nullifierHash === nullifierHasher.out;

    // 3. Verify merkle proof that commitment is in the tree
    component merkleProof = MerkleTreeChecker(20);
    merkleProof.leaf <== commitment;
    merkleProof.root <== root;

    for (var i = 0; i < 20; i++) {
        merkleProof.pathElements[i] <== pathElements[i];
        merkleProof.pathIndices[i] <== pathIndices[i];
    }

    // Output validation (just for clarity)
    signal recipientSquare;
    recipientSquare <== recipient * recipient;
}

/**
 * Merkle Tree Checker
 * Verifies that a leaf is part of a merkle tree
 */
template MerkleTreeChecker(levels) {
    signal input leaf;
    signal input root;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    component selectors[levels];
    component hashers[levels];

    signal hashes[levels + 1];
    hashes[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        selectors[i] = DualMux();
        selectors[i].in[0] <== hashes[i];
        selectors[i].in[1] <== pathElements[i];
        selectors[i].s <== pathIndices[i];

        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== selectors[i].out[0];
        hashers[i].inputs[1] <== selectors[i].out[1];

        hashes[i + 1] <== hashers[i].out;
    }

    root === hashes[levels];
}

/**
 * Dual Multiplexer
 * If s == 0 returns [in[0], in[1]]
 * If s == 1 returns [in[1], in[0]]
 */
template DualMux() {
    signal input in[2];
    signal input s;
    signal output out[2];

    s * (1 - s) === 0; // Ensure s is 0 or 1

    out[0] <== (in[1] - in[0]) * s + in[0];
    out[1] <== (in[0] - in[1]) * s + in[1];
}

// Main component
component main {public [root, nullifierHash, recipient]} = Withdraw();
