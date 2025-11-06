import { NextRequest, NextResponse } from 'next/server';
import { createTransaction } from '@/lib/db';
import { PublicKey } from '@solana/web3.js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipientAddress, amount, delayMinutes } = body;

    // Validate inputs
    if (!recipientAddress || !amount) {
      return NextResponse.json(
        { error: 'recipientAddress and amount are required' },
        { status: 400 }
      );
    }

    // Validate recipient address
    try {
      new PublicKey(recipientAddress);
    } catch {
      return NextResponse.json(
        { error: 'Invalid Solana address' },
        { status: 400 }
      );
    }

    // Validate amount (must be 0.1 SOL for fixed denomination)
    if (amount !== 0.1) {
      return NextResponse.json(
        { error: 'Amount must be 0.1 SOL (fixed denomination)' },
        { status: 400 }
      );
    }

    // Validate delay
    const delay = delayMinutes || 60;
    if (delay < 5 || delay > 1440) {
      return NextResponse.json(
        { error: 'Delay must be between 5 and 1440 minutes (24 hours)' },
        { status: 400 }
      );
    }

    // Create transaction
    const transaction = await createTransaction(recipientAddress, amount, delay);

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        depositAddress: transaction.depositAddress,
        recipientAddress: transaction.recipientAddress,
        amount: transaction.amount,
        delayMinutes: transaction.delayMinutes,
        status: transaction.status,
        createdAt: transaction.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json(
      {
        error: 'Failed to create transaction',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
