import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { PublicKey, Keypair } from '@solana/web3.js';
import { encryptPrivateKey } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { senderAddress, recipientAddress, amount, tokenType = 'SOL' } = body;

    // Validate inputs
    if (!senderAddress || !recipientAddress || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate token type
    if (tokenType !== 'SOL' && tokenType !== 'USDC') {
      return NextResponse.json(
        { error: 'Invalid token type. Must be SOL or USDC' },
        { status: 400 }
      );
    }

    // Validate Solana addresses
    try {
      new PublicKey(senderAddress);
      new PublicKey(recipientAddress);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid Solana address' },
        { status: 400 }
      );
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      );
    }

    // Generate deposit wallet
    const depositKeypair = Keypair.generate();
    const depositAddress = depositKeypair.publicKey.toString();

    // Create transaction first (without wallets)
    const transaction = await prisma.transaction.create({
      data: {
        depositAddress,
        recipientAddress,
        amount: amountNum,
        tokenType,
        delayMinutes: 2, // Fixed privacy delay (integer)
        relayerFee: 0.001,
        status: 'PENDING_DEPOSIT',
        steps: {
          create: [
            {
              stepName: 'Waiting for deposit',
              status: 'IN_PROGRESS',
              details: JSON.stringify({
                depositAddress,
                expectedAmount: amountNum,
                tokenType,
              }),
            },
          ],
        },
      },
    });

    // Now create wallet with proper encryption using transaction ID
    await prisma.wallet.create({
      data: {
        transactionId: transaction.id,
        walletAddress: depositAddress,
        encryptedPrivateKey: encryptPrivateKey(depositKeypair.secretKey, transaction.id),
        purpose: 'DEPOSIT',
      },
    });

    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      depositAddress,
      amount: amountNum,
      tokenType,
    });
  } catch (error) {
    console.error('Error creating swap:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
