import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  CreditCard,
  Heart,
  HelpCircle,
  Languages,
  MapPin,
  MessageCircle,
  Minus,
  Package,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  Star,
  Store,
  Ticket,
  Truck,
  UserRound,
  X,
  Zap,
  Moon,
  Sun,
} from "lucide-react";
import { createUserWithEmailAndPassword, getIdToken, reload, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "@firebase/auth";
import type { User as FirebaseUser } from "@firebase/auth";
import { ApiRequestError, api, formatUzs, mapMarketplaceCategories, mapMarketplaceGoods, type ApiCategory, type ApiOrder, type ApiProduct, type ApiUser } from "./api";
import { firebaseAuth, firebaseConfigReady } from "./firebase";

const navItems = ["Главная", "Категории", "Корзина", "Профиль"] as const;
type Language = "ru" | "en" | "uz";
const translations = {
  ru: {
    home: "Главная", categories: "Категории", cart: "Корзина", profile: "Профиль", catalog: "Каталог",
    global: "Международный каталог", sales: "Скидки", how: "Как заказать", delivery: "Доставка", support: "Поддержка",
    search: "Ищите товары и бренды", profileOpen: "Профиль открыт", cartOpen: "Корзина открыта", start: "Начать покупки",
    heroTitle: "Мировые товары", heroAccent: "по честной цене", heroText: "Выбираем товары у проверенных продавцов и доставляем их в Узбекистан.",
    safe: "Безопасная оплата", deliveryUz: "Доставка в Узбекистан", categoriesQuick: "Быстрый выбор", allCategories: "Все категории",
    best: "Лучшие предложения", popular: "Популярные товары", seeAll: "Смотреть всё", payments: "Платежи", shipping: "Доставка",
    catalogPdd: "Категория AliExpress", all: "Все категории", tags: "Все теги", goods: "Товары", allGoods: "Все товары",
    add: "Добавить", buy: "Купить", details: "Подробнее", loading: "Загружаем товары AliExpress...", noGoods: "Реальные товары не найдены.",
    lang: "Язык", light: "Светлая тема", dark: "Тёмная тема", loadingCatalog: "Загружаем каталог", apiError: "Ошибка каталога",
    china: "Международный каталог", hot: "Горячие товары", showAll: "Показать всё", sale: "Акции недели", discount: "Скидка",
    emptyCart: "Корзина пуста", addFromCatalog: "Добавьте товары из каталога и вернитесь сюда.", shop: "К покупкам",
    retry: "Повторить",
  },
  en: {
    home: "Home", categories: "Categories", cart: "Cart", profile: "Profile", catalog: "Catalog",
    global: "Global catalog", sales: "Deals", how: "How to order", delivery: "Delivery", support: "Support",
    search: "Search products and brands", profileOpen: "Profile opened", cartOpen: "Cart opened", start: "Start shopping",
    heroTitle: "Global products", heroAccent: "at a fair price", heroText: "We select products from trusted sellers and deliver them to Uzbekistan.",
    safe: "Secure payment", deliveryUz: "Delivery to Uzbekistan", categoriesQuick: "Quick pick", allCategories: "All categories",
    best: "Best offers", popular: "Popular products", seeAll: "View all", payments: "Payments", shipping: "Delivery",
    catalogPdd: "AliExpress category", all: "All categories", tags: "All tags", goods: "Products", allGoods: "All products",
    add: "Add", buy: "Buy", details: "Details", loading: "Loading AliExpress products...", noGoods: "No real products found.",
    lang: "Language", light: "Light theme", dark: "Dark theme", loadingCatalog: "Loading catalog", apiError: "Catalog error",
    china: "Global catalog", hot: "Trending products", showAll: "Show all", sale: "Weekly deals", discount: "Sale",
    emptyCart: "Your cart is empty", addFromCatalog: "Add products from the catalog and come back here.", shop: "Start shopping",
    retry: "Retry",
  },
  uz: {
    home: "Bosh sahifa", categories: "Kategoriyalar", cart: "Savat", profile: "Profil", catalog: "Katalog",
    global: "Xalqaro katalog", sales: "Chegirmalar", how: "Qanday buyurtma berish", delivery: "Yetkazib berish", support: "Yordam",
    search: "Mahsulot va brendlarni qidiring", profileOpen: "Profil ochildi", cartOpen: "Savat ochildi", start: "Xaridni boshlash",
    heroTitle: "Dunyo mahsulotlari", heroAccent: "halol narxda", heroText: "Ishonchli sotuvchilardan mahsulotlarni tanlaymiz va O‘zbekistonga yetkazamiz.",
    safe: "Xavfsiz to‘lov", deliveryUz: "O‘zbekistonga yetkazib berish", categoriesQuick: "Tezkor tanlov", allCategories: "Barcha kategoriyalar",
    best: "Eng yaxshi takliflar", popular: "Mashhur mahsulotlar", seeAll: "Barchasini ko‘rish", payments: "To‘lovlar", shipping: "Yetkazib berish",
    catalogPdd: "AliExpress kategoriyasi", all: "Barcha kategoriyalar", tags: "Barcha teglar", goods: "Mahsulotlar", allGoods: "Barcha mahsulotlar",
    add: "Qo‘shish", buy: "Sotib olish", details: "Batafsil", loading: "AliExpress mahsulotlari yuklanmoqda...", noGoods: "Haqiqiy mahsulotlar topilmadi.",
    lang: "Til", light: "Yorug‘ rejim", dark: "Qorong‘i rejim", loadingCatalog: "Katalog yuklanmoqda", apiError: "Katalog xatosi",
    china: "Xalqaro katalog", hot: "Ommabop mahsulotlar", showAll: "Barchasini ko‘rsatish", sale: "Haftalik chegirmalar", discount: "Chegirma",
    emptyCart: "Savat bo‘sh", addFromCatalog: "Katalogdan mahsulot qo‘shing va bu yerga qayting.", shop: "Xaridga o‘tish",
    retry: "Qayta urinish",
  },
} as const;
type View =
  | (typeof navItems)[number]
  | "Каталог"
  | "Международный каталог"
  | "Скидки"
  | "Как заказать"
  | "Доставка"
  | "Поддержка";

const LogoMark = ({ className = "" }: { className?: string }) => (
  <img className={className} src="/uriona-logo.png" alt="Логотип URIONA" />
);

const topMenuItems = [
  { label: "Каталог", view: "Каталог" as View, message: "Каталог открыт" },
  { label: "Международный каталог", view: "Международный каталог" as View, message: "Открыт международный каталог" },
  { label: "Скидки", view: "Скидки" as View, message: "Акции и скидки" },
  { label: "Как заказать", view: "Как заказать" as View, message: "Как заказать" },
  { label: "Доставка", view: "Доставка" as View, message: "Доставка по Узбекистану" },
  { label: "Поддержка", view: "Поддержка" as View, message: "Поддержка открыта" },
];

const CART_STORAGE_KEY = "uriona-cart";
const PRODUCTS_STORAGE_KEY = "uriona-cart-products";
const LIKED_STORAGE_KEY = "uriona-liked-products";
const MIN_PROMO_SUBTOTAL = 500_000 * 100;
type ProfileSection = "overview" | "orders" | "wishlist" | "stores" | "reviews" | "questions" | "coupons" | "addresses" | "payments" | "settings" | "support";

const orderStatusLabels: Record<string, string> = {
  CREATED: "Создан",
  AWAITING_PAYMENT: "Ожидает оплаты",
  PAID: "Оплачен",
  PROCESSING: "Собирается",
  SHIPPED: "Отправлен",
  DELIVERED: "Доставлен",
  CANCELLED: "Отменён",
};

function firebaseErrorMessage(error: unknown): string {
  const code = error && typeof error === "object" && "code" in error && typeof error.code === "string"
    ? error.code
    : "";
  const messages: Record<string, string> = {
    "auth/email-already-in-use": "Аккаунт с таким email уже существует. Войдите или восстановите пароль.",
    "auth/invalid-email": "Проверьте правильность email.",
    "auth/invalid-credential": "Неверный email или пароль.",
    "auth/user-not-found": "Аккаунт не найден. Проверьте email или создайте аккаунт.",
    "auth/wrong-password": "Неверный email или пароль.",
    "auth/weak-password": "Пароль должен содержать не менее 8 символов.",
    "auth/too-many-requests": "Слишком много попыток. Попробуйте позже.",
    "auth/network-request-failed": "Нет соединения. Проверьте интернет и повторите попытку.",
    "auth/operation-not-allowed": "В Firebase Console не включён вход по email и паролю.",
    "auth/unauthorized-domain": "Домен сайта не добавлен в список Authorized domains Firebase.",
    "auth/configuration-not-found": "Firebase Authentication не настроен в проекте.",
  };
  return messages[code] ?? (error instanceof Error ? error.message : "Не удалось выполнить запрос Firebase.");
}

function readStoredValue(key: string): unknown {
  const stored = localStorage.getItem(key);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as unknown;
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    localStorage.removeItem(key);
    return null;
  }
}

function isApiProduct(value: unknown): value is ApiProduct {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const product = value as Record<string, unknown>;
  return typeof product.id === "string"
    && typeof product.titleUz === "string"
    && typeof product.currency === "string"
    && typeof product.priceMinor === "number"
    && Number.isFinite(product.priceMinor)
    && typeof product.status === "string";
}

function readStoredCart(): Record<string, number> {
  const stored = readStoredValue(CART_STORAGE_KEY);
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};
  return Object.fromEntries(
    Object.entries(stored).filter((entry): entry is [string, number] => {
      const quantity = entry[1];
      return typeof quantity === "number" && Number.isSafeInteger(quantity) && quantity > 0;
    }),
  );
}

function readStoredProducts(): ApiProduct[] {
  const stored = readStoredValue(PRODUCTS_STORAGE_KEY);
  return Array.isArray(stored) ? stored.filter(isApiProduct).slice(-100) : [];
}

function readStoredLiked(): string[] {
  const stored = readStoredValue(LIKED_STORAGE_KEY);
  return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : [];
}

type AliExpressProductDetails = {
  subject: string;
  description: string;
  status: string;
  categoryId: string;
  images: string[];
  videos: string[];
  storeName: string;
  skus: Record<string, unknown>[];
  grossWeight: string;
  dimensions: string;
  deliveryTime: string;
};

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readString(record: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" || typeof value === "number") {
      if (String(value).trim()) return String(value);
    }
  }
  return "";
}

function readRecords(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) return value.map(readRecord).filter((item) => Object.keys(item).length > 0);
  const record = readRecord(value);
  if (Object.keys(record).length === 0) return [];
  const nestedList = Object.values(record).find(Array.isArray);
  return Array.isArray(nestedList) ? nestedList.map(readRecord).filter((item) => Object.keys(item).length > 0) : [record];
}

function parseAliExpressProductDetails(payload: unknown): AliExpressProductDetails {
  const root = readRecord(payload);
  const response = readRecord(root.aliexpress_ds_product_get_response ?? root);
  const result = readRecord(response.result ?? response);
  const base = readRecord(result.ae_item_base_info_dto);
  const multimedia = readRecord(result.ae_multimedia_info_dto);
  const store = readRecord(result.ae_store_info);
  const packageInfo = readRecord(result.package_info_dto);
  const logistics = readRecord(result.logistics_info_dto);
  const rawImages = readString(multimedia, "image_urls").split(";").map((image) => image.trim()).filter(Boolean);
  const videos = readRecords(multimedia.ae_video_dtos)
    .map((video) => readString(video, "media_url", "video_url", "url"))
    .filter(Boolean);
  const skus = readRecords(result.ae_item_sku_info_dtos);

  return {
    subject: readString(base, "subject"),
    description: readString(base, "detail", "mobile_detail").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
    status: readString(base, "product_status_type"),
    categoryId: readString(base, "category_id"),
    images: rawImages,
    videos,
    storeName: readString(store, "store_name", "shop_name", "ae_store_name", "store_id"),
    skus,
    grossWeight: readString(packageInfo, "gross_weight"),
    dimensions: ["package_length", "package_width", "package_height"].map((key) => readString(packageInfo, key)).every(Boolean)
      ? `${readString(packageInfo, "package_length")} × ${readString(packageInfo, "package_width")} × ${readString(packageInfo, "package_height")}`
      : "",
    deliveryTime: readString(logistics, "delivery_time"),
  };
}

export function App() {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem("uriona-language") as Language) || "ru");
  const [lightMode, setLightMode] = useState(() => localStorage.getItem("uriona-theme") === "light");
  const text = translations[language];
  const [view, setView] = useState<View>("Главная");
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [liveCatalog, setLiveCatalog] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [detailProduct, setDetailProduct] = useState<ApiProduct | null>(null);
  const [detailPayload, setDetailPayload] = useState<unknown>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailAttempt, setDetailAttempt] = useState(0);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");
  const [liked, setLiked] = useState<string[]>(readStoredLiked);
  const [cartItems, setCartItems] = useState<Record<string, number>>(readStoredCart);
  const [promo, setPromo] = useState("");
  const [appliedPromo, setAppliedPromo] = useState("");
  const [notice, setNotice] = useState("");
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("uriona-access-token") || "");
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [knownProducts, setKnownProducts] = useState<ApiProduct[]>(readStoredProducts);
  const [profileForm, setProfileForm] = useState({ name: "", email: "", phone: "", city: "", address: "" });
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register" | "reset">("login");
  const [profileSection, setProfileSection] = useState<ProfileSection>("overview");
  const [profileBusy, setProfileBusy] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);
  const [authNotice, setAuthNotice] = useState("");
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [ordersAttempt, setOrdersAttempt] = useState(0);
  const [orderFilter, setOrderFilter] = useState<"all" | "active" | "archive">("all");
  const productDetails = useMemo(
    () => detailPayload === null ? null : parseAliExpressProductDetails(detailPayload),
    [detailPayload],
  );

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(knownProducts.slice(-100)));
  }, [knownProducts]);

  useEffect(() => {
    localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify(liked));
  }, [liked]);

  useEffect(() => {
    localStorage.setItem("uriona-language", language);
    localStorage.setItem("uriona-theme", lightMode ? "light" : "dark");
    document.documentElement.lang = language === "uz" ? "uz" : language;
  }, [language, lightMode]);

  useEffect(() => {
    if (!authToken) return;
    let active = true;
    api.auth.profile(authToken).then((user) => {
      if (!active) return;
      setProfile(user);
      setProfileForm({ name: user.name ?? "", email: user.email ?? "", phone: user.phone ?? "", city: user.city ?? "", address: user.address ?? "" });
    }).catch((error: unknown) => {
      if (!active) return;
      if (error instanceof ApiRequestError && error.status === 401) {
        localStorage.removeItem("uriona-access-token");
        setAuthToken("");
        setProfile(null);
        return;
      }
      setNotice(error instanceof Error ? error.message : "Не удалось загрузить профиль");
    });
    return () => { active = false; };
  }, [authToken]);

  useEffect(() => {
    if (!authToken || !profile || profileSection !== "orders") return;
    let active = true;
    setOrdersLoading(true);
    setOrdersError("");
    api.orders.list(authToken)
      .then((result) => {
        if (active) setOrders(result);
      })
      .catch((error: unknown) => {
        if (active) setOrdersError(error instanceof Error ? error.message : "Не удалось загрузить заказы");
      })
      .finally(() => {
        if (active) setOrdersLoading(false);
      });
    return () => { active = false; };
  }, [authToken, profile, profileSection, ordersAttempt]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 1500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let active = true;
    setCategoriesLoading(true);
    setCategoriesError("");
    api.aliexpress.dropshippingCategories({ language: language === "ru" ? "ru" : "en" })
      .then((payload) => {
        if (!active) return;
        const liveCategories = mapMarketplaceCategories(payload);
        setCategories(liveCategories);
        setCategoriesError(liveCategories.length ? "" : text.noGoods);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setCategoriesError(error instanceof Error
          ? error.message
          : language === "en" ? "Could not load AliExpress categories." : language === "uz" ? "AliExpress kategoriyalarini yuklab bo‘lmadi." : "Не удалось загрузить категории AliExpress.");
      })
      .finally(() => {
        if (active) setCategoriesLoading(false);
      });
    return () => { active = false; };
  }, [language, catalogAttempt]);

  useEffect(() => {
    if (!detailProduct) {
      setDetailPayload(null);
      setDetailError("");
      setDetailLoading(false);
      return;
    }

    let active = true;
    setDetailPayload(null);
    setDetailError("");
    setDetailLoading(true);
    api.aliexpress.productDetails(detailProduct.id, {
      ship_to_country: "UZ",
      target_currency: "USD",
      target_language: "ru_RU",
    })
      .then((payload) => {
        if (active) setDetailPayload(payload);
      })
      .catch((error: unknown) => {
        if (active) setDetailError(error instanceof Error ? error.message : "Не удалось загрузить данные товара");
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => { active = false; };
  }, [detailProduct, detailAttempt]);

  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    setCatalogError("");
    const timer = window.setTimeout(() => {
      const filters = {
        ...(search.trim() ? { keywords: search.trim() } : {}),
        ...(selectedCat !== "all" ? { category_ids: selectedCat } : {}),
        page_no: 1,
        page_size: 20,
        target_currency: "CNY",
      };
      const load = api.aliexpress.hotProducts(filters);
      load.then((payload) => {
        if (!active) return;
        const liveProducts = mapMarketplaceGoods(payload).map((product) => ({
          ...product,
          category: categories.find((category) => category.id === product.categoryId) ?? null,
        }));
        setProducts(liveProducts);
        setLiveCatalog(true);
        setCatalogLoading(false);
        setKnownProducts((current) => Array.from(new Map([...current, ...liveProducts].map((product) => [product.id, product])).values()).slice(-100));
      }).catch((error: unknown) => {
        if (!active) return;
        setCatalogLoading(false);
        setCatalogError(error instanceof Error
          ? error.message
          : language === "en" ? "Could not load AliExpress products." : language === "uz" ? "AliExpress mahsulotlarini yuklab bo‘lmadi." : "Не удалось загрузить товары AliExpress.");
      });
    }, search.trim() ? 400 : 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search, selectedCat, categories, language, catalogAttempt]);

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products.filter((product) => {
      const title = `${product.titleUz ?? ""} ${product.titleRu ?? ""}`.toLowerCase();
      const categoryName = `${product.category?.nameUz ?? ""} ${product.category?.nameRu ?? ""}`.toLowerCase();
      const matchesQuery = liveCatalog || !term || title.includes(term) || categoryName.includes(term);
      return matchesQuery;
    });
  }, [products, search, liveCatalog]);

  const catalogMessage = catalogLoading
    ? text.loading
    : catalogError || (visibleProducts.length === 0 ? text.noGoods : "");
  const hotProducts = products.filter((product) => product.status === "popular" || product.status === "sale");
  const saleProducts = products.filter((product) => product.status === "sale");
  const hotMessage = catalogLoading ? text.loading : catalogError || (hotProducts.length === 0 ? text.noGoods : "");
  const saleMessage = catalogLoading ? text.loading : catalogError || (saleProducts.length === 0 ? text.noGoods : "");

  const cartEntryList = knownProducts.filter((product) => cartItems[product.id]);
  const cartCount = cartEntryList.reduce((sum, product) => sum + (cartItems[product.id] ?? 0), 0);
  const subtotal = cartEntryList.reduce((sum, product) => sum + product.priceMinor * (cartItems[product.id] ?? 0), 0);
  const shipping = subtotal > 0 ? 35_000 * 100 : 0;
  const discount = appliedPromo === "SAVE10" && subtotal >= MIN_PROMO_SUBTOTAL
    ? Math.round(subtotal * 0.1)
    : 0;
  const total = subtotal + shipping - discount;

  const retryCatalog = () => setCatalogAttempt((attempt) => attempt + 1);
  const renderCatalogState = (message: string, canRetry: boolean) => (
    <div className="catalog-state" role={canRetry ? "alert" : "status"}>
      <span>{message}</span>
      {canRetry && <button type="button" onClick={retryCatalog}>{text.retry}</button>}
    </div>
  );

  const goTo = (nextView: View, message?: string) => {
    setView(nextView);
    if (message) setNotice(message);
  };

  const handleAddToCart = (productId: string) => {
    setCartItems((items) => ({ ...items, [productId]: (items[productId] ?? 0) + 1 }));
    setNotice("Товар добавлен в корзину");
  };

  const toggleFavorite = (productId: string) => {
    const isSaved = liked.includes(productId);
    setLiked((items) => isSaved ? items.filter((id) => id !== productId) : [...items, productId]);
    setNotice(isSaved ? "Товар удалён из избранного" : "Товар добавлен в избранное");
  };

  const openProductDetails = (product: ApiProduct) => {
    setDetailProduct(product);
  };

  const applyPromo = () => {
    const code = promo.trim().toUpperCase();
    if (code !== "SAVE10") {
      setAppliedPromo("");
      setNotice(code ? "Промокод не найден" : "Введите промокод");
      return;
    }
    if (subtotal < MIN_PROMO_SUBTOTAL) {
      setAppliedPromo("");
      setNotice("SAVE10 действует для заказа от 500 000 сум");
      return;
    }
    setAppliedPromo(code);
    setNotice("Промокод SAVE10 применён");
  };

  const handleQtyChange = (productId: string, delta: number) => {
    setCartItems((items) => {
      const nextQty = (items[productId] ?? 0) + delta;
      if (nextQty <= 0) {
        const { [productId]: _, ...rest } = items;
        return rest;
      }
      return { ...items, [productId]: nextQty };
    });
  };

  const establishFirebaseSession = async (user: FirebaseUser) => {
    if (!user.emailVerified) {
      await sendEmailVerification(user);
      setVerificationPending(true);
      setAuthNotice(`Мы отправили ссылку подтверждения на ${user.email ?? authEmail}. Подтвердите адрес и нажмите «Я подтвердил email».`);
      return;
    }
    const result = await api.auth.firebase(await getIdToken(user, true));
    localStorage.setItem("uriona-access-token", result.accessToken);
    setAuthToken(result.accessToken);
    setProfile(result.user);
    setProfileForm({ name: result.user.name ?? "", email: result.user.email ?? user.email ?? "", phone: result.user.phone ?? "", city: result.user.city ?? "", address: result.user.address ?? "" });
    setVerificationPending(false);
    setAuthNotice("");
    setNotice("Вход выполнен");
  };

  const submitAuth = async () => {
    if (!firebaseAuth) {
      setAuthNotice("Firebase ещё не настроен. Добавьте параметры веб-приложения Firebase в окружение frontend.");
      return;
    }
    setProfileBusy(true);
    setAuthNotice("");
    try {
      if (authMode === "register") {
        const credential = await createUserWithEmailAndPassword(firebaseAuth, authEmail.trim(), authPassword);
        await sendEmailVerification(credential.user);
        setVerificationPending(true);
        setAuthNotice(`Аккаунт создан. Подтвердите email по ссылке, отправленной на ${credential.user.email ?? authEmail}. После этого нажмите «Я подтвердил email».`);
      } else {
        const credential = await signInWithEmailAndPassword(firebaseAuth, authEmail.trim(), authPassword);
        if (!credential.user.emailVerified) {
          await sendEmailVerification(credential.user);
          setVerificationPending(true);
          setAuthNotice(`Сначала подтвердите email по ссылке, отправленной на ${credential.user.email ?? authEmail}.`);
        } else {
          await establishFirebaseSession(credential.user);
        }
      }
    } catch (error) {
      setAuthNotice(firebaseErrorMessage(error));
    } finally { setProfileBusy(false); }
  };

  const checkEmailVerification = async () => {
    if (!firebaseAuth?.currentUser) {
      setAuthNotice("Войдите снова после подтверждения email.");
      setVerificationPending(false);
      return;
    }
    setProfileBusy(true);
    setAuthNotice("");
    try {
      await reload(firebaseAuth.currentUser);
      const user = firebaseAuth.currentUser;
      if (!user.emailVerified) {
        setAuthNotice("Подтверждение пока не найдено. Откройте ссылку из письма, затем попробуйте ещё раз.");
        return;
      }
      await establishFirebaseSession(user);
    } catch (error) {
      setAuthNotice(firebaseErrorMessage(error));
    } finally { setProfileBusy(false); }
  };

  const resendVerificationEmail = async () => {
    if (!firebaseAuth?.currentUser) {
      setAuthNotice("Сессия регистрации завершена. Войдите в аккаунт, чтобы запросить письмо ещё раз.");
      return;
    }
    setProfileBusy(true);
    setAuthNotice("");
    try {
      await sendEmailVerification(firebaseAuth.currentUser);
      setAuthNotice(`Письмо отправлено повторно на ${firebaseAuth.currentUser.email ?? authEmail}.`);
    } catch (error) {
      setAuthNotice(firebaseErrorMessage(error));
    } finally { setProfileBusy(false); }
  };

  const returnToLogin = async () => {
    try {
      if (firebaseAuth) await signOut(firebaseAuth);
      setVerificationPending(false);
      setAuthNotice("");
      setAuthMode("login");
    } catch (error) {
      setAuthNotice(firebaseErrorMessage(error));
    }
  };

  const logout = async () => {
    localStorage.removeItem("uriona-access-token");
    setAuthToken("");
    setProfile(null);
    if (!firebaseAuth) return;
    try {
      await signOut(firebaseAuth);
    } catch (error) {
      setNotice(firebaseErrorMessage(error));
    }
  };

  const submitPasswordReset = async () => {
    if (!firebaseAuth) {
      setAuthNotice("Firebase ещё не настроен. Добавьте параметры веб-приложения Firebase в окружение frontend.");
      return;
    }
    setProfileBusy(true);
    setAuthNotice("");
    try {
      await sendPasswordResetEmail(firebaseAuth, authEmail.trim());
      setAuthNotice("Если аккаунт с таким email существует, на него отправлена ссылка для сброса пароля.");
    } catch (error) {
      setAuthNotice(firebaseErrorMessage(error));
    } finally { setProfileBusy(false); }
  };

  const saveProfile = async () => {
    if (!authToken) return;
    setProfileBusy(true);
    try {
      const updated = await api.auth.updateProfile(authToken, {
        name: profileForm.name,
        phone: profileForm.phone,
        city: profileForm.city,
        address: profileForm.address,
        language,
      });
      setProfile(updated);
      setNotice("Профиль сохранён");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Не удалось сохранить профиль");
    } finally { setProfileBusy(false); }
  };

  const renderHome = () => (
    <>
      <section className="hero-section">
        <div className="hero-copy">
          <div className="eyebrow"><Zap size={16} />{text.best}</div>
          <h1>{text.heroTitle}<br /><em>{text.heroAccent}</em></h1>
          <p>{text.heroText}</p>
          <div className="hero-actions">
            <button type="button" className="primary-btn" onClick={() => goTo("Категории", "Каталог открыт")}>
              {text.start} <ChevronRight size={18} />
            </button>
            <button type="button" className="secondary-btn" onClick={() => setNotice("Как это работает — скоро")}>Как это работает</button>
          </div>
          <div className="trust-row">
            <span><ShieldCheck size={15} />{text.safe}</span>
            <span><Truck size={15} />{text.deliveryUz}</span>
          </div>
        </div>

        <div className="hero-card">
          <span className="sale-tag">URIONA</span>
          <div className="hero-visual">
            <ShoppingBag size={72} />
            <strong>{text.catalog}</strong>
            <small>{catalogLoading ? text.loadingCatalog : catalogError ? text.apiError : liveCatalog ? "AliExpress" : text.noGoods}</small>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-head">
          <div>
            <small>{text.categoriesQuick}</small>
            <h2>{text.categories}</h2>
          </div>
          <button type="button" onClick={() => goTo("Категории", text.allCategories)}>{text.allCategories} <ChevronRight size={16} /></button>
        </div>

        <div className="category-grid">
          {categories.length === 0 && renderCatalogState(categoriesLoading ? text.loadingCatalog : categoriesError || text.noGoods, !categoriesLoading && Boolean(categoriesError))}
          {topLevelCategories.slice(0, 8).map((category, index) => (
            <button
              key={category.id}
              type="button"
              className={`category-item ${selectedCat === category.id ? "active" : ""}`}
              onClick={() => {
                setSelectedCat(selectedCat === category.id ? "all" : category.id);
                goTo("Категории", `${category.nameRu} выбрана`);
              }}
            >
              <span className={`category-icon c${index % 8}`}>◇</span>
              <b>{category.nameRu}</b>
            </button>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div className="section-head">
          <div>
            <small>{text.best}</small>
            <h2>{text.popular}</h2>
          </div>
          <button type="button" onClick={() => goTo("Категории", text.catalog)}>{text.seeAll} <ChevronRight size={16} /></button>
        </div>

        <div className="product-grid">
          {catalogMessage ? renderCatalogState(catalogMessage, Boolean(catalogError)) : visibleProducts.slice(0, 8).map((product, index) => {
            const isLiked = liked.includes(product.id);
            const price = formatUzs(product.priceMinor);
            const tag = product.status === "sale" ? "Скидка" : product.status === "popular" ? "Популярно" : "Новинка";

            return (
              <article key={product.id} className="product-card">
                <div className={`product-media media-${index % 5}`}>
                  {product.imageUrl && <img src={product.imageUrl} alt={product.titleRu || product.titleUz} loading="lazy" />}
                  <span className="product-tag">{tag}</span>
                  <button
                    type="button"
                    className={`wish-btn ${isLiked ? "active" : ""}`}
                    onClick={() => toggleFavorite(product.id)}
                    aria-label={isLiked ? "Удалить из избранного" : "Добавить в избранное"}
                  >
                    <Heart size={15} fill={isLiked ? "currentColor" : "none"} />
                  </button>
                </div>

                <div className="product-body">
                  <span className="product-category">{product.category?.nameRu || "Категория"}</span>
                  <h3>{product.titleRu || product.titleUz}</h3>
                  <p>{product.descriptionRu || product.descriptionUz}</p>
                  <button type="button" className="product-details-btn" onClick={() => void openProductDetails(product)}>Подробнее</button>
                  <div className="price-row">
                    <div>
                      <strong>{price}</strong>
                      <small>Доставка от 1-3 дней</small>
                    </div>
                    <button type="button" className="mini-cart" onClick={() => handleAddToCart(product.id)}>
                      <ShoppingBag size={14} />Купить
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="low-grid">
        <div className="info-card">
          <small>Платежи</small>
          <h3>UZCARD / HUMO</h3>
          <p>Готово к оплате местными картами и будущим провайдерам.</p>
        </div>
        <div className="info-card accent">
          <small>Доставка</small>
          <h3>Посылки из Китая</h3>
          <p>Проверка, сборка и отслеживание по пути до Ташкента.</p>
        </div>
      </section>
    </>
  );

  const renderCatalog = () => (
    <section className="screen-panel">
      <div className="section-head panel-head">
        <div>
          <small>Каталог</small>
          <h2>Категории</h2>
        </div>
        <span className="category-total">{categoryUiLabel("count", categories.length)}</span>
      </div>

      <div className="category-browser-controls">
        <label className="category-search">
          <Search size={17} />
          <input
            value={categorySearch}
            onChange={(event) => setCategorySearch(event.target.value)}
            placeholder={categoryUiLabel("search")}
            aria-label={categoryUiLabel("search")}
          />
          {categorySearch && <button type="button" onClick={() => setCategorySearch("")} aria-label={categoryUiLabel("clearSearch")}><X size={16} /></button>}
        </label>
        {categorySearch ? (
          <button className="category-back-btn" type="button" onClick={() => setCategorySearch("")}>
            {categoryUiLabel("all")}
          </button>
        ) : categoryParentId ? (
          <div className="category-breadcrumbs">
            <button type="button" onClick={() => setCategoryParentId(null)}>{localizeText("Все категории", language)}</button>
            {categoryPath.map((category) => (
              <span key={category.id}>
                <ChevronRight size={14} />
                <button type="button" onClick={() => setCategoryParentId(category.id)}>{categoryLabel(category)}</button>
              </span>
            ))}
            <button className="category-back-btn" type="button" onClick={() => setCategoryParentId(categoryPath.length > 1 ? categoryPath[categoryPath.length - 2].id : null)}>
              <ChevronRight size={14} className="back-chevron" />{categoryUiLabel("back")}
            </button>
          </div>
        ) : null}
      </div>

      <div className="category-grid large-grid category-browser-grid">
        {categories.length === 0 && renderCatalogState(categoriesLoading ? text.loadingCatalog : categoriesError || text.noGoods, !categoriesLoading && Boolean(categoriesError))}
        {browsedCategories.map((category, index) => {
          const children = categoryChildren.get(category.id) ?? [];
          const isSelected = selectedCat === category.id;
          return (
            <article key={category.id} className={`category-browser-card ${isSelected ? "selected" : ""}`}>
              <button
                type="button"
                className={`category-item ${isSelected ? "active" : ""}`}
                onClick={() => {
                  if (categorySearch || children.length === 0) {
                    setSelectedCat(category.id);
                    setNotice(`${categoryLabel(category)} активна`);
                    if (categorySearch) setCategorySearch("");
                  } else {
                    setCategoryParentId(category.id);
                  }
                }}
              >
                <span className={`category-icon c${index % 8}`}>◇</span>
                <b>{categoryLabel(category)}</b>
                {children.length > 0 && <small>{categoryUiLabel("subcategories", children.length)}</small>}
              </button>
              <button
                type="button"
                className="category-select-btn"
                onClick={() => {
                  setSelectedCat(category.id);
                  setNotice(`${categoryLabel(category)} активна`);
                }}
              >
                {categoryUiLabel(isSelected ? "selected" : "select")}
              </button>
            </article>
          );
        })}
        {!categoriesLoading && categories.length > 0 && browsedCategories.length === 0 && (
          <p className="category-empty-state" role="status">{categorySearch ? categoryUiLabel("noResults") : text.emptyCategories}</p>
        )}
      </div>

      {products.length === 0 && !catalogLoading ? (
        <p className="catalog-source-note" role="status">{categoryUiLabel("productsComing")}</p>
      ) : products.length > 0 ? (
        <>
          <div className="section-head panel-head">
            <div>
              <small>Товары</small>
              <h2>{selectedCat === "all" ? "Все товары" : categoryLabel(categories.find((item) => item.id === selectedCat))}</h2>
            </div>
          </article>
        ))}
      </div>
  const [categoryParentId, setCategoryParentId] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState("");
    </section>
  );

  const renderChinaGoods = () => (
    <section className="screen-panel">
      <div className="section-head panel-head">
        <div>
          <small>Международный каталог</small>
          <h2>Горячие товары</h2>
        </div>
        <button type="button" onClick={() => setSelectedCat("all")}>Показать всё</button>
      </div>

      <div className="product-grid compact-grid">
        {hotMessage ? renderCatalogState(hotMessage, Boolean(catalogError)) : hotProducts.map((product, index) => (
            <article key={product.id} className="product-card compact-card">
              <div className={`product-media media-${index % 5}`}>
                {product.imageUrl && <img src={product.imageUrl} alt={product.titleRu || product.titleUz} loading="lazy" />}
                <span className="product-tag">{product.status === "sale" ? "Скидка" : "Популярно"}</span>
              </div>
              <div className="product-body">
                <span className="product-category">{product.category?.nameRu}</span>
                <h3>{product.titleRu}</h3>
                <button type="button" className="product-details-btn" onClick={() => void openProductDetails(product)}>Подробнее</button>
                <div className="price-row">
                  <strong>{formatUzs(product.priceMinor)}</strong>
                  <button type="button" className="mini-cart" onClick={() => handleAddToCart(product.id)}><Plus size={14} />Добавить</button>
                </div>
              </div>
            </article>
          ))}
      </div>
    </section>
  );

  const renderSales = () => (
    <section className="screen-panel">
      <div className="section-head panel-head">
        <div>
          <small>Скидки</small>
          <h2>Акции недели</h2>
        </div>
      </div>

      <div className="info-card accent" style={{ marginBottom: 18 }}>
        <small>Спецпредложение</small>
        <h3>Скидка до 50% на популярные категории</h3>
        <p>Тестовый промокод SAVE10 действует на заказы от 500 000 сум.</p>
      </div>

      <div className="product-grid compact-grid">
        {saleMessage ? renderCatalogState(saleMessage, Boolean(catalogError)) : saleProducts.map((product, index) => (
          <article key={product.id} className="product-card compact-card">
            <div className={`product-media media-${index % 5}`}>
              {product.imageUrl && <img src={product.imageUrl} alt={product.titleRu || product.titleUz} loading="lazy" />}
              <span className="product-tag">Скидка</span>
            </div>
            <div className="product-body">
              <span className="product-category">{product.category?.nameRu}</span>
              <h3>{product.titleRu}</h3>
              <button type="button" className="product-details-btn" onClick={() => void openProductDetails(product)}>Подробнее</button>
              <div className="price-row">
                <strong>{formatUzs(product.priceMinor)}</strong>
                <button type="button" className="mini-cart" onClick={() => handleAddToCart(product.id)}><Plus size={14} />Купить</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );

  const renderHowToOrder = () => (
    <section className="screen-panel">
      <div className="section-head panel-head">
        <div>
          <small>Как заказать</small>
          <h2>3 простых шага</h2>
        </div>
      </div>

      <div className="profile-list">
        <div className="profile-item"><span>1. Выберите товар</span><b>Откройте каталог или подборки</b></div>
        <div className="profile-item"><span>2. Добавьте в корзину</span><b>Проверьте цену и количество</b></div>
        <div className="profile-item"><span>3. Оформите заказ</span><b>Оплата и доставка в Узбекистан</b></div>
      </div>
    </section>
  );

  const renderDelivery = () => (
    <section className="screen-panel">
      <div className="section-head panel-head">
        <div>
          <small>Доставка</small>
          <h2>Как мы доставляем</h2>
        </div>
      </div>

      <div className="low-grid">
        <div className="info-card">
          <small>Срок</small>
          <h3>От 7 до 21 дня</h3>
          <p>Зависит от продавца, типа товара и логистики до Ташкента.</p>
        </div>
        <div className="info-card accent">
          <small>Отслеживание</small>
          <h3>По треку и статусам</h3>
          <p>Получаете уведомления о перемещении посылки и готовности к выдаче.</p>
        </div>
      </div>
    </section>
  );

  const renderSupport = () => (
    <section className="screen-panel">
      <div className="section-head panel-head">
        <div>
          <small>Поддержка</small>
          <h2>Центр помощи</h2>
        </div>
      </div>
      <div className="profile-help">
        <details><summary>Как оформить заказ?</summary><p>Добавьте доступные товары в корзину и перейдите к оформлению. Сейчас оформление и приём оплаты ещё не подключены.</p></details>
        <details><summary>Где посмотреть статус заказа?</summary><p>Статус оформленного заказа будет доступен в профиле, в разделе «Мои заказы».</p></details>
        <details><summary>Почему каталог может быть недоступен?</summary><p>Каталог зависит от разрешений AliExpress Open Platform. При отказе API Uriona показывает сообщение и кнопку повтора запроса.</p></details>
        <div className="profile-help-actions">
          <button type="button" className="secondary-btn" onClick={() => goTo("Профиль")}>Открыть профиль</button>
          <button type="button" className="secondary-btn" onClick={() => goTo("Корзина")}>Открыть корзину</button>
        </div>
        <p className="profile-hint">Контактный канал поддержки пока не настроен. Здесь не указан фиктивный телефон или неработающий чат.</p>
      </div>
    </section>
  );

  const renderCart = () => (
    <section className="screen-panel">
      <div className="section-head panel-head">
        <div>
          <small>Корзина</small>
          <h2>Ваш заказ</h2>
        </div>
        <span className="pill-count">{cartCount} шт.</span>
      </div>

      {cartEntryList.length === 0 ? (
        <div className="empty-state">
          <ShoppingBag size={38} />
          <h3>{text.emptyCart}</h3>
          <p>{text.addFromCatalog}</p>
          <button type="button" className="primary-btn" onClick={() => goTo("Категории", "Каталог открыт")}>{text.shop}</button>
        </div>
      ) : (
        <>
          <div className="cart-list">
            {cartEntryList.map((product) => (
              <div key={product.id} className="cart-item">
                <div className="cart-thumb">
                  {product.imageUrl && <img src={product.imageUrl} alt="" loading="lazy" />}
                </div>
                <div className="cart-copy">
                  <h3>{product.titleRu}</h3>
                  <p>{formatUzs(product.priceMinor)}</p>
                </div>
                <div className="qty-control">
                  <button type="button" onClick={() => handleQtyChange(product.id, -1)}><Minus size={14} /></button>
                  <span>{cartItems[product.id] ?? 0}</span>
                  <button type="button" onClick={() => handleQtyChange(product.id, 1)}><Plus size={14} /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="promo-box">
            <label htmlFor="promo-code">Промокод</label>
            <div className="promo-row">
              <input
                id="promo-code"
                value={promo}
                onChange={(event) => {
                  setPromo(event.target.value);
                  setAppliedPromo("");
                }}
                placeholder="SAVE10"
              />
              <button type="button" onClick={applyPromo}>Применить</button>
            </div>
          </div>

          <div className="totals">
            <div><span>Товары</span><b>{formatUzs(subtotal)}</b></div>
            <div><span>Доставка</span><b>{formatUzs(shipping)}</b></div>
            <div><span>Скидка</span><b>-{formatUzs(discount)}</b></div>
            <div className="grand"><span>Итого</span><b>{formatUzs(total)}</b></div>
          </div>

          <button type="button" className="primary-btn checkout-btn" onClick={() => setNotice("Оформление заказа ещё не подключено")}>
            Перейти к оформлению <ArrowRight size={18} />
          </button>
          <p className="checkout-note">Оформление заказа пока недоступно.</p>
        </>
      )}
    </section>
  );

  const renderProfile = () => {
    const savedProducts = liked.flatMap((id) => {
      const product = knownProducts.find((item) => item.id === id);
      return product ? [product] : [];
    });
    const unavailableFavorites = liked.length - savedProducts.length;
    const visibleOrders = orders.filter((order) => {
      const isArchived = order.status === "DELIVERED" || order.status === "CANCELLED";
      return orderFilter === "all" || (orderFilter === "archive" ? isArchived : !isArchived);
    });
    const activeOrderCount = orders.filter((order) => order.status !== "DELIVERED" && order.status !== "CANCELLED").length;
    const orderDate = (value: string) => {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? "Дата не указана" : new Intl.DateTimeFormat(language === "uz" ? "uz-UZ" : language === "en" ? "en-US" : "ru-RU", { dateStyle: "medium" }).format(date);
    };
    const profileMenuItems: Array<{ key: typeof profileSection; label: string; Icon: typeof UserRound }> = [
      { key: "overview", label: "Обзор", Icon: UserRound },
      { key: "orders", label: "Мои заказы", Icon: Package },
      { key: "wishlist", label: "Избранное", Icon: Heart },
      { key: "stores", label: "Любимые магазины", Icon: Store },
      { key: "reviews", label: "Мои отзывы", Icon: Star },
      { key: "questions", label: "Вопросы и ответы", Icon: HelpCircle },
      { key: "coupons", label: "Купоны", Icon: Ticket },
      { key: "addresses", label: "Адреса доставки", Icon: MapPin },
      { key: "payments", label: "Способы оплаты", Icon: CreditCard },
      { key: "settings", label: "Настройки", Icon: ShieldCheck },
      { key: "support", label: "Служба поддержки", Icon: MessageCircle },
    ];
    return (
    <section className="screen-panel">
      {!profile ? (
        <div className="auth-panel">
          <div className="profile-header">
            <div className="profile-avatar"><LogoMark /></div>
            <div><small>Личный кабинет</small><h2>{verificationPending ? "Подтвердите email" : authMode === "login" ? "Войти в URIONA" : authMode === "register" ? "Создать аккаунт" : "Сбросить пароль"}</h2></div>
          </div>
          {verificationPending ? (
            <>
              <p className="profile-intro">Для защиты аккаунта подтвердите адрес электронной почты по ссылке в письме. До подтверждения доступ к профилю и заказам не выдаётся.</p>
              <div className="profile-actions">
                <button type="button" className="primary-btn" disabled={profileBusy} onClick={() => void checkEmailVerification()}>Я подтвердил email</button>
                <button type="button" className="secondary-btn" disabled={profileBusy} onClick={() => void resendVerificationEmail()}>Отправить письмо ещё раз</button>
                <button type="button" className="secondary-btn" disabled={profileBusy} onClick={() => void returnToLogin()}>Вернуться ко входу</button>
              </div>
            </>
          ) : (
            <>
              <p className="profile-intro">{authMode === "login" ? "Войдите, чтобы управлять заказами, адресами и избранным." : authMode === "register" ? "Создайте аккаунт. Для завершения регистрации нужно подтвердить email." : "Укажите email — отправим ссылку для создания нового пароля."}</p>
              <form className="auth-form" onSubmit={(event) => { event.preventDefault(); void (authMode === "reset" ? submitPasswordReset() : submitAuth()); }}>
                <label>Email<input type="email" autoComplete="email" required value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="name@example.com" /></label>
                {authMode !== "reset" && <label>Пароль<input type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} minLength={8} required value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="Минимум 8 символов" /></label>}
                <div className="profile-actions">
                  <button type="submit" className="primary-btn" disabled={profileBusy || !firebaseConfigReady || !authEmail || (authMode !== "reset" && authPassword.length < 8)}>{profileBusy ? "Подождите…" : authMode === "login" ? "Войти" : authMode === "register" ? "Зарегистрироваться" : "Отправить ссылку"}</button>
                  {authMode === "login" && <button type="button" className="secondary-btn" onClick={() => { setAuthMode("register"); setAuthNotice(""); }}>Создать аккаунт</button>}
                  {authMode === "register" && <button type="button" className="secondary-btn" onClick={() => { setAuthMode("login"); setAuthNotice(""); }}>Уже есть аккаунт</button>}
                  {authMode === "reset" && <button type="button" className="secondary-btn" onClick={() => { setAuthMode("login"); setAuthNotice(""); }}>Вернуться ко входу</button>}
                </div>
              </form>
              {authMode === "login" && <button type="button" className="auth-link" onClick={() => { setAuthMode("reset"); setAuthNotice(""); }}>Забыли пароль?</button>}
              {!firebaseConfigReady && <p className="auth-message error" role="alert">Firebase не настроен для этого сайта: кнопки входа временно отключены. Нужны настройки Web App из Firebase Console и включённый метод Email/Password.</p>}
            </>
          )}
          {authNotice && <p className="auth-message" role="status">{authNotice}</p>}
        </div>
      ) : (
  const categoryChildren = useMemo(() => {
    const byParent = new Map<string, ApiCategory[]>();
    for (const category of categories) {
      const key = category.parentId ?? "root";
      const siblings = byParent.get(key) ?? [];
      siblings.push(category);
      byParent.set(key, siblings);
    }
    return byParent;
  }, [categories]);
  const topLevelCategories = categoryChildren.get("root") ?? categories;
  const categoryPath = useMemo(() => {
    const path: ApiCategory[] = [];
    const visited = new Set<string>();
    let category = categories.find((item) => item.id === categoryParentId);
    while (category && !visited.has(category.id)) {
      visited.add(category.id);
      path.unshift(category);
      const parentId = category.parentId;
      category = parentId ? categories.find((item) => item.id === parentId) : undefined;
    }
    return path;
  }, [categories, categoryParentId]);
  const browsedCategories = useMemo(() => {
    const term = categorySearch.trim().toLocaleLowerCase();
    if (term) {
      return categories.filter((category) =>
        `${category.nameRu} ${category.nameUz}`.toLocaleLowerCase().includes(term)
      );
    }
    return categoryChildren.get(categoryParentId ?? "root") ?? [];
  }, [categories, categoryChildren, categoryParentId, categorySearch]);

        <>
          <div className="profile-header">
            <div className="profile-avatar"><LogoMark /></div>
            <div><small>Личный кабинет</small><h2>{profileForm.name || profileForm.email}</h2><span className="profile-email">{profileForm.email}</span></div>
          </div>
          <div className="profile-layout">
            <nav className="profile-menu" aria-label="Разделы профиля">
              {profileMenuItems.map(({ key, label, Icon: MenuIcon }) => {
                return <button key={key} type="button" className={profileSection === key ? "active" : ""} onClick={() => setProfileSection(key)}><MenuIcon size={17} />{label}</button>;
              })}
              <button type="button" className="profile-logout" onClick={() => void logout()}><X size={17} />Выйти</button>
            </nav>
            <div className="profile-content">
              {profileSection === "overview" && <>
                <div className="mini-grid">
                  <button type="button" className="mini-tile" onClick={() => setProfileSection("orders")}><Package size={18} /><span>Активные заказы</span><b>{activeOrderCount}</b></button>
                  <button type="button" className="mini-tile" onClick={() => setProfileSection("payments")}><CreditCard size={18} /><span>Оплата</span><b>Настроить</b></button>
                  <button type="button" className="mini-tile" onClick={() => setProfileSection("wishlist")}><Heart size={18} /><span>Избранное</span><b>{liked.length}</b></button>
                </div>
                <div className="profile-section-heading"><div><small>Ваш аккаунт</small><h3>Личные данные</h3></div><ShieldCheck size={22} /></div>
                <div className="profile-form">
                  <label>Имя<input value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} placeholder="Ваше имя" /></label>
                  <label>Email<input type="email" value={profileForm.email} readOnly /></label>
                  <label>Телефон<input type="tel" value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} placeholder="Добавить номер позже" /></label>
  const categoryUiLabel = (key: "count" | "search" | "clearSearch" | "all" | "back" | "select" | "selected" | "subcategories" | "noResults" | "productsComing", count = 0) => {
    const labels = {
      ru: {
        count: `Категорий: ${count}`, search: "Поиск по всем категориям AliExpress", all: "Все 548 категорий",
        clearSearch: "Очистить поиск",
        back: "Назад", select: "Выбрать категорию", selected: "Выбрана", subcategories: `Подкатегорий: ${count}`,
        noResults: "Категории не найдены", productsComing: "Товары в этих категориях подключим следующим этапом.",
      },
      en: {
        count: `Categories: ${count}`, search: "Search all AliExpress categories", all: "All 548 categories",
        clearSearch: "Clear search",
        back: "Back", select: "Select category", selected: "Selected", subcategories: `Subcategories: ${count}`,
        noResults: "No categories found", productsComing: "Products in these categories will be connected in the next step.",
      },
      uz: {
        count: `Kategoriyalar: ${count}`, search: "Barcha AliExpress kategoriyalaridan qidirish", all: "Barcha 548 kategoriya",
        clearSearch: "Qidiruvni tozalash",
        back: "Orqaga", select: "Kategoriyani tanlash", selected: "Tanlangan", subcategories: `Quyi kategoriyalar: ${count}`,
        noResults: "Kategoriyalar topilmadi", productsComing: "Bu kategoriyalardagi mahsulotlar keyingi bosqichda ulanadi.",
      },
    } as const;
    return labels[language][key];
  };
                  <label>Город<input value={profileForm.city} onChange={(event) => setProfileForm({ ...profileForm, city: event.target.value })} placeholder="Ташкент" /></label>
                  <label>Адрес доставки<textarea value={profileForm.address} onChange={(event) => setProfileForm({ ...profileForm, address: event.target.value })} placeholder="Улица, дом, квартира" rows={3} /></label>
                </div>
                <div className="profile-actions"><button type="button" className="primary-btn" disabled={profileBusy} onClick={() => void saveProfile()}>Сохранить профиль</button></div>
              </>}
              {profileSection === "orders" && <>
                <div className="profile-section-heading"><div><small>История покупок</small><h3>Мои заказы</h3></div><button type="button" className="text-action" onClick={() => setOrdersAttempt((attempt) => attempt + 1)} disabled={ordersLoading}>Обновить</button></div>
                <div className="profile-filter-row" role="group" aria-label="Фильтр заказов">
                  {(["all", "active", "archive"] as const).map((filter) => <button type="button" key={filter} className={orderFilter === filter ? "active" : ""} aria-pressed={orderFilter === filter} onClick={() => setOrderFilter(filter)}>{filter === "all" ? "Все" : filter === "active" ? "Активные" : "Архив"}</button>)}
                </div>
                {ordersLoading ? <div className="profile-empty"><Package size={30} /><p>Загружаем заказы…</p></div>
                  : ordersError ? <div className="profile-empty" role="alert"><Package size={30} /><h3>Не удалось загрузить заказы</h3><p>{ordersError}</p><button type="button" className="secondary-btn" onClick={() => setOrdersAttempt((attempt) => attempt + 1)}>Повторить</button></div>
                  : visibleOrders.length === 0 ? <div className="profile-empty"><Package size={30} /><h3>{orders.length ? "В этом разделе пока нет заказов" : "Заказов пока нет"}</h3><p>Оформленные покупки и их статусы появятся здесь.</p><button type="button" className="secondary-btn" onClick={() => goTo("Каталог")}>Перейти в каталог</button></div>
                  : <div className="profile-order-list">{visibleOrders.map((order) => (
                    <article className="profile-order-card" key={order.id}>
                      <div className="profile-order-top"><div><small>Заказ {order.id.slice(0, 8)}</small><time>{orderDate(order.createdAt)}</time></div><span className={`order-status status-${order.status.toLowerCase()}`}>{orderStatusLabels[order.status] ?? order.status}</span></div>
                      <div className="profile-order-items">{order.items.map((item) => <div className="profile-order-item" key={item.id}>
                        {item.product?.imageUrl ? <img src={item.product.imageUrl} alt="" loading="lazy" /> : <span className="order-item-placeholder"><ShoppingBag size={16} /></span>}
                        <span>{item.product?.titleRu || item.product?.titleUz || `Товар ${item.productId.slice(0, 8)}`}</span><b>× {item.quantity}</b>
                      </div>)}</div>
                      <div className="profile-order-bottom"><span>{order.deliveryAddress}</span><b>{formatUzs(order.totalMinor)}</b></div>
                    </article>
                  ))}</div>}
              </>}
              {profileSection === "wishlist" && <>
                <div className="profile-section-heading"><div><small>Сохранённые товары</small><h3>Избранное · {liked.length}</h3></div></div>
                {savedProducts.length ? <div className="product-grid compact-grid">{savedProducts.map((product, index) => (
                  <article className="product-card compact-card" key={product.id}>
                    <div className={`product-media media-${index % 5}`}>{product.imageUrl && <img src={product.imageUrl} alt={product.titleRu || product.titleUz} loading="lazy" />}</div>
                    <div className="product-body"><span className="product-category">{product.category?.nameRu || "Товар"}</span><h3>{product.titleRu || product.titleUz}</h3>
                      <div className="price-row"><strong>{formatUzs(product.priceMinor)}</strong><button type="button" className="mini-cart" onClick={() => handleAddToCart(product.id)}><ShoppingBag size={14} />В корзину</button></div>
                      <div className="profile-card-actions"><button type="button" onClick={() => openProductDetails(product)}>Подробнее</button><button type="button" onClick={() => toggleFavorite(product.id)}>Убрать</button></div>
                    </div>
                  </article>
                ))}</div> : <div className="profile-empty"><Heart size={30} /><h3>Избранное пока пусто</h3><p>Нажимайте на сердечко в карточке товара — товары сохранятся на этом устройстве.</p><button type="button" className="secondary-btn" onClick={() => goTo("Каталог")}>Найти товары</button></div>}
                {unavailableFavorites > 0 && <p className="profile-hint">{unavailableFavorites} сохранённых товаров сейчас отсутствуют в локальном каталоге. Когда каталог загрузится, они появятся здесь.</p>}
              </>}
              {profileSection === "stores" && <div className="profile-empty"><Store size={30} /><h3>Любимые магазины</h3><p>В текущем каталоге Uriona AliExpress не передаёт данные продавцов, необходимые для подписки на магазин. Раздел заработает после подтверждения доступа к данным магазинов.</p><button type="button" className="secondary-btn" onClick={() => goTo("Каталог")}>Вернуться в каталог</button></div>}
              {profileSection === "reviews" && <div className="profile-empty"><Star size={30} /><h3>Мои отзывы</h3><p>Отзывы можно оставить после доставки заказа. Публикация и хранение отзывов пока не подключены.</p><button type="button" className="secondary-btn" onClick={() => setProfileSection("orders")}>Мои заказы</button></div>}
              {profileSection === "questions" && <div className="profile-empty"><HelpCircle size={30} /><h3>Вопросы и ответы</h3><p>Вопросы продавцам и история ответов пока не подключены: для этого нужен разрешённый API продавцов и отдельный раздел товара.</p><button type="button" className="secondary-btn" onClick={() => goTo("Поддержка")}>Открыть справку</button></div>}
              {profileSection === "coupons" && <div className="profile-coupon">
                <div className="coupon-icon"><Ticket size={22} /></div><div><small>Купон Uriona</small><h3>SAVE10 · скидка 10%</h3><p>Действует на товары при сумме от 500 000 сум. Применение будет доступно в корзине.</p><button type="button" className="secondary-btn" onClick={() => { setPromo("SAVE10"); goTo("Корзина", "Промокод добавлен в корзину"); }}>Перейти в корзину</button></div>
              </div>}
              {profileSection === "addresses" && <>
                <div className="profile-section-heading"><div><small>Для оформления заказа</small><h3>Основной адрес доставки</h3></div><MapPin size={22} /></div>
                <div className="profile-form">
                  <label>Получатель<input value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} placeholder="Имя получателя" /></label>
                  <label>Телефон<input type="tel" value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} placeholder="+998" /></label>
                  <label>Город<input value={profileForm.city} onChange={(event) => setProfileForm({ ...profileForm, city: event.target.value })} placeholder="Ташкент" /></label>
                  <label>Улица, дом, квартира<textarea value={profileForm.address} onChange={(event) => setProfileForm({ ...profileForm, address: event.target.value })} placeholder="Улица, дом, квартира" rows={3} /></label>
                </div>
                <div className="profile-actions"><button type="button" className="primary-btn" disabled={profileBusy} onClick={() => void saveProfile()}>Сохранить адрес</button></div>
                <p className="profile-hint">Сейчас профиль поддерживает один основной адрес. Несколько адресов добавим вместе с оформлением заказа.</p>
              </>}
              {profileSection === "payments" && <div className="profile-empty"><CreditCard size={30} /><h3>Оплата картой пока не подключена</h3><p>Не вводите и не отправляйте данные банковской карты в профиль. Подключение UZCARD/HUMO появится после настройки платёжного провайдера.</p></div>}
              {profileSection === "settings" && <>
                <div className="profile-section-heading"><div><small>Персональные настройки</small><h3>Настройки аккаунта</h3></div><ShieldCheck size={22} /></div>
                <div className="profile-form">
                  <label>Email<input type="email" value={profileForm.email} readOnly /></label>
                  <label>Язык интерфейса<select value={language} onChange={(event) => setLanguage(event.target.value as Language)}><option value="ru">Русский</option><option value="uz">O‘zbekcha</option><option value="en">English</option></select></label>
                </div>
                <div className="profile-setting-row"><span>Тема оформления</span><button type="button" className="secondary-btn" onClick={() => setLightMode((mode) => !mode)}>{lightMode ? "Включить тёмную тему" : "Включить светлую тему"}</button></div>
                <p className="profile-hint">Язык и тема сохраняются на этом устройстве. Email используется для входа; смена пароля пока не подключена.</p>
              </>}
              {profileSection === "support" && <div className="profile-help">
                <div className="profile-section-heading"><div><small>Помощь по Uriona</small><h3>Частые вопросы</h3></div><MessageCircle size={22} /></div>
                <details><summary>Как найти товар?</summary><p>Откройте каталог и воспользуйтесь строкой поиска. Доступность реального каталога зависит от ответа AliExpress API.</p></details>
                <details><summary>Где проверить заказ?</summary><p>После оформления заказа его статус появится в разделе «Мои заказы» профиля.</p></details>
                <details><summary>Как сохранить товар?</summary><p>Нажмите на значок сердца на карточке товара. Избранное сохраняется в браузере на этом устройстве.</p></details>
                <details><summary>Как связаться с поддержкой?</summary><p>Контактный канал поддержки Uriona ещё не настроен. Мы не показываем фиктивный телефон или неработающий чат.</p></details>
                <button type="button" className="secondary-btn" onClick={() => goTo("Поддержка")}>Раздел помощи</button>
              </div>}
            </div>
          </div>
        </>
      )}
    </section>
    );
  };

  const renderMain = () => {
    if (view === "Главная") return renderHome();
    if (view === "Категории") return renderCatalog();
    if (view === "Каталог") return renderCatalog();
    if (view === "Международный каталог") return renderChinaGoods();
    if (view === "Скидки") return renderSales();
    if (view === "Как заказать") return renderHowToOrder();
    if (view === "Доставка") return renderDelivery();
    if (view === "Поддержка") return renderSupport();
    if (view === "Корзина") return renderCart();
    return renderProfile();
  };

  return (
    <div className={`app-shell ${lightMode ? "light-mode" : ""}`}>
      <header className="topbar">
        <div className="top-row">
          <div className="brand" aria-label="URIONA logo">
            <LogoMark className="brand-mark" />
            <span>URIONA</span>
          </div>

          <div className="location">
            <MapPin size={17} />
            <div>
              <small>Доставка в</small>
              <b>Ташкент</b>
            </div>
          </div>

          <div className="search-box">
            <Search size={18} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={text.search} />
            <button type="button" onClick={() => setNotice(search.trim() ? search.trim() : text.search)}>⌕</button>
          </div>

          <div className="utility-controls">
            <Languages size={16} />
            <select aria-label={text.lang} value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
              <option value="ru">RU</option><option value="en">EN</option><option value="uz">UZ</option>
            </select>
            <button type="button" className="theme-toggle" aria-label={lightMode ? text.dark : text.light} onClick={() => setLightMode((mode) => !mode)}>
              {lightMode ? <Moon size={17} /> : <Sun size={17} />}
            </button>
          </div>

          <button className="icon-btn" type="button" onClick={() => goTo("Профиль", "Профиль открыт")}>
            <UserRound size={20} />
            <span>{text.profile}</span>
          </button>

          <button className="icon-btn cart" type="button" onClick={() => goTo("Корзина", "Корзина открыта")}>
            <ShoppingBag size={20} />
            <span>{text.cart}</span>
            {cartCount > 0 && <i>{cartCount}</i>}
          </button>
        </div>

        <nav className="nav-menu" aria-label="Основное меню">
          {topMenuItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={item.view === view ? "active" : ""}
              onClick={() => {
                setSelectedCat("all");
                goTo(item.view, item.message);
              }}
            >
              {item.view === "Каталог" ? text.catalog : item.view === "Международный каталог" ? text.global : item.view === "Скидки" ? text.sales : item.view === "Как заказать" ? text.how : item.view === "Доставка" ? text.delivery : text.support}
            </button>
          ))}
        </nav>
      </header>

      <main className="page">{renderMain()}</main>

      {detailProduct && (
        <div className="product-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailProduct(null); }}>
          <section className="product-dialog" role="dialog" aria-modal="true" aria-labelledby="product-dialog-title">
            <button type="button" className="product-dialog-close" onClick={() => setDetailProduct(null)} aria-label="Закрыть"><X size={20} /></button>
            {(productDetails?.images[0] || detailProduct.imageUrl) && <img className="product-dialog-image" src={productDetails?.images[0] || detailProduct.imageUrl || undefined} alt={productDetails?.subject || detailProduct.titleRu || detailProduct.titleUz} />}
            <small>{detailProduct.category?.nameRu || "Товар AliExpress"}</small>
            <h2 id="product-dialog-title">{productDetails?.subject || detailProduct.titleRu || detailProduct.titleUz}</h2>
            <p>{productDetails?.description || detailProduct.descriptionRu || detailProduct.descriptionUz || (detailLoading ? "Загружаем описание товара…" : "Описание не предоставлено API.")}</p>
            <strong>{formatUzs(detailProduct.priceMinor)}</strong>
            <code>product_id: {detailProduct.id}</code>
            {detailLoading && <p className="product-detail-state" role="status">Загружаем данные AliExpress…</p>}
            {detailError && <div className="product-detail-state" role="alert"><span>{detailError}</span><button type="button" onClick={() => setDetailAttempt((attempt) => attempt + 1)}>Повторить</button></div>}
            {productDetails && <>
              <dl className="product-detail-meta">
                {productDetails.status && <div><dt>Статус</dt><dd>{productDetails.status}</dd></div>}
                {productDetails.categoryId && <div><dt>ID категории</dt><dd>{productDetails.categoryId}</dd></div>}
                {productDetails.storeName && <div><dt>Магазин</dt><dd>{productDetails.storeName}</dd></div>}
                {productDetails.grossWeight && <div><dt>Вес брутто</dt><dd>{productDetails.grossWeight}</dd></div>}
                {productDetails.dimensions && <div><dt>Размер упаковки</dt><dd>{productDetails.dimensions}</dd></div>}
                {productDetails.deliveryTime && <div><dt>Срок отправки</dt><dd>{productDetails.deliveryTime}</dd></div>}
              </dl>
              {productDetails.images.length > 1 && <div className="product-detail-images" aria-label="Фотографии товара">
                {productDetails.images.slice(1, 7).map((image) => <img key={image} src={image} alt="" loading="lazy" />)}
              </div>}
              {productDetails.videos.length > 0 && <div className="product-detail-videos">
                {productDetails.videos.map((video) => <video key={video} src={video} controls preload="none" aria-label="Видео товара" />)}
              </div>}
              {productDetails.skus.length > 0 && <div className="product-detail-skus">
                <h3>Варианты товара</h3>
                {productDetails.skus.slice(0, 24).map((sku, index) => {
                  const properties = readRecords(sku.ae_sku_property_dtos)
                    .map((property) => `${readString(property, "property_name", "sku_property_name", "prop_name")}: ${readString(property, "property_value", "sku_property_value", "prop_value")}`)
                    .filter((value) => value !== ": ");
                  const price = readString(sku, "offer_sale_price", "sku_price");
                  const stock = readString(sku, "sku_available_stock");
                  return <div className="product-detail-sku" key={readString(sku, "sku_id") || index}>
                    <span>{properties.join(" · ") || `Вариант ${index + 1}`}</span>
                    <b>{price ? `${price} USD` : "Цена не указана"}{stock ? ` · Остаток: ${stock}` : ""}</b>
                  </div>;
                })}
              </div>}
            </>}
          </section>
        </div>
      )}

      {notice && <div className="toast">{notice}</div>}

      <nav className="bottom-nav" aria-label="Нижняя навигация">
        {navItems.map((item) => (
          <button
            key={item}
            type="button"
            className={view === item ? "active" : ""}
            onClick={() => goTo(item, `${item} открыт`)}
          >
            <span>{item === "Главная" ? text.home : item === "Категории" ? text.categories : item === "Корзина" ? text.cart : text.profile}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
