"use client";

import { useState } from "react";
import Link from "next/link";
import { useCartStore } from "@/stores/cart-store";
import { useAuthStore } from "@/stores/auth-store";
import {
  Search,
  ShoppingCart,
  User,
  Menu,
  X,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  Heart,
  Star,
  Sparkles,
} from "lucide-react";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Produtos" },
  { href: "/products?sort=sales", label: "Mais Vendidos" },
];

interface HeaderProps {
  topBarText?: string;
  searchPlaceholder?: string;
}

export function Header({ topBarText, searchPlaceholder }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const itemCount = useCartStore((state) => state.getItemCount());
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/products?search=${encodeURIComponent(searchQuery.trim())}`;
      setSearchOpen(false);
    }
  };

  return (
    <>
      {/* Top Bar */}
      <div className="bg-baby-blue text-white py-2 text-center text-xs sm:text-sm font-bold tracking-wide px-4">
        <span className="inline-flex items-center gap-1 sm:gap-2">
          <Sparkles size={14} className="flex-shrink-0 hidden sm:block" /> {topBarText || "FRETE GRATIS PARA TODO O BRASIL"} <Sparkles size={14} className="flex-shrink-0 hidden sm:block" />
        </span>
      </div>

      {/* Main Header */}
      <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md shadow-sm border-b border-baby-pink/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden text-gray-600"
              aria-label="Menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 flex-shrink-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-baby-pink to-accent-orange rounded-full flex items-center justify-center text-white shadow-inner flex-shrink-0">
                <Star fill="currentColor" size={16} className="sm:w-5 sm:h-5" />
              </div>
              <span className="font-display text-lg sm:text-2xl font-bold text-gradient-pink whitespace-nowrap">
                Fofurinhas Baby
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex lg:items-center lg:gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-semibold text-gray-600 transition-colors hover:text-baby-pink"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Desktop Search Bar */}
            <form
              onSubmit={handleSearch}
              className="hidden lg:flex flex-1 max-w-xl mx-8 relative"
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder || "O que seu bebe precisa hoje?"}
                className="w-full pl-4 pr-12 py-3 rounded-full border-2 border-baby-blue/30 focus:border-baby-blue focus:outline-none bg-gray-50 text-gray-600 placeholder-gray-400 font-medium transition-all"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-baby-blue text-white p-2 rounded-full hover:bg-blue-400 transition-colors cursor-pointer"
              >
                <Search size={18} strokeWidth={3} />
              </button>
            </form>

            {/* Right side actions */}
            <div className="flex items-center gap-2 sm:gap-4 text-gray-600 flex-shrink-0">
              {/* Mobile search toggle */}
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="lg:hidden"
                aria-label="Buscar"
              >
                <Search size={24} />
              </button>

              {/* Favorites */}
              <Link
                href="/products"
                className="hidden sm:flex flex-col items-center gap-0.5 hover:text-baby-pink transition-colors"
              >
                <Heart size={24} />
                <span className="text-[10px] font-bold uppercase">Favoritos</span>
              </Link>

              {/* Cart */}
              <Link
                href="/cart"
                className="flex flex-col items-center gap-0.5 hover:text-baby-pink transition-colors relative"
                aria-label="Carrinho"
              >
                <div className="relative">
                  <ShoppingCart size={24} />
                  {itemCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-accent-orange text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {itemCount > 99 ? "99+" : itemCount}
                    </span>
                  )}
                </div>
                <span className="hidden sm:block text-[10px] font-bold uppercase">Carrinho</span>
              </Link>

              {/* User menu */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-100"
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-baby-pink to-accent-orange text-xs font-semibold text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden max-w-[100px] truncate sm:inline">
                      {user.name.split(" ")[0]}
                    </span>
                    <ChevronDown className="hidden h-3.5 w-3.5 sm:block" />
                  </button>

                  {userMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setUserMenuOpen(false)}
                      />
                      <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
                        <div className="border-b border-gray-100 px-4 py-2">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {user.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {user.email}
                          </p>
                        </div>
                        {user.role === "ADMIN" ? (
                          <Link
                            href="/admin"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setUserMenuOpen(false)}
                          >
                            <LayoutDashboard className="h-4 w-4" />
                            Painel Admin
                          </Link>
                        ) : (
                          <>
                            <Link
                              href="/account"
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => setUserMenuOpen(false)}
                            >
                              <User className="h-4 w-4" />
                              Minha Conta
                            </Link>
                            <Link
                              href="/account/orders"
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => setUserMenuOpen(false)}
                            >
                              <ShoppingCart className="h-4 w-4" />
                              Meus Pedidos
                            </Link>
                          </>
                        )}
                        <div className="border-t border-gray-100">
                          <button
                            onClick={() => {
                              logout();
                              setUserMenuOpen(false);
                            }}
                            className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <LogOut className="h-4 w-4" />
                            Sair
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-baby-pink"
                >
                  <User className="h-5 w-5" />
                  <span className="hidden sm:inline">Entrar</span>
                </Link>
              )}
            </div>
          </div>

          {/* Mobile search bar */}
          {searchOpen && (
            <div className="mt-4 lg:hidden relative">
              <form onSubmit={handleSearch}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar produtos..."
                  autoFocus
                  className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:border-baby-blue"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              </form>
            </div>
          )}
        </div>

        {/* Mobile navigation menu */}
        {mobileMenuOpen && (
          <div className="border-t border-gray-100 bg-white lg:hidden">
            <nav className="container mx-auto space-y-1 px-4 py-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-baby-pink/10 hover:text-baby-pink"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
