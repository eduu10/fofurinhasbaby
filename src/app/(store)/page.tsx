export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductGrid } from "@/components/product/product-grid";
import {
  ShieldCheck,
  Truck,
  CreditCard,
  Check,
  Star,
  Heart,
} from "lucide-react";

async function getFeaturedProducts() {
  try {
    return await prisma.product.findMany({
      where: { isActive: true, isDraft: false, isFeatured: true },
      include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
      take: 8,
    });
  } catch {
    return [];
  }
}

async function getBestsellers() {
  try {
    return await prisma.product.findMany({
      where: { isActive: true, isDraft: false },
      include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
      orderBy: { salesCount: "desc" },
      take: 8,
    });
  } catch {
    return [];
  }
}

async function getOffers() {
  try {
    return await prisma.product.findMany({
      where: {
        isActive: true,
        isDraft: false,
        compareAtPrice: { not: null },
      },
      include: { images: { orderBy: { sortOrder: "asc" } }, category: true },
      take: 8,
    });
  } catch {
    return [];
  }
}

async function getCategories() {
  try {
    return await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      take: 6,
    });
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [featured, bestsellers, offers, categories] = await Promise.all([
    getFeaturedProducts(),
    getBestsellers(),
    getOffers(),
    getCategories(),
  ]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] overflow-x-hidden">
      {/* Hero Section */}
      <section className="relative bg-gradient-pastel-hero pt-8 pb-16 overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-10 left-10 text-baby-pink/20 animate-pulse">
          <Star size={48} fill="currentColor" />
        </div>
        <div className="absolute bottom-20 right-10 text-baby-yellow/40 animate-bounce">
          <Star size={64} fill="currentColor" />
        </div>

        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="lg:w-1/2 space-y-6 text-center lg:text-left z-10">
              <div className="inline-block bg-white/80 backdrop-blur-sm px-4 py-1.5 rounded-full text-accent-orange font-bold text-sm shadow-sm border border-orange-100 animate-fade-in-up">
                &#10024; Novidade Magica
              </div>
              <h1 className="font-display text-5xl lg:text-7xl font-bold text-gray-800 leading-[0.9] animate-fade-in-up">
                Sonhos <span className="text-baby-blue">Doces</span> &{" "}
                <br />
                Noites <span className="text-baby-pink">Tranquilas</span>
              </h1>
              <p className="text-lg text-gray-600 max-w-lg mx-auto lg:mx-0 font-medium animate-fade-in-up">
                Descubra nossa colecao exclusiva de produtos que transformam o dia a dia do seu bebe em momentos magicos.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-in-up">
                <Link
                  href="/products"
                  className="bg-accent-orange text-white font-display font-bold text-xl px-8 py-4 rounded-2xl shadow-lg shadow-orange-200 hover:shadow-xl hover:scale-105 transition-all active:scale-95 text-center"
                >
                  VER OFERTAS
                </Link>
                <Link
                  href="/products?sort=sales"
                  className="bg-white text-gray-700 font-display font-bold text-xl px-8 py-4 rounded-2xl shadow-md hover:bg-gray-50 transition-all border-2 border-gray-100 text-center"
                >
                  MAIS VENDIDOS
                </Link>
              </div>
            </div>

            <div className="lg:w-1/2 relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-baby-blue/30 to-baby-pink/30 rounded-full blur-3xl transform scale-90" />
              <img
                src="https://images.unsplash.com/photo-1515488042361-ee0065ab4d8b?auto=format&fit=crop&q=80&w=800"
                alt="Bebe feliz"
                className="relative z-10 rounded-[3rem] shadow-2xl border-4 border-white rotate-2 hover:rotate-0 transition-transform duration-500 w-full max-w-md mx-auto"
              />

              {/* Floating Badge */}
              <div className="absolute -bottom-6 -left-6 z-20 bg-white p-4 rounded-2xl shadow-xl border-2 border-baby-yellow max-w-[160px] hidden sm:block animate-bounce">
                <div className="flex items-center gap-1 text-accent-orange mb-1">
                  <Star fill="currentColor" size={16} />
                  <Star fill="currentColor" size={16} />
                  <Star fill="currentColor" size={16} />
                  <Star fill="currentColor" size={16} />
                  <Star fill="currentColor" size={16} />
                </div>
                <p className="text-xs font-bold text-gray-600 leading-tight">&quot;Meu bebe dormiu em 5 minutos!&quot;</p>
                <p className="text-[10px] text-gray-400 mt-1">- Mamae Julia</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="bg-white py-8 border-y border-gray-100">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: ShieldCheck, title: "Compra Segura", text: "Seus dados protegidos" },
              { icon: Truck, title: "Frete Rapido", text: "Entrega para todo Brasil" },
              { icon: CreditCard, title: "Ate 12x", text: "Sem juros no cartao" },
              { icon: Check, title: "Garantia", text: "7 dias para troca" },
            ].map((item, idx) => (
              <div key={idx} className="flex flex-col items-center text-center gap-2">
                <div className="w-12 h-12 bg-baby-blue/10 text-baby-blue rounded-full flex items-center justify-center mb-1">
                  <item.icon size={24} strokeWidth={2.5} />
                </div>
                <h3 className="font-display font-bold text-gray-800">{item.title}</h3>
                <p className="text-xs text-gray-500 font-medium">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <h2 className="mb-8 text-2xl font-display font-bold text-gradient-pink">Categorias</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                className="group flex flex-col items-center rounded-2xl border-2 border-baby-blue/20 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-pastel hover:-translate-y-1 hover:border-baby-blue/50"
              >
                <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-baby-blue/10 text-2xl transition group-hover:scale-110">
                  &#129528;
                </div>
                <span className="text-sm font-display font-bold text-gray-700 group-hover:text-baby-pink">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products */}
      {featured.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <span className="text-baby-pink font-bold tracking-wider uppercase text-sm">Os queridinhos das mamaes</span>
            <h2 className="font-display text-4xl font-bold text-gray-800 mt-2">
              Produtos em <span className="text-accent-orange underline decoration-wavy decoration-baby-yellow underline-offset-4">Destaque</span>
            </h2>
          </div>
          <ProductGrid products={featured} />
          <div className="text-center mt-8">
            <Link
              href="/products?featured=true"
              className="text-sm font-semibold text-baby-pink hover:text-pink-400 transition-colors"
            >
              Ver todos os produtos &rarr;
            </Link>
          </div>
        </section>
      )}

      {/* Bestsellers */}
      {bestsellers.length > 0 && (
        <section className="bg-baby-blue/5 py-12">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <span className="text-baby-blue font-bold tracking-wider uppercase text-sm">Top vendas</span>
              <h2 className="font-display text-4xl font-bold text-gray-800 mt-2">
                Mais <span className="text-accent-orange underline decoration-wavy decoration-baby-yellow underline-offset-4">Vendidos</span>
              </h2>
            </div>
            <ProductGrid products={bestsellers} />
            <div className="text-center mt-8">
              <Link
                href="/products?sort=sales"
                className="text-sm font-semibold text-baby-pink hover:text-pink-400 transition-colors"
              >
                Ver todos &rarr;
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Offers */}
      {offers.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <span className="text-accent-orange font-bold tracking-wider uppercase text-sm">Aproveite!</span>
            <h2 className="font-display text-4xl font-bold text-gray-800 mt-2">
              Ofertas <span className="text-accent-orange underline decoration-wavy decoration-baby-yellow underline-offset-4">Imperdiveis</span>
            </h2>
          </div>
          <ProductGrid products={offers} />
          <div className="text-center mt-8">
            <Link
              href="/products?offers=true"
              className="text-sm font-semibold text-baby-pink hover:text-pink-400 transition-colors"
            >
              Ver todas as ofertas &rarr;
            </Link>
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="bg-baby-pink/10 py-16 relative overflow-hidden">
        <div className="absolute -left-10 top-0 text-baby-pink/20">
          <Heart size={120} fill="currentColor" />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 max-w-4xl mx-auto text-center border-4 border-white ring-4 ring-baby-pink/20">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              Entre para o Clube da Mamae!
            </h2>
            <p className="text-gray-600 mb-8 max-w-lg mx-auto">
              Receba dicas exclusivas, ofertas secretas e um cupom de <span className="font-bold text-accent-orange">10% OFF</span> na sua primeira compra.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Seu melhor e-mail"
                className="flex-1 px-6 py-4 rounded-xl border-2 border-gray-200 focus:border-baby-pink focus:outline-none bg-gray-50 font-medium"
              />
              <button className="bg-baby-pink text-white font-display font-bold text-lg px-8 py-4 rounded-xl shadow-lg hover:bg-pink-400 transition-colors cursor-pointer">
                CADASTRAR
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-4">
              Prometemos nao enviar spam. Apenas amor e ofertas! &#128150;
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
