'use client';

import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowRight, Shield, Zap, Eye, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { publicKey, connected, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const router = useRouter();

  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('0.1');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStartSwap = async () => {
    if (!connected || !publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!recipientAddress) {
      toast.error('Please enter a recipient address');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Create transaction record and get deposit address
      toast.loading('Creating swap...', { id: 'swap-progress' });

      const response = await fetch('/api/swap/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderAddress: publicKey.toString(),
          recipientAddress,
          amount: amountNum,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create swap');
      }

      // Step 2: Send SOL to deposit address
      toast.loading('Approve transaction in your wallet...', { id: 'swap-progress' });

      const depositPubkey = new PublicKey(data.depositAddress);
      const lamports = Math.floor(amountNum * LAMPORTS_PER_SOL);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: depositPubkey,
          lamports,
        })
      );

      const signature = await sendTransaction(transaction, connection);

      toast.loading('Confirming transaction...', { id: 'swap-progress' });

      await connection.confirmTransaction(signature, 'confirmed');

      toast.success('Deposit confirmed!', {
        id: 'swap-progress',
        description: 'Redirecting to tracking page...',
      });

      // Redirect to tracking page
      setTimeout(() => {
        router.push(`/swap/${data.transactionId}`);
      }, 1000);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Failed to start swap', { id: 'swap-progress' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="rounded-full overflow-hidden">
                <img src="/mertcashlogo.png" alt="mert.cash logo" className="w-10 h-10 object-cover" />
              </div>
              <h1 className="text-xl font-bold text-[#efb62f]">mert.cash</h1>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="/docs"
                className="px-4 py-2 text-gray-700 hover:text-[#efb62f] transition-colors font-medium"
              >
                Docs
              </a>
              <WalletMultiButton className="!bg-[#efb62f] !text-black hover:!bg-[#d9a429] !rounded-lg !h-10" />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="max-w-6xl mx-auto text-center mb-16">
          <h2 className="text-5xl font-bold mb-4">
            Break <span className="text-[#efb62f]">On-Chain Links</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Cross-chain privacy mixer routing SOL through ZEC on NEAR Protocol
          </p>

          {/* Feature Badges */}
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full border border-gray-200">
              <Shield className="h-4 w-4 text-[#efb62f]" />
              <span className="text-sm">Untraceable</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full border border-gray-200">
              <Zap className="h-4 w-4 text-[#efb62f]" />
              <span className="text-sm">Automated</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full border border-gray-200">
              <Eye className="h-4 w-4 text-[#efb62f]" />
              <span className="text-sm">Non-Custodial</span>
            </div>
          </div>
        </div>

        {/* Main Swap Card */}
        <div className="max-w-2xl mx-auto mb-16">
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-2xl text-[#efb62f]">Create Privacy Swap</CardTitle>
              <CardDescription className="text-gray-600">
                Send SOL privately through our multi-chain mixer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!connected ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">Connect your wallet to get started</p>
                  <WalletMultiButton className="!bg-[#efb62f] !text-black hover:!bg-[#d9a429] !rounded-lg !h-12 !text-base" />
                </div>
              ) : (
                <>
                  {/* Amount Input */}
                  <div className="space-y-2">
                    <Label className="text-black">Amount (SOL)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="bg-white border-gray-200 text-black focus:border-[#efb62f]"
                      placeholder="0.1"
                    />
                    <p className="text-xs text-gray-500">Minimum: 0.01 SOL</p>
                  </div>

                  {/* Recipient Address */}
                  <div className="space-y-2">
                    <Label className="text-black">Recipient Solana Address</Label>
                    <Input
                      type="text"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      className="bg-white border-gray-200 text-black focus:border-[#efb62f] font-mono"
                      placeholder="Enter Solana address..."
                    />
                  </div>

                  {/* Flow Diagram */}
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-[#efb62f]/20 border-2 border-[#efb62f] flex items-center justify-center mb-2">
                          <span className="text-[#efb62f] font-bold">SOL</span>
                        </div>
                        <span className="text-gray-600">Start</span>
                      </div>
                      <ArrowRight className="text-gray-400" />
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-gray-100 border-2 border-gray-300 flex items-center justify-center mb-2">
                          <span className="text-gray-600 font-bold">ZEC</span>
                        </div>
                        <span className="text-gray-600">via NEAR</span>
                      </div>
                      <ArrowRight className="text-gray-400" />
                      <div className="flex flex-col items-center">
                        <div className="w-12 h-12 rounded-full bg-[#efb62f]/20 border-2 border-[#efb62f] flex items-center justify-center mb-2">
                          <span className="text-[#efb62f] font-bold">SOL</span>
                        </div>
                        <span className="text-gray-600">Recipient</span>
                      </div>
                    </div>
                  </div>

                  {/* Start Button */}
                  <Button
                    onClick={handleStartSwap}
                    disabled={isProcessing || !recipientAddress}
                    className="w-full bg-[#efb62f] hover:bg-[#d9a429] text-black font-semibold h-12 text-base"
                  >
                    {isProcessing ? (
                      <>Processing...</>
                    ) : (
                      <>
                        Start Private Swap
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* How It Works Section */}
        <div className="max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold text-center mb-4 text-[#efb62f]">How It Works</h3>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            mert.cash uses a multi-chain privacy mixer to break on-chain transaction links, making your transfers untraceable
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-white border-gray-200">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-[#efb62f]/20 border-2 border-[#efb62f] flex items-center justify-center mb-4">
                  <span className="text-[#efb62f] font-bold text-xl">1</span>
                </div>
                <CardTitle className="text-black">Cross-Chain Swap</CardTitle>
                <CardDescription className="text-[#efb62f] text-xs mt-2">SOL → ZEC</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm">
                  Your SOL is swapped to ZEC (Zcash) via NEAR Intents and deposited into the internal multi-token pool on NEAR Protocol
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-[#efb62f]/20 border-2 border-[#efb62f] flex items-center justify-center mb-4">
                  <span className="text-[#efb62f] font-bold text-xl">2</span>
                </div>
                <CardTitle className="text-black">Privacy Pool</CardTitle>
                <CardDescription className="text-[#efb62f] text-xs mt-2">NEAR mt-token</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm">
                  ZEC sits in NEAR's internal multi-token ledger, completely breaking the link between your Solana address and the recipient
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200">
              <CardHeader>
                <div className="w-12 h-12 rounded-full bg-[#efb62f]/20 border-2 border-[#efb62f] flex items-center justify-center mb-4">
                  <span className="text-[#efb62f] font-bold text-xl">3</span>
                </div>
                <CardTitle className="text-black">Final Delivery</CardTitle>
                <CardDescription className="text-[#efb62f] text-xs mt-2">ZEC → SOL</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm">
                  ZEC is swapped back to SOL via NEAR Intents and delivered directly to the recipient's Solana address
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Features List */}
          <div className="mt-12 p-6 bg-white rounded-lg border border-gray-200">
            <h4 className="text-xl font-bold mb-4 text-[#efb62f]">Key Features</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                'No direct on-chain link between sender and recipient',
                'Cross-chain routing through NEAR network',
                'ZEC privacy coin as intermediate token',
                'Automated processing with relayer system',
                'Full transaction tracking and transparency',
                'Non-custodial - funds never held by us',
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-[#efb62f] mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="rounded-full overflow-hidden">
                <img src="/mertcashlogo.png" alt="mert.cash logo" className="w-10 h-10 object-cover" />
              </div>
              <span className="font-bold text-[#efb62f]">mert.cash</span>
            </div>
            <p className="text-center text-gray-500 text-sm">
              Untraceable Solana Transactions
            </p>
            <div className="flex gap-6 text-sm text-gray-600">
              <a href="/docs" className="hover:text-[#efb62f] transition-colors">Documentation</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
