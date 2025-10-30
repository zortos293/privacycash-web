"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient, useBlockNumber } from "wagmi";

// Disable static optimization to prevent SSR issues with Web3 libraries
export const dynamic = 'force-dynamic';
import { parseEther, formatEther, type Hex } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Clock, Info, History, ExternalLink, RefreshCw, Download, CheckCircle, XCircle, Loader2, ArrowUpCircle, Lock, BookOpen, GitlabIcon, Send } from "lucide-react";
import HowItWorks from "@/components/HowItWorks";
import { PRIVACY_POOL_ABI } from "@/lib/contractABI";
import { createDepositNote, createChangeNote, updateDepositNoteStatus, getRetryableNotes, getAllDepositNotes, storeDepositNote, getDepositNote, storeWithdrawalTransaction, getCombinedTransactionHistory, cleanupDuplicateWithdrawals, getAllWithdrawalTransactions, updateWithdrawalStatus, getDepositNotesForWallet, getWithdrawalsForWallet, type DepositNote, type WithdrawalTransaction, type CombinedTransaction } from "@/lib/privacyPool";
import { MerkleTree, loadMerkleTreeState, saveMerkleTreeState, saveDepositIndex, getDepositIndex } from "@/lib/merkleTree";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const PRIVACY_POOL_ADDRESS = process.env.NEXT_PUBLIC_PRIVACY_POOL_ADDRESS as `0x${string}` | undefined;

export default function Home() {
  const [activeTab, setActiveTab] = useState<"deposit" | "send" | "backup">("deposit"); // Tab switcher
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("0.01");
  const [delayMinutes, setDelayMinutes] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [currentNote, setCurrentNote] = useState<DepositNote | null>(null);
  const [stage, setStage] = useState<"deposit" | "queue">("deposit");
  const [merkleTree, setMerkleTree] = useState<MerkleTree | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [retryableNotes, setRetryableNotes] = useState<DepositNote[]>([]);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [shouldAutoQueue, setShouldAutoQueue] = useState(false); // Controls auto-queue behavior
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0); // Force history refresh
  const [showWelcomeModal, setShowWelcomeModal] = useState(false); // First-time user welcome
  const ITEMS_PER_PAGE = 10;

  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: currentBlockNumber } = useBlockNumber({ watch: true });
  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address: address,
  });

  const { writeContract, data: hash, error: writeError, isPending: isWritePending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Debug transaction states
  useEffect(() => {
    console.log("📊 Transaction State:", {
      hash,
      isWritePending,
      isConfirming,
      isConfirmed,
      writeError: writeError?.message,
      stage,
      hasCurrentNote: !!currentNote
    });
  }, [hash, isWritePending, isConfirming, isConfirmed, writeError, stage, currentNote]);

  // Track transaction submission and confirmation with toasts
  useEffect(() => {
    if (hash && isConfirming && !isConfirmed) {
      const txType = stage === "deposit" ? "Deposit" : "Withdrawal";
      toast.loading(`${txType} transaction submitted! Waiting for confirmation...`, {
        id: `tx-${hash}`,
        description: `Transaction: ${hash.slice(0, 10)}...${hash.slice(-8)}`,
      });
    }
  }, [hash, isConfirming, isConfirmed, stage]);

  const { data: poolStats, refetch: refetchPoolStats } = useReadContract({
    address: PRIVACY_POOL_ADDRESS,
    abi: PRIVACY_POOL_ABI,
    functionName: "getPoolStats",
  });

  // Initialize Merkle tree on mount (client-side only)
  useEffect(() => {
    const loadTree = async () => {
      if (typeof window === 'undefined') return; // Only run on client

      // Check if contract address has changed (new deployment)
      const storedAddress = localStorage.getItem('privacy_pool_address');
      if (storedAddress && storedAddress !== PRIVACY_POOL_ADDRESS) {
        // Check if there are any deposit notes
        const allNotes = getAllDepositNotes();
        if (allNotes.length > 0) {
          toast.warning(
            `Contract updated! ${allNotes.length} old deposit(s) from previous contract cannot be recovered. Only deposits made to the NEW contract will be visible.`,
            { duration: 8000 }
          );
        }

        // Clear all old data
        localStorage.removeItem('merkle_tree');
        localStorage.removeItem('all_deposit_notes');
        localStorage.removeItem('withdrawal_transactions');
      }

      // Store current contract address
      if (PRIVACY_POOL_ADDRESS) {
        localStorage.setItem('privacy_pool_address', PRIVACY_POOL_ADDRESS);
      }

      let tree = loadMerkleTreeState();
      if (!tree) {
        tree = new MerkleTree();
      }
      setMerkleTree(tree);

      // Clean up duplicate withdrawals from localStorage
      cleanupDuplicateWithdrawals();
    };
    loadTree();
  }, []);

  // Listen for WithdrawalProcessed events to capture actual transaction hash
  useEffect(() => {
    if (!publicClient || !PRIVACY_POOL_ADDRESS || !address) return;

    let isSubscribed = true;

    const watchWithdrawalEvents = async () => {
      console.log("👂 Setting up WithdrawalProcessed event listener...");

      try {
        // Get user's deposits to watch
        const userNotes = getDepositNotesForWallet(address);
        const userCommitments = userNotes.map(n => n.commitment);

        if (userCommitments.length === 0) return;

        // First, fetch past events for completed withdrawals (to get their real tx hashes)
        console.log("🔍 Fetching past WithdrawalProcessed events...");
        try {
          const currentBlock = await publicClient.getBlockNumber();
          const fromBlock = currentBlock - 10000n; // Last ~10k blocks (~8 hours on BSC)

          const logs = await publicClient.getContractEvents({
            address: PRIVACY_POOL_ADDRESS,
            abi: PRIVACY_POOL_ABI,
            eventName: 'WithdrawalProcessed',
            fromBlock: fromBlock > 0n ? fromBlock : 0n,
            toBlock: 'latest',
          });


          for (const log of logs) {
            const { args, transactionHash } = log as any;
            const commitment = args?.commitment;

            if (commitment && userCommitments.includes(commitment)) {
              console.log(`  📝 Found past withdrawal for ${commitment.slice(0, 10)}: ${transactionHash}`);

              // Update with real tx hash
              updateDepositNoteStatus(commitment, 'completed', {
                withdrawalTxHash: transactionHash
              });

              const allWithdrawals = getAllWithdrawalTransactions();
              let withdrawal = allWithdrawals.find(w => w.commitment === commitment);

              // For multi-deposit, secondary deposits won't match by commitment
              // Try to find by queueTxHash from the deposit note
              if (!withdrawal) {
                const depositNote = getDepositNote(commitment);
                if (depositNote?.queueTxHash) {
                  withdrawal = allWithdrawals.find(w => w.queueTxHash === depositNote.queueTxHash);
                  if (withdrawal) {
                    console.log(`  ℹ️ Found withdrawal by queueTxHash (multi-deposit secondary)`);
                  }
                }
              }

              if (withdrawal && !withdrawal.withdrawalTxHash) {
                updateWithdrawalStatus(withdrawal.id, 'completed', {
                  withdrawalTxHash: transactionHash
                });
                console.log(`  ✅ Updated past withdrawal with real tx hash`);
              }
            }
          }
        } catch (error) {
          console.error("Failed to fetch past events:", error);
        }

        // Watch for WithdrawalProcessed events
        const unwatchWithdrawal = publicClient.watchContractEvent({
          address: PRIVACY_POOL_ADDRESS,
          abi: PRIVACY_POOL_ABI,
          eventName: 'WithdrawalProcessed',
          onLogs: (logs) => {
            if (!isSubscribed) return;

            for (const log of logs) {
              try {
                // WithdrawalProcessed(uint256 indexed queueId, bytes32 indexed commitment, address recipient, uint256 amount, bytes32 txHash)
                const { args, transactionHash } = log as any;
                const commitment = args?.commitment;

                // Check if this is one of user's deposits
                if (commitment && userCommitments.includes(commitment)) {
                  console.log(`   📝 Transaction hash: ${transactionHash}`);

                  // Update deposit info with real transaction hash
                  updateDepositNoteStatus(commitment, 'completed', {
                    withdrawalTxHash: transactionHash
                  });

                  // Update withdrawal transaction if exists
                  const allWithdrawals = getAllWithdrawalTransactions();
                  let withdrawal = allWithdrawals.find(w => w.commitment === commitment);

                  // For multi-deposit, secondary deposits won't match by commitment
                  // Try to find by queueTxHash from the deposit note
                  if (!withdrawal) {
                    const depositNote = getDepositNote(commitment);
                    if (depositNote?.queueTxHash) {
                      withdrawal = allWithdrawals.find(w => w.queueTxHash === depositNote.queueTxHash);
                      if (withdrawal) {
                        console.log(`   ℹ️ Found withdrawal by queueTxHash (multi-deposit secondary)`);
                      }
                    }
                  }

                  if (withdrawal) {
                    updateWithdrawalStatus(withdrawal.id, 'completed', {
                      withdrawalTxHash: transactionHash
                    });
                    console.log(`   ✅ Updated withdrawal ${withdrawal.id.slice(0, 10)} with real tx hash`);
                  } else {
                    console.log(`   ⚠️ No withdrawal transaction found for ${commitment.slice(0, 10)}`);
                  }

                  // Refresh UI
                  setHistoryRefreshTrigger(prev => prev + 1);

                  // Show toast notification
                  toast.success("Withdrawal Completed!", {
                    description: `Your funds have been sent! Transaction: ${transactionHash.slice(0, 10)}...`,
                    action: {
                      label: "View Transaction",
                      onClick: () => window.open(`https://${process.env.NEXT_PUBLIC_NETWORK === "testnet" ? "testnet." : ""}bscscan.com/tx/${transactionHash}`, '_blank')
                    },
                    duration: 10000,
                  });
                }
              } catch (error) {
                console.error("Error processing WithdrawalProcessed event:", error);
              }
            }
          },
        });

        // Watch for ChangeDeposit events (partial withdrawal change-back)
        const unwatchChange = publicClient.watchContractEvent({
          address: PRIVACY_POOL_ADDRESS,
          abi: PRIVACY_POOL_ABI,
          eventName: 'ChangeDeposit',
          onLogs: (logs) => {
            if (!isSubscribed) return;

            for (const log of logs) {
              try {
                // ChangeDeposit(bytes32 indexed oldCommitment, bytes32 indexed newCommitment, uint256 changeAmount, uint32 leafIndex)
                const { args, transactionHash } = log as any;
                const oldCommitment = args?.oldCommitment;
                const newCommitment = args?.newCommitment;
                const changeAmount = args?.changeAmount;
                const leafIndex = args?.leafIndex;

                console.log(`   Old: ${oldCommitment?.slice(0, 10)}...`);
                console.log(`   New: ${newCommitment?.slice(0, 10)}...`);
                console.log(`   Amount: ${formatEther(changeAmount || 0n)} BNB`);
                console.log(`   Leaf Index: ${leafIndex}`);

                // Update change note status to 'deposited'
                if (newCommitment) {
                  updateDepositNoteStatus(newCommitment, 'deposited', {
                    leafIndex: Number(leafIndex),
                    depositTxHash: transactionHash
                  });
                  console.log(`   ✅ Updated change note ${newCommitment.slice(0, 10)} to 'deposited'`);

                  // Refresh UI
                  setHistoryRefreshTrigger(prev => prev + 1);

                  // Show toast notification
                  toast.success("Change Deposited!", {
                    description: `${formatEther(changeAmount || 0n)} BNB returned to your balance`,
                    duration: 5000,
                  });
                }
              } catch (error) {
                console.error("Error processing ChangeDeposit event:", error);
              }
            }
          },
        });

        // Cleanup on unmount
        return () => {
          isSubscribed = false;
          unwatchWithdrawal();
          unwatchChange();
          console.log("👋 Stopped watching contract events");
        };
      } catch (error) {
        console.error("Failed to set up event listener:", error);
      }
    };

    watchWithdrawalEvents();
  }, [publicClient, PRIVACY_POOL_ADDRESS, address]); // fetchPrivateBalance removed to fix initialization order

  // Load retryable notes on mount
  // Load and validate deposits from blockchain - auto-delete deposits from old contracts
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const loadAndValidateDeposits = async () => {
      setIsValidating(true);
      const localNotes = getAllDepositNotes(); // Get ALL deposits, not just retryable

      // If no contract or no notes, just set empty
      if (!publicClient || !PRIVACY_POOL_ADDRESS || localNotes.length === 0) {
        setRetryableNotes(getRetryableNotes());
        setIsValidating(false);
        return;
      }

      try {
        // Query contract for each deposit
        const validatedNotes: DepositNote[] = [];
        const invalidCommitments: `0x${string}`[] = [];

        const statusMap = ['none', 'deposited', 'queued', 'processing', 'completed'];

        for (const note of localNotes) {
          try {
            // Check if deposit exists in current contract
            const contractStatus = await publicClient.readContract({
              address: PRIVACY_POOL_ADDRESS,
              abi: PRIVACY_POOL_ABI,
              functionName: "getDepositStatus",
              args: [note.commitment]
            }) as number;

            // Status 0 = None (doesn't exist), > 0 = exists
            if (contractStatus > 0) {
              const statusString = statusMap[contractStatus] as 'deposited' | 'queued' | 'processing' | 'completed';

              // Update the note with the correct status from contract
              const updatedNote = {
                ...note,
                status: statusString
              };

              // Save updated status to localStorage
              storeDepositNote(updatedNote);

              validatedNotes.push(updatedNote);
            } else if (note.status === 'pending') {
              // Keep pending notes even if they don't exist yet
              validatedNotes.push(note);
            } else {
              invalidCommitments.push(note.commitment);
            }
          } catch (error: any) {
            // Don't delete on error - might be temporary network issue
          }
        }

        // Permanently delete invalid deposits from localStorage
        if (invalidCommitments.length > 0) {
          for (const commitment of invalidCommitments) {
            const key = `deposit_note_${commitment}`;
            localStorage.removeItem(key);
          }

          // Update the all_deposit_notes list
          const cleanedNotes = validatedNotes;
          localStorage.setItem("all_deposit_notes", JSON.stringify(cleanedNotes));

          // Also clean up any withdrawal transactions for invalid commitments
          const allWithdrawals = getAllWithdrawalTransactions();
          const validWithdrawals = allWithdrawals.filter(
            w => !invalidCommitments.includes(w.commitment as `0x${string}`)
          );
          localStorage.setItem("all_withdrawal_transactions", JSON.stringify(validWithdrawals));

          toast.success(`Cleaned up history`, {
            description: `Removed ${invalidCommitments.length} deposit${invalidCommitments.length === 1 ? '' : 's'} from old contracts`,
            duration: 5000,
          });

          console.log(`🗑️ Permanently deleted ${invalidCommitments.length} invalid deposits and their withdrawals from storage`);
        }

        // Update withdrawal statuses for completed deposits
        let withdrawalStatusChanged = false;
        validatedNotes.forEach(note => {
          if (note.status === 'completed' && note.queueTxHash) {
            const allWithdrawals = getAllWithdrawalTransactions();
            const withdrawal = allWithdrawals.find(w => w.commitment === note.commitment);

            if (withdrawal && withdrawal.status !== 'completed') {
              updateWithdrawalStatus(withdrawal.id, 'completed', {
                withdrawalTxHash: note.withdrawalTxHash
              });
              withdrawalStatusChanged = true;
            }
          }
        });

        // Trigger history refresh if any withdrawal status changed during validation
        if (withdrawalStatusChanged) {
          setHistoryRefreshTrigger(prev => prev + 1);
        }

        // Filter retryable notes by wallet address (only show current wallet's deposits)
        const walletRetryable = validatedNotes.filter(n =>
          (n.status === 'deposited' || n.status === 'failed') &&
          (!n.walletAddress || (address && n.walletAddress.toLowerCase() === address.toLowerCase()))
        );
        setRetryableNotes(walletRetryable);
      } catch (error) {
        console.error("Failed to validate deposits:", error);
        // On error, use wallet-filtered notes (fallback)
        if (address) {
          const walletNotes = getDepositNotesForWallet(address);
          setRetryableNotes(walletNotes.filter(n => n.status === 'deposited' || n.status === 'failed'));
        } else {
          setRetryableNotes([]);
        }
      } finally {
        setIsValidating(false);
      }
    };

    loadAndValidateDeposits();
  }, [publicClient, PRIVACY_POOL_ADDRESS]);

  // Sync function (called manually when needed, not on every block!)
  // Uses contract reads instead of event logs to avoid RPC rate limits
  const syncMerkleTree = async (silent = false) => {
    if (!publicClient || !PRIVACY_POOL_ADDRESS || isSyncing) return;

    setIsSyncing(true);
    try {
      if (!silent) console.log("🔄 Syncing Merkle tree...");

      // Get contract's deposit count
      const nextIndex = await publicClient.readContract({
        address: PRIVACY_POOL_ADDRESS,
        abi: PRIVACY_POOL_ABI,
        functionName: "nextIndex"
      });

      const expectedCount = Number(nextIndex);

      if (expectedCount === 0) {
        setIsSyncing(false);
        return;
      }

      const contractRoot = await publicClient.readContract({
        address: PRIVACY_POOL_ADDRESS,
        abi: PRIVACY_POOL_ABI,
        functionName: "getLastRoot"
      }) as Hex;

      const newTree = new MerkleTree();

      // Use getCommitments() batch function to read all at once
      const commitments = await publicClient.readContract({
        address: PRIVACY_POOL_ADDRESS,
        abi: PRIVACY_POOL_ABI,
        functionName: "getCommitments",
        args: [0, expectedCount]
      }) as Hex[];

      // Insert all commitments into tree
      for (let i = 0; i < commitments.length; i++) {
        const insertedIndex = newTree.insert(commitments[i]);
        saveDepositIndex(commitments[i], insertedIndex);
      }

      const localRoot = newTree.getRoot();

      // Check if roots match
      if (localRoot.toLowerCase() !== contractRoot.toLowerCase()) {
        throw new Error("Tree root mismatch");
      }

      setMerkleTree(newTree);
      saveMerkleTreeState(newTree);
      if (!silent) console.log(`✅ Synced ${newTree.getLeaves().length} deposits`);
    } catch (err) {
      if (!silent) console.error("Sync failed:", err);
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // Retry wrapper for syncMerkleTree - retries silently in background
  const syncMerkleTreeWithRetry = async (maxRetries = 3, showToast = true): Promise<boolean> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const silent = attempt > 1; // First attempt can log, retries are silent
        await syncMerkleTree(silent);
        return true; // Success
      } catch (err) {
        if (attempt < maxRetries) {
          // Retry silently after a delay
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        } else {
          // All retries failed - notify user only if showToast is true
          if (showToast) {
            toast.error("Failed to sync with blockchain. Please try again.", { duration: 5000 });
          }
          return false;
        }
      }
    }
    return false;
  };

  // Only sync ONCE on mount, not on every block!
  useEffect(() => {
    if (merkleTree && publicClient && PRIVACY_POOL_ADDRESS) {
      syncMerkleTreeWithRetry(3, false); // Silent retries on mount
    }
  }, []); // Empty deps = only on mount

  // Don't auto-fill recipient address - let user enter their desired recipient

  // NO BACKGROUND POLLING - History is fetched on-demand when user clicks History button
  // Private balance is fetched on mount and after transactions

  // Calculate private balance - fetched live from blockchain
  const [privateBalance, setPrivateBalance] = useState<string>('0.0000');
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);

  const fetchPrivateBalance = useCallback(async () => {
    if (!address || !publicClient || !PRIVACY_POOL_ADDRESS) {
      setPrivateBalance('0.0000');
      return;
    }

    setIsLoadingBalance(true);
    console.log(`💰 Fetching private balance from blockchain for wallet ${address.slice(0, 10)}...`);

    try {
      // Get ALL deposits from the blockchain
      const nextIndex = await publicClient.readContract({
        address: PRIVACY_POOL_ADDRESS,
        abi: PRIVACY_POOL_ABI,
        functionName: "nextIndex"
      });

      const expectedCount = Number(nextIndex);
      console.log(`  📊 Contract has ${expectedCount} total deposits`);

      if (expectedCount === 0) {
        console.log(`  ℹ️ No deposits in contract yet`);
        setPrivateBalance('0.0000');
        setIsLoadingBalance(false);
        return;
      }

      // Fetch all commitments from blockchain
      const commitments = await publicClient.readContract({
        address: PRIVACY_POOL_ADDRESS,
        abi: PRIVACY_POOL_ABI,
        functionName: "getCommitments",
        args: [0, expectedCount]
      }) as Hex[];

      console.log(`  📝 Fetched ${commitments.length} commitments from blockchain`);

      // Get local notes to match against blockchain
      const localNotes = getDepositNotesForWallet(address);
      console.log(`  🔍 Found ${localNotes.length} local notes for wallet ${address.slice(0, 10)}`);
      localNotes.forEach((n, i) => {
        console.log(`    [${i}] ${n.commitment.slice(0, 10)} - wallet: ${n.walletAddress?.slice(0, 10) || 'none'}, status: ${n.status}`);
      });

      const localCommitmentMap = new Map(localNotes.map(n => [n.commitment.toLowerCase(), n]));

      let total = 0;
      let depositsWithCredentials = 0;
      let depositsWithoutCredentials = 0;

      // Check each commitment from blockchain
      for (let i = 0; i < commitments.length; i++) {
        const commitment = commitments[i];

        try {
          // Get deposit info from contract
          // Returns: (commitment, leafIndex, depositTime, amount, queueId, status, recipient, executeAfter, withdrawalTxHash)
          const depositInfo = await publicClient.readContract({
            address: PRIVACY_POOL_ADDRESS,
            abi: PRIVACY_POOL_ABI,
            functionName: "getDepositInfo",
            args: [commitment]
          }) as readonly [Hex, number, bigint, bigint, bigint, number, Hex, bigint, Hex];

          // depositInfo is an array: [commitment, leafIndex, depositTime, amount, queueId, status, recipient, executeAfter, withdrawalTxHash]
          const amount = depositInfo[3]; // amount is 4th element (index 3)
          const status = Number(depositInfo[5]); // status is 6th element (index 5)

          // Only count deposits that are: deposited (1), queued (2), or processing (3)
          // Only count status 1 (Deposited) as available balance
          // Status 2 (Queued) and 3 (Processing) are locked for withdrawal
          // Status 4 (Completed) is already withdrawn
          if (status === 1) {
            const amountBNB = parseFloat(formatEther(amount));
            total += amountBNB;

            // Check if we have credentials for this deposit
            const hasCredentials = localCommitmentMap.has(commitment.toLowerCase());

            if (hasCredentials) {
              depositsWithCredentials++;
            } else {
              depositsWithoutCredentials++;
            }
          }
        } catch (error) {
          // Silent error handling
        }
      }

      if (depositsWithoutCredentials > 0) {
        toast.warning(
          `Found ${depositsWithoutCredentials} deposit(s) without withdrawal credentials. These are visible in balance but cannot be withdrawn.`,
          { duration: 6000 }
        );
      }

      setPrivateBalance(total.toFixed(4));
    } catch (error) {
      console.error("Failed to fetch private balance:", error);
      setPrivateBalance('0.0000');
    } finally {
      setIsLoadingBalance(false);
    }
  }, [address, publicClient, PRIVACY_POOL_ADDRESS]);

  // Fetch balance on mount and when address changes
  useEffect(() => {
    if (address) {
      fetchPrivateBalance();
    }
  }, [address, fetchPrivateBalance]);

  // Show welcome modal for first-time users
  useEffect(() => {
    if (address && isConnected) {
      const hasSeenWelcome = localStorage.getItem('privacy_cash_welcome_seen');
      if (!hasSeenWelcome) {
        // Small delay to let wallet connection settle
        setTimeout(() => {
          setShowWelcomeModal(true);
        }, 500);
      }
    }
  }, [address, isConnected]);

  // Refresh balance when history changes (from event listener updates)
  useEffect(() => {
    if (address && historyRefreshTrigger > 0) {
      fetchPrivateBalance();
    }
  }, [historyRefreshTrigger, address, fetchPrivateBalance]);

  useEffect(() => {
    if (isConfirmed && hash) {
      // Dismiss the loading toast
      toast.dismiss(`tx-${hash}`);

      if (stage === "deposit" && currentNote) {
        // Update note with deposit info
        const updatedNote = {
          ...currentNote,
          depositTxHash: hash,
          status: 'deposited' as const,
          timestamp: Date.now()
        };
        setCurrentNote(updatedNote);
        storeDepositNote(updatedNote);

        // Refresh balance immediately after saving note
        console.log("🔄 Note saved, refreshing balance...");
        setTimeout(() => fetchPrivateBalance(), 100);

        // Check if we should auto-queue withdrawal or just finish deposit
        if (shouldAutoQueue) {
          // Deposit confirmed, now wait for blockchain sync then queue withdrawal
          setStage("queue");
          setIsLoading(true);

          const toastId = toast.loading("Deposit confirmed! Syncing with blockchain...");

          const attemptQueue = async (): Promise<void> => {
            try {
              // Wait for blockchain to index deposit
              await new Promise(resolve => setTimeout(resolve, 6000));

              // Sync with retries (silent)
              const success = await syncMerkleTreeWithRetry(3, false);
              if (!success) {
                throw new Error("Failed to sync");
              }

              // Update note with leaf index
              const leafIndex = getDepositIndex(updatedNote.commitment);
              if (leafIndex !== undefined) {
                updatedNote.leafIndex = leafIndex;
                setCurrentNote(updatedNote);
                storeDepositNote(updatedNote);
              }

              // Verify we have the commitment
              if (!leafIndex) {
                throw new Error("Commitment not found");
              }

              // Now queue withdrawal
              toast.loading("Preparing withdrawal...", { id: toastId });
              await new Promise(resolve => setTimeout(resolve, 500));
              toast.dismiss(toastId);
              queueWithdrawal(updatedNote);
            } catch (err) {
              toast.error("Failed to sync with blockchain. Please use the retry button below.", { id: toastId });
              setIsLoading(false);
              setStage("deposit");
            }
          };

          attemptQueue();
        } else {
          // Just deposit mode - don't auto-queue
          const txHashLink = `https://${process.env.NEXT_PUBLIC_NETWORK === "testnet" ? "testnet." : ""}bscscan.com/tx/${hash}`;

          toast.success("Deposit Successful!", {
            description: `Added ${updatedNote.amount || amount} BNB to your private balance. Switch to "Send" tab to make private transfers.`,
            action: {
              label: "View Transaction",
              onClick: () => window.open(txHashLink, '_blank')
            },
            duration: 10000,
          });

          setIsLoading(false);
          setCurrentNote(null);
          setStage("deposit");
          refetchBalance();
          refetchPoolStats();

          // Wait a bit for the note to be fully saved, then refresh balance
          setTimeout(() => {
            console.log("🔄 Refreshing private balance after deposit...");
            fetchPrivateBalance();
          }, 500);

          // Refresh retryable notes (wallet-filtered)
          if (address) {
            const walletNotes = getDepositNotesForWallet(address);
            setRetryableNotes(walletNotes.filter(n => n.status === 'deposited' || n.status === 'failed'));
          }
        }
      } else if (stage === "queue") {
        // Withdrawal queued successfully
        if (currentNote) {
          // Update primary deposit
          updateDepositNoteStatus(currentNote.commitment, 'queued', {
            queueTxHash: hash
          });

          // If multi-deposit, also update all secondary deposits with queueTxHash
          const multiDepositNotes = (currentNote as any).multiDepositNotes as DepositNote[] | undefined;
          if (multiDepositNotes && multiDepositNotes.length > 1) {
            console.log(`  📝 Updating ${multiDepositNotes.length} deposits with queueTxHash ${hash.slice(0, 10)}...`);
            for (const note of multiDepositNotes) {
              if (note.commitment !== currentNote.commitment) {
                console.log(`     → ${note.commitment.slice(0, 10)}: status=queued, queueTxHash=${hash.slice(0, 10)}...`);
                updateDepositNoteStatus(note.commitment, 'queued', {
                  queueTxHash: hash
                });
              }
            }
          }

          // Store withdrawal transaction for history (use hash as unique ID to prevent duplicates)
          const withdrawal: WithdrawalTransaction = {
            id: hash, // Use transaction hash as unique ID
            commitment: currentNote.commitment,
            amount: currentNote.amount || amount,
            recipient: recipientAddress,
            delayMinutes: delayMinutes,
            queueTxHash: hash,
            timestamp: Date.now(),
            executeAfter: Date.now() + (delayMinutes * 60 * 1000),
            status: 'queued',
            walletAddress: address, // Save wallet address
          };
          storeWithdrawalTransaction(withdrawal);
        }

        // Show toast notification
        const queueTxLink = `https://${process.env.NEXT_PUBLIC_NETWORK === "testnet" ? "testnet." : ""}bscscan.com/tx/${hash}`;

        toast.success("Send Successful!", {
          description: `Sending ${amount} BNB to ${recipientAddress.slice(0, 8)}...${recipientAddress.slice(-6)}. Estimated delivery: ${delayMinutes} min. Check transaction history to view status.`,
          action: {
            label: "View History",
            onClick: () => {
              setShowHistoryModal(true);
              setHistoryPage(1);
              fetchHistoryFromBlockchain();
            }
          },
          duration: 10000,
        });

        setIsLoading(false);
        setCurrentNote(null);
        setStage("deposit");
        setRecipientAddress("");
        setAmount("0.01");
        setActiveTab("deposit"); // Switch back to deposit tab after successful send
        refetchBalance();
        refetchPoolStats();

        // Immediate refresh (might not reflect change yet)
        fetchPrivateBalance();

        // Delayed refresh after 5 seconds to ensure blockchain state is updated
        setTimeout(() => {
          console.log("🔄 [5s Delayed Refresh] Updating private balance after send...");
          toast.info("Updating balance...", {
            description: "Refreshing your private balance from the blockchain",
            duration: 3000,
          });
          fetchPrivateBalance();
          refetchPoolStats();
        }, 5000);

        // Refresh retryable notes (wallet-filtered)
        if (address) {
          const walletNotes = getDepositNotesForWallet(address);
          setRetryableNotes(walletNotes.filter(n => n.status === 'deposited' || n.status === 'failed'));
        }
      }
    }
  }, [isConfirmed, hash, stage, currentNote, address, fetchPrivateBalance]);

  useEffect(() => {
    if (writeError) {
      console.error("🚨 writeError detected:", writeError);
      const errorMsg = writeError.message || "Transaction failed";
      console.error("  Error message:", errorMsg);

      // Check if user rejected the transaction
      const isUserRejection = errorMsg.includes("User rejected") ||
                               errorMsg.includes("User denied") ||
                               errorMsg.includes("rejected") ||
                               errorMsg.includes("denied") ||
                               errorMsg.includes("cancelled");

      // If queue transaction failed, mark note as failed (only if not user rejection)
      if (stage === "queue" && currentNote && !isUserRejection) {
        updateDepositNoteStatus(currentNote.commitment, 'failed', {
          failureReason: errorMsg
        });

        // Update retryable notes list (wallet-filtered)
        if (address) {
          const walletNotes = getDepositNotesForWallet(address);
          setRetryableNotes(walletNotes.filter(n => n.status === 'deposited' || n.status === 'failed'));
        }

        // Show helpful error toast
        toast.error("Withdrawal Queue Failed", {
          description: `Your ${currentNote?.amount || amount} BNB deposit is safe in the contract. You can retry from the History section.`,
          duration: 8000,
        });
      } else if (isUserRejection) {
        // User cancelled in wallet - just show a simple message
        toast.error("Transaction Cancelled", {
          description: "You cancelled the transaction in your wallet",
          duration: 4000,
        });
      } else {
        toast.error("Transaction Failed", {
          description: errorMsg,
          duration: 6000,
        });
      }

      setIsLoading(false);
      setStage("deposit");
      setCurrentNote(null);
    }
  }, [writeError, stage, currentNote, amount, address]);

  const retryWithdrawal = async (note: DepositNote, recipient: string, delay: number) => {
    setCurrentNote(note);
    setRecipientAddress(recipient);
    setDelayMinutes(delay);
    setStage("queue");
    setIsLoading(true);
    setShowRetryModal(false);

    const retryToastId = toast.loading("Retrying withdrawal...");

    try {
      // Sync with retries (silent)
      const success = await syncMerkleTreeWithRetry(3, false);
      if (!success) {
        throw new Error("Failed to sync");
      }

      // Make sure we have the leaf index
      let leafIndex = note.leafIndex;
      if (leafIndex === undefined) {
        leafIndex = getDepositIndex(note.commitment);
      }

      if (leafIndex !== undefined) {
        note.leafIndex = leafIndex;
        setCurrentNote(note);
        storeDepositNote(note);
      } else {
        throw new Error("Commitment not found");
      }

      // Now attempt withdrawal
      toast.dismiss(retryToastId);
      setTimeout(() => {
        queueWithdrawal(note);
      }, 1000);
    } catch (err: any) {
      toast.error("Failed to sync. Please try again.", { id: retryToastId });
      setIsLoading(false);
      setStage("deposit");
    }
  };

  const queueWithdrawal = async (noteToUse?: DepositNote) => {
    // Use provided note or fall back to state
    const activeNote = noteToUse || currentNote;

    if (!activeNote || !PRIVACY_POOL_ADDRESS || !merkleTree || !publicClient) {
      return;
    }

    if (!address) {
      toast.error("Please connect your wallet first");
      setIsLoading(false);
      return;
    }

    // Check if this deposit has already been queued
    try {
      const depositStatus = await publicClient.readContract({
        address: PRIVACY_POOL_ADDRESS,
        abi: PRIVACY_POOL_ABI,
        functionName: "getDepositStatus",
        args: [activeNote.commitment]
      }) as number;

      const statusMap = ['none', 'deposited', 'queued', 'processing', 'completed'];
      const status = statusMap[depositStatus];

      if (status === 'queued' || status === 'processing' || status === 'completed') {
        toast.error(`This deposit has already been ${status}. You cannot queue it again.`);
        setIsLoading(false);
        setShowRetryModal(false);
        return;
      }

      if (status === 'none') {
        toast.error("This deposit doesn't exist in the contract. It may be from a different contract.");
        setIsLoading(false);
        setShowRetryModal(false);
        return;
      }
    } catch (statusError: any) {
      console.error("Failed to check deposit status:", statusError);
      toast.error("Failed to verify deposit status. Please try again.");
      setIsLoading(false);
      return;
    }

    try {
      // First, verify tree is synced with contract
      const contractNextIndex = await publicClient.readContract({
        address: PRIVACY_POOL_ADDRESS,
        abi: PRIVACY_POOL_ABI,
        functionName: "nextIndex"
      });

      const localLeafCount = merkleTree.getLeaves().length;
      const contractLeafCount = Number(contractNextIndex);

      if (localLeafCount !== contractLeafCount) {
        const syncToastId = toast.loading("Syncing tree...");

        try {
          // Auto-sync with retries (silent)
          const success = await syncMerkleTreeWithRetry(3, false);
          if (!success) {
            throw new Error("Failed to sync");
          }

          // Reload tree from localStorage after sync
          const syncedTree = loadMerkleTreeState();
          if (!syncedTree) {
            throw new Error("Failed to load tree");
          }

          toast.dismiss(syncToastId);

          // Continue with the synced tree
          const updatedMerkleTree = syncedTree;

          // Get the leaf index for this commitment from synced tree
          let leafIndex = activeNote.leafIndex;
          if (leafIndex === undefined) {
            leafIndex = getDepositIndex(activeNote.commitment);
          }

          if (leafIndex === undefined) {
            throw new Error("Commitment not found");
          }

          // Generate merkle proof
          const proof = updatedMerkleTree.getProof(leafIndex);

          // Verify proof locally before sending
          const isValidLocal = updatedMerkleTree.verify(
            activeNote.commitment,
            proof.pathElements,
            proof.pathIndices,
            updatedMerkleTree.getRoot()
          );

          if (!isValidLocal) {
            throw new Error("Proof verification failed");
          }

          // Pad arrays to length 20 (required by contract)
          const merkleProof: Hex[] = Array(20).fill('0x0000000000000000000000000000000000000000000000000000000000000000');
          const pathIndices: boolean[] = Array(20).fill(false);

          for (let i = 0; i < Math.min(20, proof.pathElements.length); i++) {
            merkleProof[i] = proof.pathElements[i];
            pathIndices[i] = proof.pathIndices[i];
          }

          if (!PRIVACY_POOL_ADDRESS) {
            throw new Error("Contract address not configured");
          }

          toast.info("Please approve the withdrawal transaction in your wallet...");

          // Get withdrawal amount and change commitment
          const withdrawAmount = parseEther(amount);
          const changeCommitment = (activeNote as any).changeCommitment || `0x${'0'.repeat(64)}`;

          // Check if this is a multi-deposit withdrawal
          const multiDepositNotes = (activeNote as any).multiDepositNotes as DepositNote[] | undefined;
          const isMultiDeposit = multiDepositNotes && multiDepositNotes.length > 1;

          if (isMultiDeposit) {
            console.log(`  📞 Calling queueMultiWithdrawal with ${multiDepositNotes.length} deposits...`);
            console.log(`    Total withdraw amount: ${amount} BNB`);
            console.log(`    Change commitment: ${changeCommitment.slice(0, 10)}...`);

            // Prepare arrays for multi-deposit
            const nullifiers: Hex[] = [];
            const secrets: Hex[] = [];
            const merkleProofs: Hex[][] = [];
            const pathIndicesArray: boolean[][] = [];

            for (const note of multiDepositNotes) {
              // Get leaf index
              let noteLeafIndex = note.leafIndex;
              if (noteLeafIndex === undefined) {
                noteLeafIndex = getDepositIndex(note.commitment);
              }
              if (noteLeafIndex === undefined) {
                throw new Error(`Commitment ${note.commitment.slice(0, 10)} not found in tree`);
              }

              // Generate merkle proof for this note
              const noteProof = updatedMerkleTree.getProof(noteLeafIndex);

              // Pad proof to length 20
              const paddedProof: Hex[] = Array(20).fill('0x0000000000000000000000000000000000000000000000000000000000000000');
              const paddedIndices: boolean[] = Array(20).fill(false);
              for (let i = 0; i < Math.min(20, noteProof.pathElements.length); i++) {
                paddedProof[i] = noteProof.pathElements[i];
                paddedIndices[i] = noteProof.pathIndices[i];
              }

              nullifiers.push(note.nullifier);
              secrets.push(note.secret);
              merkleProofs.push(paddedProof);
              pathIndicesArray.push(paddedIndices);
            }

            // Call multi-deposit withdrawal
            writeContract({
              address: PRIVACY_POOL_ADDRESS,
              abi: PRIVACY_POOL_ABI,
              functionName: "queueMultiWithdrawal",
              args: [
                nullifiers,
                secrets,
                recipientAddress as `0x${string}`,
                withdrawAmount,
                changeCommitment as `0x${string}`,
                BigInt(delayMinutes),
                merkleProofs as any, // Array of [Hex; 20]
                pathIndicesArray as any, // Array of [boolean; 20]
              ],
            });
            console.log("  ✅ queueMultiWithdrawal called successfully");
          } else {
            console.log("  📞 Calling writeContract with single deposit...");
            console.log(`    Withdraw amount: ${amount} BNB`);
            console.log(`    Change commitment: ${changeCommitment.slice(0, 10)}...`);

            // Call contract with all 8 parameters (single deposit)
            writeContract({
              address: PRIVACY_POOL_ADDRESS,
              abi: PRIVACY_POOL_ABI,
              functionName: "queueWithdrawal",
              args: [
                activeNote.nullifier,
                activeNote.secret,
                recipientAddress as `0x${string}`,
                withdrawAmount,                    // withdrawal amount
                changeCommitment as `0x${string}`, // change commitment
                BigInt(delayMinutes),
                merkleProof as [Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex],
                pathIndices as [boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean],
              ],
            });
            console.log("  ✅ writeContract called successfully");
          }
          return; // Exit early after successful contract call
        } catch (syncError: any) {
          toast.error(`Failed to sync tree: ${syncError.message}`, { id: syncToastId });
          throw syncError;
        }
      }

      // Get the leaf index for this commitment
      let leafIndex = activeNote.leafIndex;
      if (leafIndex === undefined) {
        leafIndex = getDepositIndex(activeNote.commitment);
      }

      if (leafIndex === undefined) {
        throw new Error("Commitment not found");
      }

      // Generate merkle proof
      const proof = merkleTree.getProof(leafIndex);

      // Verify proof locally before sending
      const isValidLocal = merkleTree.verify(
        activeNote.commitment,
        proof.pathElements,
        proof.pathIndices,
        merkleTree.getRoot()
      );

      if (!isValidLocal) {
        throw new Error("Proof verification failed");
      }

      // Pad arrays to length 20 (required by contract)
      const merkleProof: Hex[] = Array(20).fill('0x0000000000000000000000000000000000000000000000000000000000000000');
      const pathIndices: boolean[] = Array(20).fill(false);

      for (let i = 0; i < Math.min(20, proof.pathElements.length); i++) {
        merkleProof[i] = proof.pathElements[i];
        pathIndices[i] = proof.pathIndices[i];
      }

      if (!PRIVACY_POOL_ADDRESS) {
        throw new Error("Contract address not configured");
      }

      toast.info("Please approve the withdrawal transaction in your wallet...");

      // Get withdrawal amount and change commitment
      const withdrawAmount = parseEther(amount);
      const changeCommitment = (activeNote as any).changeCommitment || `0x${'0'.repeat(64)}`;

      // Check if this is a multi-deposit withdrawal
      const multiDepositNotes = (activeNote as any).multiDepositNotes as DepositNote[] | undefined;
      const isMultiDeposit = multiDepositNotes && multiDepositNotes.length > 1;

      try {
        if (isMultiDeposit) {

          // Prepare arrays for multi-deposit
          const nullifiers: Hex[] = [];
          const secrets: Hex[] = [];
          const merkleProofs: Hex[][] = [];
          const pathIndicesArray: boolean[][] = [];

          for (const note of multiDepositNotes) {
            // Get leaf index
            let noteLeafIndex = note.leafIndex;
            if (noteLeafIndex === undefined) {
              noteLeafIndex = getDepositIndex(note.commitment);
            }
            if (noteLeafIndex === undefined) {
              throw new Error(`Commitment ${note.commitment.slice(0, 10)} not found in tree`);
            }

            // Generate merkle proof for this note
            const noteProof = merkleTree.getProof(noteLeafIndex);

            // Pad proof to length 20
            const paddedProof: Hex[] = Array(20).fill('0x0000000000000000000000000000000000000000000000000000000000000000');
            const paddedIndices: boolean[] = Array(20).fill(false);
            for (let i = 0; i < Math.min(20, noteProof.pathElements.length); i++) {
              paddedProof[i] = noteProof.pathElements[i];
              paddedIndices[i] = noteProof.pathIndices[i];
            }

            nullifiers.push(note.nullifier);
            secrets.push(note.secret);
            merkleProofs.push(paddedProof);
            pathIndicesArray.push(paddedIndices);
          }

          // Call multi-deposit withdrawal
          writeContract({
            address: PRIVACY_POOL_ADDRESS,
            abi: PRIVACY_POOL_ABI,
            functionName: "queueMultiWithdrawal",
            args: [
              nullifiers,
              secrets,
              recipientAddress as `0x${string}`,
              withdrawAmount,
              changeCommitment as `0x${string}`,
              BigInt(delayMinutes),
              merkleProofs as any,
              pathIndicesArray as any,
            ],
          });
          console.log("  ✅ queueMultiWithdrawal called successfully");
        } else {
          // Single deposit withdrawal
          console.log("  📞 Calling queueWithdrawal (single deposit)...");
          console.log(`    Withdraw amount: ${amount} BNB`);
          console.log(`    Change commitment: ${changeCommitment.slice(0, 10)}...`);

          writeContract({
            address: PRIVACY_POOL_ADDRESS,
            abi: PRIVACY_POOL_ABI,
            functionName: "queueWithdrawal",
            args: [
              activeNote.nullifier,
              activeNote.secret,
              recipientAddress as `0x${string}`,
              withdrawAmount,
              changeCommitment as `0x${string}`,
              BigInt(delayMinutes),
              merkleProof as [Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex, Hex],
              pathIndices as [boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean, boolean],
            ],
          });
          console.log("  ✅ queueWithdrawal called successfully");
        }
      } catch (contractError: any) {
        console.error("  ❌ writeContract error:", contractError);
        throw contractError;
      }
    } catch (err: any) {
      console.error("❌ Queue error:", err);
      toast.error(err.message || "Failed to queue");
      setIsLoading(false);
      setStage("deposit");
    }
  };

  // Deposit only - adds to private balance without queueing withdrawal
  const handleDeposit = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!PRIVACY_POOL_ADDRESS) {
      toast.error("Contract not deployed");
      return;
    }

    const amountNum = parseFloat(amount);
    if (!amount || amountNum <= 0 || amountNum < 0.01) {
      toast.error("Minimum amount is 0.01 BNB");
      return;
    }

    setIsLoading(true);
    setStage("deposit");
    setShouldAutoQueue(false); // Don't auto-queue for deposit-only

    toast.info("Please approve the deposit transaction in your wallet...");

    try {
      // Create deposit note
      const note = createDepositNote();
      // Store the amount and wallet address with the note
      note.amount = amount;
      note.walletAddress = address; // Save wallet address
      setCurrentNote(note);

      // Make deposit (will NOT auto-queue withdrawal)
      writeContract({
        address: PRIVACY_POOL_ADDRESS,
        abi: PRIVACY_POOL_ABI,
        functionName: "deposit",
        args: [note.commitment],
        value: parseEther(amount),
      });
    } catch (err: any) {
      console.error("Deposit error:", err);
      toast.error(err.message || "Deposit failed");
      setIsLoading(false);
      setStage("deposit");
    }
  };

  // Send from pool - queue withdrawal from existing deposit
  const handleSendFromPool = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!PRIVACY_POOL_ADDRESS) {
      toast.error("Contract not deployed");
      return;
    }

    if (!publicClient) {
      toast.error("Blockchain connection not ready");
      return;
    }

    if (!recipientAddress || recipientAddress.length !== 42 || !recipientAddress.startsWith("0x")) {
      toast.error("Invalid recipient address");
      return;
    }

    const amountNum = parseFloat(amount);
    if (!amount || amountNum <= 0 || amountNum < 0.01) {
      toast.error("Minimum amount is 0.01 BNB");
      return;
    }

    // Check private balance
    const currentBalance = parseFloat(privateBalance);
    if (amountNum > currentBalance) {
      toast.error(`Insufficient private balance. You have ${currentBalance.toFixed(4)} BNB available.`);
      return;
    }

    // Get all deposited notes for this wallet (don't filter by amount - multi-deposit will handle combinations)
    const walletNotes = getDepositNotesForWallet(address);
    const candidateNotes = walletNotes.filter(
      note => note.status === 'deposited'
    );

    if (candidateNotes.length === 0) {
      // Check if balance exists but no credentials
      const currentBalance = parseFloat(privateBalance);
      if (currentBalance > 0) {
        toast.error(
          `You have ${currentBalance.toFixed(4)} BNB visible in the contract, but no withdrawal credentials found in localStorage. Please import your backup file in the Backup tab to restore access.`,
          { duration: 8000 }
        );
      } else {
        toast.error(`No available deposits. Please make a deposit first.`);
      }
      return;
    }

    // Verify contract status for each candidate to find truly available deposits
    const verifiedNotes: DepositNote[] = [];
    const statusMap = ['none', 'deposited', 'queued', 'processing', 'completed'];

    console.log(`🔍 Checking availability of ${candidateNotes.length} deposits:`);
    for (const note of candidateNotes) {
      try {
        const depositStatus = await publicClient.readContract({
          address: PRIVACY_POOL_ADDRESS,
          abi: PRIVACY_POOL_ABI,
          functionName: "getDepositStatus",
          args: [note.commitment]
        }) as number;

        const statusName = statusMap[depositStatus] || 'unknown';
        console.log(`  ${note.commitment.slice(0, 10)}: ${note.amount} BNB - status: ${statusName}`);

        // Status 1 = deposited (available for queuing)
        if (depositStatus === 1) {
          verifiedNotes.push(note);
          console.log(`    ✅ Available for withdrawal`);
        } else {
          console.log(`    ❌ Not available (status: ${statusName})`);
        }
      } catch (err) {
        console.error(`Failed to check status for ${note.commitment}:`, err);
      }
    }

    if (verifiedNotes.length === 0) {
      const unavailableInfo = candidateNotes.map(n => `${n.amount} BNB (${n.status || 'unknown'})`).join(', ');
      toast.error(`No deposits available for withdrawal. Your deposits: ${unavailableInfo}. Deposits that are queued/processing cannot be used again.`, {
        duration: 8000
      });
      return;
    }

    console.log(`✅ ${verifiedNotes.length} deposit(s) available for withdrawal: ${verifiedNotes.map(n => n.amount).join(', ')} BNB`);

    // Smart selection: Find best deposit(s) for the withdrawal amount
    const withdrawAmt = parseFloat(amount);

    // Sort deposits by amount (smallest first for optimal combination)
    const sortedNotes = verifiedNotes.sort((a, b) =>
      parseFloat(a.amount || '0') - parseFloat(b.amount || '0')
    );

    console.log(`💰 Available deposits: ${sortedNotes.map(n => `${n.amount} BNB`).join(', ')}`);
    console.log(`📤 Requested withdrawal: ${withdrawAmt.toFixed(4)} BNB`);

    // Strategy 1: Try to find a single deposit that has enough funds
    const validDeposit = sortedNotes.find(note => {
      const depositAmt = parseFloat(note.amount || '0');

      // Must have enough funds (any change amount is allowed)
      if (depositAmt >= withdrawAmt) {
        const change = depositAmt - withdrawAmt;
        console.log(`  ✅ ${note.commitment.slice(0, 10)}: ${depositAmt} BNB - valid ${change === 0 ? '(exact match)' : `(${change.toFixed(4)} BNB change)`}`);
        return true;
      }

      console.log(`  ❌ ${note.commitment.slice(0, 10)}: ${depositAmt} BNB - not enough`);
      return false;
    });

    // Strategy 2: If no single deposit works, try combining deposits
    let selectedNotes: DepositNote[] = [];

    if (validDeposit) {
      console.log(`✅ Using single deposit: ${validDeposit.commitment.slice(0, 10)}... (${validDeposit.amount} BNB)`);
      selectedNotes = [validDeposit];
    } else {
      console.log(`🔍 No single deposit works, trying multi-deposit combination...`);

      // Try to combine deposits (use greedy algorithm - smallest first)
      let accumulated = 0;
      const combination: DepositNote[] = [];

      for (const note of sortedNotes) {
        combination.push(note);
        accumulated += parseFloat(note.amount || '0');

        // Check if we have enough funds now (any change is allowed)
        if (accumulated >= withdrawAmt) {
          const change = accumulated - withdrawAmt;
          console.log(`✅ Found valid combination: ${combination.length} deposits totaling ${accumulated.toFixed(4)} BNB (${change.toFixed(4)} BNB change)`);
          selectedNotes = combination;
          break;
        }
      }

      if (selectedNotes.length === 0) {
        const totalAvailable = sortedNotes.reduce((sum, n) => sum + parseFloat(n.amount || '0'), 0);
        toast.error(
          `Insufficient funds. Requested: ${withdrawAmt.toFixed(4)} BNB, Available: ${totalAvailable.toFixed(4)} BNB`,
          { duration: 10000 }
        );
        return;
      }

      console.log(`✅ Selected ${selectedNotes.length} deposits:`, selectedNotes.map(n => `${n.commitment.slice(0, 10)}... (${n.amount} BNB)`).join(', '));
    }

    // Store selected notes for withdrawal
    const selectedNote = selectedNotes[0];
    (selectedNote as any).multiDepositNotes = selectedNotes; // Store all notes for multi-deposit withdrawal
    setCurrentNote(selectedNote);
    setStage("queue");
    setIsLoading(true);

    const syncToastId = toast.loading("Preparing to send from pool...");

    try {
      // Sync with retries (silent)
      const success = await syncMerkleTreeWithRetry(3, false);
      if (!success) {
        throw new Error("Failed to sync");
      }

      // For multi-deposit withdrawals, we need to calculate total deposit amount
      const totalDepositAmount = selectedNotes.reduce((sum, note) => sum + parseFloat(note.amount || '0'), 0);
      const withdrawAmt = parseFloat(amount);
      const changeAmount = totalDepositAmount - withdrawAmt;

      console.log(`📤 Withdrawing ${amount} BNB from ${totalDepositAmount.toFixed(4)} BNB total deposits (${selectedNotes.length} deposit${selectedNotes.length > 1 ? 's' : ''})`);

      // Generate change commitment if there's change
      let changeCommitment = `0x${'0'.repeat(64)}`;
      if (changeAmount > 0) {
        // For multi-deposit, create a temporary note with the total deposit amount
        const tempNote = {
          ...selectedNote,
          amount: totalDepositAmount.toFixed(4)
        };

        const { changeNote, changeCommitment: newChangeCommitment } = createChangeNote(tempNote, amount);
        changeCommitment = newChangeCommitment;

        if (changeNote) {
          console.log(`💰 Change: ${changeNote.amount} BNB (commitment: ${changeCommitment.slice(0, 10)}...)`);
          // Store change note immediately (will be updated when relayer processes)
          storeDepositNote(changeNote);
        }
      } else {
        console.log(`✅ Full withdrawal - no change needed`);
      }

      // Store change commitment for the contract call
      (selectedNote as any).changeCommitment = changeCommitment;

      // Make sure all notes have leaf indices
      for (const note of selectedNotes) {
        let leafIndex = note.leafIndex;
        if (leafIndex === undefined) {
          leafIndex = getDepositIndex(note.commitment);
          if (leafIndex !== undefined) {
            note.leafIndex = leafIndex;
            storeDepositNote(note);
            console.log(`✅ Found commitment ${note.commitment.slice(0, 10)} at index ${leafIndex}`);
          } else {
            throw new Error(`Commitment ${note.commitment.slice(0, 10)} not found in tree. Please refresh the page and try again.`);
          }
        }
      }

      // Now attempt withdrawal - pass the note directly
      toast.dismiss(syncToastId);
      setTimeout(() => {
        queueWithdrawal(selectedNote);
      }, 1000);
    } catch (err: any) {
      console.error("Send from pool error:", err);
      toast.error(err.message || "Failed to send. Please try again.", { id: syncToastId });
      setIsLoading(false);
      setStage("deposit");
    }
  };

  // Get sorted history (newest first) - fetched LIVE from blockchain when user opens modal
  // No localStorage, no background polling - only fetch on demand
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [blockchainHistory, setBlockchainHistory] = useState<CombinedTransaction[]>([]);

  const fetchHistoryFromBlockchain = async () => {
    if (!address || !publicClient || !PRIVACY_POOL_ADDRESS) {
      setBlockchainHistory([]);
      return;
    }

    setIsLoadingHistory(true);
    console.log(`📊 Fetching history from blockchain for wallet ${address.slice(0, 10)}...`);

    try {
      // Get all deposits for this wallet from localStorage (we need commitment/nullifier/secret)
      const localNotes = getDepositNotesForWallet(address);
      console.log(`  Found ${localNotes.length} deposits in localStorage`);

      // Query blockchain status for each deposit
      const history: CombinedTransaction[] = [];

      for (const note of localNotes) {
        try {
          // Get real-time status from contract
          const contractStatus = await publicClient.readContract({
            address: PRIVACY_POOL_ADDRESS,
            abi: PRIVACY_POOL_ABI,
            functionName: "getDepositStatus",
            args: [note.commitment]
          }) as number;

          const statusMap = ['none', 'deposited', 'queued', 'processing', 'completed'];
          const status = statusMap[contractStatus];

          // Skip deposits that don't exist in contract
          if (contractStatus === 0) continue;

          // Skip pending deposits (these are change notes waiting for relayer)
          if (note.status === 'pending') continue;

          // Check if this deposit has an associated withdrawal
          const allWithdrawals = getAllWithdrawalTransactions();
          const withdrawal = allWithdrawals.find(w => w.commitment === note.commitment);

          // Only show withdrawals in history - deposits are not shown
          if (withdrawal) {
            // Update withdrawal status if contract says it's completed but localStorage doesn't
            let updatedWithdrawal = withdrawal;
            if (status === 'completed' && withdrawal.status !== 'completed') {
              // Update deposit note status to completed
              updateDepositNoteStatus(note.commitment, 'completed', {
                withdrawalTxHash: note.withdrawalTxHash
              });

              // Update withdrawal status to completed
              updateWithdrawalStatus(withdrawal.id, 'completed', {
                withdrawalTxHash: note.withdrawalTxHash
              });

              // Get the updated withdrawal
              const updated = getAllWithdrawalTransactions().find(w => w.id === withdrawal.id);
              if (updated) {
                updatedWithdrawal = updated;
              }
            }

            history.push({
              type: 'withdrawal',
              commitment: note.commitment,
              amount: updatedWithdrawal.amount,
              timestamp: updatedWithdrawal.timestamp || Date.now(),
              status: updatedWithdrawal.status,
              depositData: note,
              withdrawalData: updatedWithdrawal,
              txHash: updatedWithdrawal.withdrawalTxHash || updatedWithdrawal.queueTxHash,
            });
          } else if (status === 'completed' && !withdrawal) {
            // Completed but no withdrawal found - might be secondary in multi-deposit
            // Try to find withdrawal by queueTxHash if available (for multi-deposit secondaries)
            const withdrawalByQueueTx = note.queueTxHash
              ? allWithdrawals.find(w => w.queueTxHash === note.queueTxHash)
              : undefined;

            if (withdrawalByQueueTx) {
              // Update withdrawal status if contract says it's completed but localStorage doesn't
              let updatedWithdrawal = withdrawalByQueueTx;
              if (withdrawalByQueueTx.status !== 'completed') {
                updateWithdrawalStatus(withdrawalByQueueTx.id, 'completed', {
                  withdrawalTxHash: note.withdrawalTxHash
                });

                const updated = getAllWithdrawalTransactions().find(w => w.id === withdrawalByQueueTx.id);
                if (updated) {
                  updatedWithdrawal = updated;
                }
              }

              history.push({
                type: 'withdrawal',
                commitment: note.commitment,
                amount: updatedWithdrawal.amount,
                timestamp: updatedWithdrawal.timestamp || Date.now(),
                status: updatedWithdrawal.status,
                depositData: note,
                withdrawalData: updatedWithdrawal,
                txHash: updatedWithdrawal.withdrawalTxHash || updatedWithdrawal.queueTxHash,
              });
            }
          }
        } catch (error) {
          console.error(`  ❌ Error fetching status for ${note.commitment.slice(0, 10)}:`, error);
        }
      }

      // Sort by timestamp (newest first)
      const sorted = history.sort((a, b) => b.timestamp - a.timestamp);
      console.log(`  ✅ Loaded ${sorted.length} transactions from blockchain`);

      setBlockchainHistory(sorted);

      // Also refresh the private balance to reflect any completed withdrawals
      fetchPrivateBalance();
    } catch (error) {
      console.error("Failed to fetch history:", error);
      setBlockchainHistory([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const getSortedHistory = () => blockchainHistory;

  // Pagination logic
  const sortedHistory = getSortedHistory();
  const totalPages = Math.ceil(sortedHistory.length / ITEMS_PER_PAGE);
  const paginatedHistory = sortedHistory.slice(
    (historyPage - 1) * ITEMS_PER_PAGE,
    historyPage * ITEMS_PER_PAGE
  );

  // Backup & Restore Functions
  const handleExportBackup = () => {
    try {
      if (!address) {
        toast.error("Please connect your wallet first");
        return;
      }

      const allNotes = getDepositNotesForWallet(address);
      if (allNotes.length === 0) {
        toast.error("No deposits to backup");
        return;
      }

      // Create backup object
      const backup = {
        version: "1.0",
        contractAddress: PRIVACY_POOL_ADDRESS,
        walletAddress: address,
        exportDate: new Date().toISOString(),
        deposits: allNotes
      };

      // Convert to JSON and download
      const dataStr = JSON.stringify(backup, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `privacy-cash-backup-${address.slice(0, 8)}-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);

      toast.success(`Backup created! Exported ${allNotes.length} deposit(s)`, {
        description: "Store this file safely. You'll need it to recover your deposits."
      });
    } catch (error: any) {
      console.error("Export error:", error);
      toast.error("Failed to create backup: " + error.message);
    }
  };

  const handleImportBackup = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target?.result as string);

        // Validate backup format
        if (!backup.version || !backup.deposits || !Array.isArray(backup.deposits)) {
          throw new Error("Invalid backup file format");
        }

        // Warn if contract address mismatch
        if (backup.contractAddress !== PRIVACY_POOL_ADDRESS) {
          toast.warning(
            `Warning: Backup is from a different contract (${backup.contractAddress?.slice(0, 10)}...). These deposits may not work with the current contract.`,
            { duration: 8000 }
          );
        }

        // Import deposits
        let imported = 0;
        console.log(`[Import] Starting import of ${backup.deposits.length} deposits...`);

        for (const note of backup.deposits) {
          console.log(`[Import] Importing note ${note.commitment.slice(0, 10)}:`, {
            hasNullifier: !!note.nullifier,
            hasSecret: !!note.secret,
            hasWallet: !!note.walletAddress,
            status: note.status
          });

          // Ensure wallet address is set if missing
          if (!note.walletAddress && address) {
            note.walletAddress = address;
            console.log(`[Import]   Added wallet address: ${address.slice(0, 10)}`);
          }

          storeDepositNote(note);
          imported++;
        }

        console.log(`[Import] ✅ Successfully imported ${imported} deposits`);

        toast.success(`Imported ${imported} deposit(s) from backup!`, {
          description: "Your deposits have been restored."
        });

        // Refresh balance
        console.log(`[Import] Refreshing balance...`);
        fetchPrivateBalance();
        setHistoryRefreshTrigger(prev => prev + 1);

        // Reset file input to allow re-importing same file
        event.target.value = '';

      } catch (error: any) {
        console.error("Import error:", error);
        toast.error("Failed to import backup: " + error.message);
      }
    };
    reader.readAsText(file);

    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const handleCloseWelcome = () => {
    localStorage.setItem('privacy_cash_welcome_seen', 'true');
    setShowWelcomeModal(false);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="w-full max-w-7xl">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-3">
            <Image
              src="/logotransanonbnb.png"
              alt="AnonBNB Logo"
              width={64}
              height={64}
              className="animate-scale-in"
            />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-[#fbb305] via-[#ffd700] to-[#fbb305] bg-clip-text text-transparent">
              AnonBNB
            </h1>
          </div>
          <p className="text-gray-400 text-base mb-6">Send BNB Privately - Fully Untraceable</p>

          {/* Private Balance Display */}
          {isConnected && parseFloat(privateBalance) > 0 && (
            <div className="mb-6 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#fbb305]/10 border border-[#fbb305]/20 rounded-lg">
                <span className="text-gray-400 text-sm">Private Balance:</span>
                <span className="text-[#fbb305] font-semibold text-sm">{privateBalance} BNB</span>
                {isLoadingBalance && (
                  <Loader2 className="w-3.5 h-3.5 text-[#fbb305] animate-spin ml-1" />
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 animate-slide-down">
            <Button variant="outline" onClick={() => setShowHowItWorks(true)} className="animate-scale-in">
              <Info className="w-4 h-4" />
              How It Works
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowHistoryModal(true);
                setHistoryPage(1);
                fetchHistoryFromBlockchain(); // Fetch fresh from blockchain when opening
              }}
              className="animate-scale-in"
              style={{ animationDelay: '0.1s' }}
            >
              <History className="w-4 h-4" />
              History
              {retryableNotes.length > 0 && (
                <Badge variant="default" className="ml-1">
                  {retryableNotes.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Single Column Layout - Main Form Centered */}
        <div className="flex justify-center animate-slide-up">
          <div className="w-full max-w-md">
            {/* Wallet Info */}
        {isConnected && address && balanceData && (
          <Card className="mb-6 animate-scale-in">
            <CardContent className="p-5">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-500 text-xs mb-1.5">Your Wallet</p>
                  <p className="text-white text-sm font-mono">
                    {address.slice(0, 10)}...{address.slice(-8)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 text-xs mb-1.5">Balance</p>
                  <p className="text-[#fbb305] text-base font-semibold">
                    {parseFloat(balanceData.formatted).toFixed(4)} BNB
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Card */}
        <Card className="p-8 animate-scale-in" style={{ animationDelay: '0.1s' }}>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "deposit" | "send" | "backup")} className="w-full">
            {/* Tab Switcher */}
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-zinc-900">
              <TabsTrigger value="deposit">Deposit</TabsTrigger>
              <TabsTrigger value="send">Send</TabsTrigger>
              <TabsTrigger value="backup">Backup</TabsTrigger>
            </TabsList>

            <CardHeader className="p-0 mb-6">
              <CardTitle>
                {activeTab === "deposit" ? "Deposit to Pool" : activeTab === "send" ? "Send Privately" : "Backup & Restore"}
              </CardTitle>
              <CardDescription>
                {activeTab === "deposit"
                  ? "Add BNB to your private balance"
                  : activeTab === "send"
                  ? "Send from your private balance to any address"
                  : "Export or import your deposit credentials"}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">

          {/* DEPOSIT TAB - Only Amount */}
          {activeTab === "deposit" && (
            <>
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2 font-medium">Amount (BNB)</label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  step="0.01"
                  min="0.01"
                  placeholder="0.01"
                  className="text-lg h-12"
                />
                <p className="text-xs text-gray-600 mt-2">Minimum: 0.01 BNB</p>
              </div>
            </>
          )}

          {/* SEND TAB - Recipient, Delay, and Amount */}
          {activeTab === "send" && (
            <>
              {/* Amount Input */}
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2 font-medium">Amount (BNB)</label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  step="0.01"
                  min="0.01"
                  placeholder="0.01"
                  className="text-lg h-12"
                />
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-600">From your private balance: {privateBalance} BNB</p>
                  <p className="text-xs text-green-600/80">
                    ✨ Partial withdrawals supported! Remaining balance returns automatically.
                  </p>
                  {address && (() => {
                    const walletNotes = getDepositNotesForWallet(address);
                    const availableAmounts = walletNotes
                      .filter(n => n.status === 'deposited')
                      .map(n => parseFloat(n.amount || '0'))
                      .filter((v, i, a) => a.indexOf(v) === i)
                      .sort((a, b) => a - b);

                    if (availableAmounts.length > 0) {
                      return (
                        <p className="text-xs text-gray-500">
                          Available: {availableAmounts.map(a => `${a} BNB`).join(', ')}
                        </p>
                      );
                    }
                    return null;
                  })()}
                </div>
              </div>

              {/* Recipient Address */}
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2 font-medium">
                  Recipient Address
                </label>
                <Input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="0x..."
                  className="font-mono"
                />
              </div>

              {/* Delay Input */}
              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2 font-medium">
                  Time Delay (Minutes)
                </label>
                <Input
                  type="number"
                  value={delayMinutes}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    // Enforce contract limits: 0 min - 1440 min (24 hours)
                    setDelayMinutes(Math.min(1440, Math.max(0, val)));
                  }}
                  min="0"
                  max="1440"
                  step="5"
                  placeholder="30"
                  className="text-lg h-12"
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-600">
                    {delayMinutes === 0 ? 'Instant withdrawal (less private)' : `${delayMinutes} min delay`}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      onClick={() => setDelayMinutes(0)}
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                    >
                      None
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setDelayMinutes(5)}
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                    >
                      5m
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setDelayMinutes(30)}
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                    >
                      30m
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setDelayMinutes(180)}
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                    >
                      3h
                    </Button>
                  </div>
                </div>
              </div>

              {/* Summary - only for send tab */}
              {recipientAddress && amount && (
                <div className="bg-black/50 rounded-xl p-4 mb-6 border border-zinc-800">
                  <div className="flex justify-between text-sm mb-2.5">
                    <span className="text-gray-500">Recipient Gets</span>
                    <span className="text-[#fbb305] font-semibold">
                      ~{(parseFloat(amount) * 0.9965).toFixed(4)} BNB
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mb-2.5">
                    <span className="text-gray-500">Delivery Time</span>
                    <span className="text-gray-400 font-medium">{delayMinutes} minutes</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Traceability</span>
                    <span className="text-green-400 font-semibold flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Zero
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* BACKUP TAB */}
          {activeTab === "backup" && (
            <>
              <div className="space-y-6">
                {/* Warning about privacy */}
                <div className="p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-yellow-200">
                      <p className="font-semibold mb-1">Important Security Information</p>
                      <p className="text-yellow-300/80">
                        Your deposit credentials (nullifier & secret) are stored ONLY in your browser's localStorage.
                        They are NEVER sent to any server or stored on the blockchain. If you clear your browser data
                        or use a different device, you'll need this backup to access your deposits.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Export Section */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Export Backup</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Download a JSON file containing all your deposit credentials. Store it securely - anyone with this file can withdraw your deposits!
                  </p>
                  <Button
                    onClick={handleExportBackup}
                    variant="outline"
                    className="w-full h-12"
                    disabled={!isConnected}
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Export Backup File
                  </Button>
                </div>

                <Separator className="bg-gray-700" />

                {/* Import Section */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Import Backup</h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Restore your deposit credentials from a previously exported backup file.
                  </p>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      className="hidden"
                      id="backup-import"
                      disabled={!isConnected}
                    />
                    <label htmlFor="backup-import" className="block cursor-pointer">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-12 pointer-events-none"
                        disabled={!isConnected}
                      >
                        <ArrowUpCircle className="w-5 h-5 mr-2" />
                        Import Backup File
                      </Button>
                    </label>
                  </div>
                </div>

                {/* Tips */}
                <div className="p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                  <p className="text-sm font-semibold text-blue-200 mb-2">💡 Best Practices</p>
                  <ul className="text-sm text-blue-300/80 space-y-1 list-disc list-inside">
                    <li>Export backup immediately after making deposits</li>
                    <li>Store backup file in a secure location (encrypted USB, password manager, etc.)</li>
                    <li>Never share your backup file with anyone</li>
                    <li>Create new backups after each deposit session</li>
                  </ul>
                </div>
              </div>
            </>
          )}

          {/* Submit Button - shown for deposit and send tabs only */}
          {activeTab !== "backup" && (
            !isConnected ? (
              <div className="flex justify-center">
                <ConnectButton />
              </div>
            ) : (
              <Button
                onClick={activeTab === "deposit" ? handleDeposit : handleSendFromPool}
                disabled={
                  !amount ||
                  isLoading ||
                  isConfirming ||
                  isWritePending ||
                  !PRIVACY_POOL_ADDRESS ||
                  (activeTab === "send" && !recipientAddress)
                }
                className="w-full h-12"
                size="lg"
              >
              {isWritePending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Awaiting Wallet Approval...
                </>
              ) : isLoading || isConfirming ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {stage === "deposit" ? "Processing..." : "Queueing..."}
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  {activeTab === "deposit" ? "Deposit to Pool" : "Send Privately"}
                </>
              )}
              </Button>
            )
          )}
          </CardContent>
          </Tabs>
        </Card>
          </div>
        </div>

        {/* Retry Modal */}
        <Dialog open={showRetryModal && !!currentNote} onOpenChange={setShowRetryModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Queue Withdrawal</DialogTitle>
              <DialogDescription>
                Complete the withdrawal for your deposited funds
              </DialogDescription>
            </DialogHeader>

            {currentNote && (
              <>
                <div className="mb-6 p-4 bg-black/50 rounded-xl border border-zinc-800">
                  <p className="text-gray-400 text-sm mb-2">
                    <span className="font-semibold">Amount:</span> {currentNote.amount || "0.01"} BNB
                  </p>
                  <p className="text-gray-500 text-xs font-mono break-all">
                    {currentNote.commitment}
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm text-gray-400 mb-2 font-medium">
                    Recipient Address
                  </label>
                  <Input
                    type="text"
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value.trim())}
                    placeholder="0x..."
                    className="font-mono"
                  />
                  {recipientAddress && recipientAddress.length !== 42 && (
                    <p className="text-yellow-400 text-xs mt-1">
                      Address must be 42 characters (current: {recipientAddress.length})
                    </p>
                  )}
                  {recipientAddress && recipientAddress.length === 42 && !recipientAddress.startsWith('0x') && (
                    <p className="text-red-400 text-xs mt-1">
                      Address must start with 0x
                    </p>
                  )}
                  {recipientAddress && recipientAddress.length === 42 && recipientAddress.startsWith('0x') && (
                    <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Valid address format
                    </p>
                  )}
                </div>

              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2 font-medium">
                  Time Delay (Minutes)
                </label>
                <Input
                  type="number"
                  value={delayMinutes}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setDelayMinutes(Math.min(1440, Math.max(0, val)));
                  }}
                  min="0"
                  max="1440"
                  step="5"
                  placeholder="30"
                  className="text-lg h-12"
                />
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-600">
                    {delayMinutes === 0 ? 'Instant withdrawal (less private)' : `${delayMinutes} min delay`}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      onClick={() => setDelayMinutes(0)}
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                    >
                      None
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setDelayMinutes(5)}
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                    >
                      5m
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setDelayMinutes(30)}
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                    >
                      30m
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setDelayMinutes(180)}
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs"
                    >
                      3h
                    </Button>
                  </div>
                </div>
              </div>

                <div className="flex gap-3 mt-6">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowRetryModal(false);
                      setRecipientAddress("");
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => queueWithdrawal()}
                    disabled={!recipientAddress || recipientAddress.length !== 42 || !recipientAddress.startsWith('0x') || isLoading}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Confirm"
                    )}
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* History Modal */}
        <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
          <DialogContent className="max-w-5xl max-h-[90vh] p-0 gap-0 [&>button]:hidden">
            <div className="flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="p-8 pb-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#fbb305]/10 rounded-xl flex items-center justify-center ring-1 ring-[#fbb305]/20">
                      <History className="w-6 h-6 text-[#fbb305]" />
                    </div>
                    <div>
                      <DialogTitle className="text-2xl mb-1">Transaction History</DialogTitle>
                      <DialogDescription className="text-base">
                        {sortedHistory.length} {sortedHistory.length === 1 ? 'transaction' : 'transactions'} • Sorted by newest first
                      </DialogDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        console.log("🔄 Manual refresh triggered - fetching from blockchain");
                        fetchHistoryFromBlockchain();
                        toast.info("Refreshing from blockchain...");
                      }}
                      disabled={isLoadingHistory}
                      className="gap-2"
                    >
                      <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowHistoryModal(false)}
                      className="h-9 w-9 rounded-full hover:bg-zinc-800 hover:text-white"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Content */}
              <ScrollArea className="flex-1 px-8 py-6">
                {isLoadingHistory ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <Loader2 className="w-12 h-12 text-[#fbb305] animate-spin mb-4" />
                    <h3 className="text-white text-xl font-semibold mb-2">Loading from blockchain...</h3>
                    <p className="text-gray-500 text-sm max-w-md">Fetching real-time transaction status</p>
                  </div>
                ) : sortedHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-24 h-24 bg-zinc-800/30 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-zinc-800">
                      <History className="w-12 h-12 text-gray-600" />
                    </div>
                    <h3 className="text-white text-xl font-semibold mb-2">No transaction history</h3>
                    <p className="text-gray-500 text-sm max-w-md">Your completed and pending transactions will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paginatedHistory.map((tx, idx) => {
                      const globalIdx = (historyPage - 1) * ITEMS_PER_PAGE + idx;
                      const reverseIdx = sortedHistory.length - globalIdx; // Newest = highest number
                      const isWithdrawal = tx.type === 'withdrawal';

                      const getStatusBadge = () => {
                        if (tx.status === 'completed') return <Badge variant="completed" className="gap-1.5"><CheckCircle className="w-3 h-3" />Completed</Badge>;
                        if (tx.status === 'failed') return <Badge variant="failed" className="gap-1.5"><XCircle className="w-3 h-3" />Failed</Badge>;
                        if (tx.status === 'processing') return <Badge variant="processing" className="gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />Processing</Badge>;
                        if (tx.status === 'queued') return <Badge variant="queued" className="gap-1.5"><Clock className="w-3 h-3" />Queued</Badge>;
                        return <Badge variant="default" className="gap-1.5"><Download className="w-3 h-3" />Deposited</Badge>;
                      };

                      const getTypeIcon = () => {
                        if (isWithdrawal) {
                          return <div className="w-10 h-10 bg-green-500/10 rounded-lg flex items-center justify-center ring-1 ring-green-500/20"><Download className="w-5 h-5 text-green-400" /></div>;
                        }
                        return <div className="w-10 h-10 bg-[#fbb305]/10 rounded-lg flex items-center justify-center ring-1 ring-[#fbb305]/20"><ArrowUpCircle className="w-5 h-5 text-[#fbb305]" /></div>;
                      };

                      return (
                        <Card key={`${tx.type}_${tx.commitment}_${idx}`} className="overflow-hidden group hover:ring-1 hover:ring-zinc-700">
                          <CardHeader className="pb-4">
                            <div className="flex items-start gap-4">
                              {getTypeIcon()}
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3 flex-wrap">
                                  <CardTitle className="text-lg">
                                    {isWithdrawal ? 'Withdrawal' : 'Deposit'} #{reverseIdx}
                                  </CardTitle>
                                  {getStatusBadge()}
                                </div>
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-500 text-xs">Commitment:</span>
                                    <code className="text-gray-400 text-xs font-mono bg-zinc-800/50 px-2 py-0.5 rounded">
                                      {tx.commitment.slice(0, 10)}...{tx.commitment.slice(-8)}
                                    </code>
                                  </div>
                                  {tx.timestamp && (
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-3 h-3 text-gray-600" />
                                      <span className="text-gray-500 text-xs">
                                        {new Date(tx.timestamp).toLocaleString()}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardHeader>

                          <Separator />

                          <CardContent className="pt-4 pb-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                              {/* Amount */}
                              <div>
                                <p className="text-gray-500 text-xs mb-1.5 font-medium">Amount</p>
                                <p className={`text-base font-semibold ${isWithdrawal ? 'text-green-400' : 'text-[#fbb305]'}`}>
                                  {isWithdrawal ? '-' : '+'}{tx.amount} BNB
                                </p>
                              </div>

                              {/* Recipient (for withdrawals) */}
                              {isWithdrawal && tx.recipient && (
                                <div>
                                  <p className="text-gray-500 text-xs mb-1.5 font-medium">Recipient</p>
                                  <code className="text-white text-sm font-mono">
                                    {tx.recipient.slice(0, 8)}...{tx.recipient.slice(-6)}
                                  </code>
                                </div>
                              )}

                              {/* Type indicator */}
                              <div>
                                <p className="text-gray-500 text-xs mb-1.5 font-medium">Type</p>
                                <p className={`text-sm font-semibold ${isWithdrawal ? 'text-green-400' : 'text-[#fbb305]'}`}>
                                  {isWithdrawal ? 'Withdrawal' : 'Deposit'}
                                </p>
                              </div>

                              {/* Queued time remaining (for queued withdrawals) */}
                              {isWithdrawal && tx.status === 'queued' && tx.withdrawalData?.executeAfter && (
                                <div>
                                  <p className="text-purple-400 text-xs mb-1.5 font-medium">Time Remaining</p>
                                  <p className="text-purple-300 text-base font-semibold">
                                    {Math.max(0, Math.ceil((tx.withdrawalData.executeAfter - Date.now()) / 60000))} min
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2">
                              {/* Deposit transaction link */}
                              {!isWithdrawal && tx.depositData?.depositTxHash && (
                                <a
                                  href={`https://${process.env.NEXT_PUBLIC_NETWORK === "testnet" ? "testnet." : ""}bscscan.com/tx/${tx.depositData.depositTxHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-xl text-xs font-semibold border border-[#fbb305]/20 bg-black/40 hover:bg-black/60 hover:border-[#fbb305]/40 text-[#fbb305] backdrop-blur-sm transition-all duration-200 ease-apple hover:scale-[1.02] active:scale-[0.97] transform-gpu"
                                >
                                  <ArrowUpCircle className="w-3.5 h-3.5" />
                                  View Deposit
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}

                              {/* Withdrawal queue transaction link */}
                              {isWithdrawal && tx.withdrawalData?.queueTxHash && (
                                <a
                                  href={`https://${process.env.NEXT_PUBLIC_NETWORK === "testnet" ? "testnet." : ""}bscscan.com/tx/${tx.withdrawalData.queueTxHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-xl text-xs font-semibold border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 hover:border-purple-500/40 text-purple-400 transition-all duration-200 ease-apple hover:scale-[1.02] active:scale-[0.97] transform-gpu"
                                >
                                  <Clock className="w-3.5 h-3.5" />
                                  View Queue
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}

                              {/* Withdrawal completion transaction link */}
                              {isWithdrawal && tx.withdrawalData?.withdrawalTxHash && (
                                <a
                                  href={`https://${process.env.NEXT_PUBLIC_NETWORK === "testnet" ? "testnet." : ""}bscscan.com/tx/${tx.withdrawalData.withdrawalTxHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-xl text-xs font-semibold border border-green-500/20 bg-green-500/5 hover:bg-green-500/10 hover:border-green-500/40 text-green-400 transition-all duration-200 ease-apple hover:scale-[1.02] active:scale-[0.97] transform-gpu"
                                >
                                  <CheckCircle className="w-3.5 h-3.5" />
                                  View Withdrawal
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}

                              {/* Retry button only for failed withdrawals */}
                              {!isWithdrawal && tx.depositData && tx.status === 'failed' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-2"
                                  onClick={() => {
                                    setCurrentNote(tx.depositData as DepositNote);
                                    setShowHistoryModal(false);
                                    setShowRetryModal(true);
                                  }}
                                >
                                  <RefreshCw className="w-3.5 h-3.5" />
                                  Retry Withdrawal
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Pagination Footer */}
              {totalPages > 1 && (
                <>
                  <Separator />
                  <div className="p-6">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <p className="text-gray-400 text-sm font-medium">
                        Page {historyPage} of {totalPages} • {sortedHistory.length} total
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                          disabled={historyPage === 1}
                          className="gap-2"
                        >
                          Previous
                        </Button>
                        <div className="hidden sm:flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (historyPage <= 3) {
                              pageNum = i + 1;
                            } else if (historyPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = historyPage - 2 + i;
                            }

                            return (
                              <Button
                                key={pageNum}
                                variant={historyPage === pageNum ? "default" : "ghost"}
                                size="icon"
                                className="w-9 h-9"
                                onClick={() => setHistoryPage(pageNum)}
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                          disabled={historyPage === totalPages}
                          className="gap-2"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Welcome Modal - First Time Users */}
        <Dialog open={showWelcomeModal} onOpenChange={handleCloseWelcome}>
          <DialogContent className="max-w-3xl max-h-[85vh]">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-2xl flex items-center gap-3">
                <span className="text-3xl">👋</span>
                Welcome to AnonBNB!
              </DialogTitle>
              <DialogDescription className="text-sm">
                Important information about keeping your funds safe.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-3 py-2">
              {/* How It Works */}
              <div className="p-3 bg-[#F0B90B]/10 border border-[#F0B90B]/30 rounded-lg">
                <h3 className="font-semibold text-[#F8D12F] mb-1.5 flex items-center gap-2 text-sm">
                  <Info className="w-4 h-4" />
                  How It Works
                </h3>
                <p className="text-xs text-[#F8D12F]/80 leading-relaxed">
                  Breaks deposit-withdrawal links using zero-knowledge cryptography. You get a unique <strong>nullifier + secret</strong> that proves ownership without revealing identity.
                </p>
              </div>

              {/* Critical: Backup Required */}
              <div className="p-3 bg-red-900/20 border border-red-600/40 rounded-lg">
                <h3 className="font-semibold text-red-300 mb-1.5 flex items-center gap-2 text-sm">
                  <Lock className="w-4 h-4" />
                  CRITICAL: Local Storage Only
                </h3>
                <ul className="text-xs text-red-300/90 space-y-0.5 list-disc list-inside">
                  <li><strong>NOT on blockchain</strong> (preserves privacy)</li>
                  <li><strong>NOT sent to servers</strong> (client-side only)</li>
                  <li><strong>LOST if you clear browser data</strong></li>
                </ul>
              </div>

              {/* Action Required */}
              <div className="p-3 bg-[#F0B90B]/10 border border-[#F0B90B]/30 rounded-lg">
                <h3 className="font-semibold text-[#F8D12F] mb-1.5 flex items-center gap-2 text-sm">
                  <Download className="w-4 h-4" />
                  Required: Export Backup
                </h3>
                <ol className="text-xs text-[#F8D12F]/80 space-y-1 list-decimal list-inside">
                  <li><strong>Make deposit</strong></li>
                  <li><strong>Click "Backup" tab immediately</strong></li>
                  <li><strong>Export & store securely</strong></li>
                  <li><strong>Repeat after each deposit</strong></li>
                </ol>
              </div>

              {/* Security Tips */}
              <div className="p-3 bg-green-900/20 border border-green-600/40 rounded-lg">
                <h3 className="font-semibold text-green-300 mb-1.5 flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4" />
                  Security Tips
                </h3>
                <ul className="text-xs text-green-300/90 space-y-0.5 list-disc list-inside">
                  <li>Store backups in multiple secure locations</li>
                  <li>Never share backup files</li>
                  <li>Anyone with backup can withdraw</li>
                  <li>Test restore with small deposit first</li>
                </ul>
              </div>
            </div>

            {/* Quick Start - Full Width */}
            <div className="p-3 bg-[#423C45] border border-[#554D58] rounded-lg">
              <h3 className="font-semibold text-[#F8D12F] mb-2 text-sm">✨ Quick Start Guide</h3>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="text-center p-2 bg-[#342E37] rounded border border-[#554D58]">
                  <div className="text-[#F0B90B] font-bold mb-1">1. Deposit</div>
                  <div className="text-gray-400">Deposit BNB</div>
                </div>
                <div className="text-center p-2 bg-[#342E37] rounded border border-[#554D58]">
                  <div className="text-[#F0B90B] font-bold mb-1">2. Backup</div>
                  <div className="text-gray-400">Export backup file</div>
                </div>
                <div className="text-center p-2 bg-[#342E37] rounded border border-[#554D58]">
                  <div className="text-[#F0B90B] font-bold mb-1">3. Secure</div>
                  <div className="text-gray-400">Store safely</div>
                </div>
                <div className="text-center p-2 bg-[#342E37] rounded border border-[#554D58]">
                  <div className="text-[#F0B90B] font-bold mb-1">4. Send</div>
                  <div className="text-gray-400">Withdraw privately</div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => {
                  handleCloseWelcome();
                  setActiveTab("backup");
                }}
                variant="outline"
                className="flex-1 border-[#F0B90B]/40 text-[#F0B90B] hover:bg-[#F0B90B]/10"
              >
                <Download className="w-4 h-4 mr-2" />
                Go to Backup Tab
              </Button>
              <Button
                onClick={handleCloseWelcome}
                className="flex-1 bg-gradient-to-r from-[#F0B90B] to-[#F8D12F] hover:from-[#F8D12F] hover:to-[#F0B90B] text-black font-semibold"
              >
                Got It - Start Using AnonBNB
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* How It Works Modal */}
        <HowItWorks isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)} />

        {/* Footer with social links */}
        <footer className="mt-12 mb-8 flex justify-center items-center gap-4">
          <a
            href="https://x.com/anonbnb_fun"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 hover:border-[#fbb305]/40 text-zinc-400 hover:text-[#fbb305] transition-all duration-200"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            <span className="text-sm font-medium">X</span>
          </a>

          <a
            href="https://t.me/anonbnbfun"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 hover:border-[#fbb305]/40 text-zinc-400 hover:text-[#fbb305] transition-all duration-200"
          >
            <Send className="w-4 h-4" />
            <span className="text-sm font-medium">Telegram</span>
          </a>

          <a
            href="https://gitlab.com/AnonBNB/AnonBNB-docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 hover:border-[#fbb305]/40 text-zinc-400 hover:text-[#fbb305] transition-all duration-200"
          >
            <BookOpen className="w-4 h-4" />
            <span className="text-sm font-medium">Docs</span>
          </a>

          <a
            href="https://gitlab.com/AnonBNB/AnonBNB-contract"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 hover:border-[#fbb305]/40 text-zinc-400 hover:text-[#fbb305] transition-all duration-200"
          >
            <GitlabIcon className="w-4 h-4" />
            <span className="text-sm font-medium">GitLab</span>
          </a>
        </footer>
      </div>
    </div>
  );
}
