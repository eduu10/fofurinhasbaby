-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'PROCESSING';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "aliexpressOrderId" TEXT;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "affiliateUrl" TEXT,
ADD COLUMN     "aliexpressProductId" TEXT,
ADD COLUMN     "costPriceUSD" DOUBLE PRECISION,
ADD COLUMN     "exchangeRateAtImport" DOUBLE PRECISION,
ADD COLUMN     "lastSyncAt" TIMESTAMP(3),
ADD COLUMN     "needsTranslation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "omkarProductData" JSONB,
ADD COLUMN     "outOfStock" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "syncPrice" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "api_usage" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "api_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_history" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "costUSD" DOUBLE PRECISION NOT NULL,
    "sellBRL" DOUBLE PRECISION NOT NULL,
    "exchangeRate" DOUBLE PRECISION NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_dropship_info" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "affiliateUrl" TEXT,
    "purchaseUrl" TEXT,
    "aliexpressStatus" TEXT,
    "purchasedAt" TIMESTAMP(3),
    "costTotalUSD" DOUBLE PRECISION,
    "estimatedMarginBRL" DOUBLE PRECISION,
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "order_dropship_info_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_usage_service_month_key" ON "api_usage"("service", "month");

-- CreateIndex
CREATE INDEX "price_history_productId_idx" ON "price_history"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "order_dropship_info_orderId_key" ON "order_dropship_info"("orderId");

-- CreateIndex
CREATE INDEX "products_aliexpressProductId_idx" ON "products"("aliexpressProductId");

-- AddForeignKey
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_dropship_info" ADD CONSTRAINT "order_dropship_info_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
