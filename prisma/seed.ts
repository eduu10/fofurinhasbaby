import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@fofurinhasbaby.com" },
    update: {},
    create: { name: "Administrador", email: "admin@fofurinhasbaby.com", password: adminPassword, role: "ADMIN", phone: "(11) 99999-9999" },
  });
  console.log("Admin created:", admin.email);

  const customerPassword = await bcrypt.hash("cliente123", 12);
  const customer = await prisma.user.upsert({
    where: { email: "cliente@teste.com" },
    update: {},
    create: { name: "Maria Silva", email: "cliente@teste.com", password: customerPassword, role: "CUSTOMER", phone: "(11) 98888-8888" },
  });
  console.log("Customer created:", customer.email);

  await prisma.address.create({
    data: { userId: customer.id, label: "Casa", street: "Rua das Flores", number: "123", complement: "Apto 45", neighborhood: "Jardim Primavera", city: "São Paulo", state: "SP", zipCode: "01234567", isDefault: true },
  }).catch(() => {});

  const categories = await Promise.all([
    prisma.category.upsert({ where: { slug: "roupas" }, update: {}, create: { name: "Roupas", slug: "roupas", description: "Roupas para bebê", sortOrder: 1 } }),
    prisma.category.upsert({ where: { slug: "acessorios" }, update: {}, create: { name: "Acessórios", slug: "acessorios", description: "Acessórios para bebê", sortOrder: 2 } }),
    prisma.category.upsert({ where: { slug: "brinquedos" }, update: {}, create: { name: "Brinquedos", slug: "brinquedos", description: "Brinquedos educativos", sortOrder: 3 } }),
    prisma.category.upsert({ where: { slug: "higiene" }, update: {}, create: { name: "Higiene", slug: "higiene", description: "Produtos de higiene", sortOrder: 4 } }),
    prisma.category.upsert({ where: { slug: "alimentacao" }, update: {}, create: { name: "Alimentação", slug: "alimentacao", description: "Produtos de alimentação", sortOrder: 5 } }),
    prisma.category.upsert({ where: { slug: "decoracao" }, update: {}, create: { name: "Decoração", slug: "decoracao", description: "Decoração para quarto do bebê", sortOrder: 6 } }),
  ]);
  console.log("Categories created:", categories.length);

  const products = [
    { title: "Body Manga Longa Algodão Orgânico", slug: "body-manga-longa-algodao-organico", description: "Body de manga longa confeccionado em algodão orgânico 100%, super macio e confortável.", shortDescription: "Body de algodão orgânico", price: 49.90, compareAtPrice: 69.90, costPrice: 18.00, stock: 150, isFeatured: true, salesCount: 245, categoryId: categories[0].id, images: ["https://images.unsplash.com/photo-1522771930-78848d9293e8?w=600"], variations: [{ name: "Tamanho", value: "RN", stock: 30 }, { name: "Tamanho", value: "P", stock: 40 }, { name: "Tamanho", value: "M", stock: 50 }, { name: "Cor", value: "Branco", stock: 80 }, { name: "Cor", value: "Rosa", stock: 70 }] },
    { title: "Kit 3 Babadores Impermeáveis", slug: "kit-3-babadores-impermeaveis", description: "Kit com 3 babadores impermeáveis.", shortDescription: "Kit babadores silicone", price: 39.90, compareAtPrice: 59.90, costPrice: 12.00, stock: 200, isFeatured: true, salesCount: 189, categoryId: categories[1].id, images: ["https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600"], variations: [{ name: "Cor", value: "Rosa", stock: 70 }, { name: "Cor", value: "Azul", stock: 65 }] },
    { title: "Chocalho Mordedor Montessori", slug: "chocalho-mordedor-montessori", description: "Mordedor Montessori de madeira e silicone.", shortDescription: "Mordedor Montessori", price: 34.90, costPrice: 10.00, stock: 100, isFeatured: true, salesCount: 156, categoryId: categories[2].id, images: ["https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=600"], variations: [] },
    { title: "Kit Banho Bebê Completo", slug: "kit-banho-bebe-completo", description: "Kit banho hipoalergênico.", shortDescription: "Kit banho 3 itens", price: 89.90, compareAtPrice: 119.90, costPrice: 32.00, stock: 80, isFeatured: true, salesCount: 312, categoryId: categories[3].id, images: ["https://images.unsplash.com/photo-1602024242516-fbc9d4fda4b6?w=600"], variations: [] },
    { title: "Mamadeira Anticólica 260ml", slug: "mamadeira-anticolica-260ml", description: "Mamadeira anticólica.", shortDescription: "Mamadeira anticólica", price: 45.90, costPrice: 15.00, stock: 120, salesCount: 198, categoryId: categories[4].id, images: ["https://images.unsplash.com/photo-1609220136736-443140cffec6?w=600"], variations: [{ name: "Cor", value: "Rosa", stock: 40 }, { name: "Cor", value: "Azul", stock: 40 }] },
    { title: "Mobile Musical Giratório", slug: "mobile-musical-giratorio", description: "Mobile musical com 12 melodias.", shortDescription: "Mobile musical", price: 129.90, compareAtPrice: 179.90, costPrice: 45.00, stock: 50, isFeatured: true, salesCount: 87, categoryId: categories[5].id, images: ["https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=600"], variations: [] },
    { title: "Macacão Fleece Ursinho", slug: "macacao-fleece-ursinho", description: "Macacão fleece com capuz de ursinho.", shortDescription: "Macacão fleece", price: 79.90, costPrice: 28.00, stock: 90, isFeatured: true, salesCount: 134, categoryId: categories[0].id, images: ["https://images.unsplash.com/photo-1522771930-78848d9293e8?w=600"], variations: [{ name: "Tamanho", value: "P", stock: 30 }, { name: "Tamanho", value: "M", stock: 30 }, { name: "Tamanho", value: "G", stock: 30 }] },
    { title: "Tapete Atividades Sensorial", slug: "tapete-atividades-sensorial", description: "Tapete de atividades sensoriais.", shortDescription: "Tapete sensorial", price: 159.90, compareAtPrice: 199.90, costPrice: 55.00, stock: 40, isFeatured: true, salesCount: 67, categoryId: categories[2].id, images: ["https://images.unsplash.com/photo-1555252333-9f8e92e65df9?w=600"], variations: [] },
  ];

  for (const p of products) {
    const existing = await prisma.product.findUnique({ where: { slug: p.slug } });
    if (existing) { console.log(`Skipping "${p.title}"`); continue; }
    await prisma.product.create({
      data: {
        title: p.title, slug: p.slug, description: p.description, shortDescription: p.shortDescription,
        price: p.price, compareAtPrice: p.compareAtPrice || null, costPrice: p.costPrice,
        stock: p.stock, isFeatured: p.isFeatured || false, salesCount: p.salesCount || 0,
        categoryId: p.categoryId, metaTitle: p.title, metaDescription: p.shortDescription,
        images: { create: p.images.map((url, i) => ({ url, alt: p.title, sortOrder: i })) },
        variations: { create: p.variations.map((v) => ({ name: v.name, value: v.value, stock: v.stock })) },
      },
    });
    console.log(`Created: ${p.title}`);
  }

  await prisma.coupon.upsert({ where: { code: "BEMVINDO10" }, update: {}, create: { code: "BEMVINDO10", type: "PERCENTAGE", value: 10, minPurchase: 50, maxUses: 100, isActive: true } });
  await prisma.coupon.upsert({ where: { code: "FRETE15" }, update: {}, create: { code: "FRETE15", type: "FIXED", value: 15, minPurchase: 100, maxUses: 50, isActive: true } });
  console.log("Coupons created");

  for (const [key, value] of Object.entries({ storeName: "Fofurinhas Baby", primaryColor: "#db2777", currency: "BRL", defaultMargin: "40", shippingFee: "19.90", freeShippingMin: "199" })) {
    await prisma.storeSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  console.log("Settings created");

  console.log("\n--- Seed completed! ---");
  console.log("Admin: admin@fofurinhasbaby.com / admin123");
  console.log("Customer: cliente@teste.com / cliente123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
