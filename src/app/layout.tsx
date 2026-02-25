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
    default: "Fofurinhas Baby - Loja de Produtos para Bebe",
    template: "%s | Fofurinhas Baby",
  },
  description:
    "Encontre os melhores produtos para seu bebe com os melhores precos. Roupas, acessorios, brinquedos e muito mais! Frete gratis para todo Brasil.",
  keywords: ["bebe", "roupas de bebe", "produtos para bebe", "loja infantil", "enxoval", "brinquedos", "fofurinhas baby"],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Fofurinhas Baby",
    title: "Fofurinhas Baby - Loja de Produtos para Bebe",
    description: "Encontre os melhores produtos para seu bebe com os melhores precos. Frete gratis para todo Brasil!",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fofurinhas Baby",
    description: "Encontre os melhores produtos para seu bebe com os melhores precos.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: "Fofurinhas Baby",
  description: "Loja online de produtos para bebe. Roupas, acessorios, brinquedos e muito mais!",
  url: "https://fofurinhasbaby.vercel.app",
  priceRange: "R$",
  address: {
    "@type": "PostalAddress",
    addressCountry: "BR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${fredoka.variable} ${nunito.variable} antialiased`}>{children}</body>
    </html>
  );
}
