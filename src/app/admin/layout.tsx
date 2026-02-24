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
  const { user } = useAuthStore();
  useEffect(() => {
    if (!user || user.role !== "ADMIN") {
      router.push("/login?redirect=/admin");
    }
  }, [user, router]);

  if (!user || user.role !== "ADMIN") return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <ToastProvider />
      <AdminSidebar />

      <div className="flex flex-1 flex-col lg:ml-64">
        <AdminHeader />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
