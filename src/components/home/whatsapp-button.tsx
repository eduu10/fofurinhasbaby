"use client";

import { MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "5511999999999"; // Alterar para o numero real
const WHATSAPP_MESSAGE = encodeURIComponent(
  "Ola! Vi um produto na Fofurinhas Baby e gostaria de saber mais.",
);

export function WhatsAppButton() {
  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`}
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
