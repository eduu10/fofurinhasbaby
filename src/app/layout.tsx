import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
      <body className={`${fredoka.variable} ${nunito.variable} antialiased`}>{children}</body>
    </html>
  );
}
