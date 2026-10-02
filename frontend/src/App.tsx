import { cloneElement, isValidElement, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import {
  ArrowRight,
  Baby,
  BookOpen,
  Camera,
  CarFront,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  CreditCard,
  Grid2X2,
  Grid3X3,
  Heart,
  HelpCircle,
  Headphones,
  House,
  LayoutGrid,
  Languages,
  MapPin,
  MessageCircle,
  Minus,
  Package,
  PawPrint,
  Plus,
  Search,
  Share2,
  ShieldCheck,
  Shirt,
  Smartphone,
  Sofa,
  Sparkles,
  ShoppingBag,
  Star,
  Store,
  Ticket,
  Truck,
  UserRound,
  Utensils,
  X,
  Watch,
  Zap,
  Moon,
  Sun,
} from "lucide-react";
import { createUserWithEmailAndPassword, getIdToken, reload, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "@firebase/auth";
import type { User as FirebaseUser } from "@firebase/auth";
import { ApiRequestError, api, formatUzs, mapMarketplaceCategories, mapMarketplaceGoods, marketplaceImageUrl, type ApiCategory, type ApiOrder, type ApiProduct, type ApiUser, type ImageSearchMatch } from "./api";
import { inferMarketplaceCategoryId, prepareMarketplaceQuery, productCardTitle, productPopularity, searchProducts, suggestCategories } from "./search";
import { firebaseAuth, firebaseConfigReady } from "./firebase";

const navItems = ["Главная", "Категории", "Корзина", "Профиль"] as const;
type Language = "ru" | "en" | "uz";
const HOME_RECOMMENDATION_KEYWORDS = [
  "phone", "home decor", "kitchen", "women fashion", "watch", "toys", "bag", "beauty",
  "mens clothing", "shoes", "sports", "jewelry", "electronics", "pet supplies", "car accessories",
];
const PRODUCT_PREVIEW_ZONES = 7;

function shuffleItems<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

async function loadHomeRecommendationPage(keywords: string[], pageIndex: number): Promise<ApiProduct[]> {
  const results = await Promise.allSettled(keywords.map((keyWord) =>
    api.aliexpress.dropshippingProducts({
      keyWord,
      pageIndex,
      pageSize: 20,
      currency: "UZS",
    }),
  ));
  const successful = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  if (!successful.length) {
    const failure = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
    throw failure?.reason ?? new Error("No product discovery queries succeeded");
  }
  if (successful.length < results.length) {
    console.warn("Some URIONA product discovery queries failed", results.length - successful.length);
  }
  return successful.flatMap((payload) => mapMarketplaceGoods(payload, "UZS"));
}

function CategoryIllustration({ category, index }: { category: ApiCategory; index: number }) {
  const name = `${category.nameRu} ${category.nameUz}`.toLocaleLowerCase();
  const Icon = /phone|mobile|электрон|telefon|компьютер|computer|digital|телефон|смартфон/.test(name)
    ? Smartphone
    : /cloth|fashion|одеж|обув|мода|kiyim|fashion|bag|сумк/.test(name)
      ? Shirt
      : /home|house|дом|мебел|кухн|uy|sofa|furniture/.test(name)
        ? /кухн|kitchen|oshxona/.test(name) ? Utensils : /sofa|мебел|furniture/.test(name) ? Sofa : House
        : /watch|час|аксессуар|soat/.test(name)
          ? Watch
          : /beauty|health|красот|здоров|parvarish|go‘zallik/.test(name)
            ? Sparkles
            : /baby|kid|дет|ребен|болалар|игрушк|toy/.test(name)
              ? Baby
              : /sport|fitness|спорт|фитнес/.test(name)
                ? Dumbbell
                : /car|auto|авто|автомоб|машин|avto/.test(name)
                  ? CarFront
                  : /camera|photo|фото|камера/.test(name)
                    ? Camera
                    : /audio|headphone|науш|звук/.test(name)
                      ? Headphones
                      : /pet|animal|живот|питом|hayvon/.test(name)
                        ? PawPrint
                        : /book|книг|образован|учеб/.test(name)
                          ? BookOpen
                          : Package;

  return (
    <span className={`category-illustration category-illustration-${index % 6}`}>
      {category.imageUrl
        ? <img src={category.imageUrl} alt="" loading="lazy" />
        : <Icon aria-hidden="true" size={24} strokeWidth={1.8} />}
    </span>
  );
}

const uiTranslations: Record<string, Partial<Record<Language, string>>> = Object.assign({}, {
  "Личный кабинет": { en: "My account", uz: "Shaxsiy kabinet" },
  "Обзор": { en: "Overview", uz: "Umumiy ma’lumot" },
  "Мои заказы": { en: "My orders", uz: "Buyurtmalarim" },
  "Избранное": { en: "Wishlist", uz: "Saralanganlar" },
  "Любимые магазины": { en: "Favorite stores", uz: "Sevimli do‘konlar" },
  "Мои отзывы": { en: "My reviews", uz: "Sharhlarim" },
  "Вопросы и ответы": { en: "Q&A", uz: "Savol-javoblar" },
  "Купоны": { en: "Coupons", uz: "Kuponlar" },
  "Адреса доставки": { en: "Delivery addresses", uz: "Yetkazib berish manzillari" },
  "Способы оплаты": { en: "Payment methods", uz: "To‘lov usullari" },
  "Настройки": { en: "Settings", uz: "Sozlamalar" },
  "Служба поддержки": { en: "Customer support", uz: "Yordam xizmati" },
  "Выйти": { en: "Sign out", uz: "Chiqish" },
  "Подтвердите email": { en: "Verify your email", uz: "Email manzilingizni tasdiqlang" },
  "Войти в URIONA": { en: "Sign in to URIONA", uz: "URIONA’ga kiring" },
  "Создать аккаунт": { en: "Create an account", uz: "Hisob yaratish" },
  "Сбросить пароль": { en: "Reset password", uz: "Parolni tiklash" },
  "Для защиты аккаунта подтвердите адрес электронной почты по ссылке в письме. До подтверждения доступ к профилю и заказам не выдаётся.": {
    en: "To protect your account, verify your email using the link we sent. Profile and order access is unavailable until verification.",
    uz: "Hisobingizni himoya qilish uchun xatdagi havola orqali emailingizni tasdiqlang. Tasdiqlamaguningizcha profil va buyurtmalarga kirish yopiq.",
  },
  "Я подтвердил email": { en: "I verified my email", uz: "Emailimni tasdiqladim" },
  "Отправить письмо ещё раз": { en: "Resend verification email", uz: "Tasdiqlash xatini qayta yuborish" },
  "Вернуться ко входу": { en: "Back to sign in", uz: "Kirishga qaytish" },
  "Войдите, чтобы управлять заказами, адресами и избранным.": {
    en: "Sign in to manage your orders, addresses, and wishlist.",
    uz: "Buyurtmalar, manzillar va saralangan mahsulotlarni boshqarish uchun kiring.",
  },
  "Создайте аккаунт. Для завершения регистрации нужно подтвердить email.": {
    en: "Create an account. You will need to verify your email to finish registration.",
    uz: "Hisob yarating. Ro‘yxatdan o‘tishni yakunlash uchun emailingizni tasdiqlang.",
  },
  "Укажите email — отправим ссылку для создания нового пароля.": {
    en: "Enter your email and we’ll send a password reset link.",
    uz: "Email manzilingizni kiriting, parolni tiklash havolasini yuboramiz.",
  },
  "Пароль": { en: "Password", uz: "Parol" },
  "Минимум 8 символов": { en: "At least 8 characters", uz: "Kamida 8 ta belgi" },
  "Подождите…": { en: "Please wait…", uz: "Kuting…" },
  "Войти": { en: "Sign in", uz: "Kirish" },
  "Зарегистрироваться": { en: "Create account", uz: "Ro‘yxatdan o‘tish" },
  "Отправить ссылку": { en: "Send link", uz: "Havolani yuborish" },
  "Уже есть аккаунт": { en: "Already have an account", uz: "Hisobingiz bormi?" },
  "Забыли пароль?": { en: "Forgot password?", uz: "Parolni unutdingizmi?" },
  "Firebase не настроен для этого сайта: кнопки входа временно отключены. Нужны настройки Web App из Firebase Console и включённый метод Email/Password.": {
    en: "Firebase is not configured for this site, so sign-in is temporarily disabled. Configure the Firebase Web App and enable Email/Password sign-in.",
    uz: "Bu sayt uchun Firebase sozlanmagan, shu sababli kirish vaqtincha ishlamaydi. Firebase Web App sozlamalarini kiriting va Email/Password usulini yoqing.",
  },
  "Разделы профиля": { en: "Profile sections", uz: "Profil bo‘limlari" },
  "Активные заказы": { en: "Active orders", uz: "Faol buyurtmalar" },
  "Оплата": { en: "Payment", uz: "To‘lov" },
  "Настроить": { en: "Set up", uz: "Sozlash" },
  "Ваш аккаунт": { en: "Your account", uz: "Hisobingiz" },
  "Личные данные": { en: "Personal details", uz: "Shaxsiy ma’lumotlar" },
  "Имя": { en: "Name", uz: "Ism" },
  "Ваше имя": { en: "Your name", uz: "Ismingiz" },
  "Телефон": { en: "Phone", uz: "Telefon" },
  "Добавить номер позже": { en: "Add a phone number later", uz: "Telefon raqamini keyinroq qo‘shish" },
  "Город": { en: "City", uz: "Shahar" },
  "Адрес": { en: "Address", uz: "Manzil" },
  "Сохранить изменения": { en: "Save changes", uz: "O‘zgarishlarni saqlash" },
  "Сохранить профиль": { en: "Save profile", uz: "Profilni saqlash" },
  "Заказы": { en: "Orders", uz: "Buyurtmalar" },
  "Все": { en: "All", uz: "Barchasi" },
  "Активные": { en: "Active", uz: "Faol" },
  "Архив": { en: "Archive", uz: "Arxiv" },
  "Повторить": { en: "Retry", uz: "Qayta urinish" },
  "Загрузка…": { en: "Loading…", uz: "Yuklanmoqda…" },
  "Заказов пока нет": { en: "No orders yet", uz: "Hozircha buyurtmalar yo‘q" },
  "В этом разделе пока нет заказов": { en: "There are no orders in this section yet", uz: "Bu bo‘limda hozircha buyurtmalar yo‘q" },
  "Оформленные покупки и их статусы появятся здесь.": { en: "Your purchases and their statuses will appear here.", uz: "Xaridlaringiz va ularning holati shu yerda ko‘rinadi." },
  "Перейти в каталог": { en: "Go to catalog", uz: "Katalogga o‘tish" },
  "Избранное пока пусто": { en: "Your wishlist is empty", uz: "Saralanganlar ro‘yxati bo‘sh" },
  "Нажимайте на сердечко в карточке товара — товары сохранятся на этом устройстве.": {
    en: "Tap the heart on a product card to save products on this device.",
    uz: "Mahsulotni ushbu qurilmada saqlash uchun uning kartasidagi yurakchani bosing.",
  },
  "Найти товары": { en: "Find products", uz: "Mahsulotlarni topish" },
  "В каталоге пока нет данных продавцов, необходимых для подписки на магазин.": {
    en: "Seller details needed to follow stores are not available in the catalog yet.",
    uz: "Katalogda do‘konlarga obuna bo‘lish uchun sotuvchi ma’lumotlari hozircha mavjud emas.",
  },
  "Вернуться в каталог": { en: "Back to catalog", uz: "Katalogga qaytish" },
  "Язык интерфейса": { en: "Interface language", uz: "Interfeys tili" },
  "Русский": { en: "Russian", uz: "Ruscha" },
  "O‘zbekcha": { en: "Uzbek", uz: "O‘zbekcha" },
  "Профиль": { en: "Profile", uz: "Profil" },
  "Корзина": { en: "Cart", uz: "Savat" },
  "Каталог": { en: "Catalog", uz: "Katalog" },
  "Категории": { en: "Categories", uz: "Kategoriyalar" },
  "Все категории": { en: "All categories", uz: "Barcha kategoriyalar" },
  "Категория": { en: "Category", uz: "Kategoriya" },
  "Категория каталога": { en: "Catalog category", uz: "Katalog kategoriyasi" },
  "Товары": { en: "Products", uz: "Mahsulotlar" },
  "Все товары": { en: "All products", uz: "Barcha mahsulotlar" },
  "Скидка": { en: "Sale", uz: "Chegirma" },
  "Популярно": { en: "Popular", uz: "Ommabop" },
  "Новинка": { en: "New", uz: "Yangi" },
  "Добавить": { en: "Add", uz: "Qo‘shish" },
  "Купить": { en: "Buy", uz: "Sotib olish" },
  "Подробнее": { en: "Details", uz: "Batafsil" },
  "Вид сетки товаров": { en: "Product grid view", uz: "Mahsulotlar panjarasi" },
  "Сетка из 2 столбцов": { en: "2-column product grid", uz: "2 ustunli mahsulotlar" },
  "Сетка из 3 столбцов": { en: "3-column product grid", uz: "3 ustunli mahsulotlar" },
  "Сетка из 4 столбцов": { en: "4-column product grid", uz: "4 ustunli mahsulotlar" },
  "Не удалось загрузить ещё товары. Нажмите, чтобы повторить.": {
    en: "Couldn't load more products. Tap to retry.",
    uz: "Ko‘proq mahsulot yuklanmadi. Qayta urinish uchun bosing.",
  },
  "Загружаем ещё товары…": { en: "Loading more products…", uz: "Ko‘proq mahsulot yuklanmoqda…" },
  "Прокрутите вниз — загрузим следующие товары.": {
    en: "Keep scrolling to load more products.",
    uz: "Keyingi mahsulotlarni yuklash uchun pastga aylantiring.",
  },
  "Категории по запросу": { en: "Matching categories", uz: "Mos kategoriyalar" },
  "Поиск по фото": { en: "Search by image", uz: "Rasm orqali qidirish" },
  "Загрузить фото или вставить из буфера": { en: "Upload a photo or paste it from clipboard", uz: "Rasm yuklang yoki buferdan joylang" },
  "Выбрать изображение": { en: "Choose image", uz: "Rasmni tanlang" },
  "Ищем похожие товары…": { en: "Searching for similar products…", uz: "O‘xshash mahsulotlar qidirilmoqda…" },
  "Результаты поиска по фото": { en: "Image search results", uz: "Rasm orqali qidiruv natijalari" },
  "По фото ничего не найдено": { en: "No AliExpress matches were found for this image.", uz: "Bu rasm bo‘yicha AliExpress mahsulotlari topilmadi." },
  "Не удалось выполнить поиск по фото": { en: "Image search could not be completed.", uz: "Rasm orqali qidiruvni bajarib bo‘lmadi." },
  "Выберите JPG, PNG, WebP, GIF или AVIF размером до 8 МБ.": {
    en: "Choose a JPG, PNG, WebP, GIF, or AVIF image up to 8 MB.",
    uz: "8 MB gacha JPG, PNG, WebP, GIF yoki AVIF rasm tanlang.",
  },
  "Фото будет отправлено SerpApi и Google Lens для поиска.": {
    en: "The image will be sent to SerpApi and Google Lens to perform the search.",
    uz: "Qidiruv uchun rasm SerpApi va Google Lens xizmatlariga yuboriladi.",
  },
  "Удалить фото": { en: "Remove image", uz: "Rasmni olib tashlash" },
  "Открыть товар": { en: "Open product", uz: "Mahsulotni ochish" },
  "Нет товаров для загрузки сведений о продавцах.": { en: "No products are available to load seller details.", uz: "Sotuvchi ma’lumotlarini yuklash uchun mahsulotlar yo‘q." },
  "Нет изображения": { en: "No image", uz: "Rasm yo‘q" },
  "Начните вводить от 3 символов": { en: "Type at least 3 characters", uz: "Kamida 3 ta belgi kiriting" },
  "Подходящие товары": { en: "Matching products", uz: "Mos mahsulotlar" },
  "Популярные товары": { en: "Popular products", uz: "Ommabop mahsulotlar" },
  "По запросу ничего не найдено": { en: "No exact matches found", uz: "So‘rov bo‘yicha mos mahsulot topilmadi" },
  "Удалить из избранного": { en: "Remove from wishlist", uz: "Saralanganlardan olib tashlash" },
  "Добавить в избранное": { en: "Add to wishlist", uz: "Saralanganlarga qo‘shish" },
  "Показать товары": { en: "View products", uz: "Mahsulotlarni ko‘rish" },
  "Вернуться к категориям": { en: "Back to categories", uz: "Kategoriyalarga qaytish" },
  "покупок": { en: "orders", uz: "ta xarid" },
  "Товары каталога URIONA": { en: "URIONA catalog products", uz: "URIONA katalogi mahsulotlari" },
  "Горячие товары": { en: "Trending products", uz: "Ommabop mahsulotlar" },
  "Показать всё": { en: "Show all", uz: "Barchasini ko‘rsatish" },
  "Скидки": { en: "Deals", uz: "Chegirmalar" },
  "Акции недели": { en: "This week's deals", uz: "Hafta aksiyalari" },
  "Спецпредложение": { en: "Special offer", uz: "Maxsus taklif" },
  "Скидка до 50% на популярные категории": { en: "Up to 50% off popular categories", uz: "Mashhur kategoriyalarga 50% gacha chegirma" },
  "Тестовый промокод SAVE10 действует на заказы от 500 000 сум.": {
    en: "The test promo code SAVE10 applies to orders over UZS 500,000.",
    uz: "SAVE10 sinov promo-kodi 500 000 so‘mdan yuqori buyurtmalarga amal qiladi.",
  },
  "Как заказать": { en: "How to order", uz: "Qanday buyurtma berish" },
  "3 простых шага": { en: "3 easy steps", uz: "3 ta oddiy qadam" },
  "1. Выберите товар": { en: "1. Choose a product", uz: "1. Mahsulotni tanlang" },
  "Откройте каталог или подборки": { en: "Browse the catalog or collections", uz: "Katalog yoki to‘plamlarni oching" },
  "2. Добавьте в корзину": { en: "2. Add it to your cart", uz: "2. Savatga qo‘shing" },
  "Проверьте цену и количество": { en: "Check the price and quantity", uz: "Narx va miqdorni tekshiring" },
  "3. Оформите заказ": { en: "3. Place your order", uz: "3. Buyurtmani rasmiylashtiring" },
  "Оплата и доставка в Узбекистан": { en: "Payment and delivery to Uzbekistan", uz: "O‘zbekistonga to‘lov va yetkazib berish" },
  "Как мы доставляем": { en: "How delivery works", uz: "Yetkazib berish tartibi" },
  "Срок": { en: "Delivery time", uz: "Muddat" },
  "От 7 до 21 дня": { en: "7 to 21 days", uz: "7 kundan 21 kungacha" },
  "Зависит от продавца, типа товара и логистики до Ташкента.": {
    en: "It depends on the seller, product type, and shipping to Tashkent.",
    uz: "Muddat sotuvchi, mahsulot turi va Toshkentgacha bo‘lgan logistika xizmatiga bog‘liq.",
  },
  "Отслеживание": { en: "Tracking", uz: "Kuzatuv" },
  "По треку и статусам": { en: "Track your parcel and its status", uz: "Trek raqami va holatlar orqali" },
  "Получаете уведомления о перемещении посылки и готовности к выдаче.": {
    en: "Get updates as your parcel moves and when it is ready for pickup.",
    uz: "Jo‘natma harakati va olib ketishga tayyorligi haqida xabarlar olasiz.",
  },
  "Поддержка": { en: "Support", uz: "Yordam" },
  "Как связаться с поддержкой?": { en: "How can I contact support?", uz: "Yordam xizmatiga qanday bog‘lanaman?" },
  "Контактный канал поддержки Uriona ещё не настроен. Мы не показываем фиктивный телефон или неработающий чат.": {
    en: "URIONA support contact details are not configured yet. We do not display a fake phone number or a non-working chat.",
    uz: "URIONA yordam xizmati aloqa ma’lumotlari hali sozlanmagan. Soxta telefon raqami yoki ishlamaydigan chat ko‘rsatilmaydi.",
  },
  "Раздел помощи": { en: "Help center", uz: "Yordam bo‘limi" },
  "Почему каталог может быть недоступен?": { en: "Why might the catalog be unavailable?", uz: "Nega katalog ishlamasligi mumkin?" },
  "Если источник товаров временно не отвечает, Uriona покажет сообщение и кнопку повтора запроса.": {
    en: "If the product source is temporarily unavailable, URIONA will show a message and a retry button.",
    uz: "Mahsulotlar manbasi vaqtincha javob bermasa, Uriona xabar va qayta urinish tugmasini ko‘rsatadi.",
  },
  "Ташкент": { en: "Tashkent", uz: "Toshkent" },
  "Доставка в": { en: "Deliver to", uz: "Yetkazish manzili" },
  "Главное меню": { en: "Main menu", uz: "Asosiy menyu" },
  "Нижняя навигация": { en: "Bottom navigation", uz: "Quyi navigatsiya" },
  "Закрыть": { en: "Close", uz: "Yopish" },
  "Товар": { en: "Product", uz: "Mahsulot" },
  "Загружаем сведения о товаре…": { en: "Loading product details…", uz: "Mahsulot tafsilotlari yuklanmoqda…" },
  "Выбор URIONA": { en: "URIONA picks", uz: "URIONA tanlovi" },
  "Лучшие предложения каждый день": { en: "Great finds every day", uz: "Har kuni ajoyib takliflar" },
  "Найдите что-то особенное для себя": { en: "Find something special for you", uz: "O‘zingiz uchun alohida mahsulot toping" },
  "Смотреть подборку": { en: "Explore this selection", uz: "Tanlovni ko‘rish" },
  "Предыдущий баннер": { en: "Previous banner", uz: "Oldingi banner" },
  "Следующий баннер": { en: "Next banner", uz: "Keyingi banner" },
  "Баннеры": { en: "Banners", uz: "Bannerlar" },
  "Баннер": { en: "Banner", uz: "Banner" },
  "Популярные категории": { en: "Popular categories", uz: "Mashhur kategoriyalar" },
  "Выберите направление": { en: "Explore the catalog", uz: "Katalogni ko‘rib chiqing" },
  "Ваш URIONA": { en: "Your URIONA", uz: "Sizning URIONA" },
  "Найдите своё среди тысяч товаров": { en: "Find your next favorite", uz: "Minglab mahsulotlar ichidan o‘zingizga yoqqanini toping" },
  "Категории, подборки и товары со всего мира — в одном месте.": { en: "Categories, curated picks, and products from around the world — all in one place.", uz: "Kategoriyalar, tanlovlar va dunyo mahsulotlari — barchasi bir joyda." },
  "Конфиденциальность": { en: "Privacy policy", uz: "Maxfiylik siyosati" },
  "Обработка персональных данных": { en: "Personal data processing", uz: "Shaxsiy ma’lumotlarga ishlov berish" },
  "Пользовательское соглашение": { en: "Terms of use", uz: "Foydalanish shartlari" },
  "Документ готовится к публикации": { en: "This document is being prepared", uz: "Ushbu hujjat tayyorlanmoqda" },
  "О нас": { en: "About us", uz: "Biz haqimizda" },
  "Покупателям": { en: "For customers", uz: "Foydalanuvchilarga" },
  "Продавцам": { en: "For sellers", uz: "Tadbirkorlarga" },
  "О URIONA": { en: "About URIONA", uz: "URIONA haqida" },
  "Пункты выдачи": { en: "Pick-up points", uz: "Topshirish punktlari" },
  "Вакансии": { en: "Careers", uz: "Vakansiyalar" },
  "Связаться с нами": { en: "Contact us", uz: "Biz bilan bog‘lanish" },
  "Частые вопросы": { en: "FAQ", uz: "Savol-javob" },
  "Открыть пункт выдачи": { en: "Open a pick-up point", uz: "Topshirish punkti ochish" },
  "Кабинет продавца": { en: "Seller dashboard", uz: "Sotuvchi kabinetiga kirish" },
  "Стать продавцом URIONA": { en: "Sell with URIONA", uz: "URIONA’da soting" },
  "Информация появится позже": { en: "More information will be available soon", uz: "Batafsil ma’lumot tez orada paydo bo‘ladi" },
  "Магазины продавцов": { en: "Seller stores", uz: "Sotuvchilar do‘konlari" },
  "Информация для продавцов": { en: "Seller information", uz: "Sotuvchilar uchun ma’lumot" },
  "О продавцах": { en: "About sellers", uz: "Sotuvchilar haqida" },
  "Загрузить данные продавцов": { en: "Load seller information", uz: "Sotuvchilar ma’lumotlarini yuklash" },
  "Загрузить ещё данные из каталога": { en: "Load more seller data from catalog", uz: "Katalogdan yana ma’lumot yuklash" },
  "Данные продавцов загружены": { en: "Seller information loaded", uz: "Sotuvchilar ma’lumotlari yuklandi" },
  "Ошибок загрузки": { en: "Load errors", uz: "Yuklash xatolari" },
  "Не удалось загрузить сведения о продавцах. Попробуйте ещё раз.": {
    en: "Could not load seller details. Please try again.",
    uz: "Sotuvchilar ma’lumotlarini yuklab bo‘lmadi. Qayta urinib ko‘ring.",
  },
  "Информация для продавцов скоро появится": {
    en: "Seller information will be available soon",
    uz: "Sotuvchilar uchun ma’lumot tez orada paydo bo‘ladi",
  },
  "Все магазины": { en: "All stores", uz: "Barcha do‘konlar" },
  "товаров": { en: "products", uz: "mahsulot" },
  "продавцов": { en: "sellers", uz: "sotuvchi" },
  "Ошибка загрузки продавцов": { en: "Could not load sellers", uz: "Sotuvchilarni yuklab bo‘lmadi" },
  "Данные магазина": { en: "Store information", uz: "Do‘kon ma’lumotlari" },
  "Страна продавца": { en: "Seller country", uz: "Sotuvchi mamlakati" },
  "Рейтинг продавца": { en: "Seller rating", uz: "Sotuvchi reytingi" },
  "Положительные отзывы": { en: "Positive feedback", uz: "Ijobiy fikrlar" },
  "Подписчики": { en: "Followers", uz: "Obunachilar" },
  "Товары из просмотренного каталога": { en: "Products found in the loaded catalog", uz: "Yuklangan katalogdagi mahsulotlar" },
  "Витрина продавца": { en: "Seller storefront", uz: "Sotuvchi vitrinası" },
  "Загружаем сведения о продавцах…": { en: "Loading seller information…", uz: "Sotuvchilar ma’lumotlari yuklanmoqda…" },
  "Продавцы появятся после загрузки сведений из товаров.": {
    en: "Seller profiles will appear after loading details from products.",
    uz: "Mahsulotlardan ma’lumot yuklangach, sotuvchilar profillari ko‘rinadi.",
  },
  "Полный список товаров продавца пока недоступен через подключённый API.": {
    en: "The connected API does not currently provide the seller's complete product listing.",
    uz: "Ulangan API hozircha sotuvchining barcha mahsulotlari ro‘yxatini bermaydi.",
  },
  "В этом магазине пока нет других загруженных товаров.": {
    en: "No other products from this store have been loaded yet.",
    uz: "Bu do‘kondan boshqa mahsulotlar hali yuklanmagan.",
  },
  "Статус": { en: "Status", uz: "Holat" },
  "ID категории": { en: "Category ID", uz: "Kategoriya ID raqami" },
  "Магазин": { en: "Store", uz: "Do‘kon" },
  "Магазины": { en: "Stores", uz: "Do‘konlar" },
  "Вес брутто": { en: "Gross weight", uz: "Brutto vazni" },
  "Размер упаковки": { en: "Package dimensions", uz: "Qadoq o‘lchamlari" },
  "Срок отправки": { en: "Shipping time", uz: "Jo‘natish muddati" },
  "Фотографии товара": { en: "Product photos", uz: "Mahsulot rasmlari" },
  "Видео товара": { en: "Product video", uz: "Mahsulot videosi" },
  "Варианты товара": { en: "Product options", uz: "Mahsulot variantlari" },
  "Цена не указана": { en: "Price not provided", uz: "Narx ko‘rsatilmagan" },
  "Дата не указана": { en: "Date not provided", uz: "Sana ko‘rsatilmagan" },
  "Оформление заказа ещё не подключено": { en: "Checkout is not available yet", uz: "Buyurtmani rasmiylashtirish hali mavjud emas" },
  "Перейти к оформлению": { en: "Proceed to checkout", uz: "Rasmiylashtirishga o‘tish" },
  "Оформление заказа пока недоступно.": { en: "Checkout is not available yet.", uz: "Buyurtmani rasmiylashtirish hozircha mavjud emas." },
  "Итого": { en: "Total", uz: "Jami" },
  "Корзина пуста": { en: "Your cart is empty", uz: "Savatingiz bo‘sh" },
  "Добавьте товары из каталога и вернитесь сюда.": { en: "Add products from the catalog and come back here.", uz: "Katalogdan mahsulot qo‘shib, bu yerga qayting." },
  "Промокод": { en: "Promo code", uz: "Promo-kod" },
  "Применить": { en: "Apply", uz: "Qo‘llash" },
  "Платежи": { en: "Payments", uz: "To‘lovlar" },
  "Готово к оплате местными картами и будущим провайдерам.": {
    en: "Ready for local bank cards and future payment providers.",
    uz: "Mahalliy bank kartalari va kelajakdagi to‘lov provayderlari uchun tayyor.",
  },
  "Посылки из Китая": { en: "Parcels from China", uz: "Xitoydan jo‘natmalar" },
  "Проверка, сборка и отслеживание по пути до Ташкента.": {
    en: "Inspection, consolidation, and tracking on the way to Tashkent.",
    uz: "Toshkentga yetib kelguncha tekshirish, jamlash va kuzatish.",
  },
}, {
  "Логотип URIONA": { en: "URIONA logo", uz: "URIONA logotipi" },
  "Основное меню": { en: "Main menu", uz: "Asosiy menyu" },
  "Нижняя навигация": { en: "Bottom navigation", uz: "Quyi navigatsiya" },
  "Доставка в": { en: "Deliver to", uz: "Yetkazish manzili" },
  "Ташкент": { en: "Tashkent", uz: "Toshkent" },
}, {
  "История покупок": { en: "Purchase history", uz: "Xaridlar tarixi" },
  "Мои заказы": { en: "My orders", uz: "Buyurtmalarim" },
  "Фильтр заказов": { en: "Order filter", uz: "Buyurtmalar filtri" },
  "Обновить": { en: "Refresh", uz: "Yangilash" },
  "Загружаем заказы…": { en: "Loading orders…", uz: "Buyurtmalar yuklanmoqda…" },
  "Не удалось загрузить заказы": { en: "Could not load orders", uz: "Buyurtmalarni yuklab bo‘lmadi" },
  "Создан": { en: "Created", uz: "Yaratildi" },
  "Ожидает оплаты": { en: "Awaiting payment", uz: "To‘lov kutilmoqda" },
  "Оплачен": { en: "Paid", uz: "To‘langan" },
  "Собирается": { en: "Processing", uz: "Tayyorlanmoqda" },
  "Отправлен": { en: "Shipped", uz: "Jo‘natildi" },
  "Доставлен": { en: "Delivered", uz: "Yetkazildi" },
  "Отменён": { en: "Cancelled", uz: "Bekor qilindi" },
  "Уже есть аккаунт": { en: "Already have an account", uz: "Hisobingiz bormi?" },
  "Забыли пароль?": { en: "Forgot password?", uz: "Parolni unutdingizmi?" },
  "Обзор": { en: "Overview", uz: "Umumiy ma’lumot" },
  "Мои отзывы": { en: "My reviews", uz: "Sharhlarim" },
  "Вопросы и ответы": { en: "Questions and answers", uz: "Savol-javoblar" },
  "Купоны": { en: "Coupons", uz: "Kuponlar" },
  "Адреса доставки": { en: "Delivery addresses", uz: "Yetkazib berish manzillari" },
  "Способы оплаты": { en: "Payment methods", uz: "To‘lov usullari" },
  "Настройки": { en: "Settings", uz: "Sozlamalar" },
  "Служба поддержки": { en: "Customer support", uz: "Yordam xizmati" },
  "Выйти": { en: "Sign out", uz: "Chiqish" },
  "Активные заказы": { en: "Active orders", uz: "Faol buyurtmalar" },
  "Настроить": { en: "Set up", uz: "Sozlash" },
  "Ваш аккаунт": { en: "Your account", uz: "Hisobingiz" },
  "Личные данные": { en: "Personal details", uz: "Shaxsiy ma’lumotlar" },
  "Имя": { en: "Name", uz: "Ism" },
  "Ваше имя": { en: "Your name", uz: "Ismingiz" },
  "Телефон": { en: "Phone", uz: "Telefon" },
  "Добавить номер позже": { en: "Add a phone number later", uz: "Telefon raqamini keyinroq qo‘shish" },
  "Город": { en: "City", uz: "Shahar" },
  "Адрес доставки": { en: "Delivery address", uz: "Yetkazib berish manzili" },
  "Сохранить профиль": { en: "Save profile", uz: "Profilni saqlash" },
}, {
  "История покупок": { en: "Purchase history", uz: "Xaridlar tarixi" },
  "Все": { en: "All", uz: "Barchasi" },
  "Активные": { en: "Active", uz: "Faol" },
  "Архив": { en: "Archive", uz: "Arxiv" },
  "Заказов пока нет": { en: "No orders yet", uz: "Hozircha buyurtmalar yo‘q" },
  "В этом разделе пока нет заказов": { en: "There are no orders in this section yet", uz: "Bu bo‘limda hozircha buyurtmalar yo‘q" },
  "Оформленные покупки и их статусы появятся здесь.": { en: "Your purchases and their statuses will appear here.", uz: "Xaridlaringiz va ularning holati shu yerda ko‘rinadi." },
  "Перейти в каталог": { en: "Go to catalog", uz: "Katalogga o‘tish" },
  "Избранное пока пусто": { en: "Your wishlist is empty", uz: "Saralanganlar ro‘yxati bo‘sh" },
  "Нажимайте на сердечко в карточке товара — товары сохранятся на этом устройстве.": {
    en: "Tap the heart on a product card to save products on this device.",
    uz: "Mahsulotni ushbu qurilmada saqlash uchun uning kartasidagi yurakchani bosing.",
  },
  "Найти товары": { en: "Find products", uz: "Mahsulotlarni topish" },
  "Любимые магазины": { en: "Favorite stores", uz: "Sevimli do‘konlar" },
  "В каталоге пока нет данных продавцов, необходимых для подписки на магазин.": {
    en: "Seller details needed to follow stores are not available in the catalog yet.",
    uz: "Katalogda do‘konlarga obuna bo‘lish uchun sotuvchi ma’lumotlari hozircha mavjud emas.",
  },
  "Вернуться в каталог": { en: "Back to catalog", uz: "Katalogga qaytish" },
  "Язык интерфейса": { en: "Interface language", uz: "Interfeys tili" },
  "Русский": { en: "Russian", uz: "Ruscha" },
  "O‘zbekcha": { en: "Uzbek", uz: "O‘zbekcha" },
  "Тема оформления": { en: "Theme", uz: "Mavzu" },
  "Включить тёмную тему": { en: "Enable dark theme", uz: "Qorong‘i mavzuni yoqish" },
  "Включить светлую тему": { en: "Enable light theme", uz: "Yorug‘ mavzuni yoqish" },
  "Язык и тема сохраняются на этом устройстве. Email используется для входа; смена пароля пока не подключена.": {
    en: "Your language and theme are saved on this device. Your email is used to sign in; password changes are not available yet.",
    uz: "Til va mavzu ushbu qurilmada saqlanadi. Email kirish uchun ishlatiladi; parolni o‘zgartirish hozircha mavjud emas.",
  },
  "Оплата картой пока не подключена": { en: "Card payments are not available yet", uz: "Karta orqali to‘lov hozircha ishlamaydi" },
  "Не вводите и не отправляйте данные банковской карты в профиль. Подключение UZCARD/HUMO появится после настройки платёжного провайдера.": {
    en: "Do not enter or send bank card details in your profile. UZCARD/HUMO payments will be added after a payment provider is configured.",
    uz: "Profilga bank karta ma’lumotlarini kiritmang yoki yubormang. To‘lov provayderi sozlangach, UZCARD/HUMO qo‘shiladi.",
  },
  "Как связаться с поддержкой?": { en: "How can I contact support?", uz: "Yordam xizmatiga qanday bog‘lanaman?" },
  "Есть вопросы?": { en: "Questions?", uz: "Savollaringiz bormi?" },
  "Сохранить изменения": { en: "Save changes", uz: "O‘zgarishlarni saqlash" },
  "Введите промокод": { en: "Enter a promo code", uz: "Promo-kodni kiriting" },
  "Промокод не найден": { en: "Promo code not found", uz: "Promo-kod topilmadi" },
  "Нет соединения. Проверьте интернет и повторите попытку.": { en: "No connection. Check your internet and try again.", uz: "Internet aloqasi yo‘q. Internetni tekshirib, qayta urinib ko‘ring." },
  "Проверьте правильность email.": { en: "Check that your email address is correct.", uz: "Email manzilingiz to‘g‘riligini tekshiring." },
  "Неверный email или пароль.": { en: "Incorrect email or password.", uz: "Email yoki parol noto‘g‘ri." },
  "Аккаунт не найден. Проверьте email или создайте аккаунт.": { en: "Account not found. Check your email or create an account.", uz: "Hisob topilmadi. Emailni tekshiring yoki hisob yarating." },
  "Пароль должен содержать не менее 8 символов.": { en: "Password must be at least 8 characters.", uz: "Parol kamida 8 ta belgidan iborat bo‘lishi kerak." },
  "Слишком много попыток. Попробуйте позже.": { en: "Too many attempts. Try again later.", uz: "Urinishlar soni juda ko‘p. Keyinroq urinib ko‘ring." },
  "В Firebase Console не включён вход по email и паролю.": { en: "Email and password sign-in is not enabled in Firebase Console.", uz: "Firebase Console'da email va parol orqali kirish yoqilmagan." },
  "Домен сайта не добавлен в список Authorized domains Firebase.": { en: "The website domain is not listed in Firebase Authorized domains.", uz: "Sayt domeni Firebase Authorized domains ro‘yxatiga qo‘shilmagan." },
  "Firebase Authentication не настроен в проекте.": { en: "Firebase Authentication is not configured for this project.", uz: "Loyihada Firebase Authentication sozlanmagan." },
  "Сохранённые товары": { en: "Saved products", uz: "Saqlangan mahsulotlar" },
  "Избранное ·": { en: "Wishlist ·", uz: "Saralanganlar ·" },
  "В корзину": { en: "Add to cart", uz: "Savatga qo‘shish" },
  "Убрать": { en: "Remove", uz: "Olib tashlash" },
  "Отзывы можно оставить после доставки заказа. Публикация и хранение отзывов пока не подключены.": {
    en: "You can leave a review after your order is delivered. Review submission and storage are not available yet.",
    uz: "Buyurtma yetkazilgandan keyin sharh qoldirishingiz mumkin. Sharh yuborish va saqlash hozircha ishlamaydi.",
  },
  "Открыть справку": { en: "Open help center", uz: "Yordam markazini ochish" },
  "Вопросы продавцам и история ответов пока не подключены: для этого нужен разрешённый API продавцов и отдельный раздел товара.": {
    en: "Seller questions and answer history are not available yet. They require approved seller API access and a dedicated product section.",
    uz: "Sotuvchilarga savollar va javoblar tarixi hozircha ishlamaydi. Buning uchun sotuvchi API ruxsati va mahsulot bo‘limi kerak.",
  },
  "Купон Uriona": { en: "URIONA coupon", uz: "URIONA kuponi" },
  "Действует на товары при сумме от 500 000 сум. Применение будет доступно в корзине.": {
    en: "Valid on orders over UZS 500,000. It can be applied in the cart.",
    uz: "500 000 so‘mdan yuqori buyurtmalarga amal qiladi. Kuponni savatda qo‘llash mumkin.",
  },
  "Перейти в корзину": { en: "Go to cart", uz: "Savatga o‘tish" },
  "Промокод добавлен в корзину": { en: "Promo code added to cart", uz: "Promo-kod savatga qo‘shildi" },
  "Для оформления заказа": { en: "For checkout", uz: "Buyurtmani rasmiylashtirish uchun" },
  "Основной адрес доставки": { en: "Primary delivery address", uz: "Asosiy yetkazib berish manzili" },
  "Получатель": { en: "Recipient", uz: "Qabul qiluvchi" },
  "Имя получателя": { en: "Recipient name", uz: "Qabul qiluvchining ismi" },
  "Улица, дом, квартира": { en: "Street, building, apartment", uz: "Ko‘cha, uy, xonadon" },
  "Сохранить адрес": { en: "Save address", uz: "Manzilni saqlash" },
  "Сейчас профиль поддерживает один основной адрес. Несколько адресов добавим вместе с оформлением заказа.": {
    en: "Your profile currently supports one primary address. Multiple addresses will be available with checkout.",
    uz: "Hozircha profilda bitta asosiy manzilni saqlash mumkin. Buyurtmani rasmiylashtirish qo‘shilganda bir nechta manzil ham bo‘ladi.",
  },
}, {
  "Оплата картой пока не подключена": { en: "Card payments are not available yet", uz: "Karta orqali to‘lov hozircha ishlamaydi" },
  "Не вводите и не отправляйте данные банковской карты в профиль. Подключение UZCARD/HUMO появится после настройки платёжного провайдера.": {
    en: "Do not enter or send bank card details in your profile. UZCARD/HUMO payments will be added after a payment provider is configured.",
    uz: "Profilga bank karta ma’lumotlarini kiritmang yoki yubormang. To‘lov provayderi sozlangach, UZCARD/HUMO qo‘shiladi.",
  },
  "Персональные настройки": { en: "Personal settings", uz: "Shaxsiy sozlamalar" },
  "Настройки аккаунта": { en: "Account settings", uz: "Hisob sozlamalari" },
  "Тема оформления": { en: "Theme", uz: "Mavzu" },
  "Включить тёмную тему": { en: "Enable dark theme", uz: "Qorong‘i mavzuni yoqish" },
  "Включить светлую тему": { en: "Enable light theme", uz: "Yorug‘ mavzuni yoqish" },
  "Язык и тема сохраняются на этом устройстве. Email используется для входа; смена пароля пока не подключена.": {
    en: "Your language and theme are saved on this device. Your email is used to sign in; password changes are not available yet.",
    uz: "Til va mavzu ushbu qurilmada saqlanadi. Email kirish uchun ishlatiladi; parolni o‘zgartirish hozircha mavjud emas.",
  },
  "Помощь по Uriona": { en: "URIONA help", uz: "URIONA yordami" },
  "Частые вопросы": { en: "Frequently asked questions", uz: "Ko‘p so‘raladigan savollar" },
  "Как найти товар?": { en: "How do I find a product?", uz: "Mahsulotni qanday topaman?" },
  "Откройте каталог и воспользуйтесь строкой поиска. Если товары не загрузились, попробуйте позже.": {
    en: "Open the catalog and use the search bar. If products do not load, please try again later.",
    uz: "Katalogni ochib, qidiruv satridan foydalaning. Mahsulotlar yuklanmasa, keyinroq qayta urinib ko‘ring.",
  },
  "Где проверить заказ?": { en: "Where can I check my order?", uz: "Buyurtmani qayerdan tekshirish mumkin?" },
  "После оформления заказа его статус появится в разделе «Мои заказы» профиля.": {
    en: "After placing an order, its status will appear under “My orders” in your profile.",
    uz: "Buyurtma rasmiylashtirilgach, uning holati profildagi “Buyurtmalarim” bo‘limida ko‘rinadi.",
  },
  "Как сохранить товар?": { en: "How do I save a product?", uz: "Mahsulotni qanday saqlayman?" },
  "Нажмите на значок сердца на карточке товара. Избранное сохраняется в браузере на этом устройстве.": {
    en: "Tap the heart icon on a product card. Your wishlist is saved in this browser on this device.",
    uz: "Mahsulot kartasidagi yurak belgisini bosing. Saralanganlar ro‘yxati shu qurilmadagi brauzerda saqlanadi.",
  },
  "Открыть профиль": { en: "Open profile", uz: "Profilni ochish" },
  "Открыть корзину": { en: "Open cart", uz: "Savatni ochish" },
}, {
  "Контактный канал поддержки Uriona ещё не настроен. Мы не показываем фиктивный телефон или неработающий чат.": {
    en: "URIONA support contact details are not configured yet. We do not show a fake phone number or a non-working chat.",
    uz: "URIONA yordam xizmati aloqa ma’lumotlari hali sozlanmagan. Soxta telefon raqami yoki ishlamaydigan chat ko‘rsatilmaydi.",
  },
  "Раздел помощи": { en: "Help center", uz: "Yordam bo‘limi" },
  "Профиль сохранён": { en: "Profile saved", uz: "Profil saqlandi" },
  "Промокод добавлен в корзину": { en: "Promo code added to cart", uz: "Promo-kod savatga qo‘shildi" },
  "Вход выполнен": { en: "Signed in", uz: "Tizimga kirildi" },
  "Товар удалён из избранного": { en: "Product removed from wishlist", uz: "Mahsulot saralanganlardan olib tashlandi" },
  "Товар добавлен в избранное": { en: "Product added to wishlist", uz: "Mahsulot saralanganlarga qo‘shildi" },
  "Товар добавлен в корзину": { en: "Product added to cart", uz: "Mahsulot savatga qo‘shildi" },
  "Добавить в избранное": { en: "Add to wishlist", uz: "Saralanganlarga qo‘shish" },
  "Удалить из избранного": { en: "Remove from wishlist", uz: "Saralanganlardan olib tashlash" },
  "Поделиться": { en: "Share", uz: "Ulashish" },
  "Купить сейчас": { en: "Buy now", uz: "Hozir xarid qilish" },
  "Похожие товары": { en: "Similar items", uz: "O‘xshash mahsulotlar" },
  "Товары магазина": { en: "More from this store", uz: "Bu do‘kondagi mahsulotlar" },
  "Ссылка на товар скопирована": { en: "Product link copied", uz: "Mahsulot havolasi nusxalandi" },
  "Не удалось поделиться товаром": { en: "Could not share this product", uz: "Mahsulotni ulashib bo‘lmadi" },
  "Посмотреть магазин": { en: "Visit store", uz: "Do‘konga o‘tish" },
  "Загружаем похожие товары…": { en: "Loading similar items…", uz: "O‘xshash mahsulotlar yuklanmoqda…" },
  "Этот вариант сейчас недоступен": { en: "This option is currently unavailable", uz: "Bu variant hozir mavjud emas" },
  "Выберите вариант": { en: "Choose an option", uz: "Variantni tanlang" },
  "Добавить в корзину": { en: "Add to cart", uz: "Savatga qo‘shish" },
  "В наличии": { en: "In stock", uz: "Mavjud" },
  "Фотографии товара": { en: "Product photos", uz: "Mahsulot rasmlari" },
  "Фото": { en: "Photo", uz: "Rasm" },
  "покупок": { en: "purchases", uz: "xarid" },
  "Промокод не найден": { en: "Promo code not found", uz: "Promo-kod topilmadi" },
  "Введите промокод": { en: "Enter a promo code", uz: "Promo-kodni kiriting" },
  "Промокод SAVE10 применён": { en: "Promo code SAVE10 applied", uz: "SAVE10 promo-kodi qo‘llandi" },
  "Как это работает — скоро": { en: "How it works — coming soon", uz: "Bu qanday ishlaydi — tez orada" },
  "Оформление заказа ещё не подключено": { en: "Checkout is not available yet", uz: "Buyurtmani rasmiylashtirish hali mavjud emas" },
  "Письмо отправлено повторно на": { en: "Verification email resent to", uz: "Tasdiqlash xati qayta yuborildi:" },
  "Создан": { en: "Created", uz: "Yaratildi" },
  "Ожидает оплаты": { en: "Awaiting payment", uz: "To‘lov kutilmoqda" },
  "Оплачен": { en: "Paid", uz: "To‘langan" },
  "Собирается": { en: "Processing", uz: "Tayyorlanmoqda" },
  "Отправлен": { en: "Shipped", uz: "Jo‘natildi" },
  "Доставлен": { en: "Delivered", uz: "Yetkazildi" },
  "Отменён": { en: "Cancelled", uz: "Bekor qilindi" },
}, {
}, {
  "Доставка": { en: "Delivery", uz: "Yetkazib berish" },
  "Как это работает": { en: "How it works", uz: "Bu qanday ishlaydi" },
  "Центр помощи": { en: "Help center", uz: "Yordam markazi" },
  "Как оформить заказ?": { en: "How do I place an order?", uz: "Buyurtmani qanday rasmiylashtiraman?" },
  "Добавьте доступные товары в корзину и перейдите к оформлению. Сейчас оформление и приём оплаты ещё не подключены.": {
    en: "Add available products to your cart and proceed to checkout. Checkout and payment processing are not available yet.",
    uz: "Mavjud mahsulotlarni savatga qo‘shing va rasmiylashtirishga o‘ting. Buyurtma rasmiylashtirish va to‘lov hozircha ishlamaydi.",
  },
  "Где посмотреть статус заказа?": { en: "Where can I check my order status?", uz: "Buyurtma holatini qayerdan ko‘raman?" },
  "Статус оформленного заказа будет доступен в профиле, в разделе «Мои заказы».": {
    en: "Your order status will be available in the Profile under “My orders”.",
    uz: "Buyurtma holati Profilning “Buyurtmalarim” bo‘limida ko‘rinadi.",
  },
  "Открыть профиль": { en: "Open profile", uz: "Profilni ochish" },
  "Открыть корзину": { en: "Open cart", uz: "Savatni ochish" },
  "Контактный канал поддержки пока не настроен. Здесь не указан фиктивный телефон или неработающий чат.": {
    en: "Support contact details are not configured yet. We do not show a fake phone number or a non-working chat.",
    uz: "Yordam xizmati aloqa ma’lumotlari hali sozlanmagan. Soxta telefon raqami yoki ishlamaydigan chat ko‘rsatilmaydi.",
  },
  "Доставка по Узбекистану": { en: "Delivery across Uzbekistan", uz: "O‘zbekiston bo‘ylab yetkazib berish" },
  "Акции и скидки": { en: "Deals and discounts", uz: "Aksiya va chegirmalar" },
  "Поддержка открыта": { en: "Support opened", uz: "Yordam bo‘limi ochildi" },
  "Профиль открыт": { en: "Profile opened", uz: "Profil ochildi" },
  "Корзина открыта": { en: "Cart opened", uz: "Savat ochildi" },
  "Каталог открыт": { en: "Catalog opened", uz: "Katalog ochildi" },
  "Товар добавлен в корзину": { en: "Product added to cart", uz: "Mahsulot savatga qo‘shildi" },
  "Товар удалён из избранного": { en: "Product removed from wishlist", uz: "Mahsulot saralanganlardan olib tashlandi" },
  "Товар добавлен в избранное": { en: "Product added to wishlist", uz: "Mahsulot saralanganlarga qo‘shildi" },
  "Промокод не найден": { en: "Promo code not found", uz: "Promo-kod topilmadi" },
  "Введите промокод": { en: "Enter a promo code", uz: "Promo-kodni kiriting" },
  "SAVE10 действует для заказа от 500 000 сум": { en: "SAVE10 applies to orders over UZS 500,000", uz: "SAVE10 kodi 500 000 so‘mdan yuqori buyurtmalarga amal qiladi" },
  "Промокод SAVE10 применён": { en: "Promo code SAVE10 applied", uz: "SAVE10 promo-kodi qo‘llandi" },
  "Вход выполнен": { en: "Signed in", uz: "Tizimga kirildi" },
  "Профиль сохранён": { en: "Profile saved", uz: "Profil saqlandi" },
  "Как это работает — скоро": { en: "How it works — coming soon", uz: "Bu qanday ishlaydi — tez orada" },
  "Ваш заказ": { en: "Your order", uz: "Buyurtmangiz" },
  "шт.": { en: "items", uz: "dona" },
  "Корзина открыт": { en: "Cart opened", uz: "Savat ochildi" },
  "Категории открыт": { en: "Categories opened", uz: "Kategoriyalar ochildi" },
  "Главная открыт": { en: "Home opened", uz: "Bosh sahifa ochildi" },
  "В корзину": { en: "Add to cart", uz: "Savatga qo‘shish" },
  "Убрать": { en: "Remove", uz: "Olib tashlash" },
  "Сохранённых товаров сейчас отсутствуют в локальном каталоге. Когда каталог загрузится, они появятся здесь.": {
    en: "Saved products are currently missing from the local catalog. They will appear here once the catalog loads.",
    uz: "Saqlangan mahsulotlar hozir mahalliy katalogda yo‘q. Katalog yuklangach, ular shu yerda ko‘rinadi.",
  },
  "Отзывы можно оставить после доставки заказа. Публикация и хранение отзывов пока не подключены.": {
    en: "You can leave a review after your order is delivered. Review submission and storage are not available yet.",
    uz: "Buyurtma yetkazilgandan keyin sharh qoldirishingiz mumkin. Sharh yuborish va saqlash hozircha ishlamaydi.",
  },
  "Открыть справку": { en: "Open help center", uz: "Yordam markazini ochish" },
  "Вопросы продавцам и история ответов пока не подключены: для этого нужен разрешённый API продавцов и отдельный раздел товара.": {
    en: "Seller questions and answer history are not available yet. They require approved seller API access and a dedicated product section.",
    uz: "Sotuvchilarga savollar va javoblar tarixi hozircha ishlamaydi. Buning uchun sotuvchi API ruxsati va mahsulot bo‘limi kerak.",
  },
  "Купон Uriona": { en: "URIONA coupon", uz: "URIONA kuponi" },
  "Действует на товары при сумме от 500 000 сум. Применение будет доступно в корзине.": {
    en: "Valid on orders over UZS 500,000. It can be applied in the cart.",
    uz: "500 000 so‘mdan yuqori buyurtmalarga amal qiladi. Kuponni savatda qo‘llash mumkin.",
  },
  "Перейти в корзину": { en: "Go to cart", uz: "Savatga o‘tish" },
  "Промокод добавлен в корзину": { en: "Promo code added to cart", uz: "Promo-kod savatga qo‘shildi" },
  "Для оформления заказа": { en: "For checkout", uz: "Buyurtmani rasmiylashtirish uchun" },
  "Основной адрес доставки": { en: "Primary delivery address", uz: "Asosiy yetkazib berish manzili" },
  "Получатель": { en: "Recipient", uz: "Qabul qiluvchi" },
  "Имя получателя": { en: "Recipient name", uz: "Qabul qiluvchining ismi" },
  "Улица, дом, квартира": { en: "Street, building, apartment", uz: "Ko‘cha, uy, xonadon" },
  "Сохранить адрес": { en: "Save address", uz: "Manzilni saqlash" },
  "Сейчас профиль поддерживает один основной адрес. Несколько адресов добавим вместе с оформлением заказа.": {
    en: "Your profile currently supports one primary address. Multiple addresses will be available with checkout.",
    uz: "Hozircha profilda bitta asosiy manzilni saqlash mumkin. Buyurtmani rasmiylashtirish qo‘shilganda bir nechta manzil ham bo‘ladi.",
  },
}, {
  "Оплата картой пока не подключена": { en: "Card payments are not available yet", uz: "Karta orqali to‘lov hozircha ishlamaydi" },
  "Не вводите и не отправляйте данные банковской карты в профиль. Подключение UZCARD/HUMO появится после настройки платёжного провайдера.": {
    en: "Do not enter or send bank card details in your profile. UZCARD/HUMO payments will be added after a payment provider is configured.",
    uz: "Profilga bank karta ma’lumotlarini kiritmang yoki yubormang. To‘lov provayderi sozlangach, UZCARD/HUMO qo‘shiladi.",
  },
  "Персональные настройки": { en: "Personal settings", uz: "Shaxsiy sozlamalar" },
  "Настройки аккаунта": { en: "Account settings", uz: "Hisob sozlamalari" },
  "Тема оформления": { en: "Theme", uz: "Mavzu" },
  "Включить тёмную тему": { en: "Enable dark theme", uz: "Qorong‘i mavzuni yoqish" },
  "Включить светлую тему": { en: "Enable light theme", uz: "Yorug‘ mavzuni yoqish" },
  "Язык и тема сохраняются на этом устройстве. Email используется для входа; смена пароля пока не подключена.": {
    en: "Your language and theme are saved on this device. Your email is used to sign in; password changes are not available yet.",
    uz: "Til va mavzu ushbu qurilmada saqlanadi. Email kirish uchun ishlatiladi; parolni o‘zgartirish hozircha mavjud emas.",
  },
  "Помощь по Uriona": { en: "URIONA help", uz: "URIONA yordami" },
  "Частые вопросы": { en: "Frequently asked questions", uz: "Ko‘p so‘raladigan savollar" },
  "Как найти товар?": { en: "How do I find a product?", uz: "Mahsulotni qanday topaman?" },
  "Откройте каталог и воспользуйтесь строкой поиска. Если товары не загрузились, попробуйте позже.": {
    en: "Open the catalog and use the search bar. If products do not load, please try again later.",
    uz: "Katalogni ochib, qidiruv satridan foydalaning. Mahsulotlar yuklanmasa, keyinroq qayta urinib ko‘ring.",
  },
  "Где проверить заказ?": { en: "Where can I check my order?", uz: "Buyurtmani qayerdan tekshirish mumkin?" },
  "После оформления заказа его статус появится в разделе «Мои заказы» профиля.": {
    en: "After placing an order, its status will appear under “My orders” in your profile.",
    uz: "Buyurtma rasmiylashtirilgach, uning holati profildagi “Buyurtmalarim” bo‘limida ko‘rinadi.",
  },
  "Как сохранить товар?": { en: "How do I save a product?", uz: "Mahsulotni qanday saqlayman?" },
  "Нажмите на значок сердца на карточке товара. Избранное сохраняется в браузере на этом устройстве.": {
    en: "Tap the heart icon on a product card. Your wishlist is saved in this browser on this device.",
    uz: "Mahsulot kartasidagi yurak belgisini bosing. Saralanganlar ro‘yxati shu qurilmadagi brauzerda saqlanadi.",
  },
  "История покупок": { en: "Purchase history", uz: "Xaridlar tarixi" },
  "Обновить": { en: "Refresh", uz: "Yangilash" },
  "Фильтр заказов": { en: "Order filter", uz: "Buyurtmalar filtri" },
  "Загружаем заказы…": { en: "Loading orders…", uz: "Buyurtmalar yuklanmoqda…" },
  "Не удалось загрузить заказы": { en: "Could not load orders", uz: "Buyurtmalarni yuklab bo‘lmadi" },
  "Сохранённые товары": { en: "Saved products", uz: "Saqlangan mahsulotlar" },
  "Создан": { en: "Created", uz: "Yaratildi" },
  "Ожидает оплаты": { en: "Awaiting payment", uz: "To‘lov kutilmoqda" },
  "Оплачен": { en: "Paid", uz: "To‘langan" },
  "Собирается": { en: "Processing", uz: "Tayyorlanmoqda" },
  "Отправлен": { en: "Shipped", uz: "Jo‘natildi" },
  "Доставлен": { en: "Delivered", uz: "Yetkazildi" },
  "Отменён": { en: "Cancelled", uz: "Bekor qilindi" },
});

function localizeText(value: string, language: Language): string {
  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  const source = value.trim();
  const exact = uiTranslations[source]?.[language];
  if (exact) return `${leading}${exact}${trailing}`;
  const variant = source.match(/^Вариант (\d+)$/);
  if (variant) {
    const translated = language === "en" ? `Option ${variant[1]}` : language === "uz" ? `${variant[1]}-variant` : source;
    return `${leading}${translated}${trailing}`;
  }
  const productFallback = source.match(/^Товар (.+)$/);
  if (productFallback) {
    const translated = language === "en" ? `Product ${productFallback[1]}` : language === "uz" ? `${productFallback[1]} mahsulot` : source;
    return `${leading}${translated}${trailing}`;
  }
  const orderNumber = source.match(/^Заказ (.+)$/);
  if (orderNumber) {
    const translated = language === "en" ? `Order ${orderNumber[1]}` : language === "uz" ? `Buyurtma ${orderNumber[1]}` : source;
    return `${leading}${translated}${trailing}`;
  }
  const unavailableFavorites = source.match(/^(\d+) сохранённых товаров сейчас отсутствуют в локальном каталоге\. Когда каталог загрузится, они появятся здесь\.$/);
  if (unavailableFavorites) {
    const translated = language === "en"
      ? `${unavailableFavorites[1]} saved products are currently missing from the local catalog. They will appear here once the catalog loads.`
      : `${unavailableFavorites[1]} ta saqlangan mahsulot hozir mahalliy katalogda yo‘q. Katalog yuklangach, ular shu yerda ko‘rinadi.`;
    return `${leading}${translated}${trailing}`;
  }
  const resendNotice = source.match(/^Письмо отправлено повторно на (.+)\.$/);
  if (resendNotice) {
    const translated = language === "en"
      ? `Verification email resent to ${resendNotice[1]}.`
      : `Tasdiqlash xati ${resendNotice[1]} manziliga qayta yuborildi.`;
    return `${leading}${translated}${trailing}`;
  }
  const categoryNotice = source.match(/^(.+) (выбрана|активна)$/);
  if (categoryNotice) {
    const verb = language === "en" ? (categoryNotice[2] === "выбрана" ? "selected" : "active") : language === "uz" ? (categoryNotice[2] === "выбрана" ? "tanlandi" : "faol") : categoryNotice[2];
    return `${leading}${categoryNotice[1]} ${verb}${trailing}`;
  }
  return value;
}

function localizeNode(node: ReactNode, language: Language): ReactNode {
  if (typeof node === "string") return localizeText(node, language);
  if (Array.isArray(node)) return node.map((child) => localizeNode(child, language));
  if (!isValidElement<{ children?: ReactNode } & Record<string, unknown>>(node)) return node;

  const props = { ...node.props };
  props.children = localizeNode(props.children, language);
  for (const attribute of ["alt", "aria-label", "placeholder", "title"]) {
    if (typeof props[attribute] === "string") props[attribute] = localizeText(props[attribute], language);
  }
  return cloneElement(node, props);
}

const translations = {
  ru: {
    home: "Главная", categories: "Категории", cart: "Корзина", profile: "Профиль", catalog: "Каталог",
    sales: "Скидки", how: "Как заказать", delivery: "Доставка", support: "Поддержка",
    search: "Ищите товары и бренды", profileOpen: "Профиль открыт", cartOpen: "Корзина открыта", start: "Начать покупки",
    heroTitle: "Мировые товары", heroAccent: "по честной цене", heroText: "Выбираем товары у проверенных продавцов и доставляем их в Узбекистан.",
    safe: "Безопасная оплата", deliveryUz: "Доставка в Узбекистан", categoriesQuick: "Быстрый выбор", allCategories: "Все категории",
    best: "Лучшие предложения", popular: "Популярные товары", forYou: "Лучшие подборки для вас",
    searchResults: (query: string) => `Товары по запросу «${query}»`, seeAll: "Смотреть всё", payments: "Платежи", shipping: "Доставка",
    catalogPdd: "Категория", all: "Все категории", tags: "Все теги", goods: "Товары", allGoods: "Все товары",
    add: "Добавить", buy: "Купить", details: "Подробнее", loading: "Загружаем товары...", noGoods: "Товары не найдены.",
    lang: "Язык", light: "Светлая тема", dark: "Тёмная тема", loadingCatalog: "Загружаем каталог", apiError: "Ошибка каталога",
    sale: "Акции недели", discount: "Скидка",
    emptyCart: "Корзина пуста", addFromCatalog: "Добавьте товары из каталога и вернитесь сюда.", shop: "К покупкам",
    retry: "Повторить",
    emptyCategories: "Категории пока не загружены.", localCatalogLabel: "Каталог URIONA",
    localCatalogNote: "Показаны товары из каталога URIONA. Данные каталога сейчас недоступны.",
    affiliatePermissionError: "Каталог товаров временно недоступен. Попробуйте позже.",
    dropshippingAuthorizationError: "Для подробностей товара не подключена авторизация Dropshipping API.",
    dropshippingPermissionError: "Поиск товаров временно недоступен. Попробуйте позже.",
    catalogUnavailable: "Не удалось загрузить каталог. Проверьте подключение и попробуйте позже.",
    detailsUnavailable: "Не удалось получить подробности товара. Попробуйте позже.",
    localCatalogUnavailable: "Локальный каталог также временно недоступен.",
    sessionExpired: "Сессия истекла. Войдите снова, чтобы открыть профиль и заказы.",
  },
  en: {
    home: "Home", categories: "Categories", cart: "Cart", profile: "Profile", catalog: "Catalog",
    sales: "Deals", how: "How to order", delivery: "Delivery", support: "Support",
    search: "Search products and brands", profileOpen: "Profile opened", cartOpen: "Cart opened", start: "Start shopping",
    heroTitle: "Global products", heroAccent: "at a fair price", heroText: "We select products from trusted sellers and deliver them to Uzbekistan.",
    safe: "Secure payment", deliveryUz: "Delivery to Uzbekistan", categoriesQuick: "Quick pick", allCategories: "All categories",
    best: "Best offers", popular: "Popular products", forYou: "Best picks for you",
    searchResults: (query: string) => `Products for “${query}”`, seeAll: "View all", payments: "Payments", shipping: "Delivery",
    catalogPdd: "Category", all: "All categories", tags: "All tags", goods: "Products", allGoods: "All products",
    add: "Add", buy: "Buy", details: "Details", loading: "Loading products...", noGoods: "No products found.",
    lang: "Language", light: "Light theme", dark: "Dark theme", loadingCatalog: "Loading catalog", apiError: "Catalog error",
    sale: "Weekly deals", discount: "Sale",
    emptyCart: "Your cart is empty", addFromCatalog: "Add products from the catalog and come back here.", shop: "Start shopping",
    retry: "Retry",
    emptyCategories: "Categories are not available yet.", localCatalogLabel: "URIONA catalog",
    localCatalogNote: "Showing products saved in the URIONA catalog. Catalog data is currently unavailable.",
    affiliatePermissionError: "The product catalog is temporarily unavailable. Please try again later.",
    dropshippingAuthorizationError: "Dropshipping API authorization is not connected for product details.",
    dropshippingPermissionError: "Product search is temporarily unavailable. Please try again later.",
    catalogUnavailable: "Could not load the catalog. Check your connection and try again later.",
    detailsUnavailable: "Could not load product details. Try again later.",
    localCatalogUnavailable: "The local catalog is also temporarily unavailable.",
    sessionExpired: "Your session expired. Sign in again to view your profile and orders.",
  },
  uz: {
    home: "Bosh sahifa", categories: "Kategoriyalar", cart: "Savat", profile: "Profil", catalog: "Katalog",
    sales: "Chegirmalar", how: "Qanday buyurtma berish", delivery: "Yetkazib berish", support: "Yordam",
    search: "Mahsulot va brendlarni qidiring", profileOpen: "Profil ochildi", cartOpen: "Savat ochildi", start: "Xaridni boshlash",
    heroTitle: "Dunyo mahsulotlari", heroAccent: "halol narxda", heroText: "Ishonchli sotuvchilardan mahsulotlarni tanlaymiz va O‘zbekistonga yetkazamiz.",
    safe: "Xavfsiz to‘lov", deliveryUz: "O‘zbekistonga yetkazib berish", categoriesQuick: "Tezkor tanlov", allCategories: "Barcha kategoriyalar",
    best: "Eng yaxshi takliflar", popular: "Mashhur mahsulotlar", forYou: "Siz uchun eng yaxshi to‘plamlar",
    searchResults: (query: string) => `“${query}” so‘rovi bo‘yicha mahsulotlar`, seeAll: "Barchasini ko‘rish", payments: "To‘lovlar", shipping: "Yetkazib berish",
    catalogPdd: "Kategoriya", all: "Barcha kategoriyalar", tags: "Barcha teglar", goods: "Mahsulotlar", allGoods: "Barcha mahsulotlar",
    add: "Qo‘shish", buy: "Sotib olish", details: "Batafsil", loading: "Mahsulotlar yuklanmoqda...", noGoods: "Mahsulotlar topilmadi.",
    lang: "Til", light: "Yorug‘ rejim", dark: "Qorong‘i rejim", loadingCatalog: "Katalog yuklanmoqda", apiError: "Katalog xatosi",
    sale: "Haftalik chegirmalar", discount: "Chegirma",
    emptyCart: "Savat bo‘sh", addFromCatalog: "Katalogdan mahsulot qo‘shing va bu yerga qayting.", shop: "Xaridga o‘tish",
    retry: "Qayta urinish",
    emptyCategories: "Kategoriyalar hozircha mavjud emas.", localCatalogLabel: "URIONA katalogi",
    localCatalogNote: "URIONA katalogida saqlangan mahsulotlar ko‘rsatilmoqda. Katalog ma’lumotlari hozir mavjud emas.",
    affiliatePermissionError: "Mahsulotlar katalogi vaqtincha ishlamayapti. Keyinroq qayta urinib ko‘ring.",
    dropshippingAuthorizationError: "Mahsulot tafsilotlari uchun Dropshipping API avtorizatsiyasi ulanmagan.",
    dropshippingPermissionError: "Mahsulot qidiruvi vaqtincha ishlamayapti. Keyinroq qayta urinib ko‘ring.",
    catalogUnavailable: "Katalogni yuklab bo‘lmadi. Ulanishni tekshirib, keyinroq qayta urinib ko‘ring.",
    detailsUnavailable: "Mahsulot tafsilotlarini yuklab bo‘lmadi. Keyinroq qayta urinib ko‘ring.",
    localCatalogUnavailable: "Mahalliy katalog ham vaqtincha ishlamayapti.",
    sessionExpired: "Sessiya muddati tugadi. Profil va buyurtmalarni ko‘rish uchun qayta kiring.",
  },
} as const;
type View =
  | (typeof navItems)[number]
  | "Каталог"
  | "Магазины"
  | "Скидки"
  | "Как заказать"
  | "Доставка"
  | "Поддержка";

const LogoMark = ({ className = "" }: { className?: string }) => (
  <img className={className} src="/uriona-logo.png" alt="Логотип URIONA" />
);

const topMenuItems = [
  { label: "Каталог", view: "Каталог" as View, message: "Каталог открыт" },
  { label: "Магазины", view: "Магазины" as View, message: "Магазины продавцов" },
  { label: "Скидки", view: "Скидки" as View, message: "Акции и скидки" },
  { label: "Как заказать", view: "Как заказать" as View, message: "Как заказать" },
  { label: "Доставка", view: "Доставка" as View, message: "Доставка по Узбекистану" },
  { label: "Поддержка", view: "Поддержка" as View, message: "Поддержка открыта" },
];

const CART_STORAGE_KEY = "uriona-cart";
const PRODUCTS_STORAGE_KEY = "uriona-cart-products";
const LIKED_STORAGE_KEY = "uriona-liked-products";
const SELLERS_STORAGE_KEY = "uriona-seller-profiles";
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

function aliExpressErrorMessage(error: unknown, language: Language, context: "catalog" | "dropshipping" | "details"): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  const copy = translations[language];
  if (message.includes("insufficientpermission") || message.includes("does not have permission")) {
    return context === "details" || context === "dropshipping" ? copy.dropshippingPermissionError : copy.affiliatePermissionError;
  }
  if (context !== "catalog" && (message.includes("requires oauth authorization") || message.includes("access token"))) {
    return copy.dropshippingAuthorizationError;
  }
  return context === "details" ? copy.detailsUnavailable : copy.catalogUnavailable;
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

type SellerProfile = {
  id: string;
  name: string;
  logoUrl?: string;
  country?: string;
  rating?: string;
  positiveRate?: string;
  followers?: string;
  description?: string;
  updatedAt: string;
};

function isSellerProfile(value: unknown): value is SellerProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const seller = value as Record<string, unknown>;
  return typeof seller.id === "string" && typeof seller.name === "string" && typeof seller.updatedAt === "string";
}

function readStoredSellers(): SellerProfile[] {
  const stored = readStoredValue(SELLERS_STORAGE_KEY);
  return Array.isArray(stored) ? stored.filter(isSellerProfile).slice(-100) : [];
}

function readStoredLiked(): string[] {
  const stored = readStoredValue(LIKED_STORAGE_KEY);
  return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : [];
}

function sellerIdentity(id: string, name: string): string {
  return id.trim() || (name.trim() ? `name:${name.trim().toLocaleLowerCase()}` : "");
}

function mergeSellerProfiles(current: SellerProfile[], incoming: SellerProfile[]): SellerProfile[] {
  const merged = new Map(current.map((seller) => [seller.id, seller]));
  for (const seller of incoming) {
    if (!seller.id || !seller.name) continue;
    const previous = merged.get(seller.id);
    merged.set(seller.id, {
      ...previous,
      ...seller,
      logoUrl: seller.logoUrl || previous?.logoUrl,
      country: seller.country || previous?.country,
      rating: seller.rating || previous?.rating,
      positiveRate: seller.positiveRate || previous?.positiveRate,
      followers: seller.followers || previous?.followers,
      description: seller.description || previous?.description,
    });
  }
  return Array.from(merged.values()).slice(-100);
}

type AliExpressProductDetails = {
  subject: string;
  description: string;
  status: string;
  categoryId: string;
  images: string[];
  videos: string[];
  storeName: string;
  storeId: string;
  storeLogoUrl: string;
  storeCountry: string;
  storeRating: string;
  storePositiveRate: string;
  storeFollowers: string;
  storeDescription: string;
  skus: Record<string, unknown>[];
  rating: string;
  orders: string;
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

function skuIsAvailable(sku: Record<string, unknown>): boolean {
  const stock = readString(sku, "sku_available_stock");
  const quantity = Number(stock);
  return !stock || !Number.isFinite(quantity) || quantity > 0;
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
  const detailHtml = readString(base, "detail", "mobile_detail");
  const description = typeof DOMParser === "undefined"
    ? detailHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
    : new DOMParser().parseFromString(detailHtml, "text/html").body.textContent?.replace(/\s+/g, " ").trim() ?? "";

  return {
    subject: readString(base, "subject"),
    description,
    status: readString(base, "product_status_type"),
    categoryId: readString(base, "category_id"),
    images: Array.from(new Set(rawImages.map((image) => marketplaceImageUrl(image)).filter((image): image is string => Boolean(image)))),
    videos,
    storeName: readString(store, "store_name", "shop_name", "ae_store_name"),
    storeId: readString(store, "store_id", "shop_id", "seller_id"),
    storeLogoUrl: marketplaceImageUrl(readString(store, "store_logo", "shop_logo", "logo_url") || null) || "",
    storeCountry: readString(store, "store_country", "country", "country_name"),
    storeRating: readString(store, "store_rating", "seller_rating", "evaluation_rating", "avg_evaluation_rating"),
    storePositiveRate: readString(store, "positive_feedback_rate", "positive_rate", "positive_feedback"),
    storeFollowers: readString(store, "followers", "follower_count", "follow_count"),
    storeDescription: readString(store, "store_description", "description", "shop_description"),
    skus,
    rating: readString(base, "avg_evaluation_rating"),
    orders: readString(base, "sales_count"),
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
  const categoryLabel = (category?: ApiCategory | null) => language === "uz"
    ? category?.nameUz || category?.nameRu
    : category?.nameRu || category?.nameUz;
  const productTitle = (product: Pick<ApiProduct, "titleRu" | "titleUz">) => language === "uz"
    ? product.titleUz || product.titleRu
    : product.titleRu || product.titleUz;
  const productDescription = (product: ApiProduct) => language === "uz"
    ? product.descriptionUz || product.descriptionRu
    : product.descriptionRu || product.descriptionUz;
  const [view, setView] = useState<View>("Главная");
  const [productGridColumns, setProductGridColumns] = useState<2 | 3 | 4>(() => {
    const stored = localStorage.getItem("uriona-product-grid-columns");
    if (stored === "2" || stored === "3" || stored === "4") return Number(stored) as 2 | 3 | 4;
    return window.innerWidth <= 620 ? 2 : 4;
  });
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [imageSearchFile, setImageSearchFile] = useState<File | null>(null);
  const [imageSearchPreview, setImageSearchPreview] = useState("");
  const [imageSearchResults, setImageSearchResults] = useState<ImageSearchMatch[]>([]);
  const [imageSearchLoading, setImageSearchLoading] = useState(false);
  const [imageSearchError, setImageSearchError] = useState("");
  const imageSearchInputRef = useRef<HTMLInputElement>(null);
  const imageSearchPreviewRef = useRef("");
  const imageSearchRequestRef = useRef(0);
  const [recommendationKeywords] = useState(() => shuffleItems(HOME_RECOMMENDATION_KEYWORDS).slice(0, 6));
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const heroPointerStart = useRef<number | null>(null);
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [categoryParentId, setCategoryParentId] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState("");
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [catalogHasMore, setCatalogHasMore] = useState(false);
  const [catalogLoadingMore, setCatalogLoadingMore] = useState(false);
  const [catalogMoreError, setCatalogMoreError] = useState("");
  const [catalogMoreRetry, setCatalogMoreRetry] = useState(0);
  const [catalogPaginationTick, setCatalogPaginationTick] = useState(0);
  const catalogPageRef = useRef(1);
  const catalogLoadLockRef = useRef<object | null>(null);
  const catalogLoadMoreRef = useRef<HTMLDivElement | null>(null);
  const [liveCatalog, setLiveCatalog] = useState(false);
  const [catalogSource, setCatalogSource] = useState<"loading" | "aliexpress" | "local" | "unavailable">("loading");
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [catalogAttempt, setCatalogAttempt] = useState(0);
  const [detailProduct, setDetailProduct] = useState<ApiProduct | null>(null);
  const [detailPayload, setDetailPayload] = useState<unknown>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailAttempt, setDetailAttempt] = useState(0);
  const [selectedDetailImage, setSelectedDetailImage] = useState(0);
  const [selectedSkuProperties, setSelectedSkuProperties] = useState<Record<string, string>>({});
  const [relatedProducts, setRelatedProducts] = useState<ApiProduct[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedError, setRelatedError] = useState("");
  const [hoveredProductId, setHoveredProductId] = useState<string | null>(null);
  const [hoverProductImages, setHoverProductImages] = useState<Record<string, string[]>>({});
  const [hoverImageIndexes, setHoverImageIndexes] = useState<Record<string, number>>({});
  const hoverPointerPositions = useRef<Record<string, number>>({});
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
  const [sellerProfiles, setSellerProfiles] = useState<SellerProfile[]>(readStoredSellers);
  const [selectedSellerId, setSelectedSellerId] = useState("");
  const [sellerFetchLoading, setSellerFetchLoading] = useState(false);
  const [sellerFetchError, setSellerFetchError] = useState("");
  const sellerFetchAttempted = useRef(new Set<string>());
  const hoverImageCache = useRef(new Map<string, string[]>());
  const sharedProductId = useRef(new URLSearchParams(window.location.search).get("product"));
  const sharedProductHandled = useRef(false);
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
    if (!detailProduct || !productDetails) return;
    const enrichedProduct: ApiProduct = {
      ...detailProduct,
      categoryId: productDetails.categoryId || detailProduct.categoryId,
      titleRu: productDetails.subject || detailProduct.titleRu,
      titleUz: productDetails.subject || detailProduct.titleUz,
      descriptionRu: productDetails.description || detailProduct.descriptionRu,
      descriptionUz: productDetails.description || detailProduct.descriptionUz,
      imageUrl: productDetails.images[0] || detailProduct.imageUrl,
      rating: productDetails.rating || detailProduct.rating,
      orders: productDetails.orders || detailProduct.orders,
      sellerId: sellerIdentity(productDetails.storeId, productDetails.storeName) || detailProduct.sellerId,
      sellerName: productDetails.storeName || detailProduct.sellerName,
      sellerLogoUrl: productDetails.storeLogoUrl || detailProduct.sellerLogoUrl,
      sellerCountry: productDetails.storeCountry || detailProduct.sellerCountry,
      sellerRating: productDetails.storeRating || detailProduct.sellerRating,
      sellerPositiveRate: productDetails.storePositiveRate || detailProduct.sellerPositiveRate,
      sellerFollowers: productDetails.storeFollowers || detailProduct.sellerFollowers,
      sellerDescription: productDetails.storeDescription || detailProduct.sellerDescription,
      category: categories.find((category) => category.id === productDetails.categoryId) ?? detailProduct.category,
    };
    setKnownProducts((current) => Array.from(
      new Map([...current, enrichedProduct].map((product) => [product.id, product])).values(),
    ).slice(-100));
    const sellerId = sellerIdentity(productDetails.storeId, productDetails.storeName);
    if (sellerId && productDetails.storeName) {
      setSellerProfiles((current) => mergeSellerProfiles(current, [{
        id: sellerId,
        name: productDetails.storeName,
        logoUrl: productDetails.storeLogoUrl || undefined,
        country: productDetails.storeCountry || undefined,
        rating: productDetails.storeRating || undefined,
        positiveRate: productDetails.storePositiveRate || undefined,
        followers: productDetails.storeFollowers || undefined,
        description: productDetails.storeDescription || undefined,
        updatedAt: new Date().toISOString(),
      }]));
    }
  }, [detailProduct, productDetails, categories]);
  const detailSkuGroups = useMemo(() => {
    if (!productDetails) return [];
    const groups = new Map<string, { name: string; values: string[] }>();
    for (const sku of productDetails.skus) {
      for (const property of readRecords(sku.ae_sku_property_dtos)) {
        const id = readString(property, "sku_property_id", "property_name", "sku_property_name");
        const name = readString(property, "sku_property_name", "property_name", "prop_name") || id;
        const value = readString(property, "sku_property_value", "property_value", "prop_value");
        if (!id || !value) continue;
        const group = groups.get(id) ?? { name, values: [] };
        if (!group.values.includes(value)) group.values.push(value);
        groups.set(id, group);
      }
    }
    return Array.from(groups, ([id, group]) => ({ id, ...group }));
  }, [productDetails]);
  const selectedDetailSku = useMemo(() => {
    if (!productDetails) return null;
    if (!detailSkuGroups.length) return productDetails.skus.find(skuIsAvailable) ?? null;
    if (detailSkuGroups.some((group) => !selectedSkuProperties[group.id])) return null;
    return productDetails.skus.find((sku) => {
      const skuProperties = readRecords(sku.ae_sku_property_dtos);
      return detailSkuGroups.every((group) => {
        const property = skuProperties.find((item) =>
          readString(item, "sku_property_id", "property_name", "sku_property_name") === group.id
        );
        return property && readString(property, "sku_property_value", "property_value", "prop_value") === selectedSkuProperties[group.id];
      });
    }) ?? null;
  }, [productDetails, detailSkuGroups, selectedSkuProperties]);

  const clearExpiredSession = (email?: string | null) => {
    localStorage.removeItem("uriona-access-token");
    setAuthToken("");
    setProfile(null);
    setOrders([]);
    setOrdersLoading(false);
    setOrdersError("");
    setAuthEmail(email || "");
    setAuthMode("login");
    setProfileSection("overview");
    setAuthNotice(text.sessionExpired);
    setView("Профиль");
  };

  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    localStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(knownProducts.slice(-100)));
  }, [knownProducts]);

  useEffect(() => {
    localStorage.setItem(SELLERS_STORAGE_KEY, JSON.stringify(sellerProfiles.slice(-100)));
  }, [sellerProfiles]);

  useEffect(() => {
    localStorage.setItem(LIKED_STORAGE_KEY, JSON.stringify(liked));
  }, [liked]);

  useEffect(() => {
    const productId = sharedProductId.current;
    if (sharedProductHandled.current || !productId || !/^\d+$/.test(productId)) return;
    sharedProductHandled.current = true;
    const cachedProduct = knownProducts.find((product) => product.id === productId)
      ?? products.find((product) => product.id === productId);
    setDetailProduct(cachedProduct ?? {
      id: productId,
      categoryId: null,
      titleUz: "",
      titleRu: "",
      currency: "UZS",
      priceMinor: 0,
      status: "popular",
    });
  }, []);

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
        clearExpiredSession(profile?.email);
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
        if (!active) return;
        if (error instanceof ApiRequestError && error.status === 401) {
          clearExpiredSession(profile.email);
          return;
        }
        setOrdersError(error instanceof Error ? error.message : "Не удалось загрузить заказы");
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
        if (liveCategories.length) {
          setCategories(liveCategories);
          setCategoriesError("");
          return;
        }
        return api.categories().then((localCategories) => {
          if (!active) return;
          setCategories(localCategories);
          setCategoriesError(localCategories.length ? "" : text.emptyCategories);
        });
      })
      .catch(async (error: unknown) => {
        if (!active) return;
        try {
          const localCategories = await api.categories();
          if (!active) return;
          setCategories(localCategories);
          setCategoriesError(localCategories.length ? "" : aliExpressErrorMessage(error, language, "catalog"));
        } catch {
          if (!active) return;
          setCategories([]);
          setCategoriesError(text.localCatalogUnavailable);
        }
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
    setSelectedDetailImage(0);
    setSelectedSkuProperties({});
    api.aliexpress.productDetails(detailProduct.id, {
      ship_to_country: "UZ",
      target_currency: "UZS",
      target_language: language === "en" ? "en_US" : language === "uz" ? "uz_UZ" : "ru_RU",
    })
      .then((payload) => {
        if (active) setDetailPayload(payload);
      })
      .catch((error: unknown) => {
        if (active) setDetailError(aliExpressErrorMessage(error, language, "details"));
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => { active = false; };
  }, [detailProduct, detailAttempt, language]);

  useEffect(() => {
    if (!detailProduct || !productDetails) {
      setRelatedProducts([]);
      setRelatedLoading(false);
      setRelatedError("");
      return;
    }
    const categoryId = productDetails.categoryId || detailProduct.categoryId || undefined;
    const categoryName = categoryLabel(detailProduct.category) || "";
    const relatedKeyword = prepareMarketplaceQuery(`${categoryName} ${productDetails.subject}`)
      .split(" ")
      .filter(Boolean)
      .slice(0, 5)
      .join(" ");
    if (!relatedKeyword) {
      setRelatedProducts([]);
      setRelatedLoading(false);
      setRelatedError("");
      return;
    }

    let active = true;
    setRelatedProducts([]);
    setRelatedError("");
    setRelatedLoading(true);
    const fetchRelated = (keyWord: string, filterByCategory: boolean) =>
      api.aliexpress.dropshippingProducts({
        keyWord,
        ...(filterByCategory && categoryId && /^\d+$/.test(categoryId) ? { categoryId } : {}),
        pageIndex: 1,
        pageSize: 20,
        currency: "UZS",
      }).then((payload) => mapMarketplaceGoods(payload, "UZS")
        .filter((product) => product.id !== detailProduct.id)
        .map((product) => ({
          ...product,
          category: categories.find((category) => category.id === product.categoryId) ?? detailProduct.category ?? null,
        })));
    const fallbackKeyword = prepareMarketplaceQuery(categoryName)
      || prepareMarketplaceQuery(productDetails.subject).split(" ").slice(0, 3).join(" ");
    const loadRelated = async () => {
      try {
        const primary = await fetchRelated(relatedKeyword, Boolean(categoryId));
        if (primary.length || !fallbackKeyword || fallbackKeyword === relatedKeyword) return primary;
      } catch (error) {
        console.warn("Specific related-product search failed; trying the broader category search", error);
      }
      return fallbackKeyword && fallbackKeyword !== relatedKeyword
        ? fetchRelated(fallbackKeyword, false)
        : [];
    };
    loadRelated().then((items) => {
      if (!active) return;
      setRelatedProducts(items.slice(0, 8));
    }).catch((error: unknown) => {
      if (active) setRelatedError(aliExpressErrorMessage(error, language, "dropshipping"));
    }).finally(() => {
      if (active) setRelatedLoading(false);
    });
    return () => { active = false; };
  }, [detailProduct, productDetails, categories, language]);

  useEffect(() => {
    if (!liveCatalog || !hoveredProductId || !/^\d+$/.test(hoveredProductId)) return;
    let active = true;
    const cachedImages = hoverImageCache.current.get(hoveredProductId);
    if (cachedImages) {
      setHoverProductImages((images) => ({ ...images, [hoveredProductId]: cachedImages }));
      setHoverImageIndexes((indexes) => ({ ...indexes, [hoveredProductId]: 0 }));
      return () => { active = false; };
    }
    api.aliexpress.productDetails(hoveredProductId, {
      ship_to_country: "UZ",
      target_currency: "UZS",
      target_language: language === "en" ? "en_US" : language === "uz" ? "uz_UZ" : "ru_RU",
    }).then((payload) => {
      if (!active) return;
      const images = parseAliExpressProductDetails(payload).images;
      if (images.length < 2) return;
      hoverImageCache.current.set(hoveredProductId, images);
      setHoverProductImages((current) => ({ ...current, [hoveredProductId]: images }));
      const pointerPosition = hoverPointerPositions.current[hoveredProductId] ?? 0;
      const baseImage = products.find((product) => product.id === hoveredProductId)?.imageUrl
        ?? knownProducts.find((product) => product.id === hoveredProductId)?.imageUrl;
      const previewCount = Math.min(new Set([baseImage, ...images].filter(Boolean)).size, PRODUCT_PREVIEW_ZONES);
      setHoverImageIndexes((current) => ({
        ...current,
        [hoveredProductId]: Math.min(Math.floor(pointerPosition * previewCount), previewCount - 1),
      }));
    }).catch((error: unknown) => {
      if (active) console.error("Не удалось загрузить фотографии для предпросмотра товара", error);
    });
    return () => {
      active = false;
    };
  }, [hoveredProductId, language, liveCatalog]);

  useEffect(() => {
    if (view !== "Главная" || products.length < 2) return;
    const interval = window.setInterval(() => {
      setHeroSlideIndex((index) => (index + 1) % Math.min(products.length, 5));
    }, 5200);
    return () => window.clearInterval(interval);
  }, [view, products.length]);

  const previousViewForSellers = useRef<View>(view);
  useEffect(() => {
    const previousView = previousViewForSellers.current;
    previousViewForSellers.current = view;
    if (view !== "Магазины" || previousView === "Магазины" || !products.length) return;
    setKnownProducts((current) => Array.from(
      new Map([...current, ...products].map((product) => [product.id, product])).values(),
    ).slice(-100));
  }, [view]);

  useEffect(() => {
    if ((view === "Категории" || view === "Каталог") && selectedCat === "all" && !search.trim()) {
      setProducts([]);
      catalogPageRef.current = 1;
      setCatalogHasMore(false);
      setCatalogLoadingMore(false);
      setCatalogMoreError("");
      catalogLoadLockRef.current = null;
      setLiveCatalog(false);
      setCatalogLoading(false);
      setCatalogError("");
      setCatalogSource("loading");
      return;
    }

    let active = true;
    catalogPageRef.current = 1;
    catalogLoadLockRef.current = null;
    setProducts([]);
    setCatalogHasMore(false);
    setCatalogLoadingMore(false);
    setCatalogMoreError("");
    setCatalogLoading(true);
    setCatalogError("");
    setCatalogSource("loading");
    const timer = window.setTimeout(() => {
      const searchTerm = search.trim();
      if (searchTerm && !prepareMarketplaceQuery(searchTerm)) {
        setProducts([]);
        setCatalogHasMore(false);
        setLiveCatalog(true);
        setCatalogSource("aliexpress");
        setCatalogLoading(false);
        return;
      }
      const isHomeRecommendations = view === "Главная" && selectedCat === "all" && !searchTerm;
      const useDropshippingSearch = selectedCat !== "all" || Boolean(searchTerm) || isHomeRecommendations;
      const selectedCategory = categories.find((category) => category.id === selectedCat);
      const categoryKeyword = selectedCat !== "all" ? categoryLabel(selectedCategory)?.trim() : "";
      const marketplaceCategoryId = selectedCat !== "all"
        ? selectedCat
        : inferMarketplaceCategoryId(searchTerm, categories);
      const filters = {
        ...(searchTerm ? { keywords: searchTerm } : {}),
        ...(selectedCat !== "all" ? { category_ids: selectedCat } : {}),
        page_no: 1,
        page_size: 20,
        target_currency: "CNY",
      };
      const useLocalCatalog = async (marketplaceError?: unknown) => {
        try {
          const localResult = await api.products({
            ...(search.trim() ? { search: search.trim() } : {}),
            ...(selectedCat !== "all" ? { categoryId: selectedCat } : {}),
            page: 1,
            limit: 20,
          });
          if (!active) return;
          const localProducts = localResult.items.map((product) => ({
            ...product,
            status: "popular",
            category: product.category ?? categories.find((category) => category.id === product.categoryId) ?? null,
          }));
          setProducts(localProducts);
          catalogPageRef.current = 1;
          setCatalogHasMore(localResult.page < localResult.pages);
          setLiveCatalog(false);
          setCatalogSource(localProducts.length ? "local" : "unavailable");
          setCatalogError(localProducts.length
            ? ""
            : marketplaceError
              ? aliExpressErrorMessage(marketplaceError, language, "catalog")
              : text.noGoods);
          if (localProducts.length) {
            setKnownProducts((current) => Array.from(new Map([...current, ...localProducts].map((product) => [product.id, product])).values()).slice(-100));
          }
        } catch {
          if (!active) return;
          setProducts([]);
          setCatalogHasMore(false);
          setLiveCatalog(false);
          setCatalogSource("unavailable");
          setCatalogError(text.localCatalogUnavailable);
        }
      };
      const load = useDropshippingSearch
        ? isHomeRecommendations
          ? loadHomeRecommendationPage(recommendationKeywords, 1)
          : api.aliexpress.dropshippingProducts({
              keyWord: prepareMarketplaceQuery(searchTerm) || categoryKeyword || recommendationKeywords[0],
              ...(marketplaceCategoryId ? { categoryId: marketplaceCategoryId } : {}),
              pageIndex: 1,
              pageSize: 20,
              ...(selectedCat !== "all" ? { sortBy: "orders,desc" } : {}),
              currency: "UZS",
            }).then((payload) => mapMarketplaceGoods(payload, "UZS"))
        : api.aliexpress.hotProducts(filters).then((payload) => mapMarketplaceGoods(payload, "CNY"));
      load.then((mappedProducts) => {
        if (!active) return;
        const categorizedProducts = mappedProducts.map((product) => ({
          ...product,
          category: categories.find((category) => category.id === product.categoryId)
            ?? categories.find((category) => category.id === selectedCat)
            ?? null,
        }));
        const uniqueMappedProducts = Array.from(new Map(categorizedProducts.map((product) => [product.id, product])).values());
        const liveProducts = isHomeRecommendations ? shuffleItems(uniqueMappedProducts) : uniqueMappedProducts;
        if (!liveProducts.length) {
          if (useDropshippingSearch) {
            setProducts([]);
            setCatalogHasMore(false);
            setLiveCatalog(true);
            setCatalogSource("aliexpress");
            setCatalogError("");
            return;
          }
          return useLocalCatalog();
        }
        setProducts(liveProducts);
        catalogPageRef.current = 1;
        setCatalogHasMore(liveProducts.length >= 20);
        setLiveCatalog(true);
        setCatalogSource("aliexpress");
        setCatalogLoading(false);
        setKnownProducts((current) => Array.from(new Map([...current, ...liveProducts].map((product) => [product.id, product])).values()).slice(-100));
      }).catch((error: unknown) => {
        if (!active) return;
        if (useDropshippingSearch) {
          setProducts([]);
          setCatalogHasMore(false);
          setLiveCatalog(true);
          setCatalogSource("unavailable");
          setCatalogError(aliExpressErrorMessage(error, language, "dropshipping"));
          return;
        }
        return useLocalCatalog(error);
      }).finally(() => {
        if (active) setCatalogLoading(false);
      });
    }, search.trim() ? 400 : 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [search, selectedCat, categories, language, catalogAttempt, recommendationKeywords, view]);

  useEffect(() => {
    const isHomeRecommendations = view === "Главная" && selectedCat === "all" && !search.trim();
    const canPaginate = isHomeRecommendations
      || ((view === "Категории" || view === "Каталог") && (selectedCat !== "all" || Boolean(search.trim())));
    const sentinel = catalogLoadMoreRef.current;
    if (
      !canPaginate
      || !catalogHasMore
      || catalogLoading
      || catalogMoreError
      || !products.length
      || !sentinel
    ) return;

    let active = true;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting) || catalogLoadLockRef.current) return;

      const requestLock = {};
      catalogLoadLockRef.current = requestLock;
      setCatalogLoadingMore(true);
      const pageIndex = catalogPageRef.current + 1;
      const searchTerm = search.trim();
      const isHomeRecommendations = view === "Главная" && selectedCat === "all" && !searchTerm;
      const selectedCategory = categories.find((category) => category.id === selectedCat);
      const categoryKeyword = selectedCat !== "all" ? categoryLabel(selectedCategory)?.trim() : "";
      const marketplaceCategoryId = selectedCat !== "all"
        ? selectedCat
        : inferMarketplaceCategoryId(searchTerm, categories);

      const loadPage = catalogSource === "local"
        ? api.products({
            ...(searchTerm ? { search: searchTerm } : {}),
            ...(selectedCat !== "all" ? { categoryId: selectedCat } : {}),
            page: pageIndex,
            limit: 20,
          }).then((result) => ({
            products: result.items.map((product) => ({
              ...product,
              status: "popular",
              category: product.category ?? categories.find((category) => category.id === product.categoryId) ?? null,
            })),
            hasMore: result.page < result.pages,
          }))
        : isHomeRecommendations
          ? loadHomeRecommendationPage(recommendationKeywords, pageIndex).then((products) => ({
              products: products.map((product) => ({
                ...product,
                category: categories.find((category) => category.id === product.categoryId) ?? null,
              })),
              hasMore: products.length >= 20,
            }))
          : api.aliexpress.dropshippingProducts({
            keyWord: prepareMarketplaceQuery(searchTerm) || categoryKeyword || recommendationKeywords[0],
            ...(marketplaceCategoryId ? { categoryId: marketplaceCategoryId } : {}),
            pageIndex,
            pageSize: 20,
            ...(selectedCat !== "all" ? { sortBy: "orders,desc" } : {}),
            currency: "UZS",
          }).then((payload) => {
            const products = mapMarketplaceGoods(payload, "UZS").map((product) => ({
              ...product,
              category: categories.find((category) => category.id === product.categoryId)
                ?? categories.find((category) => category.id === selectedCat)
                ?? null,
            }));
            return { products, hasMore: products.length >= 20 };
          });

      loadPage
        .then(({ products: pageProducts, hasMore }) => {
          if (!active) return;
          const existingIds = new Set(products.map((product) => product.id));
          const newProducts = pageProducts.filter((product) => !existingIds.has(product.id));
          catalogPageRef.current = pageIndex;
          setProducts((current) => {
            const currentIds = new Set(current.map((product) => product.id));
            return [...current, ...newProducts.filter((product) => !currentIds.has(product.id))];
          });
          setCatalogHasMore(hasMore && newProducts.length > 0);
          setCatalogMoreError("");
          if (newProducts.length) {
            setKnownProducts((current) => Array.from(new Map([...current, ...newProducts].map((product) => [product.id, product])).values()).slice(-100));
          }
        })
        .catch(() => {
          if (active) setCatalogMoreError(localizeText("Не удалось загрузить ещё товары. Нажмите, чтобы повторить.", language));
        })
        .finally(() => {
          if (catalogLoadLockRef.current === requestLock) {
            catalogLoadLockRef.current = null;
            setCatalogLoadingMore(false);
            setCatalogPaginationTick((tick) => tick + 1);
          }
        });
    }, { rootMargin: "500px 0px" });

    observer.observe(sentinel);
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [
    view,
    selectedCat,
    search,
    categories,
    language,
    recommendationKeywords,
    catalogSource,
    catalogHasMore,
    catalogLoading,
    catalogMoreError,
    catalogMoreRetry,
    catalogPaginationTick,
    products,
  ]);

  const visibleProducts = useMemo(() => {
    if (!search.trim()) return products;
    return searchProducts(products, search, categories);
  }, [products, search, categories]);
  const matchingSearchProducts = useMemo(
    () => search.trim() ? searchProducts([...products, ...knownProducts], search, categories) : [],
    [products, knownProducts, search, categories],
  );
  const suggestedSearchCategories = useMemo(
    () => search.trim().length >= 3 ? suggestCategories(categories, search) : [],
    [categories, search],
  );
  const searchFallbackProducts = useMemo(() => {
    if (!search.trim() || visibleProducts.length) return [];
    const matching = matchingSearchProducts.filter((product) => !products.some((loaded) => loaded.id === product.id));
    if (matching.length) return matching.slice(0, 4);
    return [...knownProducts]
      .sort((first, second) => productPopularity(second) - productPopularity(first))
      .slice(0, 4);
  }, [search, visibleProducts, matchingSearchProducts, products, knownProducts]);
  const searchSuggestionProducts = useMemo(() => {
    if (search.trim().length < 3) return [];
    const uniqueProducts = Array.from(new Map([...products, ...knownProducts].map((product) => [product.id, product])).values());
    const matching = searchProducts(uniqueProducts, search, categories);
    if (matching.length) return matching.slice(0, 4);
    return uniqueProducts
      .sort((first, second) => productPopularity(second) - productPopularity(first))
      .slice(0, 4);
  }, [search, products, knownProducts, categories]);

  const sellerDirectory = useMemo(() => {
    const directory = new Map(sellerProfiles.map((seller) => [seller.id, seller]));
    const discovered: SellerProfile[] = [];
    for (const product of [...knownProducts, ...products]) {
      const id = sellerIdentity(product.sellerId ?? "", product.sellerName ?? "");
      if (!id || !product.sellerName) continue;
      discovered.push({
        id,
        name: product.sellerName,
        logoUrl: product.sellerLogoUrl,
        country: product.sellerCountry,
        rating: product.sellerRating,
        positiveRate: product.sellerPositiveRate,
        followers: product.sellerFollowers,
        description: product.sellerDescription,
        updatedAt: new Date().toISOString(),
      });
    }
    for (const seller of mergeSellerProfiles(Array.from(directory.values()), discovered)) {
      directory.set(seller.id, seller);
    }
    return Array.from(directory.values()).sort((first, second) => first.name.localeCompare(second.name));
  }, [sellerProfiles, knownProducts, products]);
  const selectedSeller = sellerDirectory.find((seller) => seller.id === selectedSellerId);
  const selectedSellerProducts = useMemo(() => {
    if (!selectedSellerId) return [];
    return Array.from(new Map([...knownProducts, ...products]
      .filter((product) => sellerIdentity(product.sellerId ?? "", product.sellerName ?? "") === selectedSellerId)
      .map((product) => [product.id, product])).values());
  }, [products, knownProducts, selectedSellerId]);

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
  const activeCategoryParentId = categoryParentId ?? topLevelCategories[0]?.id ?? null;
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
    return categoryChildren.get(activeCategoryParentId ?? "root") ?? [];
  }, [categories, categoryChildren, activeCategoryParentId, categorySearch]);

  const catalogMessage = catalogLoading
    ? text.loading
    : catalogError || (visibleProducts.length === 0
      ? search.trim()
        ? localizeText("По запросу ничего не найдено", language)
        : text.noGoods
      : "");
  const saleProducts = products.filter((product) => product.status === "sale");
  const saleMessage = catalogLoading ? text.loading : catalogError || (saleProducts.length === 0 ? text.noGoods : "");

  const cartEntryList = knownProducts.filter((product) => cartItems[product.id]);
  const cartCount = cartEntryList.reduce((sum, product) => sum + (cartItems[product.id] ?? 0), 0);
  const subtotal = cartEntryList.reduce((sum, product) => sum + product.priceMinor * (cartItems[product.id] ?? 0), 0);
  const detailImages = productDetails?.images.length
    ? productDetails.images
    : detailProduct?.imageUrl ? [detailProduct.imageUrl] : [];
  const detailSkuPrice = selectedDetailSku
    ? Number(readString(selectedDetailSku, "offer_sale_price", "sku_price").replace(",", "."))
    : 0;
  const detailSkuStock = selectedDetailSku ? readString(selectedDetailSku, "sku_available_stock") : "";
  const detailSkuCanBeAdded = Boolean(selectedDetailSku && skuIsAvailable(selectedDetailSku) && readString(selectedDetailSku, "sku_id", "id"));
  const detailHasVariants = Boolean(productDetails?.skus.length);
  const selectedVariantLabel = selectedDetailSku
    ? readRecords(selectedDetailSku.ae_sku_property_dtos)
      .map((property) => readString(property, "sku_property_value", "property_value", "prop_value"))
      .filter(Boolean)
      .join(" · ")
    : "";
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
  const categoryUiLabel = (key: "count" | "search" | "clearSearch" | "all" | "back" | "select" | "selected" | "subcategories" | "noResults", count = 0) => {
    const labels = {
      ru: {
        count: `Категорий: ${count}`, search: "Поиск по категориям", all: "Все 548 категорий",
        clearSearch: "Очистить поиск",
        back: "Назад", select: "Показать товары", selected: "Выбрана", subcategories: `Подкатегорий: ${count}`,
        noResults: "Категории не найдены",
      },
      en: {
        count: `Categories: ${count}`, search: "Search categories", all: "All 548 categories",
        clearSearch: "Clear search",
        back: "Back", select: "View products", selected: "Selected", subcategories: `Subcategories: ${count}`,
        noResults: "No categories found",
      },
      uz: {
        count: `Kategoriyalar: ${count}`, search: "Kategoriyalarni qidirish", all: "Barcha 548 kategoriya",
        clearSearch: "Qidiruvni tozalash",
        back: "Orqaga", select: "Mahsulotlarni ko‘rish", selected: "Tanlangan", subcategories: `Quyi kategoriyalar: ${count}`,
        noResults: "Kategoriyalar topilmadi",
      },
    } as const;
    return labels[language][key];
  };

  const goTo = (nextView: View, message?: string) => {
    setView(nextView);
    if (message) setNotice(message);
  };

  const chooseImageForSearch = (file: File) => {
    const allowedTypes = new Set(["image/avif", "image/gif", "image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(file.type) || file.size > 8 * 1024 * 1024) {
      setImageSearchError(localizeText("Выберите JPG, PNG, WebP, GIF или AVIF размером до 8 МБ.", language));
      return;
    }
    if (imageSearchPreviewRef.current) URL.revokeObjectURL(imageSearchPreviewRef.current);
    const preview = URL.createObjectURL(file);
    imageSearchPreviewRef.current = preview;
    setImageSearchFile(file);
    setImageSearchPreview(preview);
    setImageSearchResults([]);
    setImageSearchError("");
  };

  const clearImageSearch = () => {
    imageSearchRequestRef.current += 1;
    if (imageSearchPreviewRef.current) URL.revokeObjectURL(imageSearchPreviewRef.current);
    imageSearchPreviewRef.current = "";
    setImageSearchFile(null);
    setImageSearchPreview("");
    setImageSearchResults([]);
    setImageSearchError("");
    setImageSearchLoading(false);
  };

  const runImageSearch = async () => {
    if (!imageSearchFile) return;
    const requestId = ++imageSearchRequestRef.current;
    setImageSearchLoading(true);
    setImageSearchError("");
    setImageSearchResults([]);
    try {
      const response = await api.aliexpress.imageSearch(imageSearchFile);
      if (requestId !== imageSearchRequestRef.current) return;
      setImageSearchResults(response.results);
      setImageSearchError(response.results.length
        ? ""
        : localizeText("По фото ничего не найдено", language));
      setSelectedCat("all");
      setCategoryParentId(null);
      setCategorySearch("");
      setSearch("");
      setView("Категории");
    } catch (error) {
      if (requestId !== imageSearchRequestRef.current) return;
      setImageSearchError(error instanceof Error ? error.message : localizeText("Не удалось выполнить поиск по фото", language));
    } finally {
      if (requestId === imageSearchRequestRef.current) setImageSearchLoading(false);
    }
  };

  useEffect(() => () => {
    if (imageSearchPreviewRef.current) URL.revokeObjectURL(imageSearchPreviewRef.current);
  }, []);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const pastedImage = Array.from(event.clipboardData?.items ?? [])
        .find((item) => item.type.startsWith("image/"))
        ?.getAsFile();
      if (!pastedImage) return;
      event.preventDefault();
      chooseImageForSearch(pastedImage);
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [language]);

  const handleAddToCart = (productId: string, sku?: Record<string, unknown>) => {
    const baseProduct = knownProducts.find((product) => product.id === productId)
      ?? products.find((product) => product.id === productId)
      ?? (detailProduct?.id === productId ? detailProduct : undefined);
    if (sku && baseProduct) {
      const skuId = readString(sku, "sku_id", "id");
      const price = Number(readString(sku, "offer_sale_price", "sku_price").replace(",", "."));
      const variantLabel = readRecords(sku.ae_sku_property_dtos)
        .map((property) => readString(property, "sku_property_value", "property_value", "prop_value"))
        .filter(Boolean)
        .join(" · ");
      if (!skuId || !Number.isFinite(price) || price <= 0 || !skuIsAvailable(sku)) {
        setNotice(localizeText("Этот вариант сейчас недоступен", language));
        return;
      }
      const lineId = `${productId}::${skuId}`;
      const variantProduct: ApiProduct = {
        ...baseProduct,
        id: lineId,
        skuId,
        variantLabel,
        priceMinor: Math.round(price * 100),
        imageUrl: marketplaceImageUrl(
          readRecords(sku.ae_sku_property_dtos).map((property) => readString(property, "sku_image")).find(Boolean) || baseProduct.imageUrl || null,
        ),
      };
      setKnownProducts((current) => Array.from(new Map([...current, variantProduct].map((product) => [product.id, product])).values()).slice(-100));
      setCartItems((items) => ({ ...items, [lineId]: (items[lineId] ?? 0) + 1 }));
    } else {
      setCartItems((items) => ({ ...items, [productId]: (items[productId] ?? 0) + 1 }));
    }
    setNotice("Товар добавлен в корзину");
  };

  const toggleFavorite = (productId: string) => {
    const isSaved = liked.includes(productId);
    setLiked((items) => isSaved ? items.filter((id) => id !== productId) : [...items, productId]);
    setNotice(isSaved ? "Товар удалён из избранного" : "Товар добавлен в избранное");
  };

  const renderProductStats = (product: ApiProduct) => (product.rating || product.orders) && (
    <div className="product-stats">
      {product.rating && <span><Star size={13} fill="currentColor" />{product.rating}</span>}
      {product.orders && <span>{product.orders} {localizeText("покупок", language)}</span>}
    </div>
  );
  const renderProductPrice = (product: ApiProduct) => (
    <div className="product-prices">
      <strong>{formatUzs(product.priceMinor)}</strong>
      {product.originalPriceMinor && (
        <span className="product-original-price">
          <del>{formatUzs(product.originalPriceMinor)}</del>
          {product.discountPercent ? <small>-{product.discountPercent}%</small> : null}
        </span>
      )}
    </div>
  );
  const renderProductGridSelector = () => (
    <div className="grid-view-switch" role="group" aria-label={localizeText("Вид сетки товаров", language)}>
      {([2, 3, 4] as const).map((columns) => {
        const Icon = columns === 2 ? Grid2X2 : columns === 3 ? Grid3X3 : LayoutGrid;
        const label = localizeText(`Сетка из ${columns} столбцов`, language);
        return (
          <button
            key={columns}
            type="button"
            className={productGridColumns === columns ? "active" : ""}
            aria-label={label}
            aria-pressed={productGridColumns === columns}
            title={label}
            onClick={() => {
              setProductGridColumns(columns);
              localStorage.setItem("uriona-product-grid-columns", String(columns));
            }}
          >
            <Icon size={17} />
          </button>
        );
      })}
    </div>
  );
  const renderCatalogPagination = () => (catalogHasMore || catalogLoadingMore || catalogMoreError) && (
    <div className="catalog-pagination" ref={catalogLoadMoreRef} aria-live="polite">
      {catalogLoadingMore
        ? <span>{localizeText("Загружаем ещё товары…", language)}</span>
        : catalogMoreError
          ? <button
              type="button"
              onClick={() => {
                setCatalogMoreError("");
                setCatalogMoreRetry((attempt) => attempt + 1);
              }}
            >
              {catalogMoreError} {text.retry}
            </button>
          : <span className="catalog-pagination-hint">{localizeText("Прокрутите вниз — загрузим следующие товары.", language)}</span>}
    </div>
  );
  const renderSearchFallback = () => search.trim() && !visibleProducts.length && searchFallbackProducts.length > 0 && (
    <section className="search-fallback" aria-label={localizeText("Популярные товары", language)}>
      <div>
        <small>{localizeText("По запросу ничего не найдено", language)}</small>
        <h3>{localizeText(matchingSearchProducts.length ? "Подходящие товары" : "Популярные товары", language)}</h3>
      </div>
      <div className="search-fallback-list">
        {searchFallbackProducts.map((product) => (
          <button key={product.id} type="button" onClick={() => openProductDetails(product)}>
            {product.imageUrl && <img src={product.imageUrl} alt="" loading="lazy" />}
            <span>{productCardTitle(productTitle(product) || "")}</span>
            <b>{formatUzs(product.priceMinor)}</b>
          </button>
        ))}
      </div>
    </section>
  );

  const openProductDetails = (product: ApiProduct) => {
    setHoveredProductId(null);
    setDetailProduct(product);
  };

  const loadSellerInformation = async () => {
    if (sellerFetchLoading) return;
    const candidates = Array.from(new Map([...knownProducts, ...products]
      .filter((product) => /^\d+$/.test(product.id.split("::")[0]))
      .filter((product) => !sellerFetchAttempted.current.has(product.id.split("::")[0]))
      .map((product) => [product.id.split("::")[0], product])).values())
      .slice(0, 12);
    if (!candidates.length) {
      setSellerFetchError(localizeText("Нет товаров для загрузки сведений о продавцах.", language));
      return;
    }

    setSellerFetchLoading(true);
    setSellerFetchError("");
    let loaded = 0;
    let failed = 0;
    try {
      for (let offset = 0; offset < candidates.length; offset += 3) {
        const batch = candidates.slice(offset, offset + 3);
        batch.forEach((product) => sellerFetchAttempted.current.add(product.id.split("::")[0]));
        const results = await Promise.allSettled(batch.map(async (product) => {
          const productId = product.id.split("::")[0];
          const payload = await api.aliexpress.productDetails(productId, {
            ship_to_country: "UZ",
            target_currency: "UZS",
            target_language: language === "en" ? "en_US" : language === "uz" ? "uz_UZ" : "ru_RU",
          });
          return { product, details: parseAliExpressProductDetails(payload) };
        }));
        const enriched: ApiProduct[] = [];
        const profiles: SellerProfile[] = [];
        for (const result of results) {
          if (result.status === "rejected") {
            failed += 1;
            sellerFetchAttempted.current.delete(batch[results.indexOf(result)]?.id.split("::")[0] ?? "");
            console.warn("Unable to load seller details from a product", result.reason);
            continue;
          }
          const { product, details } = result.value;
          const sellerId = sellerIdentity(details.storeId, details.storeName);
          if (!sellerId || !details.storeName) continue;
          loaded += 1;
          profiles.push({
            id: sellerId,
            name: details.storeName,
            logoUrl: details.storeLogoUrl || undefined,
            country: details.storeCountry || undefined,
            rating: details.storeRating || undefined,
            positiveRate: details.storePositiveRate || undefined,
            followers: details.storeFollowers || undefined,
            description: details.storeDescription || undefined,
            updatedAt: new Date().toISOString(),
          });
          enriched.push({
            ...product,
            sellerId,
            sellerName: details.storeName,
            sellerLogoUrl: details.storeLogoUrl || product.sellerLogoUrl,
            sellerCountry: details.storeCountry || product.sellerCountry,
            sellerRating: details.storeRating || product.sellerRating,
            sellerPositiveRate: details.storePositiveRate || product.sellerPositiveRate,
            sellerFollowers: details.storeFollowers || product.sellerFollowers,
            sellerDescription: details.storeDescription || product.sellerDescription,
          });
        }
        if (enriched.length) {
          const replacements = new Map(enriched.map((product) => [product.id, product]));
          setProducts((current) => current.map((product) => replacements.get(product.id) ?? product));
          setKnownProducts((current) => Array.from(
            new Map([...current, ...enriched].map((product) => [product.id, product])).values(),
          ).slice(-100));
        }
        if (profiles.length) setSellerProfiles((current) => mergeSellerProfiles(current, profiles));
      }
      if (loaded === 0) {
        setSellerFetchError(failed
          ? localizeText("Не удалось загрузить сведения о продавцах. Попробуйте ещё раз.", language)
          : localizeText("Продавцы появятся после загрузки сведений из товаров.", language));
      } else if (failed) {
        setNotice(`${localizeText("Данные продавцов загружены", language)}: ${loaded}. ${localizeText("Ошибок загрузки", language)}: ${failed}.`);
      } else {
        setNotice(`${localizeText("Данные продавцов загружены", language)}: ${loaded}`);
      }
    } finally {
      setSellerFetchLoading(false);
    }
  };

  const openSellerStore = (sellerId: string) => {
    setSelectedSellerId(sellerId);
    setDetailProduct(null);
    setView("Магазины");
  };

  const shareProduct = async () => {
    if (!detailProduct) return;
    const title = productDetails?.subject || productTitle(detailProduct) || "";
    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.set("product", detailProduct.id.split("::")[0]);
    const url = shareUrl.toString();
    if (navigator.share) {
      try {
        await navigator.share({ title, text: title, url });
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        setNotice(localizeText("Не удалось поделиться товаром", language));
      }
      return;
    }
    if (!navigator.clipboard) {
      setNotice(localizeText("Не удалось поделиться товаром", language));
      return;
    }
    try {
      await navigator.clipboard.writeText(`${title}\n${url}`);
      setNotice(localizeText("Ссылка на товар скопирована", language));
    } catch {
      setNotice(localizeText("Не удалось поделиться товаром", language));
    }
  };

  const buyNow = () => {
    if (!detailProduct) return;
    if (detailHasVariants && !detailSkuCanBeAdded) return;
    handleAddToCart(detailProduct.id, detailHasVariants ? selectedDetailSku ?? undefined : undefined);
    setDetailProduct(null);
    setView("Корзина");
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
      if (error instanceof ApiRequestError && error.status === 401) {
        clearExpiredSession(profile?.email);
        return;
      }
      setNotice(error instanceof Error ? error.message : "Не удалось сохранить профиль");
    } finally { setProfileBusy(false); }
  };

  const previewImagesFor = (product: ApiProduct) => Array.from(new Set([
    product.imageUrl,
    ...(hoverProductImages[product.id] ?? []),
  ].filter((image): image is string => Boolean(image)))).slice(0, PRODUCT_PREVIEW_ZONES);
  const handleProductPreviewMove = (event: ReactPointerEvent<HTMLDivElement>, product: ApiProduct) => {
    if (event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const relativePosition = Math.max(0, Math.min(0.9999, (event.clientX - bounds.left) / bounds.width));
    hoverPointerPositions.current[product.id] = relativePosition;
    const images = previewImagesFor(product);
    if (images.length < 2) return;
    const imageIndex = Math.min(images.length - 1, Math.floor(relativePosition * images.length));
    setHoveredProductId(product.id);
    setHoverImageIndexes((indexes) => indexes[product.id] === imageIndex
      ? indexes
      : { ...indexes, [product.id]: imageIndex });
  };

  const heroProducts = products.slice(0, 5);
  const activeHeroProduct = heroProducts[heroSlideIndex % Math.max(1, heroProducts.length)];
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

        <div
          className="hero-card campaign-slider"
          onPointerDown={(event) => { heroPointerStart.current = event.clientX; }}
          onPointerUp={(event) => {
            if (event.target instanceof Element && event.target.closest("button")) {
              heroPointerStart.current = null;
              return;
            }
            const start = heroPointerStart.current;
            heroPointerStart.current = null;
            if (start === null || Math.abs(event.clientX - start) < 36) return;
            setHeroSlideIndex((index) => (index + (event.clientX < start ? 1 : -1) + Math.max(heroProducts.length, 1)) % Math.max(heroProducts.length, 1));
          }}
        >
          {activeHeroProduct?.imageUrl && <img className="campaign-slider-image" src={activeHeroProduct.imageUrl} alt="" />}
          <div className="campaign-slider-shade" />
          <div className="campaign-slider-copy">
            <span className="campaign-slider-kicker">{localizeText("Выбор URIONA", language)}</span>
            <strong>{activeHeroProduct ? productCardTitle(productTitle(activeHeroProduct) || "") : localizeText("Лучшие предложения каждый день", language)}</strong>
            <span>{activeHeroProduct ? formatUzs(activeHeroProduct.priceMinor) : catalogLoading ? text.loadingCatalog : localizeText("Найдите что-то особенное для себя", language)}</span>
            <button
              type="button"
              className="campaign-slider-cta"
              onClick={() => activeHeroProduct ? void openProductDetails(activeHeroProduct) : goTo("Категории", "Каталог открыт")}
            >
              {localizeText("Смотреть подборку", language)} <ChevronRight size={16} />
            </button>
          </div>
          <div className="campaign-slider-controls">
            <button
              type="button"
              aria-label={localizeText("Предыдущий баннер", language)}
              onClick={() => setHeroSlideIndex((index) => (index - 1 + Math.max(heroProducts.length, 1)) % Math.max(heroProducts.length, 1))}
            ><ChevronLeft size={18} /></button>
            <div className="campaign-slider-dots" aria-label={localizeText("Баннеры", language)}>
              {heroProducts.map((product, index) => (
                <button
                  type="button"
                  key={product.id}
                  className={index === heroSlideIndex % heroProducts.length ? "active" : ""}
                  aria-label={`${localizeText("Баннер", language)} ${index + 1}`}
                  aria-current={index === heroSlideIndex % heroProducts.length ? "true" : undefined}
                  onClick={() => setHeroSlideIndex(index)}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label={localizeText("Следующий баннер", language)}
              onClick={() => setHeroSlideIndex((index) => (index + 1) % Math.max(heroProducts.length, 1))}
            ><ChevronRight size={18} /></button>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div className="section-head">
          <div>
            <small>{text.best}</small>
            <h2>{search.trim() ? text.searchResults(search.trim()) : text.forYou}</h2>
          </div>
          <div className="section-head-actions">
            {renderProductGridSelector()}
            <button type="button" onClick={() => goTo("Категории", text.catalog)}>{text.seeAll} <ChevronRight size={16} /></button>
          </div>
        </div>

        {catalogSource === "local" && <p className="catalog-source-note" role="status">{text.localCatalogNote}</p>}
        <div className={`product-grid columns-${productGridColumns}`}>
          {catalogMessage ? renderCatalogState(catalogMessage, Boolean(catalogError)) : visibleProducts.map((product, index) => {
            const isLiked = liked.includes(product.id);
            const tag = product.status === "sale" ? "Скидка" : product.status === "popular" ? "Популярно" : "Новинка";
            const previewImages = previewImagesFor(product);

            return (
              <article
                key={product.id}
                className="product-card"
                onMouseEnter={() => liveCatalog && setHoveredProductId(product.id)}
                onMouseLeave={() => setHoveredProductId(null)}
                onFocusCapture={() => liveCatalog && setHoveredProductId(product.id)}
                onBlurCapture={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHoveredProductId(null);
                }}
              >
                <div
                  className={`product-media media-${index % 5}`}
                  onPointerMove={(event) => liveCatalog && handleProductPreviewMove(event, product)}
                >
                  {product.imageUrl && <img
                    src={previewImages[hoveredProductId === product.id ? hoverImageIndexes[product.id] ?? 0 : 0] ?? product.imageUrl}
                    alt={productTitle(product) || ""}
                    loading="lazy"
                  />}
                  {hoveredProductId === product.id && previewImages.length > 1 && <span className="product-preview-zones" aria-hidden="true">
                    {previewImages.map((image, zone) => <i key={`${image}-${zone}`} className={zone === (hoverImageIndexes[product.id] ?? 0) ? "active" : ""} />)}
                  </span>}
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
                  <span className="product-category">{categoryLabel(product.category) || "Категория"}</span>
                  <h3>{productCardTitle(productTitle(product) || "")}</h3>
                  {productDescription(product) && <p>{productDescription(product)}</p>}
                  {renderProductStats(product)}
                  <div className="price-row">
                    {renderProductPrice(product)}
                    <div className="product-card-actions">
                      {liveCatalog && <button type="button" className="product-details-btn" onClick={() => void openProductDetails(product)}>{localizeText("Подробнее", language)}</button>}
                      <button type="button" className="mini-cart" onClick={() => handleAddToCart(product.id)}>
                        <ShoppingBag size={14} />{localizeText("Купить", language)}
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {renderSearchFallback()}
        {renderCatalogPagination()}
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
          <h2>{localizeText("Выберите направление", language)}</h2>
        </div>
        <span className="category-total">{categoryUiLabel("count", categories.length)}</span>
      </div>

      {selectedCat !== "all" && (
        <div className="section-head panel-head selected-category-heading">
          <div>
            <small>{localizeText("Товары", language)}</small>
            <h2>{categoryLabel(categories.find((item) => item.id === selectedCat))}</h2>
          </div>
          <div className="catalog-product-controls">
            {renderProductGridSelector()}
            <button
              type="button"
              className="category-back-btn"
              onClick={() => {
                setSelectedCat("all");
                setCategoryParentId(null);
                setCategorySearch("");
                setSearch("");
              }}
            >
              {localizeText("Вернуться к категориям", language)}
            </button>
          </div>
        </div>
      )}

      {selectedCat === "all" && !search.trim() && (
        <>
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

      <div className="category-browser-layout">
        {!categorySearch && <aside className="category-root-sidebar" aria-label={localizeText("Популярные категории", language)}>
          <h3>{localizeText("Популярные категории", language)}</h3>
          {topLevelCategories.map((category, index) => (
            <button
              type="button"
              key={category.id}
              className={activeCategoryParentId === category.id ? "active" : ""}
              onClick={() => {
                const children = categoryChildren.get(category.id) ?? [];
                if (!children.length) {
                  setSelectedCat(category.id);
                  setNotice(`${categoryLabel(category)} активна`);
                } else {
                  setCategoryParentId(category.id);
                }
              }}
            >
              <CategoryIllustration category={category} index={index} />
              <span>{categoryLabel(category)}</span>
              <ChevronRight size={16} />
            </button>
          ))}
        </aside>}
        <div className="category-browser-content">
          {!categorySearch && activeCategoryParentId && (() => {
            const activeCategory = categories.find((category) => category.id === activeCategoryParentId);
            return activeCategory ? <div className="category-browser-heading">
              <div>
                <small>{localizeText("Выберите направление", language)}</small>
                <h3>{categoryLabel(activeCategory)}</h3>
              </div>
              <button type="button" onClick={() => {
                setSelectedCat(activeCategory.id);
                setNotice(`${categoryLabel(activeCategory)} активна`);
              }}>{categoryUiLabel("select")} <ChevronRight size={15} /></button>
            </div> : null;
          })()}
          <div className="category-subcategory-grid">
            {categories.length === 0 && renderCatalogState(categoriesLoading ? text.loadingCatalog : categoriesError || text.noGoods, !categoriesLoading && Boolean(categoriesError))}
            {browsedCategories.map((category, index) => {
              const categoryChildCount = categoryChildren.get(category.id)?.length ?? 0;
              return (
                <button
                  type="button"
                  key={category.id}
                  className="category-subcategory-card"
                  onClick={() => {
                    setSelectedCat(category.id);
                    setCategorySearch("");
                    setNotice(`${categoryLabel(category)} активна`);
                  }}
                >
                  <CategoryIllustration category={category} index={index} />
                  <span>{categoryLabel(category)}</span>
                  {categoryChildCount > 0 && <small>{categoryUiLabel("subcategories", categoryChildCount)}</small>}
                  <ChevronRight size={15} />
                </button>
              );
            })}
            {!categoriesLoading && categories.length > 0 && browsedCategories.length === 0 && (
              <p className="category-empty-state" role="status">{categorySearch ? categoryUiLabel("noResults") : text.emptyCategories}</p>
            )}
          </div>
        </div>
      </div>
        </>
      )}

      {imageSearchResults.length > 0 && selectedCat === "all" && !search.trim() && (
        <section className="image-search-results">
          <div className="section-head">
            <div>
              <small>{localizeText("Поиск по фото", language)}</small>
              <h2>{localizeText("Результаты поиска по фото", language)}</h2>
            </div>
          </div>
          <div className="image-search-results-grid">
            {imageSearchResults.map((match) => (
              <article className="image-search-result-card" key={match.productId}>
                <img src={match.thumbnail} alt="" loading="lazy" />
                <div>
                  <b>{match.title}</b>
                  <small>{match.source}</small>
                  <button type="button" className="product-details-btn" onClick={() => void openProductDetails({
                    id: match.productId,
                    categoryId: null,
                    titleUz: match.title,
                    titleRu: match.title,
                    currency: "UZS",
                    priceMinor: 0,
                    status: "popular",
                    imageUrl: match.thumbnail,
                  })}>{localizeText("Открыть товар", language)} <ChevronRight size={15} /></button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {(selectedCat !== "all" || Boolean(search.trim())) && products.length === 0 ? (
        <div className="catalog-products-state">
          {renderCatalogState(
            catalogLoading ? text.loading : catalogError || text.noGoods,
            !catalogLoading && Boolean(catalogError)
          )}
        </div>
      ) : (selectedCat !== "all" || Boolean(search.trim())) && products.length > 0 ? (
        <>
          {selectedCat === "all" && (
            <div className="section-head panel-head">
              <div>
                <small>Товары</small>
                <h2>{text.searchResults(search.trim())}</h2>
              </div>
              <div className="catalog-product-controls">
                {renderProductGridSelector()}
                <button
                  type="button"
                  className="category-back-btn"
                  onClick={() => setSearch("")}
                >
                  {localizeText("Вернуться к категориям", language)}
                </button>
              </div>
            </div>
          )}
          {catalogSource === "local" && <p className="catalog-source-note" role="status">{text.localCatalogNote}</p>}
          <div className={`product-grid compact-grid columns-${productGridColumns}`}>
            {catalogMessage ? renderCatalogState(catalogMessage, Boolean(catalogError)) : visibleProducts.map((product, index) => {
              const previewImages = previewImagesFor(product);
              return (
                <article
                  key={product.id}
                  className="product-card compact-card"
                  onMouseEnter={() => liveCatalog && setHoveredProductId(product.id)}
                  onMouseLeave={() => setHoveredProductId(null)}
                >
                  <div className={`product-media media-${index % 5}`} onPointerMove={(event) => liveCatalog && handleProductPreviewMove(event, product)}>
                    {product.imageUrl && <img src={previewImages[hoveredProductId === product.id ? hoverImageIndexes[product.id] ?? 0 : 0] ?? product.imageUrl} alt={productTitle(product) || ""} loading="lazy" />}
                    {hoveredProductId === product.id && previewImages.length > 1 && <span className="product-preview-zones" aria-hidden="true">{previewImages.map((image, zone) => <i key={`${image}-${zone}`} className={zone === (hoverImageIndexes[product.id] ?? 0) ? "active" : ""} />)}</span>}
                    <span className="product-tag">{product.status === "sale" ? "Скидка" : "Новинка"}</span>
                    <button type="button" className={`wish-btn ${liked.includes(product.id) ? "active" : ""}`} onClick={() => toggleFavorite(product.id)} aria-label={liked.includes(product.id) ? "Удалить из избранного" : "Добавить в избранное"}>
                      <Heart size={15} fill={liked.includes(product.id) ? "currentColor" : "none"} />
                    </button>
                  </div>
                  <div className="product-body">
                    <span className="product-category">{categoryLabel(product.category)}</span>
                    <h3>{productCardTitle(productTitle(product) || "")}</h3>
                    {renderProductStats(product)}
                    <div className="price-row">
                      {renderProductPrice(product)}
                      <div className="product-card-actions">
                        {liveCatalog && <button type="button" className="product-details-btn" onClick={() => void openProductDetails(product)}>{localizeText("Подробнее", language)}</button>}
                        <button type="button" className="mini-cart" onClick={() => handleAddToCart(product.id)}><Plus size={14} />{localizeText("Добавить", language)}</button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {renderSearchFallback()}
          {renderCatalogPagination()}
        </>
      ) : null}
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

      <div className={`product-grid compact-grid columns-${productGridColumns}`}>
        {saleMessage ? renderCatalogState(saleMessage, Boolean(catalogError)) : saleProducts.map((product, index) => (
          <article key={product.id} className="product-card compact-card">
            <div className={`product-media media-${index % 5}`}>
              {product.imageUrl && <img src={product.imageUrl} alt={productTitle(product) || ""} loading="lazy" />}
              <span className="product-tag">Скидка</span>
            </div>
            <div className="product-body">
              <span className="product-category">{categoryLabel(product.category)}</span>
              <h3>{productCardTitle(productTitle(product) || "")}</h3>
              {renderProductStats(product)}
              <div className="price-row">
                <strong>{formatUzs(product.priceMinor)}</strong>
                <div className="product-card-actions">
                  {liveCatalog && <button type="button" className="product-details-btn" onClick={() => void openProductDetails(product)}>{localizeText("Подробнее", language)}</button>}
                  <button type="button" className="mini-cart" onClick={() => handleAddToCart(product.id)}><Plus size={14} />{localizeText("Купить", language)}</button>
                </div>
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
        <details><summary>Почему каталог может быть недоступен?</summary><p>Если источник товаров временно не отвечает, Uriona покажет сообщение и кнопку повтора запроса.</p></details>
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
                  <h3>{productCardTitle(productTitle(product) || "")}</h3>
                  <p>{product.variantLabel ? `${product.variantLabel} · ` : ""}{formatUzs(product.priceMinor)}</p>
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
                        <span>{item.product ? productTitle(item.product) : localizeText(`Товар ${item.productId.slice(0, 8)}`, language)}</span><b>× {item.quantity}</b>
                      </div>)}</div>
                      <div className="profile-order-bottom"><span>{order.deliveryAddress}</span><b>{formatUzs(order.totalMinor)}</b></div>
                    </article>
                  ))}</div>}
              </>}
              {profileSection === "wishlist" && <>
                <div className="profile-section-heading"><div><small>Сохранённые товары</small><h3>Избранное · {liked.length}</h3></div></div>
                {savedProducts.length ? <div className={`product-grid compact-grid columns-${productGridColumns}`}>{savedProducts.map((product, index) => (
                  <article className="product-card compact-card" key={product.id}>
                    <div className={`product-media media-${index % 5}`}>{product.imageUrl && <img src={product.imageUrl} alt={productTitle(product) || ""} loading="lazy" />}</div>
                    <div className="product-body"><span className="product-category">{categoryLabel(product.category) || "Товар"}</span><h3>{productCardTitle(productTitle(product) || "")}</h3>
                      <div className="price-row"><strong>{formatUzs(product.priceMinor)}</strong><button type="button" className="mini-cart" onClick={() => handleAddToCart(product.id)}><ShoppingBag size={14} />В корзину</button></div>
                      <div className="profile-card-actions">{/^\d+$/.test(product.id) && <button type="button" onClick={() => openProductDetails(product)}>Подробнее</button>}<button type="button" onClick={() => toggleFavorite(product.id)}>Убрать</button></div>
                    </div>
                  </article>
                ))}</div> : <div className="profile-empty"><Heart size={30} /><h3>Избранное пока пусто</h3><p>Нажимайте на сердечко в карточке товара — товары сохранятся на этом устройстве.</p><button type="button" className="secondary-btn" onClick={() => goTo("Каталог")}>Найти товары</button></div>}
                {unavailableFavorites > 0 && <p className="profile-hint">{unavailableFavorites} сохранённых товаров сейчас отсутствуют в локальном каталоге. Когда каталог загрузится, они появятся здесь.</p>}
              </>}
              {profileSection === "stores" && <div className="profile-empty"><Store size={30} /><h3>Магазины продавцов</h3><p>{sellerDirectory.length ? `${sellerDirectory.length} ${localizeText("продавцов", language)}` : localizeText("Продавцы появятся после загрузки сведений из товаров.", language)}</p><button type="button" className="secondary-btn" onClick={() => sellerDirectory.length ? goTo("Магазины") : void loadSellerInformation()}>{sellerDirectory.length ? localizeText("Магазины продавцов", language) : localizeText("Загрузить данные продавцов", language)}</button></div>}
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
                <details><summary>Как найти товар?</summary><p>Откройте каталог и воспользуйтесь строкой поиска. Если товары не загрузились, попробуйте позже.</p></details>
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

  const renderStores = () => (
    <section className="section-block seller-directory">
      <div className="section-head">
        <div>
          <small>{localizeText("О продавцах", language)}</small>
          <h2>{localizeText("Магазины продавцов", language)}</h2>
        </div>
        <button type="button" className="secondary-btn" onClick={() => void loadSellerInformation()} disabled={sellerFetchLoading}>
          <Store size={16} />
          {sellerFetchLoading
            ? localizeText("Загружаем сведения о продавцах…", language)
            : localizeText(sellerDirectory.length ? "Загрузить ещё данные из каталога" : "Загрузить данные продавцов", language)}
        </button>
      </div>
      <p className="seller-directory-note">{localizeText("Полный список товаров продавца пока недоступен через подключённый API.", language)}</p>
      {sellerFetchError && <p className="seller-directory-error" role="alert">{sellerFetchError}</p>}

      {selectedSeller ? (
        <div className="seller-store-view">
          <button type="button" className="seller-back-btn" onClick={() => setSelectedSellerId("")}>
            <ChevronLeft size={16} />{localizeText("Все магазины", language)}
          </button>
          <section className="seller-profile-card">
            {selectedSeller.logoUrl
              ? <img src={selectedSeller.logoUrl} alt="" />
              : <span className="seller-profile-icon"><Store size={25} /></span>}
            <div className="seller-profile-copy">
              <small>{localizeText("Данные магазина", language)}</small>
              <h3>{selectedSeller.name}</h3>
              {selectedSeller.description && <p>{selectedSeller.description}</p>}
              <div className="seller-profile-facts">
                {selectedSeller.country && <span>{localizeText("Страна продавца", language)}: {selectedSeller.country}</span>}
                {selectedSeller.rating && <span><Star size={14} fill="currentColor" />{localizeText("Рейтинг продавца", language)}: {selectedSeller.rating}</span>}
                {selectedSeller.positiveRate && <span>{localizeText("Положительные отзывы", language)}: {selectedSeller.positiveRate}</span>}
                {selectedSeller.followers && <span>{localizeText("Подписчики", language)}: {selectedSeller.followers}</span>}
              </div>
            </div>
          </section>
          <div className="seller-products-heading">
            <h3>{localizeText("Товары из просмотренного каталога", language)}</h3>
            {renderProductGridSelector()}
          </div>
          {selectedSellerProducts.length ? (
            <div className={`seller-products-grid columns-${productGridColumns}`}>
              {selectedSellerProducts.map((product) => (
                <button type="button" className="seller-product-card" key={product.id} onClick={() => void openProductDetails(product)}>
                  {product.imageUrl
                    ? <img src={product.imageUrl} alt="" loading="lazy" />
                    : <span className="seller-product-placeholder"><Package size={22} /></span>}
                  <span><b>{productCardTitle(productTitle(product) || "")}</b><strong>{formatUzs(product.priceMinor)}</strong></span>
                </button>
              ))}
            </div>
          ) : <p className="seller-directory-note">{localizeText("В этом магазине пока нет других загруженных товаров.", language)}</p>}
        </div>
      ) : sellerDirectory.length ? (
        <div className="seller-directory-grid">
          {sellerDirectory.map((seller) => {
            const productsCount = new Set([...knownProducts, ...products].filter(
              (product) => sellerIdentity(product.sellerId ?? "", product.sellerName ?? "") === seller.id,
            ).map((product) => product.id)).size;
            return (
              <button type="button" className="seller-directory-card" key={seller.id} onClick={() => setSelectedSellerId(seller.id)}>
                {seller.logoUrl ? <img src={seller.logoUrl} alt="" /> : <span className="seller-profile-icon"><Store size={22} /></span>}
                <span className="seller-directory-card-copy">
                  <b>{seller.name}</b>
                  {seller.country && <small>{seller.country}</small>}
                  <small>{productsCount} {localizeText("товаров", language)}</small>
                </span>
                <ChevronRight size={18} />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="seller-directory-empty">
          <Store size={32} />
          <p>{localizeText("Продавцы появятся после загрузки сведений из товаров.", language)}</p>
          <button type="button" className="primary-btn" onClick={() => void loadSellerInformation()} disabled={sellerFetchLoading}>
            {localizeText("Загрузить данные продавцов", language)}
          </button>
        </div>
      )}
    </section>
  );

  const renderMain = () => {
    if (view === "Главная") return renderHome();
    if (view === "Категории") return renderCatalog();
    if (view === "Каталог") return renderCatalog();
    if (view === "Магазины") return renderStores();
    if (view === "Скидки") return renderSales();
    if (view === "Как заказать") return renderHowToOrder();
    if (view === "Доставка") return renderDelivery();
    if (view === "Поддержка") return renderSupport();
    if (view === "Корзина") return renderCart();
    return renderProfile();
  };

  return localizeNode(
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
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && search.trim()) {
                  setSearchFocused(false);
                  goTo("Категории", text.searchResults(search.trim()));
                }
                if (event.key === "Escape") setSearchFocused(false);
              }}
              placeholder={text.search}
              aria-autocomplete="list"
              aria-expanded={searchFocused && search.trim().length >= 3}
              aria-controls="product-search-suggestions"
            />
            <button type="button" aria-label={localizeText("Найти товары", language)} onClick={() => {
              setSearchFocused(false);
              if (search.trim()) goTo("Категории", text.searchResults(search.trim()));
            }}>⌕</button>
            <input
              ref={imageSearchInputRef}
              className="image-search-file-input"
              type="file"
              accept="image/avif,image/gif,image/jpeg,image/png,image/webp"
              capture="environment"
              aria-label={localizeText("Выбрать изображение", language)}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                if (file) chooseImageForSearch(file);
                event.currentTarget.value = "";
              }}
            />
            <button
              type="button"
              className="image-search-trigger"
              aria-label={localizeText("Поиск по фото", language)}
              title={localizeText("Поиск по фото", language)}
              onClick={() => imageSearchInputRef.current?.click()}
            ><Camera size={18} /></button>
            {(imageSearchPreview || imageSearchError) && <div className="image-search-panel">
              <div className="image-search-panel-heading">
                <strong>{localizeText("Поиск по фото", language)}</strong>
                <button type="button" aria-label={localizeText("Удалить фото", language)} onClick={clearImageSearch}><X size={16} /></button>
              </div>
              {imageSearchPreview && <img className="image-search-preview" src={imageSearchPreview} alt="" />}
              <p>{localizeText("Загрузить фото или вставить из буфера", language)}</p>
              <small>{localizeText("Фото будет отправлено SerpApi и Google Lens для поиска.", language)}</small>
              {imageSearchError && <span className="image-search-error" role="alert">{imageSearchError}</span>}
              <div className="image-search-panel-actions">
                <button type="button" className="secondary-btn" onClick={() => imageSearchInputRef.current?.click()}>
                  {localizeText("Выбрать изображение", language)}
                </button>
                <button type="button" className="primary-btn" disabled={!imageSearchFile || imageSearchLoading} onClick={() => void runImageSearch()}>
                  {imageSearchLoading ? localizeText("Ищем похожие товары…", language) : localizeText("Поиск по фото", language)}
                </button>
              </div>
            </div>}
            {searchFocused && search.trim().length >= 3 && (
              <div className="search-autocomplete" id="product-search-suggestions" role="listbox">
                {suggestedSearchCategories.length > 0 && (
                  <div className="search-suggestion-group">
                    <small>{localizeText("Категории по запросу", language)}</small>
                    {suggestedSearchCategories.map((category) => (
                      <button
                        key={`category-${category.id}`}
                        type="button"
                        role="option"
                        className="search-suggestion-item"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setSearch("");
                          setSelectedCat(category.id);
                          setCategoryParentId(null);
                          setSearchFocused(false);
                          goTo("Категории", `${categoryLabel(category)} выбрана`);
                        }}
                      >
                        <CategoryIllustration category={category} index={0} />
                        <span>{categoryLabel(category)}</span>
                      </button>
                    ))}
                  </div>
                )}
                {searchSuggestionProducts.length > 0 && (
                  <div className="search-suggestion-group">
                    <small>{localizeText(matchingSearchProducts.length ? "Подходящие товары" : "Популярные товары", language)}</small>
                    {searchSuggestionProducts.map((product) => (
                      <button
                        key={`product-${product.id}`}
                        type="button"
                        role="option"
                        className="search-suggestion-item product-search-suggestion"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setSearchFocused(false);
                          openProductDetails(product);
                        }}
                      >
                        {product.imageUrl && <img src={product.imageUrl} alt="" loading="lazy" />}
                        <span>{productCardTitle(productTitle(product) || "")}</span>
                        <b>{formatUzs(product.priceMinor)}</b>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
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
              {item.view === "Каталог" ? text.catalog
                : item.view === "Магазины" ? localizeText("Магазины", language)
                  : item.view === "Скидки" ? text.sales
                    : item.view === "Как заказать" ? text.how
                      : item.view === "Доставка" ? text.delivery : text.support}
            </button>
          ))}
        </nav>
      </header>

      <main className="page">{renderMain()}</main>
      <footer className="site-footer">
        <section className="site-footer-column">
          <h2>{localizeText("О нас", language)}</h2>
          <button type="button" onClick={() => setNotice(localizeText("Информация появится позже", language))}>{localizeText("О URIONA", language)}</button>
          <button type="button" onClick={() => goTo("Доставка")}>{localizeText("Пункты выдачи", language)}</button>
          <button type="button" onClick={() => setNotice(localizeText("Информация появится позже", language))}>{localizeText("Вакансии", language)}</button>
        </section>
        <section className="site-footer-column">
          <h2>{localizeText("Покупателям", language)}</h2>
          <button type="button" onClick={() => goTo("Поддержка")}>{localizeText("Связаться с нами", language)}</button>
          <button type="button" onClick={() => goTo("Поддержка")}>{localizeText("Частые вопросы", language)}</button>
          {["Конфиденциальность", "Обработка персональных данных", "Пользовательское соглашение"].map((label) => (
            <a
              key={label}
              href={`#${label === "Конфиденциальность" ? "privacy-policy" : label === "Обработка персональных данных" ? "personal-data" : "terms-of-use"}`}
              onClick={(event) => {
                event.preventDefault();
                setNotice(localizeText("Документ готовится к публикации", language));
              }}
            >{localizeText(label, language)}</a>
          ))}
        </section>
        <section className="site-footer-column">
          <h2>{localizeText("Продавцам", language)}</h2>
          <button type="button" onClick={() => goTo("Магазины")}>{localizeText("Магазины продавцов", language)}</button>
          <button type="button" onClick={() => setNotice(localizeText("Информация для продавцов скоро появится", language))}>{localizeText("Стать продавцом URIONA", language)}</button>
          <button type="button" onClick={() => setNotice(localizeText("Информация для продавцов скоро появится", language))}>{localizeText("Кабинет продавца", language)}</button>
          <button type="button" onClick={() => setNotice(localizeText("Информация для продавцов скоро появится", language))}>{localizeText("Открыть пункт выдачи", language)}</button>
        </section>
      </footer>

      {detailProduct && (
        <div className="product-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetailProduct(null); }}>
          <section className="product-dialog" role="dialog" aria-modal="true" aria-labelledby="product-dialog-title">
            <button type="button" className="product-dialog-close" onClick={() => setDetailProduct(null)} aria-label="Закрыть"><X size={20} /></button>
            <div className="product-dialog-layout">
              <div className="product-dialog-gallery">
                {detailImages.length > 0 && <>
                  <img
                    className="product-dialog-image"
                    src={selectedDetailSku
                      ? marketplaceImageUrl(readRecords(selectedDetailSku.ae_sku_property_dtos).map((property) => readString(property, "sku_image")).find(Boolean) || null)
                        || detailImages[selectedDetailImage] || detailImages[0]
                      : detailImages[selectedDetailImage] || detailImages[0]}
                    alt={productDetails?.subject || productTitle(detailProduct) || ""}
                    onError={(event) => {
                      if (detailProduct.imageUrl && event.currentTarget.src !== detailProduct.imageUrl) event.currentTarget.src = detailProduct.imageUrl;
                    }}
                  />
                  {detailImages.length > 1 && <div className="product-detail-thumbnails" aria-label={localizeText("Фотографии товара", language)}>
                    {detailImages.slice(0, 10).map((image, index) => (
                      <button
                        type="button"
                        key={image}
                        className={selectedDetailImage === index ? "active" : ""}
                        onClick={() => setSelectedDetailImage(index)}
                        aria-label={`${localizeText("Фото", language)} ${index + 1}`}
                        aria-pressed={selectedDetailImage === index}
                      >
                        <img src={image} alt="" loading="lazy" />
                      </button>
                    ))}
                  </div>}
                </>}
              </div>

              <div className="product-dialog-content">
                <small>{categoryLabel(detailProduct.category) || localizeText("Товар", language)}</small>
                <h2 id="product-dialog-title">{productDetails?.subject || productTitle(detailProduct)}</h2>
                {productDetails?.storeName && (
                  <button
                    type="button"
                    className="product-dialog-seller"
                    onClick={() => openSellerStore(sellerIdentity(productDetails.storeId, productDetails.storeName))}
                  >
                    <Store size={16} />{productDetails.storeName}<ChevronRight size={16} />
                  </button>
                )}
                {(productDetails?.rating || productDetails?.orders || detailProduct.rating || detailProduct.orders) && (
                  <div className="product-dialog-stats">
                    {(productDetails?.rating || detailProduct.rating) && (
                      <span><Star size={15} fill="currentColor" />{productDetails?.rating || detailProduct.rating}</span>
                    )}
                    {(productDetails?.orders || detailProduct.orders) && (
                      <span>{productDetails?.orders || detailProduct.orders} {localizeText("покупок", language)}</span>
                    )}
                  </div>
                )}
                {productDetails?.description && <p className="product-dialog-description">{productDetails.description}</p>}
                <strong>{selectedDetailSku && detailSkuPrice > 0 ? formatUzs(Math.round(detailSkuPrice * 100)) : formatUzs(detailProduct.priceMinor)}</strong>
                {detailLoading && <p className="product-detail-state" role="status">{localizeText("Загружаем сведения о товаре…", language)}</p>}
                {detailError && <div className="product-detail-state" role="alert"><span>{detailError}</span><button type="button" onClick={() => setDetailAttempt((attempt) => attempt + 1)}>Повторить</button></div>}
                {productDetails && <>
                  {(productDetails.grossWeight || productDetails.dimensions || productDetails.deliveryTime) && (
                    <dl className="product-detail-meta">
                      {productDetails.grossWeight && <div><dt>Вес брутто</dt><dd>{productDetails.grossWeight}</dd></div>}
                      {productDetails.dimensions && <div><dt>Размер упаковки</dt><dd>{productDetails.dimensions}</dd></div>}
                      {productDetails.deliveryTime && <div><dt>Срок отправки</dt><dd>{productDetails.deliveryTime}</dd></div>}
                    </dl>
                  )}
                  {productDetails.videos.length > 0 && <div className="product-detail-videos">
                    {productDetails.videos.map((video) => <video key={video} src={video} controls preload="none" aria-label="Видео товара" />)}
                  </div>}
                  {productDetails.skus.length > 0 && <div className="product-detail-skus">
                    <h3>{localizeText("Выберите вариант", language)}</h3>
                    {detailSkuGroups.map((group) => (
                      <fieldset className="product-detail-option" key={group.id}>
                        <legend>{group.name}</legend>
                        <div className="product-detail-option-values">
                          {group.values.map((value) => {
                            const compatibleSku = productDetails.skus.find((sku) => {
                              if (!skuIsAvailable(sku)) return false;
                              const skuProperties = readRecords(sku.ae_sku_property_dtos);
                              const property = skuProperties.find((item) =>
                                readString(item, "sku_property_id", "property_name", "sku_property_name") === group.id
                              );
                              return property && readString(property, "sku_property_value", "property_value", "prop_value") === value;
                            });
                            const propertyImage = compatibleSku
                              ? readRecords(compatibleSku.ae_sku_property_dtos)
                                .find((property) =>
                                  readString(property, "sku_property_id", "property_name", "sku_property_name") === group.id
                                  && readString(property, "sku_property_value", "property_value", "prop_value") === value
                                )
                              : undefined;
                            return (
                              <button
                                type="button"
                                key={value}
                                className={selectedSkuProperties[group.id] === value ? "active" : ""}
                                disabled={!compatibleSku}
                                onClick={() => setSelectedSkuProperties((current) => {
                                  const next = { ...current, [group.id]: value };
                                  const hasCombination = productDetails.skus.some((sku) => {
                                    if (!skuIsAvailable(sku)) return false;
                                    const skuProperties = readRecords(sku.ae_sku_property_dtos);
                                    return detailSkuGroups.every((candidateGroup) => {
                                      const expected = next[candidateGroup.id];
                                      if (!expected) return true;
                                      const property = skuProperties.find((item) =>
                                        readString(item, "sku_property_id", "property_name", "sku_property_name") === candidateGroup.id
                                      );
                                      return property && readString(property, "sku_property_value", "property_value", "prop_value") === expected;
                                    });
                                  });
                                  if (!hasCombination) {
                                    for (const otherGroup of detailSkuGroups) {
                                      if (otherGroup.id !== group.id) delete next[otherGroup.id];
                                    }
                                  }
                                  return next;
                                })}
                                aria-pressed={selectedSkuProperties[group.id] === value}
                              >
                                {readString(propertyImage ?? {}, "sku_image") && <img src={marketplaceImageUrl(readString(propertyImage ?? {}, "sku_image")) || undefined} alt="" loading="lazy" />}
                                {value}
                              </button>
                            );
                          })}
                        </div>
                      </fieldset>
                    ))}
                    {selectedDetailSku && <p className="product-detail-stock">
                      {selectedVariantLabel}{detailSkuStock ? ` · ${localizeText("В наличии", language)}: ${detailSkuStock}` : ""}
                    </p>}
                  </div>}
                </>}
                <div className="product-dialog-actions">
                  <button
                    type="button"
                    className="product-dialog-icon-action"
                    aria-label={localizeText(liked.includes(detailProduct.id) ? "Удалить из избранного" : "Добавить в избранное", language)}
                    onClick={() => toggleFavorite(detailProduct.id)}
                  >
                    <Heart size={18} fill={liked.includes(detailProduct.id) ? "currentColor" : "none"} />
                    {localizeText(liked.includes(detailProduct.id) ? "Удалить из избранного" : "Добавить в избранное", language)}
                  </button>
                  <button type="button" className="product-dialog-icon-action" onClick={() => void shareProduct()}>
                    <Share2 size={18} />{localizeText("Поделиться", language)}
                  </button>
                </div>
                <button
                  type="button"
                  className="primary-btn product-detail-add"
                  disabled={detailLoading || (detailHasVariants ? !detailSkuCanBeAdded : false)}
                  onClick={buyNow}
                >
                  <ShoppingBag size={17} />{localizeText("Купить сейчас", language)}
                </button>
              </div>
            </div>
            {(relatedLoading || relatedError || relatedProducts.length > 0) && <section className="product-related">
              <h3>{localizeText("Похожие товары", language)}</h3>
              {relatedLoading && <p role="status">{localizeText("Загружаем похожие товары…", language)}</p>}
              {relatedError && <p role="alert">{relatedError}</p>}
              {relatedProducts.length > 0 && <div className="product-related-grid">
                {relatedProducts.map((product) => (
                  <button type="button" className="product-related-card" key={product.id} onClick={() => openProductDetails(product)}>
                    {product.imageUrl && <img src={product.imageUrl} alt="" loading="lazy" />}
                    <span>{productCardTitle(productTitle(product) || "")}</span>
                    <b>{formatUzs(product.priceMinor)}</b>
                  </button>
                ))}
              </div>}
            </section>}
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
    </div>,
    language,
  );
}
