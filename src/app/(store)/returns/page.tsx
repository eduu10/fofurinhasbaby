import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductGrid } from "@/components/product/product-grid";
import { RotateCcw, Package, Clock, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Trocas e Devoluções",
  description: "Saiba como realizar trocas e devolucoes na Fofurinhas Baby. Garantia de 7 dias para sua total satisfacao.",
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

export default async function ReturnsPage() {
  const products = await getFeaturedProducts();

  return (
    <div className="bg-[#FDFBF7] min-h-screen">
      {/* Header */}
      <section className="bg-gradient-to-r from-baby-blue/20 to-baby-pink/20 py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            Trocas e <span className="text-baby-pink">Devoluções</span>
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Sua satisfacao e nossa prioridade. Confira abaixo como funcionam as trocas e devolucoes na Fofurinhas Baby.
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Garantia */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-12 text-center">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h2 className="font-display text-2xl font-bold text-gray-800 mb-2">Garantia de 7 Dias</h2>
          <p className="text-gray-600 max-w-lg mx-auto">
            De acordo com o Codigo de Defesa do Consumidor (Art. 49), voce tem ate <strong>7 dias corridos</strong> apos o recebimento do produto para solicitar a troca ou devolucao, sem necessidade de justificativa.
          </p>
        </div>

        {/* Passo a passo */}
        <section className="mb-16">
          <h2 className="font-display text-3xl font-bold text-gray-800 mb-8 text-center">
            Como <span className="text-accent-orange">funciona?</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Package,
                step: "1",
                title: "Entre em contato",
                desc: "Envie uma mensagem pelo WhatsApp ou e-mail informando o numero do pedido e o motivo da troca ou devolucao. Nossa equipe respondera em ate 24 horas.",
              },
              {
                icon: RotateCcw,
                step: "2",
                title: "Envie o produto",
                desc: "Apos aprovacao, voce recebera as instrucoes para envio. O produto deve estar sem uso, com etiquetas e na embalagem original. O frete de devolucao e por nossa conta em caso de defeito.",
              },
              {
                icon: CheckCircle,
                step: "3",
                title: "Receba a solucao",
                desc: "Apos recebermos e analisarmos o produto, realizaremos a troca por outro item ou o reembolso integral em ate 7 dias uteis, conforme sua preferencia.",
              },
            ].map((item, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center relative">
                <div className="absolute -top-3 -left-3 w-8 h-8 bg-accent-orange text-white rounded-full flex items-center justify-center font-display font-bold text-sm">
                  {item.step}
                </div>
                <div className="w-12 h-12 bg-baby-pink/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <item.icon size={24} className="text-baby-pink" />
                </div>
                <h3 className="font-display font-bold text-gray-800 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Condições */}
        <section className="mb-16">
          <h2 className="font-display text-3xl font-bold text-gray-800 mb-8 text-center">
            Condicoes para <span className="text-baby-pink">Troca ou Devolucao</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-green-100">
              <h3 className="font-display font-bold text-green-600 mb-4 flex items-center gap-2">
                <CheckCircle size={20} /> Aceitas quando:
              </h3>
              <ul className="space-y-3 text-sm text-gray-600">
                {[
                  "Produto com defeito de fabricacao",
                  "Produto diferente do que foi pedido",
                  "Produto danificado durante o transporte",
                  "Arrependimento dentro de 7 dias corridos",
                  "Produto na embalagem original, sem sinais de uso",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <ArrowRight size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-100">
              <h3 className="font-display font-bold text-red-500 mb-4 flex items-center gap-2">
                <AlertTriangle size={20} /> Nao aceitas quando:
              </h3>
              <ul className="space-y-3 text-sm text-gray-600">
                {[
                  "Produto usado ou com sinais de uso",
                  "Produto sem embalagem original",
                  "Solicitacao apos 7 dias do recebimento",
                  "Produto com danos causados pelo cliente",
                  "Produto de higiene pessoal aberto",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <AlertTriangle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Reembolso */}
        <section className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-16">
          <h2 className="font-display text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Clock size={24} className="text-accent-orange" />
            Prazos de Reembolso
          </h2>
          <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-baby-pink rounded-full mt-1.5 flex-shrink-0" />
              <p><strong>Pix:</strong> Reembolso em ate 3 dias uteis apos a aprovacao da devolucao.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-baby-pink rounded-full mt-1.5 flex-shrink-0" />
              <p><strong>Cartao de credito:</strong> O estorno sera processado em ate 7 dias uteis. O prazo para o valor aparecer na fatura depende da operadora do cartao, podendo levar ate 2 faturas.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-baby-pink rounded-full mt-1.5 flex-shrink-0" />
              <p><strong>Boleto bancario:</strong> Reembolso via transferencia bancaria em ate 7 dias uteis apos a aprovacao.</p>
            </div>
          </div>
        </section>

        {/* Galeria de Produtos */}
        {products.length > 0 && (
          <section className="mb-16">
            <div className="text-center mb-8">
              <span className="text-baby-pink font-bold tracking-wider uppercase text-sm">Que tal dar uma olhadinha?</span>
              <h2 className="font-display text-3xl font-bold text-gray-800 mt-2">
                Produtos em <span className="text-accent-orange">Destaque</span>
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
        <section className="bg-gradient-to-r from-baby-blue to-blue-400 rounded-3xl p-8 md:p-12 text-center text-white">
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">Precisa solicitar uma troca?</h2>
          <p className="mb-6 text-white/90 max-w-lg mx-auto">
            Fale com a gente pelo WhatsApp. Nosso atendimento e rapido e descomplicado!
          </p>
          <a
            href="https://wa.me/5511999999999?text=Ola!%20Gostaria%20de%20solicitar%20uma%20troca"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-white text-blue-500 font-display font-bold text-lg px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            Chamar no WhatsApp
          </a>
        </section>
      </div>
    </div>
  );
}
