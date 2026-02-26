import Link from "next/link";
import { Star } from "lucide-react";

const helpLinks = [
  { href: "/about", label: "Central de Atendimento" },
  { href: "/account/orders", label: "Acompanhar Pedido" },
  { href: "/returns", label: "Trocas e Devoluções" },
  { href: "/privacy", label: "Política de Privacidade" },
];

const categoryLinks = [
  { href: "/products", label: "Todos os Produtos" },
  { href: "/products?sort=sales", label: "Mais Vendidos" },
  { href: "/products?sort=newest", label: "Novidades" },
  { href: "/blog", label: "Blog para Mamaes" },
  { href: "/cart", label: "Carrinho" },
];

interface FooterProps {
  storeName?: string;
  contactEmail?: string;
  contactWhatsapp?: string;
  contactWhatsappDisplay?: string;
  contactHours?: string;
  socialInstagram?: string;
  socialFacebook?: string;
  socialTiktok?: string;
}

export function Footer({
  storeName,
  contactEmail,
  contactWhatsapp,
  contactWhatsappDisplay,
  contactHours,
  socialInstagram,
  socialFacebook,
  socialTiktok,
}: FooterProps) {
  return (
    <footer className="bg-white pt-16 pb-8 border-t border-gray-100">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-baby-pink to-accent-orange rounded-full flex items-center justify-center text-white">
                <Star fill="currentColor" size={16} />
              </div>
              <span className="font-display text-xl font-bold text-gray-800">
                {storeName || "Fofurinhas Baby"}
              </span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              Trazendo magia e conforto para o dia a dia do seu bebe. Produtos selecionados com amor e carinho.
            </p>
          </div>

          {/* Help */}
          <div>
            <h3 className="font-display font-bold text-gray-800 mb-4 text-base">Ajuda</h3>
            <ul className="space-y-2 text-sm text-gray-500">
              {helpLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-baby-pink transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-display font-bold text-gray-800 mb-4 text-base">Categorias</h3>
            <ul className="space-y-2 text-sm text-gray-500">
              {categoryLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="hover:text-baby-pink transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Payment */}
          <div>
            <h3 className="font-display font-bold text-gray-800 mb-4 text-base">Contato</h3>
            <ul className="space-y-3 text-sm text-gray-500">
              <li>
                <span className="font-medium text-gray-700">Email:</span>
                <br />
                <a
                  href={`mailto:${contactEmail || "contato@fofurinhasbaby.com.br"}`}
                  className="transition-colors hover:text-baby-pink"
                >
                  {contactEmail || "contato@fofurinhasbaby.com.br"}
                </a>
              </li>
              <li>
                <span className="font-medium text-gray-700">WhatsApp:</span>
                <br />
                <a
                  href={`https://wa.me/${contactWhatsapp || "5511999999999"}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-baby-pink"
                >
                  {contactWhatsappDisplay || "(11) 99999-9999"}
                </a>
              </li>
              <li>
                <span className="font-medium text-gray-700">Horario:</span>
                <br />
                {contactHours || "Seg a Sex, 9h as 18h"}
              </li>
              {(socialInstagram || socialFacebook || socialTiktok) && (
                <li className="flex items-center gap-3 pt-2">
                  {socialInstagram && (
                    <a href={socialInstagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-baby-pink transition-colors" aria-label="Instagram">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                    </a>
                  )}
                  {socialFacebook && (
                    <a href={socialFacebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-baby-pink transition-colors" aria-label="Facebook">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                    </a>
                  )}
                  {socialTiktok && (
                    <a href={socialTiktok} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-baby-pink transition-colors" aria-label="TikTok">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
                    </a>
                  )}
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Security Seals & Payment Methods */}
        <div className="border-t border-gray-100 pt-8 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            {/* Formas de Pagamento */}
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Formas de pagamento</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://gringaloja.com.br/BANDERIAS.webp"
                alt="Formas de pagamento: Pix, Boleto, Visa, Mastercard, Hipercard, Cielo, American Express, Diners Club, Discover, Elo"
                className="h-14 object-contain"
                width={400}
                height={56}
                loading="lazy"
              />
            </div>

            {/* Segurança */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7">
                  <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="#ffc107" />
                  <path d="M10 17l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" fill="#fff" />
                </svg>
                <span className="text-[10px] font-bold text-gray-500 leading-tight">Norton<br />SECURED</span>
              </div>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://gringaloja.com.br/RECLAME_AQUI_LOGO_BRANCO.png"
                alt="Reclame Aqui"
                className="h-8 object-contain brightness-0 opacity-40"
                width={120}
                height={32}
                loading="lazy"
              />

              <div className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="w-7 h-7 fill-green-600">
                  <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
                  <path d="M10 17l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" fill="#fff" />
                </svg>
                <span className="text-[10px] font-bold text-gray-500 leading-tight">Google<br />Site Seguro</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center pt-8 border-t border-gray-100 text-sm text-gray-500 font-medium">
          &copy; {new Date().getFullYear()} {storeName || "Fofurinhas Baby"}. Todos os direitos reservados. Feito com &#128150; para seu bebe.
        </div>
      </div>
    </footer>
  );
}
