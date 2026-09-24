export interface SupplierProduct {
  externalId: string;
  title: string;
  priceMinor: number;
  currency: "CNY";
  available: boolean;
}

export interface SupplierAdapter {
  getProduct(externalId: string): Promise<SupplierProduct>;
  createOrder(input: { externalProductId: string; quantity: number }): Promise<{ externalOrderId: string }>;
}
