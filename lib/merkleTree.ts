import { keccak256, encodePacked, type Hex } from 'viem';

/**
 * Merkle Tree utilities for Privacy Pool V3
 * Handles merkle proof generation for withdrawal verification
 */

const FIELD_SIZE = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const ZERO_VALUE = 21663839004416932945382355908790599225266501822907911457504978515578255421292n;
const TREE_LEVELS = 20;

/**
 * Hash two values (left and right) for merkle tree
 * Uses keccak256 modulo field size for compatibility with contract
 */
export function hashLeftRight(left: Hex, right: Hex): Hex {
  const hash = keccak256(encodePacked(['bytes32', 'bytes32'], [left, right]));
  const hashBigInt = BigInt(hash);
  const result = hashBigInt % FIELD_SIZE;
  return `0x${result.toString(16).padStart(64, '0')}` as Hex;
}

/**
 * MerkleTree class for tracking deposits and generating proofs
 */
export class MerkleTree {
  private levels: number;
  private zeros: Hex[];
  private filledSubtrees: Hex[];
  private leaves: Hex[];
  private root: Hex;
  private tree: Hex[][]; // Store full tree structure for accurate proof generation

  constructor(levels: number = TREE_LEVELS) {
    this.levels = levels;
    this.leaves = [];
    this.tree = [];

    // Initialize zero values
    this.zeros = [];
    this.zeros[0] = `0x${ZERO_VALUE.toString(16).padStart(64, '0')}` as Hex;

    for (let i = 1; i < levels; i++) {
      this.zeros[i] = hashLeftRight(this.zeros[i - 1], this.zeros[i - 1]);
    }

    // Initialize filled subtrees
    this.filledSubtrees = [...this.zeros];

    // Initialize tree levels
    for (let i = 0; i <= levels; i++) {
      this.tree[i] = [];
    }

    // Calculate initial root
    this.root = hashLeftRight(this.zeros[levels - 1], this.zeros[levels - 1]);
  }

  /**
   * Insert a leaf (commitment) into the tree
   */
  insert(leaf: Hex): number {
    const index = this.leaves.length;

    if (index >= 2 ** this.levels) {
      throw new Error('Merkle tree is full');
    }

    this.leaves.push(leaf);
    this.tree[0][index] = leaf; // Store leaf at level 0

    let currentIndex = index;
    let currentLevelHash = leaf;

    for (let i = 0; i < this.levels; i++) {
      const isLeft = currentIndex % 2 === 0;

      if (isLeft) {
        this.filledSubtrees[i] = currentLevelHash;
        currentLevelHash = hashLeftRight(currentLevelHash, this.zeros[i]);
      } else {
        currentLevelHash = hashLeftRight(this.filledSubtrees[i], currentLevelHash);
      }

      currentIndex = Math.floor(currentIndex / 2);

      // Store hash at this level
      this.tree[i + 1][currentIndex] = currentLevelHash;
    }

    this.root = currentLevelHash;
    return index;
  }

  /**
   * Generate merkle proof for a leaf at given index
   */
  getProof(index: number): { pathElements: Hex[]; pathIndices: boolean[] } {
    if (index >= this.leaves.length) {
      throw new Error('Index out of bounds');
    }

    const pathElements: Hex[] = [];
    const pathIndices: boolean[] = [];

    let currentIndex = index;

    for (let i = 0; i < this.levels; i++) {
      const isRight = currentIndex % 2 === 1;
      pathIndices.push(isRight);

      // Get sibling index at current level
      const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;

      // Get sibling value from tree or use zero value
      let sibling: Hex;
      if (this.tree[i] && this.tree[i][siblingIndex]) {
        sibling = this.tree[i][siblingIndex];
      } else {
        sibling = this.zeros[i];
      }

      pathElements.push(sibling);
      currentIndex = Math.floor(currentIndex / 2);
    }

    return { pathElements, pathIndices };
  }

  /**
   * Get current merkle root
   */
  getRoot(): Hex {
    return this.root;
  }

  /**
   * Get all leaves
   */
  getLeaves(): Hex[] {
    return [...this.leaves];
  }

  /**
   * Verify a merkle proof
   */
  verify(
    leaf: Hex,
    pathElements: Hex[],
    pathIndices: boolean[],
    root: Hex
  ): boolean {
    let computedHash = leaf;

    for (let i = 0; i < pathElements.length; i++) {
      if (pathIndices[i]) {
        // If index is true (right), sibling is on left
        computedHash = hashLeftRight(pathElements[i], computedHash);
      } else {
        // If index is false (left), sibling is on right
        computedHash = hashLeftRight(computedHash, pathElements[i]);
      }
    }

    return computedHash.toLowerCase() === root.toLowerCase();
  }
}

/**
 * Local storage keys for merkle tree state
 */
const MERKLE_TREE_KEY = 'anonbnb_merkle_tree';
const DEPOSIT_INDEX_KEY = 'anonbnb_deposit_index';

/**
 * Save merkle tree state to local storage
 */
export function saveMerkleTreeState(tree: MerkleTree) {
  try {
    const state = {
      leaves: tree.getLeaves(),
      root: tree.getRoot(),
      timestamp: Date.now(),
    };
    localStorage.setItem(MERKLE_TREE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save merkle tree state:', error);
  }
}

/**
 * Load merkle tree state from local storage
 */
export function loadMerkleTreeState(): MerkleTree | null {
  try {
    const stored = localStorage.getItem(MERKLE_TREE_KEY);
    if (!stored) return null;

    const state = JSON.parse(stored);
    const tree = new MerkleTree();

    // Rebuild tree from leaves
    for (const leaf of state.leaves) {
      tree.insert(leaf);
    }

    return tree;
  } catch (error) {
    console.error('Failed to load merkle tree state:', error);
    return null;
  }
}

/**
 * Save deposit index mapping (commitment → tree index)
 */
export function saveDepositIndex(commitment: Hex, index: number) {
  try {
    const indexes = getDepositIndexes();
    indexes[commitment] = index;
    localStorage.setItem(DEPOSIT_INDEX_KEY, JSON.stringify(indexes));
  } catch (error) {
    console.error('Failed to save deposit index:', error);
  }
}

/**
 * Get all deposit index mappings
 */
export function getDepositIndexes(): Record<string, number> {
  try {
    const stored = localStorage.getItem(DEPOSIT_INDEX_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Failed to load deposit indexes:', error);
    return {};
  }
}

/**
 * Get deposit index for a commitment
 */
export function getDepositIndex(commitment: Hex): number | undefined {
  const indexes = getDepositIndexes();
  return indexes[commitment];
}

/**
 * Clear merkle tree state (useful for testing)
 */
export function clearMerkleTreeState() {
  localStorage.removeItem(MERKLE_TREE_KEY);
  localStorage.removeItem(DEPOSIT_INDEX_KEY);
}
