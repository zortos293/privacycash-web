"use client";

import { useState, useEffect } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HelpCircle, Lock, Send, CheckCircle, XCircle, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const FIXED_AMOUNT = 0.1; // Fixed 0.1 SOL denomination

type TransactionStep = {
  id: string;
  stepName: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "FAILED";
  details?: any;
  txSignature?: string;
  createdAt: string;
  updatedAt: string;
};

type TransactionData = {
  id: string;
  status: string;
  depositAddress: string;
  recipientAddress: string;
  amount: number;
  delayMinutes: number;
  steps: TransactionStep[];
  depositTxSignature?: string;
  withdrawalTxSignature?: string;
  createdAt: string;
  completedAt?: string;
};

export default function Home() {
  const { publicKey, connected, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [recipientAddress, setRecipientAddress] = useState("");
  const [delayMinutes, setDelayMinutes] = useState(5);
  const [isCreating, setIsCreating] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [currentTransaction, setCurrentTransaction] = useState<TransactionData | null>(null);
  const [statusPolling, setStatusPolling] = useState<NodeJS.Timeout | null>(null);

  // Poll for transaction updates
  useEffect(() => {
    if (currentTransaction && currentTransaction.status !== "COMPLETED" && currentTransaction.status !== "FAILED") {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/transactions/${currentTransaction.id}`);
          const data = await response.json();

          if (data.success) {
            setCurrentTransaction(data.transaction);

            // Stop polling if completed or failed
            if (data.transaction.status === "COMPLETED" || data.transaction.status === "FAILED") {
              clearInterval(interval);
              setStatusPolling(null);

              if (data.transaction.status === "COMPLETED") {
                toast.success("Transaction completed!", {
                  description: `SOL sent to ${data.transaction.recipientAddress.slice(0, 8)}...`,
                });
              } else {
                toast.error("Transaction failed", {
                  description: data.transaction.errorMessage || "Unknown error",
                });
              }
            }
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 5000); // Poll every 5 seconds

      setStatusPolling(interval);

      return () => {
        clearInterval(interval);
      };
    }
  }, [currentTransaction]);

  // Create new transaction
  const handleCreateTransaction = async () => {
    if (!recipientAddress) {
      toast.error("Please enter recipient address");
      return;
    }

    // Validate Solana address
    try {
      new PublicKey(recipientAddress);
    } catch {
      toast.error("Invalid Solana address");
      return;
    }

    try {
      setIsCreating(true);

      const response = await fetch("/api/transactions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientAddress,
          amount: FIXED_AMOUNT,
          delayMinutes,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to create transaction");
      }

      // Fetch full transaction details
      const detailsResponse = await fetch(`/api/transactions/${data.transaction.id}`);
      const detailsData = await detailsResponse.json();

      setCurrentTransaction(detailsData.transaction);

      toast.success("Transaction created!", {
        description: "Now send SOL to the deposit address",
      });
    } catch (error: any) {
      console.error("Error creating transaction:", error);
      toast.error("Failed to create transaction", {
        description: error.message,
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Send SOL to deposit address
  const handleSendDeposit = async () => {
    if (!connected || !publicKey) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!currentTransaction) {
      toast.error("No transaction created");
      return;
    }

    try {
      setIsSending(true);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(currentTransaction.depositAddress),
          lamports: Math.floor(FIXED_AMOUNT * LAMPORTS_PER_SOL),
        })
      );

      const signature = await sendTransaction(transaction, connection);

      toast.info("Transaction sent, confirming...", {
        description: signature.slice(0, 16) + "...",
      });

      await connection.confirmTransaction(signature, "confirmed");

      toast.success("Deposit confirmed!", {
        description: "Relayer will process your transaction",
      });

      // Refresh transaction status
      setTimeout(async () => {
        const response = await fetch(`/api/transactions/${currentTransaction.id}`);
        const data = await response.json();
        if (data.success) {
          setCurrentTransaction(data.transaction);
        }
      }, 2000);
    } catch (error: any) {
      console.error("Error sending deposit:", error);
      toast.error("Failed to send deposit", {
        description: error.message,
      });
    } finally {
      setIsSending(false);
    }
  };

  // Reset for new transaction
  const handleReset = () => {
    setCurrentTransaction(null);
    setRecipientAddress("");
    setDelayMinutes(5);
    if (statusPolling) {
      clearInterval(statusPolling);
      setStatusPolling(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-500";
      case "FAILED":
        return "bg-red-500";
      case "PENDING_DEPOSIT":
        return "bg-yellow-500";
      default:
        return "bg-blue-500";
    }
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "FAILED":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "IN_PROGRESS":
        return <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />;
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a] p-4">
      <div className="max-w-4xl mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-[#F0B90B]">
            Privacy Cash
          </h1>
          <p className="text-gray-400">
            Privacy mixer for Solana using ZEC routing
          </p>

          {/* How It Works Button */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" className="text-[#F0B90B] hover:text-[#F8D12F] hover:bg-[#2a2a2a]">
                <HelpCircle className="mr-2 h-4 w-4" />
                How It Works
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#2a2a2a] border-[#3a3a3a] text-white max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-[#F0B90B] text-2xl">How Privacy Cash Works</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Your transaction flow through our privacy mixer
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Visual Flow */}
                <div className="flex flex-col space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-[#F0B90B] rounded-full flex items-center justify-center text-black font-bold">
                      1
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-[#F0B90B]">Deposit 0.1 SOL</h4>
                      <p className="text-sm text-gray-400">Send SOL to unique deposit address</p>
                    </div>
                  </div>

                  <div className="pl-6 border-l-2 border-[#F0B90B] ml-6">
                    <ArrowRight className="text-[#F0B90B] h-6 w-6 mb-2" />
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-[#F0B90B] rounded-full flex items-center justify-center text-black font-bold">
                      2
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-[#F0B90B]">Swap to ZEC</h4>
                      <p className="text-sm text-gray-400">Relayer swaps SOL → ZEC via NEAR Intents</p>
                    </div>
                  </div>

                  <div className="pl-6 border-l-2 border-[#F0B90B] ml-6">
                    <ArrowRight className="text-[#F0B90B] h-6 w-6 mb-2" />
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-[#F0B90B] rounded-full flex items-center justify-center text-black font-bold">
                      3
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-[#F0B90B]">Privacy Delay</h4>
                      <p className="text-sm text-gray-400">Wait 5 min - 24 hours (you choose)</p>
                    </div>
                  </div>

                  <div className="pl-6 border-l-2 border-[#F0B90B] ml-6">
                    <ArrowRight className="text-[#F0B90B] h-6 w-6 mb-2" />
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-[#F0B90B] rounded-full flex items-center justify-center text-black font-bold">
                      4
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-[#F0B90B]">Swap to SOL</h4>
                      <p className="text-sm text-gray-400">Relayer swaps ZEC → SOL via NEAR Intents</p>
                    </div>
                  </div>

                  <div className="pl-6 border-l-2 border-[#F0B90B] ml-6">
                    <ArrowRight className="text-[#F0B90B] h-6 w-6 mb-2" />
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                      ✓
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-green-500">Receive ~0.0993 SOL</h4>
                      <p className="text-sm text-gray-400">Directly delivered to your address</p>
                    </div>
                  </div>
                </div>

                {/* Privacy Features */}
                <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#3a3a3a]">
                  <h4 className="font-semibold text-[#F0B90B] mb-3">Why It's Private:</h4>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li className="flex items-start gap-2">
                      <span className="text-[#F0B90B]">•</span>
                      <span><strong className="text-white">Fresh wallets</strong> - Every step uses new addresses</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#F0B90B]">•</span>
                      <span><strong className="text-white">ZEC routing</strong> - Breaks direct SOL → SOL link</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#F0B90B]">•</span>
                      <span><strong className="text-white">Time delays</strong> - Mixes with other transactions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#F0B90B]">•</span>
                      <span><strong className="text-white">Fixed amount</strong> - 0.1 SOL uniform transactions</span>
                    </li>
                  </ul>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Wallet Connection */}
        <div className="flex justify-center">
          <WalletMultiButton className="!bg-gradient-to-r !from-[#F0B90B] !to-[#F8D12F] !text-black hover:!from-[#d9a50a] hover:!to-[#dfc02a] !font-semibold" />
        </div>

        {/* Main Card */}
        {!currentTransaction ? (
          <Card className="bg-[#2a2a2a] border-[#3a3a3a]">
            <CardHeader>
              <CardTitle className="text-[#F0B90B]">Create New Transaction</CardTitle>
              <CardDescription className="text-gray-400">
                Fixed 0.1 SOL denomination for maximum privacy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipient" className="text-gray-300">Recipient Solana Address</Label>
                <Input
                  id="recipient"
                  placeholder="Enter recipient address..."
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="bg-[#1a1a1a] border-[#3a3a3a] text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="delay" className="text-gray-300">Privacy Delay</Label>
                <Select
                  value={delayMinutes.toString()}
                  onValueChange={(v) => setDelayMinutes(parseInt(v))}
                >
                  <SelectTrigger id="delay" className="bg-[#1a1a1a] border-[#3a3a3a] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2a2a2a] border-[#3a3a3a] text-white">
                    <SelectItem value="5">5 minutes (fastest)</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour (recommended)</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="360">6 hours</SelectItem>
                    <SelectItem value="720">12 hours</SelectItem>
                    <SelectItem value="1440">24 hours (maximum privacy)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 space-y-2 bg-[#1a1a1a] p-4 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Amount:</span>
                  <span className="font-semibold text-white">0.1 SOL</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">NEAR Bridge fees (2 hops):</span>
                  <span className="text-gray-300">~0.0006 SOL (~0.6%)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Slippage:</span>
                  <span className="text-gray-300">~0.0001 SOL</span>
                </div>
                <div className="flex justify-between text-sm text-xs text-gray-500">
                  <span>Network fees (gas):</span>
                  <span>~0.00001 SOL</span>
                </div>
                <div className="flex justify-between text-sm border-t border-[#3a3a3a] pt-2">
                  <span className="text-gray-400">You receive:</span>
                  <span className="font-semibold text-[#F0B90B]">~0.0993 SOL</span>
                </div>
              </div>

              <Button
                className="w-full bg-gradient-to-r from-[#F0B90B] to-[#F8D12F] text-black hover:from-[#d9a50a] hover:to-[#dfc02a] font-semibold"
                onClick={handleCreateTransaction}
                disabled={isCreating || !recipientAddress}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Create Private Transaction
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Transaction Status Card */}
            <Card className="bg-[#2a2a2a] border-[#3a3a3a]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-[#F0B90B]">Transaction Status</CardTitle>
                    <CardDescription className="font-mono text-xs mt-1 text-gray-400">
                      ID: {currentTransaction.id}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(currentTransaction.status)}>
                    {currentTransaction.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentTransaction.status === "PENDING_DEPOSIT" && (
                  <div className="space-y-3">
                    <Alert className="bg-[#3a3a3a] border-[#F0B90B]">
                      <Send className="h-4 w-4 text-[#F0B90B]" />
                      <AlertDescription className="text-gray-300">
                        <strong>Send exactly 0.1 SOL to this address:</strong>
                      </AlertDescription>
                    </Alert>

                    <div className="p-4 bg-[#1a1a1a] rounded-lg border border-[#3a3a3a]">
                      <p className="text-sm text-gray-400 mb-2">
                        Deposit Address:
                      </p>
                      <p className="font-mono text-sm break-all text-white">
                        {currentTransaction.depositAddress}
                      </p>
                    </div>

                    <Button
                      className="w-full bg-gradient-to-r from-[#F0B90B] to-[#F8D12F] text-black hover:from-[#d9a50a] hover:to-[#dfc02a] font-semibold"
                      onClick={handleSendDeposit}
                      disabled={!connected || isSending}
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Send 0.1 SOL from Connected Wallet
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Transaction Steps */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-gray-300">Progress:</h3>
                  {currentTransaction.steps.map((step, index) => (
                    <div key={step.id} className="flex items-start gap-3">
                      <div className="mt-0.5">{getStepIcon(step.status)}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{step.stepName}</p>
                        {step.details && (
                          <p className="text-xs text-gray-500 mt-1">
                            {typeof step.details === "string"
                              ? step.details
                              : JSON.stringify(step.details, null, 2)}
                          </p>
                        )}
                        {step.txSignature && (
                          <a
                            href={`https://explorer.solana.com/tx/${step.txSignature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[#F0B90B] hover:underline"
                          >
                            View transaction →
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {(currentTransaction.status === "COMPLETED" ||
                  currentTransaction.status === "FAILED") && (
                  <Button onClick={handleReset} variant="outline" className="w-full border-[#F0B90B] text-[#F0B90B] hover:bg-[#3a3a3a]">
                    Create New Transaction
                  </Button>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
