// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title MerkleTreeWithHistory
 * @dev Merkle tree implementation for privacy pools
 * Based on Tornado Cash's merkle tree
 *
 * This provides:
 * - O(log n) verification
 * - Efficient storage
 * - Privacy through set membership proofs
 */
contract MerkleTreeWithHistory {
    uint256 public constant FIELD_SIZE = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint256 public constant ZERO_VALUE = 21663839004416932945382355908790599225266501822907911457504978515578255421292;

    uint32 public constant levels = 20;
    bytes32[20] public filledSubtrees;
    bytes32[20] public zeros;
    uint32 public currentRootIndex = 0;
    uint32 public nextIndex = 0;
    bytes32[100] public roots; // Store last 100 roots for proof verification

    // Store all leaves for frontend access
    mapping(uint32 => bytes32) public leaves;

    constructor() {
        // Initialize zero values for empty tree
        zeros[0] = bytes32(ZERO_VALUE);
        for (uint32 i = 1; i < levels; i++) {
            zeros[i] = hashLeftRight(zeros[i - 1], zeros[i - 1]);
        }

        // Initialize root
        roots[0] = hashLeftRight(zeros[levels - 1], zeros[levels - 1]);
    }

    /**
     * @dev Hash 2 tree leaves, returns Poseidon(left, right)
     * For production, use actual Poseidon hash
     * Current: uses keccak256 for compatibility
     */
    function hashLeftRight(bytes32 _left, bytes32 _right) public pure returns (bytes32) {
        require(uint256(_left) < FIELD_SIZE, "_left should be inside the field");
        require(uint256(_right) < FIELD_SIZE, "_right should be inside the field");

        // In production, replace with Poseidon hash
        // return poseidon([_left, _right]);

        // Simplified hash for demo (use Poseidon in production)
        bytes32 result = keccak256(abi.encodePacked(_left, _right));
        // Ensure result is within field
        return bytes32(uint256(result) % FIELD_SIZE);
    }

    /**
     * @dev Insert a commitment into the tree
     */
    function _insert(bytes32 _leaf) internal returns (uint32 insertedIndex) {
        uint32 _nextIndex = nextIndex;
        require(_nextIndex < 2**levels, "Merkle tree is full. No more leaves can be added");

        // Store the leaf
        leaves[_nextIndex] = _leaf;

        uint32 currentIndex = _nextIndex;
        bytes32 currentLevelHash = _leaf;
        bytes32 left;
        bytes32 right;

        for (uint32 i = 0; i < levels; i++) {
            if (currentIndex % 2 == 0) {
                left = currentLevelHash;
                right = zeros[i];
                filledSubtrees[i] = currentLevelHash;
            } else {
                left = filledSubtrees[i];
                right = currentLevelHash;
            }

            currentLevelHash = hashLeftRight(left, right);
            currentIndex /= 2;
        }

        uint32 newRootIndex = (currentRootIndex + 1) % 100;
        currentRootIndex = newRootIndex;
        roots[newRootIndex] = currentLevelHash;
        nextIndex = _nextIndex + 1;

        return _nextIndex;
    }

    /**
     * @dev Check if root is known
     * Allows for some old roots to still be valid (for pending withdrawals)
     */
    function isKnownRoot(bytes32 _root) public view returns (bool) {
        if (_root == 0) {
            return false;
        }

        uint32 _currentRootIndex = currentRootIndex;
        uint32 i = _currentRootIndex;

        do {
            if (_root == roots[i]) {
                return true;
            }

            if (i == 0) {
                i = 100;
            }
            i--;
        } while (i != _currentRootIndex);

        return false;
    }

    /**
     * @dev Get current merkle root
     */
    function getLastRoot() public view returns (bytes32) {
        return roots[currentRootIndex];
    }

    /**
     * @dev Verify merkle proof
     * @param _leaf Leaf to verify
     * @param _pathElements Path elements for proof
     * @param _pathIndices Path indices (0 = left, 1 = right)
     */
    function verifyMerkleProof(
        bytes32 _leaf,
        bytes32[20] memory _pathElements,
        bool[20] memory _pathIndices
    ) public view returns (bool) {
        bytes32 computedHash = _leaf;

        for (uint256 i = 0; i < levels; i++) {
            if (_pathIndices[i]) {
                computedHash = hashLeftRight(_pathElements[i], computedHash);
            } else {
                computedHash = hashLeftRight(computedHash, _pathElements[i]);
            }
        }

        return isKnownRoot(computedHash);
    }
}
