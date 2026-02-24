import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Fofurinhas Baby - Loja de Produtos para Bebê",
    template: "%s | Fofurinhas Baby",
  },
  description:
    "Encontre os melhores produtos para seu bebê com os melhores preços. Roupas, acessórios, brinquedos e muito mais!",
  keywords: ["bebê", "roupas de bebê", "produtos para bebê", "loja infantil"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} antialiased`}>{children}</body>
    </html>
  );
}
