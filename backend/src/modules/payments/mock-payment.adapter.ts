import { Injectable } from "@nestjs/common";
import { PaymentAdapter, PaymentCallbackInput, PaymentProvider, PaymentResult, CreatePaymentInput } from "./payment.types";

@Injectable()
export class MockPaymentAdapter implements PaymentAdapter {
  readonly provider = PaymentProvider.MOCK;
  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    return { provider: this.provider, paymentId: `mock_${input.orderId}`, status: "PENDING", amountMinor: input.amountMinor, currency: input.currency, checkoutUrl: `/api/v1/payments/mock/${input.orderId}`, message: "Mock payment created." };
  }
  async checkPayment(paymentId: string): Promise<PaymentResult> {
    return { provider: this.provider, paymentId, status: "PENDING", amountMinor: 0, currency: "UZS" };
  }
  async handleCallback(input: PaymentCallbackInput): Promise<PaymentResult> {
    return { provider: this.provider, paymentId: input.paymentId, status: input.status, amountMinor: 0, currency: "UZS" };
  }
}
