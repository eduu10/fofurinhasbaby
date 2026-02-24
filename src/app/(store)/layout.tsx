import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FloatingCart } from "@/components/layout/floating-cart";
import { ToastProvider } from "@/components/ui/toast-provider";

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

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getStoreSettings();

  return (
    <div className="overflow-x-hidden">
      <ToastProvider />
      <Header
        topBarText={settings.topBarText}
        searchPlaceholder={settings.searchPlaceholder}
      />
      <main className="min-h-screen">{children}</main>
      <Footer
        storeName={settings.storeName}
        contactEmail={settings.contactEmail}
        contactWhatsapp={settings.contactWhatsapp}
        contactWhatsappDisplay={settings.contactWhatsappDisplay}
        contactHours={settings.contactHours}
      />
      <FloatingCart />
    </div>
  );
}
