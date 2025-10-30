"use client";

import { FC, ReactNode } from "react";
import dynamic from "next/dynamic";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";

const WalletContextProvider = dynamic(
  () => import("./WalletProvider").then(mod => ({ default: mod.WalletContextProvider })),
  { ssr: false }
);

export const ClientProviders: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <LanguageProvider>
      <WalletContextProvider>{children}</WalletContextProvider>
    </LanguageProvider>
  );
};
