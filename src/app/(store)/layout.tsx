import { prisma } from "@/lib/prisma";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { FloatingCart } from "@/components/layout/floating-cart";
import { ToastProvider } from "@/components/ui/toast-provider";
import { SalesNotification } from "@/components/SalesNotification";
import { ExitIntentPopup } from "@/components/ExitIntentPopup";

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
        storeName={settings.storeName}
        storeLogo={settings.storeLogo}
      />
      <main className="min-h-screen">{children}</main>
      <Footer
        storeName={settings.storeName}
        contactEmail={settings.contactEmail}
        contactWhatsapp={settings.contactWhatsapp}
        contactWhatsappDisplay={settings.contactWhatsappDisplay}
        contactHours={settings.contactHours}
        socialInstagram={settings.socialInstagram}
        socialFacebook={settings.socialFacebook}
        socialTiktok={settings.socialTiktok}
      />
      <FloatingCart />
      <SalesNotification />
      <ExitIntentPopup />
    </div>
  );
}
