"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { X, Gift, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

/** Codigo do cupom exibido apos o cadastro */
const COUPON_CODE = "FOFURA10";

/** Chave usada no sessionStorage para evitar exibicao repetida */
const SESSION_KEY = "exitIntentShown";

/** Chave usada no localStorage para persistir o email capturado */
const EMAIL_STORAGE_KEY = "exitIntentEmail";

/**
 * Popup de intencao de saida (exit intent).
 * Detecta quando o cursor sai pelo topo da janela e exibe um modal
 * oferecendo 10% de desconto em troca do email do visitante.
 * Exibido apenas uma vez por sessao.
 */
export function ExitIntentPopup() {
  // Controla a visibilidade do popup
  const [isVisible, setIsVisible] = useState<boolean>(false);

  // Controla a animacao de entrada (opacity + scale)
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  // Indica se o formulario foi enviado com sucesso
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  // Valor do campo de email
  const [email, setEmail] = useState<string>("");

  /**
   * Abre o popup com animacao de entrada.
   * Marca no sessionStorage para nao exibir novamente nesta sessao.
   */
  const showPopup = useCallback(() => {
    setIsVisible(true);
    // Marca a flag no sessionStorage imediatamente
    sessionStorage.setItem(SESSION_KEY, "true");
    // Pequeno atraso para disparar a animacao CSS (fade in + scale)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    });
  }, []);

  /**
   * Fecha o popup com animacao de saida.
   */
  const closePopup = useCallback(() => {
    setIsAnimating(false);
    // Aguarda a transicao CSS terminar antes de esconder o componente
    const timeout = setTimeout(() => {
      setIsVisible(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, []);

  /**
   * Registra o listener de mouseleave no document.
   * Dispara o popup quando o cursor sai pelo topo (clientY < 10).
   */
  useEffect(() => {
    // Nao registra se ja foi exibido nesta sessao
    const alreadyShown = sessionStorage.getItem(SESSION_KEY);
    if (alreadyShown) return;

    const handleMouseLeave = (e: MouseEvent) => {
      // Detecta saida pelo topo da janela
      if (e.clientY < 10) {
        showPopup();
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [showPopup]);

  /**
   * Processa o envio do formulario.
   * Salva o email no localStorage e exibe a mensagem de sucesso.
   */
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    // Persiste o email no localStorage
    localStorage.setItem(EMAIL_STORAGE_KEY, trimmedEmail);

    // Exibe a mensagem de sucesso com o cupom
    setIsSubmitted(true);
  };

  /**
   * Fecha o popup ao clicar no overlay (area escura ao redor do modal).
   * Ignora cliques dentro do modal.
   */
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      closePopup();
    }
  };

  // Nao renderiza nada se o popup nao esta visivel
  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Oferta especial de 10% de desconto"
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center p-4",
        "transition-opacity duration-300",
        isAnimating ? "opacity-100" : "opacity-0"
      )}
      onClick={handleOverlayClick}
    >
      {/* Overlay semi-transparente */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal principal */}
      <div
        className={cn(
          "relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden",
          "transition-transform duration-300 ease-out",
          isAnimating ? "scale-100" : "scale-[0.9]"
        )}
      >
        {/* Botao de fechar (X) */}
        <button
          type="button"
          onClick={closePopup}
          className="absolute top-3 right-3 z-10 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          aria-label="Fechar popup"
        >
          <X size={22} />
        </button>

        {/* Faixa decorativa superior com gradiente rosa */}
        <div className="bg-gradient-to-r from-pink-400 via-pink-300 to-rose-400 py-6 px-6 text-center">
          {/* Icone de presente */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full mb-3">
            <Gift size={32} className="text-white" />
          </div>

          {/* Titulo principal */}
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-white leading-tight">
            Espera! Pegue 10% OFF antes de ir embora
          </h2>
        </div>

        {/* Corpo do modal */}
        <div className="px-6 py-6">
          {!isSubmitted ? (
            <>
              {/* Subtexto incentivando o cadastro */}
              <p className="text-gray-600 text-center text-sm leading-relaxed mb-5">
                Cadastre seu email e receba um cupom exclusivo de{" "}
                <span className="font-bold text-pink-500">10% de desconto</span>{" "}
                para usar na sua primeira compra. Nao perca essa oportunidade!
              </p>

              {/* Formulario de captura de email */}
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Campo de email com icone */}
                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Seu melhor email"
                    className={cn(
                      "w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200",
                      "text-gray-700 placeholder:text-gray-400 text-sm",
                      "focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300",
                      "transition-all"
                    )}
                  />
                </div>

                {/* Botao de envio */}
                <button
                  type="submit"
                  className={cn(
                    "w-full py-3 rounded-xl font-display font-bold text-white text-base",
                    "bg-gradient-to-r from-pink-500 to-rose-500",
                    "hover:from-pink-600 hover:to-rose-600",
                    "active:scale-[0.98] transition-all shadow-lg shadow-pink-200",
                    "cursor-pointer"
                  )}
                >
                  Quero meu cupom!
                </button>
              </form>

              {/* Link para dispensar o popup */}
              <button
                type="button"
                onClick={closePopup}
                className="block w-full text-center text-gray-400 hover:text-gray-600 text-xs mt-4 transition-colors cursor-pointer"
              >
                Nao, obrigada
              </button>
            </>
          ) : (
            /* Mensagem de sucesso apos o cadastro */
            <div className="text-center py-4">
              {/* Icone de confirmacao */}
              <div className="inline-flex items-center justify-center w-14 h-14 bg-green-100 rounded-full mb-4">
                <Gift size={28} className="text-green-600" />
              </div>

              <h3 className="font-display text-xl font-bold text-gray-800 mb-2">
                Parabens! Seu cupom esta aqui
              </h3>

              <p className="text-gray-500 text-sm mb-4">
                Use o codigo abaixo na sua proxima compra:
              </p>

              {/* Codigo do cupom em destaque */}
              <div className="bg-pink-50 border-2 border-dashed border-pink-300 rounded-xl py-3 px-4 mb-4">
                <span className="font-mono font-bold text-2xl text-pink-600 tracking-widest">
                  {COUPON_CODE}
                </span>
              </div>

              <p className="text-gray-400 text-xs">
                Valido para sua primeira compra. Aproveite!
              </p>

              {/* Botao para fechar apos ver o cupom */}
              <button
                type="button"
                onClick={closePopup}
                className={cn(
                  "mt-5 w-full py-3 rounded-xl font-display font-bold text-white text-sm",
                  "bg-gradient-to-r from-pink-500 to-rose-500",
                  "hover:from-pink-600 hover:to-rose-600",
                  "active:scale-[0.98] transition-all cursor-pointer"
                )}
              >
                Aproveitar agora!
              </button>
            </div>
          )}
        </div>

        {/* Detalhe decorativo inferior (circulos rosa suave) */}
        <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-pink-100 rounded-full opacity-50" />
        <div className="absolute -bottom-3 -right-3 w-16 h-16 bg-rose-100 rounded-full opacity-50" />
      </div>
    </div>
  );
}
