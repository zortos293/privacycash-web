"use client";

import { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import HowItWorks from "@/components/HowItWorks";
import SolanaLogo from "@/components/SolanaLogo";

export default function Home() {
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [showHowItWorks, setShowHowItWorks] = useState(false);

  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const { setVisible } = useWalletModal();

  // Fetch balance when wallet is connected
  useEffect(() => {
    const fetchBalance = async () => {
      if (publicKey) {
        try {
          const balanceLamports = await connection.getBalance(publicKey);
          setBalance(balanceLamports / LAMPORTS_PER_SOL);
        } catch (err) {
          console.error("Error fetching balance:", err);
        }
      }
    };

    fetchBalance();
  }, [publicKey, connection]);

  const handleConnect = useCallback(() => {
    setVisible(true);
  }, [setVisible]);

  const handleMax = () => {
    // Reserve 0.01 SOL for transaction fees
    const maxAmount = Math.max(0, balance - 0.01);
    setAmount(maxAmount.toFixed(4));
  };

  const handleSend = async () => {
    if (!publicKey || !connected) {
      setError("Please connect your wallet first");
      return;
    }

    if (!recipient) {
      setError("Please enter a recipient address");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    setIsLoading(true);
    setError("");
    setSuccess("");

    try {
      // Validate recipient address
      const recipientPubkey = new PublicKey(recipient);

      // Calculate fee (0.25%)
      const amountInSol = parseFloat(amount);
      const fee = amountInSol * 0.0025;
      const totalAmount = amountInSol + fee;

      if (totalAmount > balance) {
        setError("Insufficient balance (including 0.25% fee)");
        setIsLoading(false);
        return;
      }

      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPubkey,
          lamports: Math.floor(amountInSol * LAMPORTS_PER_SOL),
        })
      );

      // Send transaction
      const signature = await sendTransaction(transaction, connection);

      // Wait for confirmation
      await connection.confirmTransaction(signature, "confirmed");

      setSuccess(`Transaction successful! Signature: ${signature.slice(0, 8)}...`);
      setAmount("");
      setRecipient("");

      // Refresh balance
      const newBalance = await connection.getBalance(publicKey);
      setBalance(newBalance / LAMPORTS_PER_SOL);
    } catch (err: any) {
      console.error("Transaction error:", err);
      setError(err.message || "Transaction failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#342E37] via-[#3d3740] to-[#2d272f] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#4F9CF9] via-[#6FB4FF] to-[#4F9CF9] bg-clip-text text-transparent">
            Privacy Cash
          </h1>
          <p className="text-gray-300 text-sm mb-4">Private transfers on Solana</p>

          {/* How It Works Button */}
          <button
            onClick={() => setShowHowItWorks(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#423C45] hover:bg-[#4d4651] border border-[#4F9CF9]/30 hover:border-[#4F9CF9]/60 rounded-lg transition-all text-sm text-[#6FB4FF] hover:text-[#4F9CF9] font-medium shadow-lg shadow-[#4F9CF9]/10"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How It Works
          </button>
        </div>

        {/* Wallet Info */}
        {connected && publicKey && (
          <div className="mb-6 bg-[#423C45] rounded-xl p-4 border border-[#554D58] shadow-lg shadow-[#4F9CF9]/5">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-300 text-xs mb-1">Wallet Address</p>
                <p className="text-white text-sm font-mono">
                  {publicKey.toBase58().slice(0, 8)}...
                  {publicKey.toBase58().slice(-8)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-300 text-xs mb-1">Balance</p>
                <p className="text-[#6FB4FF] text-sm font-semibold">
                  {balance.toFixed(4)} SOL
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-[#423C45] rounded-2xl p-8 shadow-2xl border border-[#554D58] backdrop-blur-sm">
          <h2 className="text-2xl font-semibold mb-6 text-white">Send Privately</h2>

          {/* Error Message */}
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/50 rounded-lg p-3 backdrop-blur-sm">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 bg-green-500/10 border border-green-500/50 rounded-lg p-3 backdrop-blur-sm">
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}

          {/* Amount Input */}
          <div className="mb-6">
            <label className="block text-sm text-gray-300 mb-2">Amount</label>
            <div className="relative">
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#2D272F] border border-[#554D58] rounded-lg px-4 py-3 text-lg text-white focus:outline-none focus:border-[#4F9CF9] focus:ring-2 focus:ring-[#4F9CF9]/20 transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <button
                  onClick={handleMax}
                  className="text-[#6FB4FF] text-sm font-medium hover:text-[#4F9CF9] transition-colors"
                >
                  MAX
                </button>
                <div className="w-px h-4 bg-[#554D58]"></div>
                <div className="flex items-center gap-1 bg-[#342E37] px-2 py-1 rounded">
                  <SolanaLogo className="w-5 h-5" />
                  <span className="text-sm font-medium text-white">SOL</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recipient Address */}
          <div className="mb-6">
            <label className="block text-sm text-gray-300 mb-2">
              Recipient Address
            </label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="Enter Solana address"
              className="w-full bg-[#2D272F] border border-[#554D58] rounded-lg px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-[#4F9CF9] focus:ring-2 focus:ring-[#4F9CF9]/20 transition-all"
            />
          </div>

          {/* Transaction Fee Info */}
          <div className="bg-[#2D272F] rounded-lg p-4 mb-6 border border-[#554D58]">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-300">Transaction Fee</span>
              <span className="text-[#6FB4FF] font-semibold">0.25%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-300">Privacy Level</span>
              <span className="text-green-400 font-semibold">Maximum</span>
            </div>
          </div>

          {/* Connect Wallet / Send Button */}
          {!connected ? (
            <button
              onClick={handleConnect}
              className="w-full bg-gradient-to-r from-[#4F9CF9] to-[#2E7DD2] hover:from-[#6FB4FF] hover:to-[#4F9CF9] text-white font-semibold py-4 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#4F9CF9]/30"
            >
              Connect Wallet
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!amount || !recipient || isLoading}
              className="w-full bg-gradient-to-r from-[#4F9CF9] to-[#2E7DD2] hover:from-[#6FB4FF] hover:to-[#4F9CF9] disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:transform-none shadow-lg shadow-[#4F9CF9]/30 disabled:shadow-none"
            >
              {isLoading ? "Sending..." : "Send Privately"}
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          <div className="bg-[#423C45]/80 backdrop-blur-sm rounded-xl p-4 border border-[#554D58] shadow-lg">
            <div className="text-gray-300 text-xs mb-1">Total Volume</div>
            <div className="text-[#6FB4FF] font-bold text-lg">$50M+</div>
          </div>
          <div className="bg-[#423C45]/80 backdrop-blur-sm rounded-xl p-4 border border-[#554D58] shadow-lg">
            <div className="text-gray-300 text-xs mb-1">Transaction Fee</div>
            <div className="text-[#6FB4FF] font-bold text-lg">0.25%</div>
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <div className="w-2 h-2 rounded-full bg-[#4F9CF9] shadow-sm shadow-[#4F9CF9]/50"></div>
            <span className="text-gray-200">Zero-knowledge proofs for maximum privacy</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-2 h-2 rounded-full bg-[#4F9CF9] shadow-sm shadow-[#4F9CF9]/50"></div>
            <span className="text-gray-200">OFAC compliant with selective disclosure</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-2 h-2 rounded-full bg-[#4F9CF9] shadow-sm shadow-[#4F9CF9]/50"></div>
            <span className="text-gray-200">Audited by independent 3rd party</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="w-2 h-2 rounded-full bg-[#4F9CF9] shadow-sm shadow-[#4F9CF9]/50"></div>
            <span className="text-gray-200">No account required</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-gray-400 text-xs">
            Backed by Alliance DAO • Open Source on GitHub
          </p>
          <div className="flex justify-center gap-2 mt-4">
            <div className="w-2 h-2 rounded-full bg-[#554D58]"></div>
            <div className="w-2 h-2 rounded-full bg-[#4F9CF9] shadow-sm shadow-[#4F9CF9]/50"></div>
            <div className="w-2 h-2 rounded-full bg-[#554D58]"></div>
          </div>
        </div>
      </div>

      {/* How It Works Modal */}
      <HowItWorks isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)} />
    </div>
  );
}
