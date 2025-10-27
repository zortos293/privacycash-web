"use client";

import { useState } from "react";
import SolanaLogo from "./SolanaLogo";

interface HowItWorksProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowItWorks({ isOpen, onClose }: HowItWorksProps) {
  const [activeStep, setActiveStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: "Connect Your Wallet",
      description: "Connect your Solana wallet (Phantom, Solflare, or Backpack) to get started.",
      icon: (
        <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
      visual: (
        <div className="flex justify-center items-center gap-4 my-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#4F9CF9] to-[#6FB4FF] flex items-center justify-center animate-pulse shadow-lg shadow-[#4F9CF9]/30">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
            </svg>
          </div>
          <div className="flex flex-col gap-1">
            <div className="w-2 h-2 rounded-full bg-[#6FB4FF] animate-bounce shadow-sm shadow-[#6FB4FF]/50" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-[#6FB4FF] animate-bounce shadow-sm shadow-[#6FB4FF]/50" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-[#6FB4FF] animate-bounce shadow-sm shadow-[#6FB4FF]/50" style={{ animationDelay: '300ms' }}></div>
          </div>
          <div className="w-16 h-16 rounded-lg bg-[#423C45] border-2 border-[#4F9CF9] flex items-center justify-center shadow-lg shadow-[#4F9CF9]/20">
            <svg className="w-8 h-8 text-[#6FB4FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
        </div>
      ),
    },
    {
      title: "Enter Transaction Details",
      description: "Specify the amount of SOL and the recipient's wallet address.",
      icon: (
        <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      visual: (
        <div className="my-6 space-y-3">
          <div className="bg-[#2D272F] border border-[#4F9CF9]/40 rounded-lg p-3 shadow-lg shadow-[#4F9CF9]/10">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 text-sm">Amount</span>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">1.5 SOL</span>
                <SolanaLogo className="w-5 h-5" />
              </div>
            </div>
          </div>
          <div className="bg-[#2D272F] border border-[#4F9CF9]/40 rounded-lg p-3 shadow-lg shadow-[#4F9CF9]/10">
            <div className="text-gray-300 text-xs mb-1">Recipient</div>
            <div className="text-white text-xs font-mono">7xKXtg2...TZRuJo</div>
          </div>
        </div>
      ),
    },
    {
      title: "Privacy Pool Processing",
      description: "Your transaction is processed through zero-knowledge proofs, breaking the link between sender and receiver.",
      icon: (
        <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
      visual: (
        <div className="my-6 relative">
          <div className="flex justify-between items-center">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#4F9CF9] to-[#6FB4FF] flex items-center justify-center mb-2 shadow-lg shadow-[#4F9CF9]/30">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="text-xs text-gray-300">You</span>
            </div>

            <div className="flex-1 flex flex-col items-center px-4">
              <div className="relative w-full">
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-[#4F9CF9] via-[#6FB4FF] to-[#4F9CF9] animate-pulse shadow-sm shadow-[#4F9CF9]/30"></div>
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#2E7DD2] to-[#4F9CF9] flex items-center justify-center shadow-xl shadow-[#4F9CF9]/40 animate-pulse">
                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
              </div>
              <span className="text-xs text-gray-300 mt-2">Privacy Pool</span>
              <span className="text-xs text-green-400 mt-1">ZK Proof Verification</span>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-[#4F9CF9] to-[#6FB4FF] flex items-center justify-center mb-2 shadow-lg shadow-[#4F9CF9]/30">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="text-xs text-gray-300">Recipient</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Transaction Complete",
      description: "Funds arrive at the recipient's wallet with maximum privacy. No on-chain link between you and the recipient!",
      icon: (
        <svg className="w-16 h-16 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      visual: (
        <div className="my-6 text-center">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center mb-4 animate-bounce">
            <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-4 mt-4">
            <p className="text-green-400 text-sm font-semibold mb-2">Transaction Successful!</p>
            <p className="text-gray-400 text-xs">Your identity remains private</p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="fixed inset-0 bg-[#342E37]/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-[#423C45] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[#554D58] shadow-2xl shadow-[#4F9CF9]/20 animate-slideUp">
        {/* Header */}
        <div className="sticky top-0 bg-[#423C45] border-b border-[#554D58] p-6 flex justify-between items-center backdrop-blur-sm">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#4F9CF9] via-[#6FB4FF] to-[#4F9CF9] bg-clip-text text-transparent">
            How It Works
          </h2>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-[#6FB4FF] transition-colors"
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
                      ? "bg-gradient-to-r from-[#4F9CF9] to-[#2E7DD2] text-white scale-110 shadow-lg shadow-[#4F9CF9]/40"
                      : index < activeStep
                      ? "bg-green-500 text-white shadow-md"
                      : "bg-[#554D58] text-gray-400"
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
                    backgroundColor: index < activeStep ? "#10b981" : "#554D58"
                  }}
                />
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="min-h-[400px]">
            <div className="text-center text-[#6FB4FF] mb-4">
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
          <div className="flex justify-between mt-8 pt-6 border-t border-[#554D58]">
            <button
              onClick={() => setActiveStep(Math.max(0, activeStep - 1))}
              disabled={activeStep === 0}
              className="px-6 py-2 rounded-lg bg-[#554D58] hover:bg-[#635b66] disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white font-medium"
            >
              Previous
            </button>
            <div className="flex items-center gap-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === activeStep ? "bg-[#4F9CF9] w-8 shadow-sm shadow-[#4F9CF9]/50" : "bg-[#554D58]"
                  }`}
                />
              ))}
            </div>
            {activeStep < steps.length - 1 ? (
              <button
                onClick={() => setActiveStep(Math.min(steps.length - 1, activeStep + 1))}
                className="px-6 py-2 rounded-lg bg-gradient-to-r from-[#4F9CF9] to-[#2E7DD2] hover:from-[#6FB4FF] hover:to-[#4F9CF9] transition-colors text-white font-medium shadow-lg shadow-[#4F9CF9]/30"
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

        {/* Privacy Features */}
        <div className="bg-[#2D272F] p-6 border-t border-[#554D58]">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Privacy Features</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-[#4F9CF9] mt-1.5 shadow-sm shadow-[#4F9CF9]/50"></div>
              <span className="text-xs text-gray-200">Zero-Knowledge Proofs</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-[#4F9CF9] mt-1.5 shadow-sm shadow-[#4F9CF9]/50"></div>
              <span className="text-xs text-gray-200">OFAC Compliant</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-[#4F9CF9] mt-1.5 shadow-sm shadow-[#4F9CF9]/50"></div>
              <span className="text-xs text-gray-200">No Identity Linking</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-[#4F9CF9] mt-1.5 shadow-sm shadow-[#4F9CF9]/50"></div>
              <span className="text-xs text-gray-200">Audited Security</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
