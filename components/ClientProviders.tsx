"use client";

import { FC, ReactNode } from "react";
import { WalletContextProvider } from "./WalletProvider";

export const ClientProviders: FC<{ children: ReactNode }> = ({ children }) => {
  return <WalletContextProvider>{children}</WalletContextProvider>;
};
