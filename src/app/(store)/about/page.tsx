import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductGrid } from "@/components/product/product-grid";
import { Mail, Phone, Clock, MessageCircle, HelpCircle, Truck, RotateCcw, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Central de Atendimento",
  description: "Entre em contato conosco. Estamos aqui para ajudar voce com qualquer duvida sobre nossos produtos para bebe.",
};

async function getFeaturedProducts() {
  try {
    return await prisma.product.findMany({
      where: { isActive: true, isDraft: false, isFeatured: true },
      include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
      take: 4,
    });
  } catch {
    return [];
  }
}

export default async function AboutPage() {
  const products = await getFeaturedProducts();

  return (
    <div className="bg-[#FDFBF7] min-h-screen">
      {/* Header */}
      <section className="bg-gradient-to-r from-baby-blue/20 to-baby-pink/20 py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Central de <span className="text-baby-pink">Atendimento</span>
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Estamos aqui para ajudar! Tire suas duvidas, faca sugestoes ou entre em contato conosco por qualquer um dos nossos canais.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Canais de Contato */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {[
            { icon: MessageCircle, title: "WhatsApp", text: "(11) 99999-9999", desc: "Resposta rapida", color: "text-green-500", bg: "bg-green-50" },
            { icon: Mail, title: "Email", text: "contato@fofurinhasbaby.com.br", desc: "Ate 24h uteis", color: "text-baby-blue", bg: "bg-baby-blue/10" },
            { icon: Phone, title: "Telefone", text: "(11) 99999-9999", desc: "Seg a Sex", color: "text-baby-pink", bg: "bg-baby-pink/10" },
            { icon: Clock, title: "Horario", text: "Seg a Sex", desc: "9h as 18h", color: "text-accent-orange", bg: "bg-accent-orange/10" },
          ].map((item, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
              <div className={`w-12 h-12 ${item.bg} rounded-full flex items-center justify-center mx-auto mb-3`}>
                <item.icon size={24} className={item.color} />
              </div>
              <h3 className="font-display font-bold text-gray-800 mb-1">{item.title}</h3>
              <p className="text-sm text-gray-600 font-medium">{item.text}</p>
              <p className="text-xs text-gray-400 mt-1">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <section className="mb-16">
          <h2 className="font-display text-3xl font-bold text-gray-800 mb-8 text-center">
            Perguntas <span className="text-accent-orange">Frequentes</span>
          </h2>

          <div className="space-y-4">
            {[
              {
                icon: Truck,
                question: "Qual o prazo de entrega?",
                answer: "O prazo de entrega varia de acordo com a sua regiao. Apos a confirmacao do pagamento, o pedido e despachado em ate 3 dias uteis. O prazo de entrega dos Correios ou transportadora e calculado no momento da compra e pode variar de 5 a 15 dias uteis, dependendo da localidade.",
              },
              {
                icon: HelpCircle,
                question: "Como rastreio meu pedido?",
                answer: "Apos o envio, voce recebera um e-mail com o codigo de rastreamento. Voce tambem pode acessar sua conta na loja, ir em 'Meus Pedidos' e acompanhar o status da entrega em tempo real. Se precisar de ajuda, entre em contato pelo WhatsApp.",
              },
              {
                icon: RotateCcw,
                question: "Posso trocar ou devolver um produto?",
                answer: "Sim! Voce tem ate 7 dias apos o recebimento para solicitar troca ou devolucao, conforme o Codigo de Defesa do Consumidor. O produto deve estar sem uso e na embalagem original. Acesse nossa pagina de Trocas e Devolucoes para mais detalhes.",
              },
              {
                icon: ShieldCheck,
                question: "O pagamento e seguro?",
                answer: "Totalmente! Utilizamos criptografia SSL de 256 bits em todo o site. Os pagamentos sao processados por plataformas certificadas como Stripe e Mercado Pago. Nenhum dado do seu cartao e armazenado em nossos servidores.",
              },
              {
                icon: HelpCircle,
                question: "Quais formas de pagamento sao aceitas?",
                answer: "Aceitamos Pix, cartoes de credito (Visa, Mastercard, Elo, American Express, Hipercard), cartoes de debito e boleto bancario. No cartao de credito, voce pode parcelar em ate 12x sem juros.",
              },
              {
                icon: HelpCircle,
                question: "Os produtos possuem garantia?",
                answer: "Sim! Todos os nossos produtos possuem garantia contra defeitos de fabricacao. Alem disso, oferecemos 7 dias de garantia de satisfacao. Se o produto apresentar qualquer defeito, entre em contato conosco para resolvermos da melhor forma.",
              },
            ].map((item, idx) => (
              <details key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-100 group">
                <summary className="flex items-center gap-3 p-5 cursor-pointer list-none font-display font-bold text-gray-800 hover:text-baby-pink transition-colors">
                  <item.icon size={20} className="text-baby-pink flex-shrink-0" />
                  <span className="flex-1">{item.question}</span>
                  <span className="text-gray-400 group-open:rotate-45 transition-transform text-xl">+</span>
                </summary>
                <div className="px-5 pb-5 pl-12 text-gray-600 text-sm leading-relaxed">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Galeria de Produtos */}
        {products.length > 0 && (
          <section className="mb-16">
            <div className="text-center mb-8">
              <span className="text-baby-pink font-bold tracking-wider uppercase text-sm">Enquanto isso...</span>
              <h2 className="font-display text-3xl font-bold text-gray-800 mt-2">
                Confira nossos <span className="text-accent-orange">Destaques</span>
              </h2>
            </div>
            <ProductGrid products={products} />
            <div className="text-center mt-6">
              <Link href="/products" className="text-sm font-semibold text-baby-pink hover:text-pink-400 transition-colors">
                Ver todos os produtos &rarr;
              </Link>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="bg-gradient-to-r from-baby-pink to-pink-400 rounded-3xl p-8 md:p-12 text-center text-white">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">Ainda tem duvidas?</h2>
          <p className="mb-6 text-white/90 max-w-lg mx-auto">
            Nossa equipe esta pronta para te atender. Fale com a gente pelo WhatsApp e receba ajuda em tempo real!
          </p>
          <a
            href="https://wa.me/5511999999999?text=Ola!%20Preciso%20de%20ajuda"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-white text-pink-500 font-display font-bold text-lg px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            Chamar no WhatsApp
          </a>
        </section>
      </div>
    </div>
  );
}
