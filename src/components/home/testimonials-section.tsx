"use client";

import { useState, useEffect, useRef } from "react";
import { Star, ChevronLeft, ChevronRight, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Ana Beatriz",
    city: "Sao Paulo, SP",
    avatar: "AB",
    rating: 5,
    text: "Amei os produtos! Meu bebe adorou o kit de banho, a qualidade e incrivel. Ja e a terceira vez que compro aqui.",
  },
  {
    name: "Camila Oliveira",
    city: "Rio de Janeiro, RJ",
    avatar: "CO",
    rating: 5,
    text: "Entrega super rapida e produtos de alta qualidade. O body que comprei e lindo e muito macio. Recomendo demais!",
  },
  {
    name: "Juliana Santos",
    city: "Belo Horizonte, MG",
    avatar: "JS",
    rating: 5,
    text: "Melhor loja de produtos para bebe! Os brinquedos sao seguros e educativos. Minha filha nao larga o ursinho.",
  },
  {
    name: "Fernanda Lima",
    city: "Curitiba, PR",
    avatar: "FL",
    rating: 4,
    text: "Otimo custo-beneficio! Comprei varias roupinhas e todas vieram perfeitas. O atendimento no WhatsApp e excelente.",
  },
  {
    name: "Mariana Costa",
    city: "Salvador, BA",
    avatar: "MC",
    rating: 5,
    text: "O kit higiene e maravilhoso! Produtos com cheirinho gostoso e que nao irritam a pele do bebe. Nota 10!",
  },
  {
    name: "Patricia Almeida",
    city: "Porto Alegre, RS",
    avatar: "PA",
    rating: 5,
    text: "Ja indiquei para todas as minhas amigas mamaes! Precos justos e produtos que realmente valem a pena.",
  },
  {
    name: "Raquel Ferreira",
    city: "Fortaleza, CE",
    avatar: "RF",
    rating: 5,
    text: "Comprei o enxoval todo aqui e nao me arrependo. Tudo chegou bem embalado e dentro do prazo. Loja de confianca!",
  },
  {
    name: "Luciana Mendes",
    city: "Brasilia, DF",
    avatar: "LM",
    rating: 4,
    text: "Produtos lindos e de qualidade. Meu bebe fica uma fofura com as roupinhas. Voltarei a comprar com certeza!",
  },
];

function AnimatedStars({ rating, inView }: { rating: number; inView: boolean }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={16}
          fill={i < rating ? "currentColor" : "none"}
          className={`text-accent-yellow transition-all ${
            inView
              ? "opacity-100 scale-100"
              : "opacity-0 scale-50"
          }`}
          style={{ transitionDelay: `${i * 100}ms`, transitionDuration: "300ms" }}
        />
      ))}
    </div>
  );
}

export function TestimonialsSection() {
  const [current, setCurrent] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  // Intersection Observer for star animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
        }
      },
      { threshold: 0.3 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Show 3 testimonials at a time on desktop, 1 on mobile
  const visibleCount = 3;
  const maxPage = Math.ceil(testimonials.length / visibleCount) - 1;

  const next = () => setCurrent((c) => Math.min(c + 1, maxPage));
  const prev = () => setCurrent((c) => Math.max(c - 1, 0));

  const visible = testimonials.slice(
    current * visibleCount,
    current * visibleCount + visibleCount,
  );

  return (
    <section ref={sectionRef} className="bg-baby-pink/5 py-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="text-baby-pink font-bold tracking-wider uppercase text-sm">
            Depoimentos reais
          </span>
          <h2 className="font-display text-4xl font-bold text-gray-800 mt-2">
            O que as{" "}
            <span className="text-baby-pink underline decoration-wavy decoration-baby-yellow underline-offset-4">
              Mamaes
            </span>{" "}
            dizem
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {visible.map((t, idx) => (
            <div
              key={`${current}-${idx}`}
              className="bg-white rounded-2xl p-6 shadow-lg border-2 border-baby-pink/10 hover:border-baby-pink/30 transition-all relative"
            >
              <Quote
                size={32}
                className="text-baby-pink/20 absolute top-4 right-4"
              />

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-baby-pink to-accent-orange text-white flex items-center justify-center font-display font-bold text-sm">
                  {t.avatar}
                </div>
                <div>
                  <p className="font-display font-bold text-gray-800">
                    {t.name}
                  </p>
                  <p className="text-xs text-gray-500">{t.city}</p>
                </div>
              </div>

              <AnimatedStars rating={t.rating} inView={inView} />

              <p className="text-gray-600 mt-3 text-sm leading-relaxed">
                &quot;{t.text}&quot;
              </p>
            </div>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={prev}
            disabled={current === 0}
            className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Anterior"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>

          <div className="flex gap-2">
            {Array.from({ length: maxPage + 1 }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                  i === current
                    ? "bg-baby-pink w-6"
                    : "bg-gray-300 hover:bg-gray-400"
                }`}
                aria-label={`Pagina ${i + 1}`}
              />
            ))}
          </div>

          <button
            onClick={next}
            disabled={current === maxPage}
            className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Proximo"
          >
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>
      </div>
    </section>
  );
}
