"use client";

import { useState } from "react";
import { Mail, Heart, CheckCircle } from "lucide-react";

export function NewsletterCTA() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubmitted(true);
      setEmail("");
    }
  };

  if (submitted) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-8 text-center border border-green-200">
        <CheckCircle className="mx-auto text-green-500 mb-3" size={40} />
        <h3 className="font-display text-xl font-bold text-gray-800 mb-2">
          Inscricao Confirmada!
        </h3>
        <p className="text-gray-600 text-sm">
          Voce vai receber nossas novidades e dicas exclusivas no seu email.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-baby-pink/5 to-baby-blue/5 rounded-3xl p-8 border border-baby-pink/20 text-center">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Heart className="text-baby-pink" size={24} fill="currentColor" />
        <Mail className="text-baby-blue" size={24} />
      </div>
      <h3 className="font-display text-xl md:text-2xl font-bold text-gray-800 mb-2">
        Receba Dicas Exclusivas!
      </h3>
      <p className="text-gray-600 text-sm mb-6 max-w-md mx-auto">
        Cadastre seu email e receba semanalmente artigos com dicas sobre
        maternidade, cuidados com o bebe e ofertas especiais da Fofurinhas Baby.
      </p>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Seu melhor email..."
          required
          className="flex-1 px-4 py-3 rounded-xl border-2 border-baby-pink/30 focus:border-baby-pink focus:outline-none text-sm"
        />
        <button
          type="submit"
          className="bg-gradient-buy text-white font-display font-bold py-3 px-6 rounded-xl shadow-md hover:shadow-lg transition-all text-sm whitespace-nowrap cursor-pointer"
        >
          Quero Receber!
        </button>
      </form>
      <p className="text-[10px] text-gray-400 mt-3">
        Prometemos nao enviar spam. Voce pode cancelar quando quiser.
      </p>
    </div>
  );
}
