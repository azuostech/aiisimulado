import type { Metadata } from "next";

import { AccountShortcut } from "@/components/account-shortcut";

import "./globals.css";

export const metadata: Metadata = {
  title: "Clareza AI | Preparação ANCORD",
  description: "Simulados e treinamento adaptativo para a certificação de Assessor de Investimentos.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        {children}
        <AccountShortcut />
      </body>
    </html>
  );
}
