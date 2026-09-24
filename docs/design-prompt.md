# Pinduoduo Uzbekistan — Figma Master Prompt

Create a production-ready Android-first mobile marketplace UI for Uzbekistan, inspired by the speed and density of modern cross-border commerce but with an original visual identity.

Product: Pinduoduo Uzbekistan.
Audience: Uzbekistan shoppers buying goods from China.
Reference frame: 390x844.
Languages: Uzbek and Russian.
Currency: UZS.
Phone country: +998.
Payments: prepare UI for UZCARD/HUMO and future local payment providers.

Visual direction: clean, modern, compact commerce UI; strong red primary brand; neutral light surfaces; high information density without visual clutter; large product imagery; clear discounted prices; rounded cards; 12px controls; 14–18px cards; pill tags; strong hierarchy; accessible contrast.

Tokens: Brand #E02B2B; Brand Soft #FFF1F1; Ink #17181A; Muted #6F7378; Background #F7F7F8; Surface #FFFFFF; Line #E9EAEC; Success #19A463; Warning #FFB020; Info #3478F6.

Typography: Inter. Display 32/Bold, screen title 24/Bold, section 19–20/Bold, body 14–16/Regular, labels 12/Medium, buttons 15/Semi Bold.

Spacing: 4px base with 8/12/16/20/24px common values. Buttons and inputs 48px high with 12px radius. Product cards use 14px radius. Pills use full radius.

Build reusable components: search field, primary and secondary buttons, pills, product card, category tile, address card, payment card, order card, bottom navigation, delivery timeline.

Create these complete screens: Home, Search, Categories, Product Detail, Cart, Checkout, Orders, Profile, Auth/OTP, Delivery Tracking.

Home must include search, quick categories, promotional banner, personalized product grid and bottom navigation.
Search must include query field, popular queries, result count, sorting and product grid.
Categories must include category tiles and popular products.
Product must include gallery placeholder, discount, rating, price, delivery/return badges, description and purchase actions.
Cart must include item quantity controls, promo code, totals and checkout CTA.
Checkout must include delivery address, payment method, fulfillment method, total and pay CTA.
Orders must show status tabs and order cards.
Profile must show user header, orders, addresses, payments, favorites, language and support.
Auth must support +998 phone input and Telegram OTP flow.
Tracking must show map placeholder and shipment timeline.

Keep Figma as the visual source of truth. Name frames by screen and keep the layout ready for TypeScript implementation. Do not create decorative elements that have no product purpose.
