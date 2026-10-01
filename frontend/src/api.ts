const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000/api/v1";
const CNY_TO_UZS = Number(import.meta.env.VITE_CNY_TO_UZS ?? 1800);

type JsonObject = Record<string, unknown>;
export type ApiCategory = { id: string; nameUz: string; nameRu: string };
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
  category?: ApiCategory | null;
};
export type ApiOption = { id: string; name: string; parentId: string | null };
export type ProductList = { items: ApiProduct[]; page: number; limit: number; total: number; pages: number };
export type ApiUser = { id: string; phone?: string | null; name?: string | null; email?: string | null; city?: string | null; address?: string | null; language?: string | null; role?: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API_BASE + path, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text();
    let message = body || `API error ${res.status}`;
    try {
      const error = asObject(JSON.parse(body));
      message = firstString(error.message, asObject(error.response).error_msg) || message;
    } catch {}
    throw new Error(message);
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

function findList(payload: unknown, keys: string[]): unknown[] {
  const root = asObject(payload);
  for (const key of keys) {
    if (Array.isArray(root[key])) return root[key] as unknown[];
  }
  for (const value of Object.values(root)) {
    const nested = asObject(value);
    for (const key of keys) {
      if (Array.isArray(nested[key])) return nested[key] as unknown[];
    }
  }
  return [];
}

export function mapMarketplaceGoods(payload: unknown): ApiProduct[] {
  return findList(payload, ["goods_list", "goods_details", "list"]).flatMap((entry) => {
    const goods = asObject(entry);
    const id = firstString(goods.product_id, goods.goods_sign, goods.goods_id, goods.id);
    if (!id) return [];

    const priceFen = Number(goods.target_sale_price ?? goods.min_group_price ?? goods.min_normal_price ?? goods.group_price ?? 0);
    const discount = Number(goods.coupon_discount ?? goods.discount ?? 0);
    const categoryIds = Array.isArray(goods.cat_ids) ? goods.cat_ids : [];
    const categoryId = firstString(goods.cat_id, categoryIds[0], goods.goods_cat_id) || null;
    const title = firstString(goods.product_title, goods.goods_name, goods.goods_title, goods.title) || "Товар маркетплейса";
    const description = firstString(goods.product_detail_url, goods.goods_desc, goods.goods_description, goods.description);
    const imageUrl = firstString(goods.product_main_image_url, goods.goods_thumbnail_url, goods.goods_image_url, goods.image_url) || null;
    const product: ApiProduct = {
      id,
      categoryId,
      titleUz: title,
      titleRu: title,
      descriptionUz: description,
      descriptionRu: description,
      currency: "UZS",
      priceMinor: Math.max(0, Math.round(priceFen * CNY_TO_UZS)),
      status: discount > 0 ? "sale" : "popular",
      imageUrl,
    };
    return [product];
  });
}

export function mapMarketplaceCategories(payload: unknown): ApiCategory[] {
  return findList(payload, ["goods_cats_list", "cat_list", "list"]).flatMap((entry) => {
    const category = asObject(entry);
    const id = firstString(category.cat_id, category.goods_cat_id, category.id);
    const name = firstString(category.cat_name, category.goods_cat_name, category.name);
    return id && name ? [{ id, nameUz: name, nameRu: name }] : [];
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
    register: (email: string, password: string) => request<{ accessToken: string; user: ApiUser }>("/auth/register", { method: "POST", body: JSON.stringify({ email, password }) }),
    login: (email: string, password: string) => request<{ accessToken: string; user: ApiUser }>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
    profile: (token: string) => request<ApiUser>("/auth/profile", { headers: { Authorization: `Bearer ${token}` } }),
    updateProfile: (token: string, profile: Partial<ApiUser>) => request<ApiUser>("/auth/profile", { method: "PATCH", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(profile) }),
  },
  categories: () => request<ApiCategory[]>("/categories"),
  products: (params: { search?: string; categoryId?: string; page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => value !== undefined && query.set(key, String(value)));
    return request<ProductList>(`/products?${query}`);
  },
  product: (id: string) => request<ApiProduct>(`/products/${id}`),
  aliexpress: {
    hotProducts: (params: Record<string, unknown> = {}) =>
      request<unknown>(queryPath("/integrations/aliexpress/affiliate/products", params)),
    categories: (params: Record<string, unknown> = {}) =>
      request<unknown>(queryPath("/integrations/aliexpress/affiliate/categories", params)),
    affiliateLinks: (params: Record<string, unknown> = {}) =>
      request<unknown>(queryPath("/integrations/aliexpress/affiliate/links", params)),
  },
};

export const formatUzs = (minor: number) => new Intl.NumberFormat("ru-RU").format(Math.round(minor / 100)) + " сум";
