"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { getInitials } from "@/lib/utils";
import {
  Bell,
  ChevronDown,
  LogOut,
  User,
  Settings,
  ShoppingBag,
  AlertTriangle,
  Star,
  Package,
} from "lucide-react";

interface Notification {
  id: string;
  type: "order" | "alert" | "review" | "stock";
  title: string;
  description: string;
  time: string;
  read: boolean;
  href?: string;
}

const typeIcons = {
  order: ShoppingBag,
  alert: AlertTriangle,
  review: Star,
  stock: Package,
};

const typeColors = {
  order: "text-blue-500 bg-blue-50",
  alert: "text-amber-500 bg-amber-50",
  review: "text-purple-500 bg-purple-50",
  stock: "text-red-500 bg-red-50",
};

function timeAgo(dateStr: string) {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function AdminHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications");
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data.notifications || []);
        setUnreadCount(json.data.unreadCount || 0);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 pl-14 sm:px-6 lg:px-8">
      {/* Left: Store name */}
      <div className="flex items-center gap-3 min-w-0">
        <h1 className="text-base sm:text-lg font-semibold text-gray-800 truncate">
          Painel Administrativo
        </h1>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setNotifOpen(!notifOpen);
              setMenuOpen(false);
            }}
            className="relative rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100"
            aria-label="Notificacoes"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-pink-600 text-[9px] font-bold text-white leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setNotifOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-1 w-80 sm:w-96 rounded-xl border border-gray-100 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                  <h3 className="text-sm font-semibold text-gray-800">
                    Notificacoes
                  </h3>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[11px] font-medium text-pink-600">
                      {unreadCount} nova{unreadCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <Bell className="mx-auto h-8 w-8 text-gray-300" />
                      <p className="mt-2 text-sm text-gray-400">
                        Nenhuma notificacao
                      </p>
                    </div>
                  ) : (
                    notifications.map((notif) => {
                      const Icon = typeIcons[notif.type];
                      const colorClass = typeColors[notif.type];
                      const className = `flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 ${
                        !notif.read ? "bg-pink-50/40" : ""
                      }`;

                      const content = (
                        <>
                          <div
                            className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${colorClass}`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-gray-800 truncate">
                                {notif.title}
                              </p>
                              <span className="flex-shrink-0 text-[11px] text-gray-400">
                                {timeAgo(notif.time)}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                              {notif.description}
                            </p>
                          </div>
                          {!notif.read && (
                            <span className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-pink-500" />
                          )}
                        </>
                      );

                      return notif.href ? (
                        <Link
                          key={notif.id}
                          href={notif.href}
                          onClick={() => setNotifOpen(false)}
                          className={className}
                        >
                          {content}
                        </Link>
                      ) : (
                        <div key={notif.id} className={className}>
                          {content}
                        </div>
                      );
                    })
                  )}
                </div>
                <div className="border-t border-gray-100 px-4 py-2.5">
                  <Link
                    href="/admin/orders"
                    onClick={() => setNotifOpen(false)}
                    className="block text-center text-xs font-medium text-pink-600 hover:text-pink-700"
                  >
                    Ver todos os pedidos
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User dropdown */}
        {user && (
          <div className="relative">
            <button
              onClick={() => {
                setMenuOpen(!menuOpen);
                setNotifOpen(false);
              }}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-gray-100"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-100 text-sm font-semibold text-pink-600">
                {getInitials(user.name)}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium text-gray-700">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500">{user.role === "ADMIN" ? "Administrador" : "Usuario"}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-gray-100 bg-white py-1 shadow-lg">
                  <Link
                    href="/admin/settings"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    Configuracoes
                  </Link>
                  <Link
                    href="/account"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    onClick={() => setMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    Minha Conta
                  </Link>
                  <div className="border-t border-gray-100">
                    <button
                      onClick={() => {
                        logout();
                        setMenuOpen(false);
                        window.location.href = "/login";
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
        )}
      </div>
    </header>
  );
}
