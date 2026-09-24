export type OrderStatus =
  | "created"
  | "awaiting_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPriceMinor: number;
}

export interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  currency: "UZS";
  subtotalMinor: number;
  deliveryMinor: number;
  totalMinor: number;
  items: OrderItem[];
}
