import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    userId: string;
    deliveryAddress: string;
    items?: Array<{ productId: string; quantity: number }>;
  }) {
    let items = input.items;

    if (!items) {
      const cart = await this.prisma.cart.findUnique({
        where: { userId: input.userId },
        include: { items: true }
      });

      items = cart?.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity
      })) ?? [];
    }

    if (!items.length) {
      throw new BadRequestException("Order must contain at least one item");
    }

    const ids = items.map((item) => item.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids }, status: "ACTIVE" }
    });

    if (products.length !== new Set(ids).size) {
      throw new BadRequestException("One or more products are unavailable");
    }

    const productMap = new Map<string, (typeof products)[number]>(
      products.map((product) => [product.id, product])
    );

    const totalMinor = items.reduce((sum, item) => {
      if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 999) {
        throw new BadRequestException("Invalid product quantity");
      }

      const product = productMap.get(item.productId);
      if (!product) {
        throw new BadRequestException("One or more products are unavailable");
      }

      return sum + product.priceMinor * item.quantity;
    }, 0);

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId: input.userId,
          deliveryAddress: input.deliveryAddress,
          totalMinor,
          currency: "UZS",
          status: "AWAITING_PAYMENT",
          items: {
            create: items!.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPriceMinor: productMap.get(item.productId)!.priceMinor
            }))
          }
        },
        include: { items: true }
      });

      const cart = await tx.cart.findUnique({
        where: { userId: input.userId }
      });

      if (cart) {
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id }
        });
      }

      return created;
    });

    return order;
  }

  listForUser(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, titleRu: true, titleUz: true }
            }
          }
        }
      }
    });
  }
}
