"use client";

import { useState } from "react";

interface HowItWorksProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowItWorks({ isOpen, onClose }: HowItWorksProps) {
  const [activeStep, setActiveStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: "1. Generate Your Secret Credentials",
      description: "When you initiate a deposit, the app generates two cryptographically secure random 32-byte (256-bit) values using your browser's crypto.getRandomValues(). These are your nullifier and secret - the keys to your deposit.",
      icon: (
        <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
      visual: (
        <div className="my-6 space-y-3">
          <div className="bg-zinc-900 border border-[#fbb305]/40 rounded-lg p-4 shadow-lg shadow-[#fbb305]/10">
            <div className="space-y-3">
              <div>
                <span className="text-gray-400 text-xs block mb-1">Nullifier (32 bytes)</span>
                <div className="text-[#ffd700] text-xs font-mono bg-black/30 p-2 rounded">0x7a3f89b2c4d1e6f8a9c3d5e7f1a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0</div>
              </div>
              <div>
                <span className="text-gray-400 text-xs block mb-1">Secret (32 bytes)</span>
                <div className="text-[#ffd700] text-xs font-mono bg-black/30 p-2 rounded">0x4e8d1a6f2c9b5e7a3d1f8c4b0e6a2f9d5c8b1e4a7f3c6d9b2e5a8f1c4d7b0e3a6</div>
              </div>
            </div>
          </div>
          <div className="flex justify-center items-center gap-2">
            <div className="text-xs text-gray-400 font-mono">keccak256(nullifier, secret)</div>
            <svg className="w-5 h-5 text-[#fbb305] animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
          <div className="bg-gradient-to-r from-[#fbb305]/20 to-[#ffd700]/20 border border-[#fbb305] rounded-lg p-4 shadow-xl shadow-[#fbb305]/20">
            <div className="text-center">
              <span className="text-gray-300 text-xs block mb-2">Commitment Hash (Public)</span>
              <div className="text-white text-xs font-mono font-semibold bg-black/30 p-2 rounded">0x8f1a3d5e7c9f2b4e6a8d0c3f5e7a9c1d4f6b8e0a2d5c7f9b1e4a6c8f0d3b5e7a9</div>
              <p className="text-gray-400 text-xs mt-3">✓ Stored on blockchain</p>
              <p className="text-gray-400 text-xs">✓ Proves ownership without revealing identity</p>
            </div>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
            <p className="text-purple-300 text-xs">
              <strong>Note:</strong> These credentials are stored ONLY in your browser's localStorage. Never share them or you'll lose your funds!
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "2. Deposit to Privacy Pool & Merkle Tree",
      description: "You send BNB along with your commitment hash to the smart contract. The contract adds your commitment to a 20-level binary Merkle tree (supports up to 1,048,576 deposits). The contract only knows the commitment hash - it has NO knowledge of your nullifier, secret, or future withdrawal address.",
      icon: (
        <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      ),
      visual: (
        <div className="my-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#fbb305] to-[#ffd700] flex items-center justify-center mx-auto mb-2 shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="text-xs text-gray-300">Your Wallet</span>
              <div className="text-xs text-gray-400 mt-1">0x742d...4A8c</div>
            </div>
            <div className="flex flex-col items-center gap-1 px-4">
              <div className="text-xs text-[#fbb305] font-mono">0.1 BNB</div>
              <svg className="w-6 h-6 text-[#fbb305] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <div className="text-xs text-[#ffd700] font-mono">commitment</div>
            </div>
            <div className="flex-1 text-center">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#fbb305] to-[#ffd700] flex items-center justify-center mx-auto mb-2 shadow-xl">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-xs text-gray-300">Smart Contract</span>
            </div>
          </div>

          <div className="bg-zinc-900 border border-blue-500/40 rounded-lg p-4">
            <div className="text-center mb-3">
              <span className="text-blue-400 text-xs font-semibold">Merkle Tree Structure (Binary)</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded bg-blue-500/30 border border-blue-500 flex items-center justify-center">
                <span className="text-xs text-blue-200">Root</span>
              </div>
              <div className="flex gap-8">
                <div className="w-6 h-6 rounded bg-blue-500/20 border border-blue-500/50"></div>
                <div className="w-6 h-6 rounded bg-blue-500/20 border border-blue-500/50"></div>
              </div>
              <div className="flex gap-2">
                <div className="w-4 h-4 rounded-sm bg-[#fbb305]/30 border border-[#fbb305]"></div>
                <div className="w-4 h-4 rounded-sm bg-gray-500/20"></div>
                <div className="w-4 h-4 rounded-sm bg-gray-500/20"></div>
                <div className="w-4 h-4 rounded-sm bg-gray-500/20"></div>
              </div>
              <div className="text-xs text-gray-400 mt-1">Your commitment (leaf)</div>
            </div>
          </div>

          <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-3">
            <p className="text-green-400 text-xs text-center space-y-1">
              <span className="block">✓ Commitment inserted at leaf index</span>
              <span className="block">✓ Merkle root updated on-chain</span>
              <span className="block">✓ Your deposit is now anonymous in the pool</span>
            </p>
          </div>

          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
            <p className="text-orange-300 text-xs">
              <strong>Privacy Note:</strong> The blockchain only sees: [Wallet Address] → [Commitment Hash]. Your nullifier and secret remain private in your browser.
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "3. Queue Withdrawal with Cryptographic Proof",
      description: "When ready to withdraw, you provide your nullifier and secret. The contract verifies ownership by recomputing the commitment hash, generates a nullifier hash to prevent double-spending, and validates your Merkle proof. Your withdrawal is then queued with your chosen time delay.",
      icon: (
        <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      visual: (
        <div className="my-6 space-y-3">
          <div className="bg-zinc-900 border border-purple-500/40 rounded-lg p-3 shadow-lg">
            <div className="text-center mb-2">
              <span className="text-purple-400 text-xs font-semibold">Verification Steps</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <span className="text-green-400 flex-shrink-0">✓</span>
                <div>
                  <span className="text-gray-400">keccak256(nullifier, secret)</span>
                  <span className="text-green-400 ml-2">→ Commitment verified</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-400 flex-shrink-0">✓</span>
                <div>
                  <span className="text-gray-400">keccak256(nullifier)</span>
                  <span className="text-green-400 ml-2">→ Not double-spent</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-400 flex-shrink-0">✓</span>
                <div>
                  <span className="text-gray-400">Merkle proof (20 hashes)</span>
                  <span className="text-green-400 ml-2">→ In pool</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-zinc-900 border border-blue-500/40 rounded p-2">
              <div className="text-gray-400 mb-1">Recipient</div>
              <div className="text-white font-mono text-xs">0x9f3c...6b2a</div>
            </div>
            <div className="bg-zinc-900 border border-blue-500/40 rounded p-2">
              <div className="text-gray-400 mb-1">Amount</div>
              <div className="text-[#ffd700]">0.1 BNB</div>
            </div>
            <div className="bg-zinc-900 border border-blue-500/40 rounded p-2">
              <div className="text-gray-400 mb-1">Delay</div>
              <div className="text-[#ffd700]">30 minutes</div>
            </div>
            <div className="bg-zinc-900 border border-blue-500/40 rounded p-2">
              <div className="text-gray-400 mb-1">Status</div>
              <div className="text-green-400">Queued ✓</div>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-2">
            <p className="text-blue-400 text-xs text-center">
              🎭 Withdrawal queued - No on-chain link to depositor!
            </p>
          </div>
        </div>
      ),
    },
    {
      title: "4. Automated Relayer Executes Withdrawal",
      description: "After your delay expires, our relayer service automatically processes the withdrawal. It sends BNB from the pool to your recipient using the relayer's wallet, completely breaking the on-chain link between your deposit and the final recipient.",
      icon: (
        <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
      visual: (
        <div className="my-6 space-y-3">
          <div className="bg-zinc-900 border border-green-500/40 rounded-lg p-3">
            <div className="text-center mb-2">
              <span className="text-green-400 text-xs font-semibold">Automated Processing</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-green-400 flex-shrink-0">1.</span>
                <span className="text-gray-300">Relayer checks queue every 60s</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400 flex-shrink-0">2.</span>
                <span className="text-gray-300">Calls processWithdrawals() after delay</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400 flex-shrink-0">3.</span>
                <span className="text-gray-300">Transfers 0.0996 BNB to recipient</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-green-400 flex-shrink-0">4.</span>
                <span className="text-gray-300">Marks nullifier as spent</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#fbb305] to-[#ffd700] flex items-center justify-center mx-auto mb-1 shadow-xl">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-xs text-gray-300">Pool</span>
            </div>
            <div className="flex flex-col items-center gap-1 px-3">
              <svg className="w-5 h-5 text-green-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <div className="text-xs text-green-400">Relayer</div>
            </div>
            <div className="flex-1 text-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-1 shadow-lg">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="text-xs text-gray-300">Recipient</span>
            </div>
          </div>

          <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-2">
            <p className="text-green-400 text-xs font-semibold text-center mb-1">✓ Privacy Achieved!</p>
            <div className="text-xs text-gray-300 space-y-0.5">
              <p>✓ Sent from relayer wallet (not yours)</p>
              <p>✓ No on-chain link to depositor</p>
              <p>✓ Untraceable in anonymity set</p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-black rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-zinc-800 shadow-2xl shadow-[#fbb305]/20 animate-slideUp">
        {/* Header */}
        <div className="sticky top-0 bg-black border-b border-zinc-800 p-6 flex justify-between items-center backdrop-blur-sm">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#fbb305] via-[#ffd700] to-[#fbb305] bg-clip-text text-transparent">
            How It Works
          </h2>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-[#ffd700] transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step Navigation */}
          <div className="flex justify-between mb-8 relative">
            {steps.map((_, index) => (
              <div key={index} className="flex flex-col items-center flex-1 relative z-10">
                <button
                  onClick={() => setActiveStep(index)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    index === activeStep
                      ? "bg-gradient-to-r from-[#fbb305] to-[#ffd700] text-black scale-110 shadow-lg shadow-[#fbb305]/40"
                      : index < activeStep
                      ? "bg-green-500 text-white shadow-md"
                      : "bg-zinc-800 text-gray-400"
                  }`}
                >
                  {index < activeStep ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </button>
              </div>
            ))}
            {/* Progress Lines */}
            <div className="absolute top-5 left-0 right-0 flex items-center px-5" style={{ zIndex: 0 }}>
              {steps.slice(0, -1).map((_, index) => (
                <div
                  key={index}
                  className="flex-1 h-1 mx-5 transition-colors duration-300"
                  style={{
                    backgroundColor: index < activeStep ? "#10b981" : "#27272a"
                  }}
                />
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="min-h-[400px]">
            <div className="text-center text-[#ffd700] mb-4">
              {steps[activeStep].icon}
            </div>
            <h3 className="text-2xl font-bold text-white text-center mb-3">
              {steps[activeStep].title}
            </h3>
            <p className="text-gray-300 text-center mb-6">
              {steps[activeStep].description}
            </p>
            <div>{steps[activeStep].visual}</div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-zinc-800">
            <button
              onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
              disabled={activeStep === 0}
              className="px-6 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white font-medium"
            >
              Previous
            </button>
            <div className="flex items-center gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === activeStep ? "bg-[#fbb305] w-8 shadow-sm shadow-[#fbb305]/50" : "bg-zinc-800"
                  }`}
                />
              ))}
            </div>
            {activeStep < steps.length - 1 ? (
              <button
                onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-[#fbb305] to-[#ffd700] hover:from-[#ffd700] hover:to-[#fbb305] transition-colors text-black font-medium shadow-lg shadow-[#fbb305]/30"
              >
                Next
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition-colors text-white font-medium shadow-lg shadow-green-500/30"
              >
                Get Started
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
