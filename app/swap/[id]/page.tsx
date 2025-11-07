'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Clock, XCircle, ExternalLink } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface TransactionStep {
  id: string;
  stepName: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  metadata: any;
  createdAt: string;
}

interface Transaction {
  id: string;
  status: string;
  depositAddress: string;
  recipientAddress: string;
  amount: number;
  tokenType?: string;
  createdAt: string;
  completedAt: string | null;
  steps: TransactionStep[];
}

export default function SwapPage() {
  const params = useParams();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        const response = await fetch(`/api/transaction/${params.id}`);
        if (!response.ok) {
          throw new Error('Transaction not found');
        }
        const data = await response.json();
        setTransaction(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTransaction();
    const interval = setInterval(fetchTransaction, 5000); // Refresh every 5 seconds

    return () => clearInterval(interval);
  }, [params.id]);

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-5 w-5 text-[#efb62f]" />;
      case 'IN_PROGRESS':
        return <Clock className="h-5 w-5 text-[#efb62f] animate-pulse" />;
      case 'FAILED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Circle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      PENDING: { label: 'Pending', className: 'bg-gray-700 text-gray-300' },
      DEPOSIT_RECEIVED: { label: 'Processing', className: 'bg-[#efb62f]/20 text-[#efb62f]' },
      HOP_1_DEPOSITING: { label: 'Swapping SOL → ZEC', className: 'bg-[#efb62f]/20 text-[#efb62f]' },
      HOP_1_DELAY: { label: 'Privacy Delay', className: 'bg-blue-500/20 text-blue-400' },
      HOP_2_DEPOSITING: { label: 'Swapping ZEC → SOL', className: 'bg-[#efb62f]/20 text-[#efb62f]' },
      COMPLETED: { label: 'Complete', className: 'bg-green-500/20 text-green-400' },
      FAILED: { label: 'Failed', className: 'bg-red-500/20 text-red-400' },
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-[#efb62f] text-xl">Loading transaction...</div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Card className="bg-white border-gray-200 max-w-md">
          <CardHeader>
            <CardTitle className="text-[#efb62f]">Transaction Not Found</CardTitle>
            <CardDescription className="text-gray-600">
              {error || 'The transaction you are looking for does not exist.'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <a href="/" className="inline-flex items-center gap-2 mb-4 text-gray-600 hover:text-[#efb62f] transition-colors">
            <span>← Back to mert.cash</span>
          </a>
          <h1 className="text-3xl font-bold text-[#efb62f] mb-2">Transaction Status</h1>
          <p className="text-gray-600">ID: {transaction.id.slice(0, 12)}...</p>
        </div>

        {/* Status Card */}
        <Card className="bg-white border-gray-200 mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-black">Status</CardTitle>
              {getStatusBadge(transaction.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Amount</p>
                <p className="text-lg font-semibold text-[#efb62f]">
                  {transaction.amount} {transaction.tokenType || 'SOL'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Started</p>
                <p className="text-lg font-semibold text-black">
                  {new Date(transaction.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {transaction.completedAt && (
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-lg font-semibold text-green-600">
                  {new Date(transaction.completedAt).toLocaleString()}
                </p>
              </div>
            )}

            <Separator className="bg-gray-200" />

            <div>
              <p className="text-sm text-gray-600 mb-2">Recipient Address</p>
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <code className="text-sm text-[#efb62f] break-all">{transaction.recipientAddress}</code>
                <a
                  href={`https://solscan.io/account/${transaction.recipientAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-600 hover:text-[#efb62f] transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction Steps */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-black">Transaction Steps</CardTitle>
            <CardDescription className="text-gray-600">
              Track your privacy swap through each step
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {transaction.steps.map((step, index) => (
                <div key={step.id} className="flex gap-4">
                  {/* Icon */}
                  <div className="flex flex-col items-center">
                    {getStepIcon(step.status)}
                    {index < transaction.steps.length - 1 && (
                      <div className="w-px h-full bg-gray-200 mt-2" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-black">{step.stepName}</h3>
                      <span className="text-xs text-gray-500">
                        {new Date(step.createdAt).toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Step Metadata */}
                    {step.metadata && Object.keys(step.metadata).length > 0 && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 text-sm space-y-2">
                        {step.metadata.solanaTxUrl && (
                          <a
                            href={step.metadata.solanaTxUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-[#efb62f] hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View Solana Transaction
                          </a>
                        )}
                        {step.metadata.nearTxUrl && (
                          <a
                            href={step.metadata.nearTxUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-[#efb62f] hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View NEAR Transaction
                          </a>
                        )}
                        {step.metadata.expectedOutput && (
                          <p className="text-gray-600">
                            Expected: <span className="text-[#efb62f]">{step.metadata.expectedOutput}</span>
                          </p>
                        )}
                        {step.metadata.amountOut && (
                          <p className="text-gray-600">
                            Amount: <span className="text-green-600">{step.metadata.amountOut}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
