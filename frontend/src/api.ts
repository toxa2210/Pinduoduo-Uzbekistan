const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";
const CNY_TO_UZS = Number(import.meta.env.VITE_CNY_TO_UZS ?? 1800);

type JsonObject = Record<string, unknown>;
export class ApiRequestError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export type ApiCategory = { id: string; nameUz: string; nameRu: string; parentId?: string | null; imageUrl?: string | null };
export type ApiProduct = {
  id: string;
  categoryId: string | null;
  titleUz: string;
  titleRu?: string | null;
  descriptionUz?: string | null;
  descriptionRu?: string | null;
  currency: string;
  priceMinor: number;
  status: string;
  imageUrl?: string | null;
  rating?: string;
  orders?: string;
  skuId?: string;
  variantLabel?: string;
  brandName?: string;
  attributes?: string;
  sellerId?: string;
  sellerName?: string;
  sellerLogoUrl?: string;
  sellerCountry?: string;
  sellerRating?: string;
  sellerPositiveRate?: string;
  sellerFollowers?: string;
  sellerDescription?: string;
  inStock?: boolean;
  originalPriceMinor?: number;
  discountPercent?: number;
  shippingOptionCode?: string;
  shippingFeeMinor?: number;
  shippingCompany?: string;
  shippingFeeFormat?: string;
  shippingCurrency?: string;
  shippingMinDays?: string;
  shippingMaxDays?: string;
  shippingTracking?: boolean;
  shippingQuoteQuantity?: number;
  category?: ApiCategory | null;
};
export type ApiOption = { id: string; name: string; parentId: string | null };
export type ProductList = { items: ApiProduct[]; page: number; limit: number; total: number; pages: number };
export type ApiUser = { id: string; phone?: string | null; name?: string | null; email?: string | null; city?: string | null; address?: string | null; language?: string | null; role?: string };
export type ApiProfileUpdate = Pick<ApiUser, "phone" | "name" | "city" | "address" | "language">;
export type ApiOrder = {
  id: string;
  status: string;
  totalMinor: number;
  subtotalMinor?: number;
  deliveryMinor?: number;
  discountMinor?: number;
  promoCode?: string | null;
  currency: string;
  deliveryAddress: string;
  recipientName?: string | null;
  recipientPhone?: string | null;
  deliveryCity?: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPriceMinor: number;
    supplierProductId?: string | null;
    supplierSkuId?: string | null;
    productTitle?: string | null;
    variantLabel?: string | null;
    imageUrl?: string | null;
    shippingOptionCode?: string | null;
    shippingFeeMinor?: number | null;
    shippingCompany?: string | null;
    shippingFeeFormat?: string | null;
    shippingCurrency?: string | null;
    shippingMinDays?: string | null;
    shippingMaxDays?: string | null;
    shippingTracking?: boolean | null;
    product?: Pick<ApiProduct, "id" | "titleRu" | "titleUz" | "imageUrl">;
  }>;
};
export type ApiCreateOrder = {
  recipientName: string;
  recipientPhone: string;
  deliveryCity: string;
  deliveryAddress: string;
  promoCode?: string;
  items: Array<{
    productId: string;
    quantity: number;
    supplierProductId?: string;
    supplierSkuId?: string;
    productTitle?: string;
    variantLabel?: string;
    imageUrl?: string;
    unitPriceMinor?: number;
    shippingOptionCode?: string;
    shippingFeeMinor?: number;
    shippingCompany?: string;
    shippingFeeFormat?: string;
    shippingCurrency?: string;
    shippingMinDays?: string;
    shippingMaxDays?: string;
    shippingTracking?: boolean;
    shippingQuoteQuantity?: number;
  }>;
};
export type ImageSearchMatch = {
  productId: string;
  title: string;
  link: string;
  thumbnail: string;
  source: string;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (init?.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(API_BASE + path, {
    ...init,
    headers,
  });
  if (!res.ok) {
    const body = await res.text();
    let message = body || `API error ${res.status}`;
    try {
      const error = asObject(JSON.parse(body));
      const details = asObject(error.message);
      const detailMessage = firstString(details.message);
      const detailCode = firstString(details.code, error.code);
      message = firstString(
        typeof error.message === "string"
          ? `${detailCode ? `${detailCode}: ` : ""}${error.message}`
          : undefined,
        detailMessage ? `${detailCode ? `${detailCode}: ` : ""}${detailMessage}` : "",
        asObject(error.response).error_msg,
      ) || message;
    } catch {}
    throw new ApiRequestError(message, res.status);
  }
  return res.json();
}

function asObject(value: unknown): JsonObject {
  return value && typeof value === "object" ? value as JsonObject : {};
}

function firstString(...values: unknown[]): string {
  const value = values.find((item) => item !== undefined && item !== null && item !== "");
  return value === undefined ? "" : String(value);
}

function flattenText(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(flattenText).filter(Boolean).join(" ");
  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${key} ${flattenText(item)}`.trim())
      .filter(Boolean)
      .join(" ");
  }
  return "";
}

export function marketplaceImageUrl(imageUrl: string | null, width = 480): string | null {
  if (!imageUrl) return null;
  const normalized = imageUrl.startsWith("//") ? `https:${imageUrl}` : imageUrl;
  try {
    const url = new URL(normalized);
    const isMarketplaceImage = ["alicdn.com", "aliexpress-media.com"].some(
      (host) => url.hostname === host || url.hostname.endsWith(`.${host}`),
    );
    if (!isMarketplaceImage || !["http:", "https:"].includes(url.protocol)) return normalized;
    url.protocol = "https:";
    const params = new URLSearchParams({ url: url.toString(), width: String(width) });
    return `${API_BASE.replace(/\/$/, "")}/integrations/aliexpress/image?${params}`;
  } catch {
    return normalized;
  }
}

function findList(payload: unknown, keys: string[]): unknown[] {
  const visited = new Set<object>();
  const search = (value: unknown): unknown[] | null => {
    if (!value || typeof value !== "object" || visited.has(value)) return null;
    if (Array.isArray(value)) return value;
    visited.add(value);
    const nested = asObject(value);
    for (const key of keys) {
      if (Array.isArray(nested[key])) return nested[key] as unknown[];
      const result = search(nested[key]);
      if (result) return result;
    }
    for (const child of Object.values(nested)) {
      const result = search(child);
      if (result) return result;
    }
    return null;
  };
  return search(payload) ?? [];
}

export function mapMarketplaceGoods(payload: unknown, priceCurrency: "CNY" | "UZS" = "CNY"): ApiProduct[] {
  return findList(payload, ["product", "product_list", "products", "goods_list", "goods_details", "list"]).flatMap((entry) => {
    const goods = asObject(entry);
    const id = firstString(goods.product_id, goods.itemId, goods.goods_sign, goods.goods_id, goods.id);
    if (!id) return [];

    const rawPrice = firstString(
      goods.target_sale_price, goods.targetSalePrice, goods.sale_price, goods.salePrice,
      goods.min_group_price, goods.min_normal_price, goods.group_price
    );
    const hasMarketplacePrice = Boolean(rawPrice);
    const price = Number(rawPrice || 0);
    const originalPrice = Number(firstString(goods.target_original_price, goods.targetOriginalPrice, goods.original_price, goods.originalPrice) || 0);
    const rawDiscount = firstString(goods.coupon_discount, goods.discount);
    const discount = Number(rawDiscount.replace("%", "")) || (originalPrice > price ? originalPrice - price : 0);
    const discountPercent = rawDiscount.includes("%")
      ? Number(rawDiscount.replace("%", ""))
      : originalPrice > price
        ? Math.round(((originalPrice - price) / originalPrice) * 100)
        : 0;
    const categoryIds = Array.isArray(goods.cat_ids) ? goods.cat_ids : [];
    const categoryId = firstString(goods.first_level_category_id, goods.category_id, goods.cat_id, goods.cateId, categoryIds[0], goods.goods_cat_id)
      .split(",")[0] || null;
    const title = firstString(goods.product_title, goods.goods_name, goods.goods_title, goods.title) || "Товар маркетплейса";
    const description = firstString(goods.goods_desc, goods.goods_description, goods.description);
    const brandName = firstString(goods.brand_name, goods.brandName, goods.brand, goods.product_brand);
    const attributes = flattenText(goods.attributes ?? goods.product_attributes ?? goods.product_attribute);
    const store = asObject(goods.ae_store_info ?? goods.store_info ?? goods.shop_info ?? goods.seller_info);
    const sellerId = firstString(goods.store_id, goods.shop_id, goods.seller_id, goods.shopId, goods.sellerId, store.store_id, store.shop_id);
    const sellerName = firstString(goods.store_name, goods.shop_name, goods.seller_name, goods.storeName, goods.shopName, goods.sellerName, store.store_name, store.shop_name);
    const sellerImage = marketplaceImageUrl(firstString(goods.store_logo, goods.shop_logo, goods.seller_logo, goods.storeLogo, goods.shopLogo, store.store_logo, store.logo_url) || null);
    const rawStock = goods.in_stock ?? goods.inStock ?? goods.stock_available ?? goods.available_stock ?? goods.stock_quantity ?? goods.quantity;
    const inStock = typeof rawStock === "boolean"
      ? rawStock
      : typeof rawStock === "number"
        ? rawStock > 0
        : typeof rawStock === "string"
          ? /^(?:true|yes|available)$/i.test(rawStock.trim())
            ? true
            : /^(?:false|no|unavailable|out of stock|0)$/i.test(rawStock.trim())
              ? false
              : /^\d+(?:\.\d+)?$/.test(rawStock.trim())
                ? Number(rawStock) > 0
                : undefined
          : undefined;
    const imageUrls = asObject(goods.product_main_image_url);
    const rawImageUrl = firstString(
      goods.product_main_image_url,
      goods.itemMainPic,
      goods.goods_thumbnail_url,
      goods.goods_image_url,
      goods.image_url,
      imageUrls.string
    ) || null;
    const imageUrl = marketplaceImageUrl(rawImageUrl);
    const product: ApiProduct = {
      id,
      categoryId,
      titleUz: title,
      titleRu: title,
      descriptionUz: description,
      descriptionRu: description,
      currency: "UZS",
      priceMinor: Math.max(0, Math.round(price * (hasMarketplacePrice ? (priceCurrency === "UZS" ? 100 : CNY_TO_UZS * 100) : 1))),
      status: discount > 0 ? "sale" : "popular",
      imageUrl,
      rating: firstString(goods.score, goods.evaluate_rate, goods.evaluateRate) || undefined,
      orders: firstString(goods.orders, goods.order_count, goods.orderCount) || undefined,
      brandName: brandName || undefined,
      attributes: attributes || undefined,
      sellerId: sellerId || undefined,
      sellerName: sellerName || undefined,
      sellerLogoUrl: sellerImage || undefined,
      sellerCountry: firstString(goods.store_country, goods.shop_country, goods.seller_country, store.store_country, store.country_name) || undefined,
      sellerRating: firstString(goods.store_rating, goods.shop_rating, goods.seller_rating, store.store_rating, store.evaluation_rating) || undefined,
      sellerPositiveRate: firstString(goods.positive_feedback_rate, goods.store_positive_rate, goods.shop_positive_rate, store.positive_feedback_rate) || undefined,
      sellerFollowers: firstString(goods.followers, goods.store_followers, goods.shop_followers, store.followers, store.follow_count) || undefined,
      sellerDescription: firstString(goods.store_description, goods.shop_description, goods.seller_description, store.store_description, store.description) || undefined,
      inStock,
      ...(originalPrice > price ? {
        originalPriceMinor: Math.round(originalPrice * (priceCurrency === "UZS" ? 100 : CNY_TO_UZS * 100)),
        discountPercent,
      } : {}),
    };
    return [product];
  });
}

export function mapMarketplaceCategories(payload: unknown): ApiCategory[] {
  return findList(payload, ["categories", "category", "category_list", "goods_cats_list", "goods_cat_list", "cat_list", "list"]).flatMap((entry) => {
    const category = asObject(entry);
    const id = firstString(category.category_id, category.cat_id, category.goods_cat_id, category.id);
    const name = firstString(category.category_name, category.cat_name, category.goods_cat_name, category.name);
    const parentId = firstString(category.parent_category_id, category.parent_id);
    const rawImageUrl = firstString(
      category.category_image_url,
      category.category_pic_url,
      category.category_image,
      category.cat_pic_url,
      category.image_url,
      category.pic_url,
    ) || null;
    return id && name
      ? [{ id, nameUz: name, nameRu: name, parentId: parentId || null, imageUrl: marketplaceImageUrl(rawImageUrl) }]
      : [];
  });
}

export function mapMarketplaceOptions(payload: unknown): ApiOption[] {
  return findList(payload, ["goods_opt_list", "list"]).flatMap((entry) => {
    const option = asObject(entry);
    const id = firstString(option.opt_id, option.id);
    const name = firstString(option.opt_name, option.name);
    return id && name ? [{ id, name, parentId: firstString(option.parent_opt_id) || null }] : [];
  });
}

function queryPath(path: string, params: Record<string, unknown>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.set(key, typeof value === "object" ? JSON.stringify(value) : String(value));
    }
  });
  return `${path}?${query}`;
}

export const api = {
  auth: {
    firebase: (idToken: string) => request<{ accessToken: string; user: ApiUser }>("/auth/firebase", { method: "POST", body: JSON.stringify({ idToken }) }),
    profile: (token: string) => request<ApiUser>("/auth/profile", { headers: { Authorization: `Bearer ${token}` } }),
    updateProfile: (token: string, profile: ApiProfileUpdate) => request<ApiUser>("/auth/profile", { method: "PATCH", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(profile) }),
  },
  categories: () => request<ApiCategory[]>("/categories"),
  products: (params: { search?: string; categoryId?: string; page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => value !== undefined && query.set(key, String(value)));
    return request<ProductList>(`/products?${query}`);
  },
  product: (id: string) => request<ApiProduct>(`/products/${id}`),
  orders: {
    list: (token: string) => request<ApiOrder[]>("/orders", { headers: { Authorization: `Bearer ${token}` } }),
    create: (token: string, order: ApiCreateOrder) =>
      request<ApiOrder>("/orders", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(order),
      }),
  },
  aliexpress: {
    hotProducts: (params: Record<string, unknown> = {}) =>
      request<unknown>(queryPath("/integrations/aliexpress/affiliate/products", params)),
    dropshippingProducts: (params: Record<string, unknown> = {}) =>
      request<unknown>(queryPath("/integrations/aliexpress/dropshipping/products", params)),
    categories: (params: Record<string, unknown> = {}) =>
      request<unknown>(queryPath("/integrations/aliexpress/affiliate/categories", params)),
    dropshippingCategories: (params: Record<string, unknown> = {}) =>
      request<unknown>(queryPath("/integrations/aliexpress/dropshipping/categories", params)),
    productDetails: (productId: string, params: Record<string, unknown> = {}) =>
      request<unknown>(queryPath(`/integrations/aliexpress/product/${encodeURIComponent(productId)}`, params)),
    freightOptions: (params: {
      productId: string;
      selectedSkuId: string;
      quantity: number;
      shipToCountry?: string;
      currency?: string;
      language?: string;
      locale?: string;
      provinceCode?: string;
      cityCode?: string;
    }) => request<unknown>(queryPath("/integrations/aliexpress/freight", params)),
    imageSearch: (image: File) => {
      const form = new FormData();
      form.append("image", image, image.name || "search-image");
      return request<{ results: ImageSearchMatch[] }>("/integrations/aliexpress/image-search", {
        method: "POST",
        body: form,
      });
    },
    affiliateLinks: (params: Record<string, unknown> = {}) =>
      request<unknown>(queryPath("/integrations/aliexpress/affiliate/links", params)),
  },
};

export const formatUzs = (minor: number) => new Intl.NumberFormat("ru-RU").format(Math.round(minor / 100)) + " сум";
