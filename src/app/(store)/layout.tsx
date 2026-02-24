import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FloatingCart } from "@/components/layout/floating-cart";
import { ToastProvider } from "@/components/ui/toast-provider";

export default function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-hidden">
      <ToastProvider />
      <Header />
      <main className="min-h-screen">{children}</main>
      <Footer />
      <FloatingCart />
    </div>
  );
}
