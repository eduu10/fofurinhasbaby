"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";

interface HeroCarouselProps {
  heroBadge?: string;
  heroTitle1?: string;
  heroTitle2?: string;
  heroDescription?: string;
  heroCta1?: string;
  heroCta2?: string;
  heroImage?: string;
  heroTestimonial?: string;
  heroTestimonialAuthor?: string;
}

const defaultSlides = [
  {
    badge: "Novidade Magica",
    title1: "Sonhos Doces &",
    title2: "Noites Tranquilas",
    description:
      "Descubra nossa colecao exclusiva de produtos que transformam o dia a dia do seu bebe em momentos magicos.",
    image:
      "https://images.unsplash.com/photo-1555252333-9f8e92e65df9?auto=format&fit=crop&q=75&w=650&fm=webp",
    cta: "VER OFERTAS",
    ctaLink: "/products",
  },
  {
    badge: "Cuidado Especial",
    title1: "Banho Feliz &",
    title2: "Higiene com Amor",
    description:
      "Produtos de higiene delicados e seguros para a pele sensivel do seu bebe. Do banho ate a hora de dormir.",
    image:
      "https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&q=75&w=650&fm=webp",
    cta: "VER HIGIENE",
    ctaLink: "/products?category=higiene",
  },
];

function CountdownTimer() {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    function getTimeLeft() {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      const diff = end.getTime() - now.getTime();
      return {
        hours: Math.floor(diff / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      };
    }
    setMounted(true);
    setTimeLeft(getTimeLeft());
    const interval = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(interval);
  }, []);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="inline-flex items-center gap-1 bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-sm font-bold shadow-sm border border-orange-100 min-h-[34px]">
      {mounted ? (
        <>
          <span className="text-accent-orange">Oferta expira em</span>
          <span className="bg-accent-orange text-white px-1.5 py-0.5 rounded text-xs font-mono">
            {pad(timeLeft.hours)}
          </span>
          <span className="text-accent-orange">:</span>
          <span className="bg-accent-orange text-white px-1.5 py-0.5 rounded text-xs font-mono">
            {pad(timeLeft.minutes)}
          </span>
          <span className="text-accent-orange">:</span>
          <span className="bg-accent-orange text-white px-1.5 py-0.5 rounded text-xs font-mono">
            {pad(timeLeft.seconds)}
          </span>
        </>
      ) : (
        <span className="text-accent-orange">Oferta expira em --:--:--</span>
      )}
    </div>
  );
}

export function HeroCarousel(props: HeroCarouselProps) {
  // Build slides: first slide uses settings (if provided), second is the default secondary slide
  const slides = [
    {
      badge: props.heroBadge || defaultSlides[0].badge,
      title1: props.heroTitle1 || defaultSlides[0].title1,
      title2: props.heroTitle2 || defaultSlides[0].title2,
      description: props.heroDescription || defaultSlides[0].description,
      image: props.heroImage || defaultSlides[0].image,
      cta: props.heroCta1 || defaultSlides[0].cta,
      ctaLink: defaultSlides[0].ctaLink,
    },
    defaultSlides[1],
  ];

  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % slides.length);
  }, [slides.length]);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Auto-advance every 4 seconds
  useEffect(() => {
    const interval = setInterval(next, 4000);
    return () => clearInterval(interval);
  }, [next]);

  const slide = slides[current];

  const cta2Text = props.heroCta2 || "MAIS VENDIDOS";
  const testimonialText = props.heroTestimonial || "Meu bebe dormiu em 5 minutos!";
  const testimonialAuthor = props.heroTestimonialAuthor || "Mamae Julia";

  return (
    <section className="relative bg-gradient-pastel-hero pt-8 pb-16 overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-10 left-10 text-baby-pink/20 animate-pulse">
        <Star size={48} fill="currentColor" />
      </div>
      <div className="absolute bottom-20 right-10 text-baby-yellow/40 animate-bounce">
        <Star size={64} fill="currentColor" />
      </div>

      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="lg:w-1/2 space-y-5 text-center lg:text-left z-10 min-h-[420px] lg:min-h-[460px]">
            {/* Badge */}
            <div className="inline-block bg-white/80 backdrop-blur-sm px-4 py-1.5 rounded-full text-accent-orange font-bold text-sm shadow-sm border border-orange-100">
              {slide.badge}
            </div>

            {/* Title with transition */}
            <h1
              key={`title-${current}`}
              className="font-display text-5xl lg:text-7xl font-bold text-gray-800 leading-[0.9] animate-fade-in-up"
            >
              <span className="text-baby-blue">{slide.title1}</span>
              <br />
              <span className="text-baby-pink">{slide.title2}</span>
            </h1>

            <p
              key={`desc-${current}`}
              className="text-lg text-gray-600 max-w-lg mx-auto lg:mx-0 font-medium animate-fade-in-up"
            >
              {slide.description}
            </p>

            {/* Countdown */}
            <CountdownTimer />

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start min-h-[60px]">
              <Link
                href={slide.ctaLink}
                className="bg-accent-orange text-white font-display font-bold text-xl px-8 py-4 rounded-2xl shadow-lg shadow-orange-200 hover:shadow-xl hover:scale-105 transition-all active:scale-95 text-center"
              >
                {slide.cta}
              </Link>
              <Link
                href="/products?sort=sales"
                className="bg-white text-gray-700 font-display font-bold text-xl px-8 py-4 rounded-2xl shadow-md hover:bg-gray-50 transition-all border-2 border-gray-100 text-center"
              >
                {cta2Text}
              </Link>
            </div>

            {/* Dots */}
            <div className="flex gap-3 justify-center lg:justify-start pt-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className="relative w-10 h-10 flex items-center justify-center cursor-pointer"
                  aria-label={`Slide ${i + 1}`}
                >
                  <span
                    className={`block h-3 rounded-full transition-colors duration-300 ${
                      i === current
                        ? "bg-accent-orange w-8"
                        : "bg-gray-300 hover:bg-gray-400 w-3"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Image - fixed min-height to prevent CLS */}
          <div className="lg:w-1/2 relative min-h-[350px] lg:min-h-[434px]">
            <div className="absolute inset-0 bg-gradient-to-tr from-baby-blue/30 to-baby-pink/30 rounded-full blur-3xl transform scale-90" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={`img-${current}`}
              src={slide.image}
              alt={`${slide.title1} ${slide.title2}`}
              width={650}
              height={434}
              fetchPriority={current === 0 ? "high" : "auto"}
              decoding={current === 0 ? "sync" : "async"}
              onError={(e) => { (e.target as HTMLImageElement).src = defaultSlides[0].image; }}
              className="relative z-10 rounded-[3rem] shadow-2xl border-4 border-white rotate-2 hover:rotate-0 transition-transform duration-500 w-full max-w-md mx-auto animate-fade-in-up"
            />

            {/* Navigation arrows */}
            <button
              onClick={prev}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-lg hover:bg-white transition-colors cursor-pointer"
              aria-label="Anterior"
            >
              <ChevronLeft size={24} className="text-gray-600" />
            </button>
            <button
              onClick={next}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-lg hover:bg-white transition-colors cursor-pointer"
              aria-label="Proximo"
            >
              <ChevronRight size={24} className="text-gray-600" />
            </button>

            {/* Floating testimonial badge */}
            <div className="absolute -bottom-6 -left-6 z-20 bg-white p-4 rounded-2xl shadow-xl border-2 border-baby-yellow max-w-[160px] hidden sm:block">
              <div className="flex items-center gap-1 text-accent-orange mb-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} fill="currentColor" size={12} />
                ))}
              </div>
              <p className="text-xs font-bold text-gray-600 leading-tight">
                &quot;{testimonialText}&quot;
              </p>
              <p className="text-[10px] text-gray-400 mt-1">- {testimonialAuthor}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
