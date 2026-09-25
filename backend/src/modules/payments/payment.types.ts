export enum PaymentProvider {
  MOCK = "mock",
  CLICK = "click",
  PAYME = "payme",
  PAYNET = "paynet",
}

export type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "REFUNDED";

export interface CreatePaymentInput {
  orderId: string;
  userId: string;
  amountMinor: number;
  currency: string;
  idempotencyKey: string;
  returnUrl?: string;
}

export interface PaymentResult {
  provider: PaymentProvider;
  paymentId: string;
  status: PaymentStatus;
  amountMinor: number;
  currency: string;
  checkoutUrl?: string;
  message?: string;
}

export interface PaymentCallbackInput {
  paymentId: string;
  status: "PAID" | "FAILED" | "REFUNDED";
  providerReference?: string;
}

export interface PaymentAdapter {
  readonly provider: PaymentProvider;
  createPayment(input: CreatePaymentInput): Promise<PaymentResult>;
  checkPayment(paymentId: string): Promise<PaymentResult>;
  handleCallback(input: PaymentCallbackInput): Promise<PaymentResult>;
}
