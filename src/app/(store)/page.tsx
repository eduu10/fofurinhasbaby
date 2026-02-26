export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { ProductGrid } from "@/components/product/product-grid";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { BestsellerCarousel } from "@/components/home/bestseller-carousel";
import { RecentlyViewed } from "@/components/home/recently-viewed";
import { TestimonialsSection } from "@/components/home/testimonials-section";
import { FlashSaleBanner } from "@/components/home/flash-sale-banner";
import { WhatsAppButton } from "@/components/home/whatsapp-button";
import { BlogPreview } from "@/components/home/blog-preview";
import {
  ShieldCheck,
  Heart,
  Users,
  Lock,
  Package,
} from "lucide-react";

async function getStoreSettings() {
  try {
    const settings = await prisma.storeSetting.findMany();
    const map: Record<string, string> = {};
    settings.forEach((s) => {
      map[s.key] = s.value;
    });
    return map;
  } catch {
    return {};
  }
}

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
      take: 12,
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
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      take: 6,
      include: {
        _count: { select: { products: { where: { isActive: true, isDraft: false } } } },
      },
    });
    return categories;
  } catch {
    return [];
  }
}

const CATEGORY_EMOJIS: Record<string, string> = {
  roupas: "\uD83D\uDC5A",
  acessorios: "\uD83C\uDF80",
  brinquedos: "\uD83E\uDDF8",
  higiene: "\uD83D\uDEC1",
  alimentacao: "\uD83C\uDF7C",
  decoracao: "\u2B50",
};

async function HomeContent() {
  const [featured, bestsellers, offers, categories] = await Promise.all([
    getFeaturedProducts(),
    getBestsellers(),
    getOffers(),
    getCategories(),
  ]);

  const bestsellerData = bestsellers.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    price: Number(p.price),
    compareAtPrice: p.compareAtPrice ? Number(p.compareAtPrice) : null,
    image: p.images?.[0]?.url || "https://placehold.co/400x400/FFDEE2/333?text=Produto",
    salesCount: p.salesCount,
    stock: p.stock,
    minQuantity: p.minQuantity ?? 1,
    maxQuantity: p.maxQuantity ?? 99,
  }));

  const flashProducts = offers
    .filter((p) => p.compareAtPrice && Number(p.compareAtPrice) > Number(p.price))
    .map((p) => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      price: Number(p.price),
      compareAtPrice: Number(p.compareAtPrice!),
      image: p.images?.[0]?.url || "https://placehold.co/400x400/FFDEE2/333?text=Oferta",
      stock: p.stock,
      minQuantity: p.minQuantity ?? 1,
      maxQuantity: p.maxQuantity ?? 99,
    }));

  return (
    <>
      {/* Featured Products */}
      {featured.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <span className="text-baby-pink font-bold tracking-wider uppercase text-sm">Os queridinhos das mamaes</span>
            <h2 className="font-display text-4xl font-bold text-gray-800 mt-2">
              Produtos em{" "}
              <span className="text-accent-orange underline decoration-wavy decoration-baby-yellow underline-offset-4">Destaque</span>
            </h2>
          </div>
          <ProductGrid products={featured} />
          <div className="text-center mt-8">
            <Link href="/products?featured=true" className="text-sm font-semibold text-baby-pink hover:text-pink-400 transition-colors">
              Ver todos os produtos &rarr;
            </Link>
          </div>
        </section>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <h2 className="mb-8 text-2xl font-display font-bold text-gradient-pink">
            Categorias
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((cat) => {
              const emoji = CATEGORY_EMOJIS[cat.slug] || "\uD83E\uDDF8";
              const productCount = (cat as unknown as { _count: { products: number } })._count;
              return (
                <Link
                  key={cat.id}
                  href={`/products?category=${cat.slug}`}
                  className="group flex flex-col items-center rounded-2xl border-2 border-baby-blue/20 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-pastel hover:-translate-y-1 hover:border-baby-blue/50 relative"
                >
                  <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-baby-blue/10 text-3xl transition group-hover:scale-110">
                    {cat.image ? (
                      <Image src={cat.image} alt={cat.name} width={48} height={48} className="rounded-full object-cover" unoptimized />
                    ) : (
                      <span>{emoji}</span>
                    )}
                  </div>
                  <span className="text-sm font-display font-bold text-gray-700 group-hover:text-baby-pink">{cat.name}</span>
                  {productCount && productCount.products > 0 && (
                    <span className="absolute top-2 right-2 bg-baby-pink/10 text-baby-pink text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {productCount.products}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {flashProducts.length > 0 && <FlashSaleBanner products={flashProducts} />}
      {bestsellerData.length > 0 && <BestsellerCarousel products={bestsellerData} />}

      {/* Offers */}
      {offers.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <div className="text-center mb-12">
            <span className="text-accent-orange font-bold tracking-wider uppercase text-sm">Aproveite!</span>
            <h2 className="font-display text-4xl font-bold text-gray-800 mt-2">
              Ofertas{" "}
              <span className="text-accent-orange underline decoration-wavy decoration-baby-yellow underline-offset-4">Imperdiveis</span>
            </h2>
          </div>
          <ProductGrid products={offers} />
          <div className="text-center mt-8">
            <Link href="/products?offers=true" className="text-sm font-semibold text-baby-pink hover:text-pink-400 transition-colors">
              Ver todas as ofertas &rarr;
            </Link>
          </div>
        </section>
      )}
    </>
  );
}

export default async function HomePage() {
  const settings = await getStoreSettings();

  return (
    <div className="min-h-screen bg-[#FDFBF7] overflow-x-hidden">
      {/* Preload hero LCP image */}
      <link
        rel="preload"
        as="image"
        href={settings.heroImage || "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&q=75&w=650&fm=webp"}
        // @ts-expect-error fetchpriority not yet in React types
        fetchpriority="high"
      />

      {/* Hero Carousel - renderiza imediatamente */}
      <HeroCarousel
        heroBadge={settings.heroBadge}
        heroTitle1={settings.heroTitle1}
        heroTitle2={settings.heroTitle2}
        heroDescription={settings.heroDescription}
        heroCta1={settings.heroCta1}
        heroCta2={settings.heroCta2}
        heroImage={settings.heroImage}
        heroTestimonial={settings.heroTestimonial}
        heroTestimonialAuthor={settings.heroTestimonialAuthor}
      />

      {/* Conteúdo dinâmico - carrega enquanto a página já está visível */}
      <Suspense fallback={
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-100 rounded w-48 mx-auto" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-100 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      }>
        <HomeContent />
      </Suspense>

      {/* Trust Badges */}
      <section className="bg-white py-8 border-y border-gray-100">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Users, title: "1.200+ Mamaes", text: "Clientes satisfeitas em todo Brasil" },
              { icon: Package, title: "Envio Direto", text: "Enviado direto para sua casa" },
              { icon: Lock, title: "100% Seguro", text: "Pagamento com criptografia SSL" },
              { icon: ShieldCheck, title: "Garantia", text: "7 dias para troca ou devolucao" },
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

      {/* Recently Viewed */}
      <RecentlyViewed />

      {/* Testimonials */}
      <TestimonialsSection />

      {/* Blog Preview */}
      <BlogPreview />

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
              Receba dicas exclusivas, ofertas secretas e um cupom de{" "}
              <span className="font-bold text-accent-orange">10% OFF</span> na sua primeira compra.
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
            <p className="text-xs text-gray-500 mt-4">Prometemos nao enviar spam. Apenas amor e ofertas!</p>
          </div>
        </div>
      </section>

      <WhatsAppButton whatsappNumber={settings.contactWhatsapp} storeName={settings.storeName} />
    </div>
  );
}
