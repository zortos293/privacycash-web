import { NextRequest, NextResponse } from 'next/server';
import { getTransactionDetails } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const transaction = await getTransactionDetails(id);

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // Don't expose encrypted private keys in API response
    const sanitizedWallets = transaction.wallets.map((w) => ({
      id: w.id,
      walletAddress: w.walletAddress,
      purpose: w.purpose,
      createdAt: w.createdAt,
    }));

    // Parse step details
    const sanitizedSteps = transaction.steps.map((s) => ({
      id: s.id,
      stepName: s.stepName,
      status: s.status,
      details: s.details ? JSON.parse(s.details) : null,
      txSignature: s.txSignature,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        status: transaction.status,
        depositAddress: transaction.depositAddress,
        recipientAddress: transaction.recipientAddress,
        amount: transaction.amount,
        delayMinutes: transaction.delayMinutes,
        platformFee: transaction.platformFee,
        relayerFee: transaction.relayerFee,
        depositTxSignature: transaction.depositTxSignature,
        zecSwapTxSignature: transaction.zecSwapTxSignature,
        solSwapTxSignature: transaction.solSwapTxSignature,
        withdrawalTxSignature: transaction.withdrawalTxSignature,
        errorMessage: transaction.errorMessage,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        completedAt: transaction.completedAt,
        wallets: sanitizedWallets,
        steps: sanitizedSteps,
      },
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch transaction',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
