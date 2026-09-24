export interface Product {
  id: string;
  categoryId: string | null;
  titleUz: string;
  titleRu?: string;
  descriptionUz?: string;
  descriptionRu?: string;
  currency: "CNY" | "UZS";
  priceMinor: number;
  status: "draft" | "active" | "archived";
  supplierProductRef?: string;
}
