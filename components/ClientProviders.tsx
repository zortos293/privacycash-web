"use client";

import { FC, ReactNode } from "react";
import dynamic from "next/dynamic";

const WalletContextProvider = dynamic(
  () => import("./WalletProvider").then(mod => ({ default: mod.WalletContextProvider })),
  { ssr: false }
);

export const ClientProviders: FC<{ children: ReactNode }> = ({ children }) => {
  return <WalletContextProvider>{children}</WalletContextProvider>;
};
