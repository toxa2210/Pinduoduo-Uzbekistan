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
import { api, formatUzs, mapMarketplaceCategories, mapMarketplaceGoods, type ApiCategory, type ApiProduct, type ApiUser } from "./api";

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

export function App() {
  const [language, setLanguage] = useState<Language>(() => (localStorage.getItem("uriona-language") as Language) || "ru");
  const [lightMode, setLightMode] = useState(() => localStorage.getItem("uriona-theme") === "light");
  const text = translations[language];
  const [view, setView] = useState<View>("Главная");
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [knownProducts, setKnownProducts] = useState<ApiProduct[]>([]);
  const [liveCatalog, setLiveCatalog] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [detailProduct, setDetailProduct] = useState<ApiProduct | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState("");
  const [liked, setLiked] = useState<string[]>([]);
  const [cartItems, setCartItems] = useState<Record<string, number>>({});
  const [promo, setPromo] = useState("");
  const [notice, setNotice] = useState("");
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("uriona-access-token") || "");
  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [profileForm, setProfileForm] = useState({ name: "", email: "", phone: "", city: "", address: "" });
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [profileSection, setProfileSection] = useState<"overview" | "orders" | "wishlist" | "stores" | "reviews" | "questions" | "coupons" | "addresses" | "payments" | "settings" | "support">("overview");
  const [profileBusy, setProfileBusy] = useState(false);

  useEffect(() => {
    localStorage.setItem("uriona-language", language);
    localStorage.setItem("uriona-theme", lightMode ? "light" : "dark");
    document.documentElement.lang = language === "uz" ? "uz" : language;
  }, [language, lightMode]);

  useEffect(() => {
    if (!authToken) return;
    api.auth.profile(authToken).then((user) => {
      setProfile(user);
      setProfileForm({ name: user.name ?? "", email: user.email ?? "", phone: user.phone ?? "", city: user.city ?? "", address: user.address ?? "" });
    }).catch(() => {
      localStorage.removeItem("uriona-access-token");
      setAuthToken("");
    });
  }, [authToken]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 1500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let active = true;
    api.aliexpress.categories()
      .then((payload) => {
        if (!active) return;
        const liveCategories = mapMarketplaceCategories(payload);
        setCategories(liveCategories);
        setCategoriesError(liveCategories.length ? "" : text.noGoods);
      })
      .catch(() => {
        if (!active) return;
        setCategoriesError(language === "en" ? "Could not load AliExpress categories." : language === "uz" ? "AliExpress kategoriyalarini yuklab bo‘lmadi." : "Не удалось загрузить категории AliExpress.");
      })
      .finally(() => {
        if (active) setCategoriesLoading(false);
      });
    return () => { active = false; };
  }, [language]);

  useEffect(() => {
    let active = true;
    setCatalogLoading(true);
    setCatalogError("");
    const timer = window.setTimeout(() => {
      const filters = {
        ...(search.trim() ? { keyword: search.trim() } : {}),
        ...(selectedCat !== "all" ? { category_id: selectedCat } : {}),
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
        setKnownProducts((current) => Array.from(new Map([...current, ...liveProducts].map((product) => [product.id, product])).values()));
      }).catch(() => {
        if (!active) return;
        setCatalogLoading(false);
        setCatalogError(language === "en" ? "Could not load AliExpress products." : language === "uz" ? "AliExpress mahsulotlarini yuklab bo‘lmadi." : "Не удалось загрузить товары AliExpress.");
      });
    }, search.trim() ? 400 : 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search, selectedCat, categories, language]);

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
  const shipping = subtotal > 0 ? 35000 : 0;
  const discount = promo.trim().toUpperCase() === "SAVE10" ? Math.round(subtotal * 0.1) : 0;
  const total = subtotal + shipping - discount;

  const goTo = (nextView: View, message?: string) => {
    setView(nextView);
    if (message) setNotice(message);
  };

  const handleAddToCart = (productId: string) => {
    setCartItems((items) => ({ ...items, [productId]: (items[productId] ?? 0) + 1 }));
    setNotice("Товар добавлен в корзину");
  };

  const openProductDetails = async (product: ApiProduct) => {
    setDetailProduct(product);
    setDetailLoading(true);
    try {
      setDetailLoading(false);
    } catch {
      setNotice("Детали товара будут добавлены после подключения detail API AliExpress");
    } finally {
      setDetailLoading(false);
    }
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

  const submitAuth = async () => {
    setProfileBusy(true);
    try {
      const result = authMode === "register"
        ? await api.auth.register(authEmail, authPassword)
        : await api.auth.login(authEmail, authPassword);
      localStorage.setItem("uriona-access-token", result.accessToken);
      setAuthToken(result.accessToken);
      setProfile(result.user);
      setProfileForm({ name: result.user.name ?? "", email: result.user.email ?? authEmail, phone: result.user.phone ?? "", city: result.user.city ?? "", address: result.user.address ?? "" });
      setNotice(authMode === "register" ? "Аккаунт создан" : "Профиль открыт");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Не удалось выполнить вход");
    } finally { setProfileBusy(false); }
  };

  const saveProfile = async () => {
    if (!authToken) return;
    setProfileBusy(true);
    try {
      const updated = await api.auth.updateProfile(authToken, { ...profileForm, language });
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
          {categories.length === 0 && <p className="catalog-state">{categoriesLoading ? text.loadingCatalog : categoriesError || text.noGoods}</p>}
          {categories.map((category, index) => (
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
          {catalogMessage ? <p className="catalog-state">{catalogMessage}</p> : visibleProducts.slice(0, 8).map((product, index) => {
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
                    onClick={() => {
                      setLiked((items) =>
                        items.includes(product.id) ? items.filter((id) => id !== product.id) : [...items, product.id],
                      );
                    }}
                    aria-label="Добавить в избранное"
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
        <button type="button" onClick={() => setSelectedCat("all")}>Все</button>
      </div>

      <div className="category-grid large-grid">
        {categories.length === 0 && <p className="catalog-state">{categoriesLoading ? "Загружаем категории..." : categoriesError || "Категории не найдены."}</p>}
        {categories.map((category, index) => (
          <button
            key={category.id}
            type="button"
            className={`category-item ${selectedCat === category.id ? "active" : ""}`}
            onClick={() => {
              setSelectedCat(category.id);
              setNotice(`${category.nameRu} активна`);
            }}
          >
            <span className={`category-icon c${index % 8}`}>◇</span>
            <b>{category.nameRu}</b>
          </button>
        ))}
      </div>

      <div className="catalog-filters">
        <label htmlFor="marketplace-category-filter">Категория AliExpress</label>
        <select id="marketplace-category-filter" value={selectedCat} onChange={(event) => setSelectedCat(event.target.value)}>
          <option value="all">Все категории</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.nameRu}</option>)}
        </select>
      </div>

      <div className="section-head panel-head">
        <div>
          <small>Товары</small>
          <h2>{selectedCat === "all" ? "Все товары" : categories.find((item) => item.id === selectedCat)?.nameRu}</h2>
        </div>
      </div>

      <div className="product-grid compact-grid">
        {catalogMessage ? <p className="catalog-state">{catalogMessage}</p> : visibleProducts.map((product, index) => (
          <article key={product.id} className="product-card compact-card">
            <div className={`product-media media-${index % 5}`}>
              {product.imageUrl && <img src={product.imageUrl} alt={product.titleRu || product.titleUz} loading="lazy" />}
              <span className="product-tag">{product.status === "sale" ? "Скидка" : "Новинка"}</span>
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
        {hotMessage ? <p className="catalog-state">{hotMessage}</p> : hotProducts.map((product, index) => (
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
        <p>Промокод SAVE10 действует на все заказы от 500 000 сум.</p>
      </div>

      <div className="product-grid compact-grid">
        {saleMessage ? <p className="catalog-state">{saleMessage}</p> : saleProducts.map((product, index) => (
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
          <h2>Свяжитесь с нами</h2>
        </div>
      </div>

      <div className="profile-list">
        <div className="profile-item"><span>Телефон</span><b>+998 90 123 45 67</b></div>
        <div className="profile-item"><span>Чат</span><b>Поддержка 24/7</b></div>
        <div className="profile-item"><span>Email</span><b>Поддержка URIONA</b></div>
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
          <h3>Корзина пуста</h3>
          <p>Добавьте товары из каталога и вернитесь сюда.</p>
          <button type="button" className="primary-btn" onClick={() => goTo("Категории", "Каталог открыт")}>К покупкам</button>
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
            <label>Промокод</label>
            <div className="promo-row">
              <input value={promo} onChange={(event) => setPromo(event.target.value)} placeholder="SAVE10" />
              <button type="button" onClick={() => setNotice(promo.trim() ? `Промокод ${promo.trim()} активирован` : "Введите промокод")}>Применить</button>
            </div>
          </div>

          <div className="totals">
            <div><span>Товары</span><b>{formatUzs(subtotal)}</b></div>
            <div><span>Доставка</span><b>{formatUzs(shipping)}</b></div>
            <div><span>Скидка</span><b>-{formatUzs(discount)}</b></div>
            <div className="grand"><span>Итого</span><b>{formatUzs(total)}</b></div>
          </div>

          <button type="button" className="primary-btn checkout-btn" onClick={() => goTo("Профиль", "Заказ оформлен — скоро")}>Перейти к оформлению <ArrowRight size={18} /></button>
        </>
      )}
    </section>
  );

  const renderProfile = () => {
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
            <div><small>Личный кабинет</small><h2>{authMode === "login" ? "Войти в URIONA" : "Создать аккаунт"}</h2></div>
          </div>
          <p className="profile-intro">{authMode === "login" ? "Войдите, чтобы управлять заказами, адресами и избранным." : "Создайте аккаунт URIONA за несколько секунд."}</p>
          <label>Email<input type="email" autoComplete="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="name@example.com" /></label>
          <label>Пароль<input type="password" autoComplete={authMode === "login" ? "current-password" : "new-password"} value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder="Минимум 8 символов" /></label>
          <div className="profile-actions">
            <button type="button" className="primary-btn" disabled={profileBusy || !authEmail || authPassword.length < 8} onClick={() => void submitAuth()}>{authMode === "login" ? "Войти" : "Зарегистрироваться"}</button>
            <button type="button" className="secondary-btn" onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>{authMode === "login" ? "Создать аккаунт" : "Уже есть аккаунт"}</button>
          </div>
          <p className="profile-hint">Телефон можно добавить позже в настройках профиля. Подтверждение телефона пока не требуется.</p>
        </div>
      ) : (
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
              <button type="button" className="profile-logout" onClick={() => { localStorage.removeItem("uriona-access-token"); setAuthToken(""); setProfile(null); }}><X size={17} />Выйти</button>
            </nav>
            <div className="profile-content">
              {profileSection === "overview" && <>
                <div className="mini-grid">
                  <div className="mini-tile"><Package size={18} /><span>Заказы</span><b>0</b></div>
                  <div className="mini-tile"><CreditCard size={18} /><span>Оплата</span><b>Добавить</b></div>
                  <div className="mini-tile"><Heart size={18} /><span>Избранное</span><b>{liked.length}</b></div>
                </div>
                <div className="profile-section-heading"><div><small>Ваш аккаунт</small><h3>Личные данные</h3></div><ShieldCheck size={22} /></div>
                <div className="profile-form">
                  <label>Имя<input value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} placeholder="Ваше имя" /></label>
                  <label>Email<input type="email" value={profileForm.email} readOnly /></label>
                  <label>Телефон<input type="tel" value={profileForm.phone} onChange={(event) => setProfileForm({ ...profileForm, phone: event.target.value })} placeholder="Добавить номер позже" /></label>
                  <label>Город<input value={profileForm.city} onChange={(event) => setProfileForm({ ...profileForm, city: event.target.value })} placeholder="Ташкент" /></label>
                  <label>Адрес доставки<textarea value={profileForm.address} onChange={(event) => setProfileForm({ ...profileForm, address: event.target.value })} placeholder="Улица, дом, квартира" rows={3} /></label>
                </div>
                <div className="profile-actions"><button type="button" className="primary-btn" disabled={profileBusy} onClick={() => void saveProfile()}>Сохранить профиль</button></div>
              </>}
              {profileSection === "orders" && <div className="profile-empty"><Package size={30} /><h3>Заказов пока нет</h3><p>Ваши покупки будут отображаться здесь.</p><button type="button" className="secondary-btn" onClick={() => goTo("Каталог")}>Перейти в каталог</button></div>}
              {profileSection === "wishlist" && <div className="profile-empty"><Heart size={30} /><h3>Моё избранное</h3><p>Сохраняйте товары, чтобы быстро вернуться к ним позже.</p><button type="button" className="secondary-btn" onClick={() => goTo("Каталог")}>Найти товары</button></div>}
              {profileSection === "stores" && <div className="profile-empty"><Store size={30} /><h3>Любимые магазины</h3><p>Подписанные магазины будут отображаться здесь.</p></div>}
              {profileSection === "reviews" && <div className="profile-empty"><Star size={30} /><h3>Мои отзывы</h3><p>Отзывы можно будет оставить после получения заказа.</p></div>}
              {profileSection === "questions" && <div className="profile-empty"><HelpCircle size={30} /><h3>Вопросы и ответы</h3><p>История вопросов по товарам появится здесь.</p></div>}
              {profileSection === "coupons" && <div className="profile-empty"><Ticket size={30} /><h3>Купоны</h3><p>Доступные скидки и купоны будут собраны в этом разделе.</p></div>}
              {profileSection === "addresses" && <div className="profile-empty"><MapPin size={30} /><h3>Адреса доставки</h3><p>Добавьте адрес при первом оформлении заказа.</p></div>}
              {profileSection === "payments" && <div className="profile-empty"><CreditCard size={30} /><h3>Способы оплаты</h3><p>Подключите UZCARD или HUMO во время оформления.</p></div>}
              {profileSection === "settings" && <div className="profile-empty"><ShieldCheck size={30} /><h3>Настройки аккаунта</h3><p>Email используется для входа в URIONA.</p></div>}
              {profileSection === "support" && <div className="profile-empty"><MessageCircle size={30} /><h3>Служба поддержки</h3><p>Мы поможем с заказом, оплатой и доставкой.</p><button type="button" className="secondary-btn" onClick={() => setNotice("Поддержка скоро будет доступна")}>Открыть чат</button></div>}
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
            {detailProduct.imageUrl && <img className="product-dialog-image" src={detailProduct.imageUrl} alt={detailProduct.titleRu || detailProduct.titleUz} />}
            <small>{detailLoading ? "Загружаем данные AliExpress..." : detailProduct.category?.nameRu || "Товар AliExpress"}</small>
            <h2 id="product-dialog-title">{detailProduct.titleRu || detailProduct.titleUz}</h2>
            <p>{detailProduct.descriptionRu || detailProduct.descriptionUz || "Описание не предоставлено API."}</p>
            <strong>{formatUzs(detailProduct.priceMinor)}</strong>
            <code>goods_sign: {detailProduct.id}</code>
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
