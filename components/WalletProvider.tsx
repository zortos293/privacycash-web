"use client";

import { ReactNode, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";

// Import Solana wallet adapter CSS
import "@solana/wallet-adapter-react-ui/styles.css";

// Determine network from environment variable
const isMainnet = process.env.NEXT_PUBLIC_NETWORK === "mainnet";
const network = isMainnet ? WalletAdapterNetwork.Mainnet : WalletAdapterNetwork.Devnet;

// RPC endpoints with fallback
const getRpcEndpoint = () => {
  if (isMainnet) {
    // Use custom RPC or public endpoints for mainnet
    return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com";
  } else {
    // Use devnet
    return process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(WalletAdapterNetwork.Devnet);
  }
};

export const WalletContextProvider = ({ children }: { children: ReactNode }) => {
  const endpoint = useMemo(() => getRpcEndpoint(), []);

  // Configure wallet adapters
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
