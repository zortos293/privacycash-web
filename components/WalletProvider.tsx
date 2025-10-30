"use client";

import { ReactNode } from "react";
import { WagmiProvider, createConfig, http, fallback, createStorage, cookieStorage } from "wagmi";
import { bsc, bscTestnet } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, getDefaultConfig, darkTheme } from "@rainbow-me/rainbowkit";

// Import RainbowKit CSS
import "@rainbow-me/rainbowkit/styles.css";

// Determine network from environment variable
const isTestnet = process.env.NEXT_PUBLIC_NETWORK === "testnet";
const activeChain = isTestnet ? bscTestnet : bsc;

// Use multiple CORS-enabled RPC endpoints with automatic fallback
// If one fails or hits rate limits, wagmi automatically tries the next one
const mainnetTransport = fallback([
  http('https://bsc.publicnode.com'),
  http('https://binance.llamarpc.com'),
  http('https://bsc-dataseed1.binance.org'),
  http('https://bsc-dataseed2.binance.org'),
  http('https://bsc-dataseed3.binance.org'),
  http('https://bsc-dataseed4.binance.org'),
  http('https://bsc-dataseed1.defibit.io'),
  http('https://bsc-dataseed2.defibit.io'),
  http('https://bsc-dataseed1.ninicoin.io'),
  http('https://bsc-dataseed2.ninicoin.io'),
]);

const testnetTransport = fallback([
  http('https://bsc-testnet.publicnode.com'),
  http('https://data-seed-prebsc-1-s1.binance.org:8545'),
  http('https://data-seed-prebsc-2-s1.binance.org:8545'),
  http('https://data-seed-prebsc-1-s2.binance.org:8545'),
  http('https://data-seed-prebsc-2-s2.binance.org:8545'),
]);

const activeTransport = isTestnet ? testnetTransport : mainnetTransport;

// Configure chains - dynamically based on NEXT_PUBLIC_NETWORK
const config = getDefaultConfig({
  appName: "AnonBNB",
  projectId: "1f21d2f2d8f2c92574b7539376e680e1", // Get from https://cloud.walletconnect.com
  chains: [activeChain],
  transports: {
    [activeChain.id]: activeTransport,
  },
  ssr: false, // Disable SSR to prevent indexedDB errors
  storage: createStorage({
    storage: typeof window !== 'undefined' ? window.localStorage : cookieStorage,
  }),
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1_000 * 60 * 60 * 24, // 24 hours
      networkMode: "offlineFirst",
      refetchOnWindowFocus: false,
      retry: 0,
    },
    mutations: {
      networkMode: "offlineFirst",
    },
  },
});

export const WalletContextProvider = ({ children }: { children: ReactNode }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: '#F0B90B', // BNB gold
            accentColorForeground: '#000000', // Black text on gold
            borderRadius: 'medium',
            fontStack: 'system',
            overlayBlur: 'small',
          })}
          appInfo={{
            appName: "AnonBNB",
            disclaimer: ({ Text, Link }) => (
              <Text>
                Privacy-focused BNB mixer. By connecting your wallet, you agree to our{" "}
                <Link href="https://example.com/terms">Terms of Service</Link>
              </Text>
            ),
            learnMoreUrl: undefined, // Disable analytics
          }}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
