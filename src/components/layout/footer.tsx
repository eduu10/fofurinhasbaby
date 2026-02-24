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
  { href: "/cart", label: "Carrinho" },
];

export function Footer() {
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
                Fofurinhas Baby
              </span>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              Trazendo magia e conforto para o dia a dia do seu bebe. Produtos selecionados com amor e carinho.
            </p>
          </div>

          {/* Help */}
          <div>
            <h4 className="font-display font-bold text-gray-800 mb-4">Ajuda</h4>
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
            <h4 className="font-display font-bold text-gray-800 mb-4">Categorias</h4>
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
            <h4 className="font-display font-bold text-gray-800 mb-4">Contato</h4>
            <ul className="space-y-3 text-sm text-gray-500">
              <li>
                <span className="font-medium text-gray-700">Email:</span>
                <br />
                <a
                  href="mailto:contato@fofurinhasbaby.com.br"
                  className="transition-colors hover:text-baby-pink"
                >
                  contato@fofurinhasbaby.com.br
                </a>
              </li>
              <li>
                <span className="font-medium text-gray-700">WhatsApp:</span>
                <br />
                <a
                  href="https://wa.me/5511999999999"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-colors hover:text-baby-pink"
                >
                  (11) 99999-9999
                </a>
              </li>
              <li>
                <span className="font-medium text-gray-700">Horario:</span>
                <br />
                Seg a Sex, 9h as 18h
              </li>
            </ul>
          </div>
        </div>

        <div className="text-center pt-8 border-t border-gray-100 text-sm text-gray-400 font-medium">
          &copy; {new Date().getFullYear()} Fofurinhas Baby. Todos os direitos reservados. Feito com &#128150; para seu bebe.
        </div>
      </div>
    </footer>
  );
}
