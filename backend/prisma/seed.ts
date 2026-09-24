import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const categories = [
    ["Электроника", "Электроника"],
    ["Для дома", "Для дома"],
    ["Одежда", "Одежда"],
    ["Красота", "Красота"],
    ["Аксессуары", "Аксессуары"],
    ["Спорт", "Спорт"]
  ] as const;

  const categoryMap = new Map<string, string>();

  for (const [nameUz, nameRu] of categories) {
    const category = await prisma.category.upsert({
      where: { nameUz },
      update: { nameRu },
      create: { nameUz, nameRu }
    });
    categoryMap.set(nameUz, category.id);
  }

  const products = [
    ["Беспроводные наушники", "Simsiz quloqchinlar", "Электроника", 1990000],
    ["Умная лампа", "Aqlli chiroq", "Для дома", 1290000],
    ["Мужская худи", "Erkaklar hudisi", "Одежда", 2490000],
    ["Косметичка", "Kosmetichka", "Красота", 890000],
    ["Рюкзак", "Ryukzak", "Аксессуары", 3190000],
    ["Фитнес-браслет", "Fitnes bilaguzuk", "Спорт", 2790000]
  ] as const;

  for (const [titleRu, titleUz, categoryName, priceMinor] of products) {
    await prisma.product.upsert({
      where: { supplierProductRef: `demo-${categoryName}-${titleRu}` },
      update: {
        titleRu,
        titleUz,
        categoryId: categoryMap.get(categoryName),
        currency: "UZS",
        priceMinor,
        status: "ACTIVE"
      },
      create: {
        titleRu,
        titleUz,
        categoryId: categoryMap.get(categoryName),
        currency: "UZS",
        priceMinor,
        status: "ACTIVE",
        supplierProductRef: `demo-${categoryName}-${titleRu}`
      }
    });
  }

  console.log("Local demo catalog seeded.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
