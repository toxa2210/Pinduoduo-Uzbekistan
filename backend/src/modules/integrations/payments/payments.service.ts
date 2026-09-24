import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../database/prisma.service";

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrderPayment(orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { payments: { orderBy: { createdAt: "desc" } } }
    });
    if (!order) throw new NotFoundException("Order not found");
    return order;
  }

  async markPaid(paymentId: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment) throw new NotFoundException("Payment not found");
      if (payment.status === "PAID") return payment;
      if (payment.status === "REFUNDED" || payment.status === "FAILED") {
        throw new BadRequestException("Payment cannot be marked as paid");
      }

      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: { status: "PAID" }
      });

      await tx.order.updateMany({
        where: { id: payment.orderId, status: "AWAITING_PAYMENT" },
        data: { status: "PAID" }
      });

      return updated;
    });
  }

  async markRefunded(paymentId: string) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment) throw new NotFoundException("Payment not found");

      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: { status: "REFUNDED" }
      });

      await tx.order.updateMany({
        where: { id: payment.orderId, status: { in: ["AWAITING_PAYMENT", "PAID"] } },
        data: { status: "CANCELLED" }
      });

      return updated;
    });
  }
}
