import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { MockPaymentAdapter } from "./mock-payment.adapter";
import { PaymentAdapter, PaymentProvider, PaymentResult } from "./payment.types";

@Injectable()
export class PaymentsService {
  private readonly adapters = new Map<PaymentProvider, PaymentAdapter>();
  constructor(private readonly prisma: PrismaService, private readonly mock: MockPaymentAdapter) {
    this.adapters.set(PaymentProvider.MOCK, mock);
  }
  private adapter(provider: PaymentProvider) {
    const adapter = this.adapters.get(provider);
    if (!adapter) throw new BadRequestException({ code: "PAYMENT_PROVIDER_NOT_CONFIGURED", message: `Payment provider "${provider}" is not configured yet` });
    return adapter;
  }
  async create(userId: string, orderId: string, provider: PaymentProvider, idempotencyKey: string): Promise<PaymentResult> {
    const order = await this.prisma.order.findFirst({ where: { id: orderId, userId }, include: { payments: true } });
    if (!order) throw new BadRequestException({ code: "ORDER_NOT_FOUND", message: "Заказ не найден" });
    if (order.status === "PAID") throw new BadRequestException({ code: "ORDER_ALREADY_PAID", message: "Заказ уже оплачен" });
    if (order.status === "CANCELLED" || order.status === "REFUNDED") throw new BadRequestException({ code: "ORDER_NOT_PAYABLE", message: "Заказ нельзя оплатить" });
    const existing = order.payments.find(p => p.provider === provider && p.externalRef === idempotencyKey);
    if (existing) return { provider, paymentId: existing.id, status: existing.status, amountMinor: existing.amountMinor, currency: existing.currency };
    const result = await this.adapter(provider).createPayment({ orderId, userId, amountMinor: order.totalMinor, currency: order.currency, idempotencyKey });
    await this.prisma.$transaction([
      this.prisma.payment.create({ data: { orderId, provider, externalRef: idempotencyKey, amountMinor: result.amountMinor, currency: result.currency, status: result.status } }),
      this.prisma.order.update({ where: { id: orderId }, data: { status: result.status === "PAID" ? "PAID" : "AWAITING_PAYMENT" } }),
    ]);
    return result;
  }
  async mockConfirm(userId: string, orderId: string) {
    const payment = await this.prisma.payment.findFirst({ where: { orderId, order: { userId }, provider: PaymentProvider.MOCK }, orderBy: { createdAt: "desc" } });
    if (!payment) throw new BadRequestException({ code: "PAYMENT_NOT_FOUND", message: "Платёж не найден" });
    const updated = await this.prisma.$transaction(async tx => {
      const p = await tx.payment.update({ where: { id: payment.id }, data: { status: "PAID" } });
      await tx.order.update({ where: { id: orderId }, data: { status: "PAID" } });
      return p;
    });
    return { paymentId: updated.id, status: updated.status, orderId };
  }
}
