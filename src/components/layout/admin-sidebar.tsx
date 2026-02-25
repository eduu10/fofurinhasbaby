"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  FolderTree,
  Ticket,
  DollarSign,
  Settings,
  Store,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Globe,
  Import,
} from "lucide-react";

const sidebarLinks = [
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/products",
    label: "Produtos",
    icon: Package,
  },
  {
    href: "/admin/products/import",
    label: "Importar AliExpress",
    icon: Import,
  },
  {
    href: "/admin/orders",
    label: "Pedidos",
    icon: ShoppingBag,
  },
  {
    href: "/admin/categories",
    label: "Categorias",
    icon: FolderTree,
  },
  {
    href: "/admin/coupons",
    label: "Cupons",
    icon: Ticket,
  },
  {
    href: "/admin/finance",
    label: "Financeiro",
    icon: DollarSign,
  },
  {
    href: "/admin/settings",
    label: "Configuracoes",
    icon: Settings,
  },
  {
    href: "/admin/settings/aliexpress",
    label: "AliExpress",
    icon: Globe,
  },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo area */}
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
        {!collapsed && (
          <Link href="/admin" className="text-lg font-bold text-pink-600">
            Fofurinhas
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden rounded-md p-1.5 text-gray-500 hover:bg-gray-100 lg:inline-flex"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {sidebarLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-pink-50 text-pink-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? link.label : undefined}
            >
              <Icon
                className={cn(
                  "h-5 w-5 flex-shrink-0",
                  active ? "text-pink-600" : "text-gray-400"
                )}
              />
              {!collapsed && <span>{link.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Back to store */}
      <div className="border-t border-gray-200 p-3">
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Voltar a Loja" : undefined}
        >
          <Store className="h-5 w-5 flex-shrink-0 text-gray-400" />
          {!collapsed && <span>Voltar a Loja</span>}
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-40 rounded-md bg-white p-2 shadow-md lg:hidden"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5 text-gray-600" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform bg-white shadow-xl transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute right-3 top-4 rounded-md p-1 text-gray-500 hover:bg-gray-100"
          aria-label="Fechar menu"
        >
          <X className="h-5 w-5" />
        </button>
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden h-screen border-r border-gray-200 bg-white transition-all duration-200 lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block",
          collapsed ? "lg:w-16" : "lg:w-64"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
