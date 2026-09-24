export type PaymentStatus = "pending" | "processing" | "paid" | "failed" | "refunded";

export interface PaymentRequest {
  orderId: string;
  amountMinor: number;
  currency: "UZS";
}

export interface PaymentProvider {
  createPayment(request: PaymentRequest): Promise<{ providerPaymentRef: string; checkoutUrl?: string }>;
  getPaymentStatus(providerPaymentRef: string): Promise<PaymentStatus>;
}
