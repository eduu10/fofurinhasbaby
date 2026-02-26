"use client";

import { MessageCircle } from "lucide-react";

interface WhatsAppButtonProps {
  whatsappNumber?: string;
  storeName?: string;
}

export function WhatsAppButton({ whatsappNumber, storeName }: WhatsAppButtonProps) {
  const number = whatsappNumber || "5511999999999";
  const name = storeName || "Fofurinhas Baby";
  const message = encodeURIComponent(
    `Ola! Vi um produto na ${name} e gostaria de saber mais.`,
  );

  return (
    <a
      href={`https://wa.me/${number}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600 hover:scale-110 transition-all group"
      aria-label="Falar no WhatsApp"
    >
      <MessageCircle size={28} strokeWidth={2} />
      {/* Tooltip */}
      <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs font-bold px-3 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Fale conosco
      </span>
      {/* Pulse ring */}
      <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-25" />
    </a>
  );
}
