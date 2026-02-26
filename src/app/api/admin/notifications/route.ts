import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { successResponse, errorResponse } from "@/lib/api";

export async function GET() {
  try {
    await requireAdmin();

    // Fetch recent orders (last 10)
    const recentOrders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        user: { select: { name: true } },
        items: { select: { title: true, quantity: true } },
      },
    });

    // Fetch unread dropship alerts
    const alerts = await prisma.dropshipAlert.findMany({
      where: { read: false },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Fetch pending reviews
    const pendingReviews = await prisma.review.count({
      where: { isApproved: false },
    });

    // Count low-stock products (stock <= 5 and active)
    const lowStockCount = await prisma.product.count({
      where: { isActive: true, isDraft: false, stock: { lte: 5 } },
    });

    // Build notifications list
    const notifications: Array<{
      id: string;
      type: "order" | "alert" | "review" | "stock";
      title: string;
      description: string;
      time: string;
      read: boolean;
      href?: string;
    }> = [];

    // Add order notifications
    for (const order of recentOrders) {
      const itemNames = order.items.map((i) => i.title).slice(0, 2);
      const extra = order.items.length > 2 ? ` +${order.items.length - 2}` : "";
      notifications.push({
        id: `order-${order.id}`,
        type: "order",
        title: `Pedido #${order.orderNumber}`,
        description: `${order.user.name} — ${itemNames.join(", ")}${extra}`,
        time: order.createdAt.toISOString(),
        read: order.status !== "PENDING",
        href: `/admin/orders/${order.id}`,
      });
    }

    // Add dropship alerts
    for (const alert of alerts) {
      notifications.push({
        id: `alert-${alert.id}`,
        type: "alert",
        title: alert.type === "price_change" ? "Alteracao de preco" : alert.type === "out_of_stock" ? "Produto sem estoque" : "Alerta",
        description: alert.message,
        time: alert.createdAt.toISOString(),
        read: alert.read,
      });
    }

    // Add review notification if any pending
    if (pendingReviews > 0) {
      notifications.push({
        id: "reviews-pending",
        type: "review",
        title: "Avaliacoes pendentes",
        description: `${pendingReviews} avaliacao${pendingReviews > 1 ? "oes" : ""} aguardando aprovacao`,
        time: new Date().toISOString(),
        read: false,
        href: "/admin/reviews",
      });
    }

    // Add low stock notification if any
    if (lowStockCount > 0) {
      notifications.push({
        id: "low-stock",
        type: "stock",
        title: "Estoque baixo",
        description: `${lowStockCount} produto${lowStockCount > 1 ? "s" : ""} com estoque baixo`,
        time: new Date().toISOString(),
        read: false,
        href: "/admin/products",
      });
    }

    // Sort by time desc
    notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    const unreadCount = notifications.filter((n) => !n.read).length;

    return successResponse({ notifications: notifications.slice(0, 15), unreadCount });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return errorResponse("Nao autenticado", 401);
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return errorResponse("Acesso negado", 403);
    }
    console.error("Admin notifications error:", error);
    return errorResponse("Erro ao carregar notificacoes", 500);
  }
}
