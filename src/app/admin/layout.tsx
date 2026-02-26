"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { AdminSidebar } from "@/components/layout/admin-sidebar";
import { AdminHeader } from "@/components/layout/admin-header";
import { ToastProvider } from "@/components/ui/toast-provider";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, _initialized, initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    if (_initialized && (!user || user.role !== "ADMIN")) {
      router.push("/login?redirect=/admin");
    }
  }, [user, _initialized, router]);

  if (!_initialized || !user || user.role !== "ADMIN") return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ToastProvider />
      <AdminSidebar />

      <div className="flex flex-1 flex-col lg:ml-64">
        <AdminHeader />
        <main className="flex-1 p-3 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
