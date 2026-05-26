import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestFoodtruck,
  createCategory,
  createMenuItem,
  createOffer,
  callGetOptimizedOffers,
  getTotalDiscount,
  cleanup,
  CartItem,
} from './setup';

// Each describe block creates its own isolated foodtruck

describe('Cas dégénérés', () => {
  let foodtruckId: string;
  let userId: string;
  let catId: string;
  let itemId: string;

  beforeAll(async () => {
    ({ foodtruckId, userId } = await createTestFoodtruck());
    catId = await createCategory(foodtruckId, { name: 'Burgers' });
    itemId = await createMenuItem(foodtruckId, { name: 'Burger', price: 800, categoryId: catId });
  });

  afterAll(async () => {
    await cleanup(foodtruckId, userId);
  });

  it('panier vide → discount 0', async () => {
    await createOffer(foodtruckId, {
      name: 'Offre test',
      offer_type: 'threshold_discount',
      config: { min_amount: 1000, discount_type: 'fixed', discount_value: 300 },
    });

    const results = await callGetOptimizedOffers(foodtruckId, [], 0);
    expect(getTotalDiscount(results)).toBe(0);
  });

  it('panier avec items mais aucune offre active → discount 0', async () => {
    // Deactivate all offers first
    const { supabase } = await import('./setup');
    await supabase.from('offers').update({ is_active: false }).eq('foodtruck_id', foodtruckId);

    const cart: CartItem[] = [
      { menu_item_id: itemId, category_id: catId, name: 'Burger', price: 800, quantity: 2 },
    ];
    const results = await callGetOptimizedOffers(foodtruckId, cart, 1600);
    expect(getTotalDiscount(results)).toBe(0);
  });

  it('foodtruck sans aucune offre → discount 0', async () => {
    // Create a fresh foodtruck with no offers
    const { foodtruckId: ftId2, userId: uid2 } = await createTestFoodtruck();
    const cat2 = await createCategory(ftId2, { name: 'Cat' });
    const item2 = await createMenuItem(ftId2, { name: 'Item', price: 500, categoryId: cat2 });

    const cart: CartItem[] = [
      { menu_item_id: item2, category_id: cat2, name: 'Item', price: 500, quantity: 1 },
    ];
    const results = await callGetOptimizedOffers(ftId2, cart, 500);
    expect(getTotalDiscount(results)).toBe(0);

    await cleanup(ftId2, uid2);
  });

  it('offre active mais panier ne contient aucun item éligible → discount 0', async () => {
    const catPizza = await createCategory(foodtruckId, { name: 'Pizzas' });

    // BxGy offer on Pizzas category
    await createOffer(foodtruckId, {
      name: '3+1 Pizzas',
      offer_type: 'buy_x_get_y',
      config: { trigger_quantity: 3, reward_quantity: 1, trigger_category_ids: [catPizza] },
      is_active: true,
    });

    // Cart only has burgers, not pizzas
    const cart: CartItem[] = [
      { menu_item_id: itemId, category_id: catId, name: 'Burger', price: 800, quantity: 4 },
    ];
    const results = await callGetOptimizedOffers(foodtruckId, cart, 3200);
    // Filter: only BxGy should be checked, and it won't match
    const bxgyResults = results.filter((r) => r.offer_type === 'buy_x_get_y');
    expect(bxgyResults).toHaveLength(0);
  });
});

describe('Bundle simple', () => {
  let foodtruckId: string;
  let userId: string;
  let catBurger: string;
  let catBoisson: string;
  let catFrites: string;
  let burgerItem: string;
  let boissonItem: string;
  let fritesItem: string;

  beforeAll(async () => {
    ({ foodtruckId, userId } = await createTestFoodtruck());
    catBurger = await createCategory(foodtruckId, { name: 'Burgers' });
    catBoisson = await createCategory(foodtruckId, { name: 'Boissons' });
    catFrites = await createCategory(foodtruckId, { name: 'Frites' });

    burgerItem = await createMenuItem(foodtruckId, {
      name: 'Burger Classic',
      price: 1000,
      categoryId: catBurger,
    });
    boissonItem = await createMenuItem(foodtruckId, {
      name: 'Coca',
      price: 300,
      categoryId: catBoisson,
    });
    fritesItem = await createMenuItem(foodtruckId, {
      name: 'Frites',
      price: 500,
      categoryId: catFrites,
    });
  });

  afterAll(async () => {
    await cleanup(foodtruckId, userId);
  });

  it('bundle dont le prix fixe > somme items → discount négatif → PAS appliqué', async () => {
    // Burger (10€) + Boisson (3€) = 13€, bundle price 15€ → no discount
    await createOffer(foodtruckId, {
      name: 'Menu cher',
      offer_type: 'bundle',
      config: {
        fixed_price: 1500,
        bundle_categories: [
          { category_id: catBurger, quantity: 1 },
          { category_id: catBoisson, quantity: 1 },
        ],
      },
    });

    const cart: CartItem[] = [
      {
        menu_item_id: burgerItem,
        category_id: catBurger,
        name: 'Burger Classic',
        price: 1000,
        quantity: 1,
      },
      { menu_item_id: boissonItem, category_id: catBoisson, name: 'Coca', price: 300, quantity: 1 },
    ];
    const results = await callGetOptimizedOffers(foodtruckId, cart, 1300);
    const bundleResults = results.filter((r) => r.offer_type === 'bundle');
    expect(bundleResults).toHaveLength(0);
  });

  it('bundle Burger+Boisson+Frites 15€, panier 18€ → discount 3€', async () => {
    await createOffer(foodtruckId, {
      name: 'Menu Complet',
      offer_type: 'bundle',
      config: {
        fixed_price: 1500,
        bundle_categories: [
          { category_id: catBurger, quantity: 1 },
          { category_id: catBoisson, quantity: 1 },
          { category_id: catFrites, quantity: 1 },
        ],
      },
    });

    const cart: CartItem[] = [
      {
        menu_item_id: burgerItem,
        category_id: catBurger,
        name: 'Burger Classic',
        price: 1000,
        quantity: 1,
      },
      { menu_item_id: boissonItem, category_id: catBoisson, name: 'Coca', price: 300, quantity: 1 },
      { menu_item_id: fritesItem, category_id: catFrites, name: 'Frites', price: 500, quantity: 1 },
    ];
    const results = await callGetOptimizedOffers(foodtruckId, cart, 1800);
    const bundleResults = results.filter((r) => r.offer_type === 'bundle');
    expect(bundleResults.length).toBeGreaterThanOrEqual(1);

    const menuComplet = bundleResults.find((r) => r.offer_name === 'Menu Complet');
    expect(menuComplet).toBeDefined();
    expect(menuComplet!.calculated_discount).toBe(300); // 1800 - 1500
  });

  it('bundle incomplet (manque un item requis) → pas appliqué', async () => {
    // Only burger + boisson in cart but bundle needs 3 categories
    const cart: CartItem[] = [
      {
        menu_item_id: burgerItem,
        category_id: catBurger,
        name: 'Burger Classic',
        price: 1000,
        quantity: 1,
      },
      { menu_item_id: boissonItem, category_id: catBoisson, name: 'Coca', price: 300, quantity: 1 },
    ];
    const results = await callGetOptimizedOffers(foodtruckId, cart, 1300);
    const menuComplet = results.find((r) => r.offer_name === 'Menu Complet');
    expect(menuComplet).toBeUndefined();
  });

  it('bundle appliqué 2 fois (panier 2×burger + 2×boisson + 2×frites)', async () => {
    const cart: CartItem[] = [
      {
        menu_item_id: burgerItem,
        category_id: catBurger,
        name: 'Burger Classic',
        price: 1000,
        quantity: 2,
      },
      { menu_item_id: boissonItem, category_id: catBoisson, name: 'Coca', price: 300, quantity: 2 },
      { menu_item_id: fritesItem, category_id: catFrites, name: 'Frites', price: 500, quantity: 2 },
    ];
    const results = await callGetOptimizedOffers(foodtruckId, cart, 3600);
    const menuComplet = results.find((r) => r.offer_name === 'Menu Complet');
    expect(menuComplet).toBeDefined();
    expect(menuComplet!.times_applied).toBe(2);
    expect(menuComplet!.calculated_discount).toBe(600); // 2 × 300
  });
});

describe('Buy X Get Y (anti-gaming)', () => {
  let foodtruckId: string;
  let userId: string;
  let catPizza: string;
  let pizza10: string;
  let pizza12: string;
  let pizza15: string;

  beforeAll(async () => {
    ({ foodtruckId, userId } = await createTestFoodtruck());
    catPizza = await createCategory(foodtruckId, { name: 'Pizzas' });
    pizza10 = await createMenuItem(foodtruckId, {
      name: 'Margherita',
      price: 1000,
      categoryId: catPizza,
    });
    pizza12 = await createMenuItem(foodtruckId, {
      name: 'Reine',
      price: 1200,
      categoryId: catPizza,
    });
    pizza15 = await createMenuItem(foodtruckId, {
      name: '4 Fromages',
      price: 1500,
      categoryId: catPizza,
    });
  });

  afterAll(async () => {
    await cleanup(foodtruckId, userId);
  });

  it('BxGy "3 achetés 1 offert" (X=3 Y=1), 4 pizzas à 10€ → discount = 10€', async () => {
    await createOffer(foodtruckId, {
      name: '3+1 Pizza',
      offer_type: 'buy_x_get_y',
      config: {
        trigger_quantity: 3,
        reward_quantity: 1,
        trigger_category_ids: [catPizza],
      },
    });

    const cart: CartItem[] = [
      {
        menu_item_id: pizza10,
        category_id: catPizza,
        name: 'Margherita',
        price: 1000,
        quantity: 4,
      },
    ];
    const results = await callGetOptimizedOffers(foodtruckId, cart, 4000);
    const bxgy = results.find((r) => r.offer_type === 'buy_x_get_y');
    expect(bxgy).toBeDefined();
    expect(bxgy!.calculated_discount).toBe(1000); // 1 pizza offerte à 10€
  });

  it('5 pizzas à 10€ (1 reste) → discount = 10€ (5e pizza ignorée)', async () => {
    const cart: CartItem[] = [
      {
        menu_item_id: pizza10,
        category_id: catPizza,
        name: 'Margherita',
        price: 1000,
        quantity: 5,
      },
    ];
    const results = await callGetOptimizedOffers(foodtruckId, cart, 5000);
    const bxgy = results.find((r) => r.offer_type === 'buy_x_get_y');
    expect(bxgy).toBeDefined();
    // 5 items, group_size=4, k=1, skip=1 → 1 application, 1 item offert
    expect(bxgy!.calculated_discount).toBe(1000);
  });

  it('8 pizzas à 10€ → discount = 20€ (2 lots de 4)', async () => {
    const cart: CartItem[] = [
      {
        menu_item_id: pizza10,
        category_id: catPizza,
        name: 'Margherita',
        price: 1000,
        quantity: 8,
      },
    ];
    const results = await callGetOptimizedOffers(foodtruckId, cart, 8000);
    const bxgy = results.find((r) => r.offer_type === 'buy_x_get_y');
    expect(bxgy).toBeDefined();
    expect(bxgy!.calculated_discount).toBe(2000); // 2 × 10€
    expect(bxgy!.times_applied).toBe(2);
  });

  it('BxGy avec items à prix différents → offre la moins chère', async () => {
    // 4 pizzas: 10€, 12€, 12€, 15€ → group_size=4, k=1, skip=0
    // Sorted ASC: [10, 12, 12, 15] → reward = 10€ (cheapest in group)
    const cart: CartItem[] = [
      {
        menu_item_id: pizza10,
        category_id: catPizza,
        name: 'Margherita',
        price: 1000,
        quantity: 1,
      },
      { menu_item_id: pizza12, category_id: catPizza, name: 'Reine', price: 1200, quantity: 2 },
      {
        menu_item_id: pizza15,
        category_id: catPizza,
        name: '4 Fromages',
        price: 1500,
        quantity: 1,
      },
    ];
    const results = await callGetOptimizedOffers(foodtruckId, cart, 4900);
    const bxgy = results.find((r) => r.offer_type === 'buy_x_get_y');
    expect(bxgy).toBeDefined();
    expect(bxgy!.calculated_discount).toBe(1000); // cheapest item (10€) free
  });

  it('BxGy skip logic: 9 items (X=3 Y=1) → k=2, skip 1 cheapest', async () => {
    // 9 pizzas at 10€. group_size=4, k=floor(9/4)=2, skip=9-8=1
    // After skipping 1, 8 items form 2 groups of 4, each offers 10€
    const cart: CartItem[] = [
      {
        menu_item_id: pizza10,
        category_id: catPizza,
        name: 'Margherita',
        price: 1000,
        quantity: 9,
      },
    ];
    const results = await callGetOptimizedOffers(foodtruckId, cart, 9000);
    const bxgy = results.find((r) => r.offer_type === 'buy_x_get_y');
    expect(bxgy).toBeDefined();
    expect(bxgy!.calculated_discount).toBe(2000); // 2 × 10€
    expect(bxgy!.times_applied).toBe(2);
  });

  it('BxGy catégorie filtrée: panier mixte → seuls les matching comptent', async () => {
    const catDessert = await createCategory(foodtruckId, { name: 'Desserts' });
    const tiramisu = await createMenuItem(foodtruckId, {
      name: 'Tiramisu',
      price: 600,
      categoryId: catDessert,
    });

    // Cart: 3 pizzas + 2 desserts. BxGy only on pizzas.
    const cart: CartItem[] = [
      {
        menu_item_id: pizza10,
        category_id: catPizza,
        name: 'Margherita',
        price: 1000,
        quantity: 3,
      },
      {
        menu_item_id: tiramisu,
        category_id: catDessert,
        name: 'Tiramisu',
        price: 600,
        quantity: 2,
      },
    ];
    const results = await callGetOptimizedOffers(foodtruckId, cart, 4200);
    const bxgy = results.find((r) => r.offer_type === 'buy_x_get_y');
    // 3 pizzas only → group_size=4, k=0 → no application
    expect(bxgy).toBeUndefined();
  });
});

describe('Threshold (palier)', () => {
  let foodtruckId: string;
  let userId: string;
  let catId: string;
  let itemId: string;

  beforeAll(async () => {
    ({ foodtruckId, userId } = await createTestFoodtruck());
    catId = await createCategory(foodtruckId, { name: 'Items' });
    itemId = await createMenuItem(foodtruckId, { name: 'Item', price: 500, categoryId: catId });
  });

  afterAll(async () => {
    await cleanup(foodtruckId, userId);
  });

  it('palier "dès 20€, -3€", panier 25€ → discount 3€', async () => {
    await createOffer(foodtruckId, {
      name: 'Palier 20€',
      offer_type: 'threshold_discount',
      config: { min_amount: 2000, discount_type: 'fixed', discount_value: 300 },
    });

    const cart: CartItem[] = [
      { menu_item_id: itemId, category_id: catId, name: 'Item', price: 500, quantity: 5 },
    ];
    const results = await callGetOptimizedOffers(foodtruckId, cart, 2500);
    const threshold = results.find((r) => r.offer_type === 'threshold_discount');
    expect(threshold).toBeDefined();
    expect(threshold!.calculated_discount).toBe(300);
  });

  it('palier "dès 20€, -10%", panier 30€ → discount 3€', async () => {
    await createOffer(foodtruckId, {
      name: 'Palier 10%',
      offer_type: 'threshold_discount',
      config: { min_amount: 2000, discount_type: 'percentage', discount_value: 10 },
    });

    const cart: CartItem[] = [
      { menu_item_id: itemId, category_id: catId, name: 'Item', price: 500, quantity: 6 },
    ];
    const results = await callGetOptimizedOffers(foodtruckId, cart, 3000);
    const threshold = results.find((r) => r.offer_name === 'Palier 10%');
    expect(threshold).toBeDefined();
    expect(threshold!.calculated_discount).toBe(300); // 3000 * 10/100
  });

  it('palier "dès 20€, -3€", panier 18€ → pas atteint', async () => {
    const cart: CartItem[] = [
      { menu_item_id: itemId, category_id: catId, name: 'Item', price: 600, quantity: 3 },
    ];
    const results = await callGetOptimizedOffers(foodtruckId, cart, 1800);
    const threshold = results.find((r) => r.offer_name === 'Palier 20€');
    expect(threshold).toBeUndefined();
  });

  it('palier cumulé avec bundle → les 2 s additionnent', async () => {
    const catBurger = await createCategory(foodtruckId, { name: 'Burgers' });
    const catBoisson = await createCategory(foodtruckId, { name: 'Boissons' });
    const burger = await createMenuItem(foodtruckId, {
      name: 'Burger',
      price: 1200,
      categoryId: catBurger,
    });
    const boisson = await createMenuItem(foodtruckId, {
      name: 'Coca',
      price: 400,
      categoryId: catBoisson,
    });

    await createOffer(foodtruckId, {
      name: 'Menu B+B',
      offer_type: 'bundle',
      config: {
        fixed_price: 1400,
        bundle_categories: [
          { category_id: catBurger, quantity: 1 },
          { category_id: catBoisson, quantity: 1 },
        ],
      },
    });

    // Cart: burger (12€) + boisson (4€) + 3 items (5€ each) = 31€ total
    const cart: CartItem[] = [
      { menu_item_id: burger, category_id: catBurger, name: 'Burger', price: 1200, quantity: 1 },
      { menu_item_id: boisson, category_id: catBoisson, name: 'Coca', price: 400, quantity: 1 },
      { menu_item_id: itemId, category_id: catId, name: 'Item', price: 500, quantity: 3 },
    ];
    const totalAmount = 1200 + 400 + 1500; // 31€
    const results = await callGetOptimizedOffers(foodtruckId, cart, totalAmount);

    const bundleDiscount = results.find((r) => r.offer_name === 'Menu B+B');
    const thresholdDiscount = results.find((r) => r.offer_name === 'Palier 20€');

    expect(bundleDiscount).toBeDefined();
    expect(bundleDiscount!.calculated_discount).toBe(200); // 1600 - 1400

    expect(thresholdDiscount).toBeDefined();
    expect(thresholdDiscount!.calculated_discount).toBe(300); // fixed 3€
  });
});

describe('Promo code', () => {
  let foodtruckId: string;
  let userId: string;
  let catId: string;
  let itemId: string;

  beforeAll(async () => {
    ({ foodtruckId, userId } = await createTestFoodtruck());
    catId = await createCategory(foodtruckId, { name: 'Items' });
    itemId = await createMenuItem(foodtruckId, { name: 'Item', price: 1000, categoryId: catId });
  });

  afterAll(async () => {
    await cleanup(foodtruckId, userId);
  });

  it('code valide, percentage 10%, panier 50€ → discount 5€', async () => {
    await createOffer(foodtruckId, {
      name: 'Bienvenue 10%',
      offer_type: 'promo_code',
      config: { code: 'BIENVENUE', discount_type: 'percentage', discount_value: 10 },
    });

    const cart: CartItem[] = [
      { menu_item_id: itemId, category_id: catId, name: 'Item', price: 1000, quantity: 5 },
    ];
    const results = await callGetOptimizedOffers(foodtruckId, cart, 5000, 'BIENVENUE');
    const promo = results.find((r) => r.offer_type === 'promo_code');
    expect(promo).toBeDefined();
    expect(promo!.calculated_discount).toBe(500);
  });

  it('code valide, fixed -5€, min_order_amount 30€, panier 25€ → pas appliqué', async () => {
    await createOffer(foodtruckId, {
      name: 'Fixe 5€',
      offer_type: 'promo_code',
      config: { code: 'CINQ', discount_type: 'fixed', discount_value: 500, min_order_amount: 3000 },
    });

    const cart: CartItem[] = [
      { menu_item_id: itemId, category_id: catId, name: 'Item', price: 500, quantity: 5 },
    ];
    const results = await callGetOptimizedOffers(foodtruckId, cart, 2500, 'CINQ');
    const promo = results.find((r) => r.offer_name === 'Fixe 5€');
    expect(promo).toBeUndefined();
  });

  it('code valide, fixed -5€, min_order_amount 30€, panier 35€ → appliqué', async () => {
    const cart: CartItem[] = [
      { menu_item_id: itemId, category_id: catId, name: 'Item', price: 500, quantity: 7 },
    ];
    const results = await callGetOptimizedOffers(foodtruckId, cart, 3500, 'CINQ');
    const promo = results.find((r) => r.offer_name === 'Fixe 5€');
    expect(promo).toBeDefined();
    expect(promo!.calculated_discount).toBe(500);
  });

  it('code expiré (end_date passée) → pas appliqué', async () => {
    await createOffer(foodtruckId, {
      name: 'Expiré',
      offer_type: 'promo_code',
      config: { code: 'EXPIRE', discount_type: 'fixed', discount_value: 500 },
      end_date: '2020-01-01T00:00:00Z',
    });

    const cart: CartItem[] = [
      { menu_item_id: itemId, category_id: catId, name: 'Item', price: 1000, quantity: 3 },
    ];
    const results = await callGetOptimizedOffers(foodtruckId, cart, 3000, 'EXPIRE');
    const promo = results.find((r) => r.offer_name === 'Expiré');
    expect(promo).toBeUndefined();
  });

  it('code cumulable avec bundle actif → les 2 s appliquent', async () => {
    const catBurger = await createCategory(foodtruckId, { name: 'Burgers' });
    const catBoisson = await createCategory(foodtruckId, { name: 'Boissons' });
    const burger = await createMenuItem(foodtruckId, {
      name: 'Burger',
      price: 1000,
      categoryId: catBurger,
    });
    const boisson = await createMenuItem(foodtruckId, {
      name: 'Coca',
      price: 300,
      categoryId: catBoisson,
    });

    await createOffer(foodtruckId, {
      name: 'Bundle B+B',
      offer_type: 'bundle',
      config: {
        fixed_price: 1100,
        bundle_categories: [
          { category_id: catBurger, quantity: 1 },
          { category_id: catBoisson, quantity: 1 },
        ],
      },
    });

    const cart: CartItem[] = [
      { menu_item_id: burger, category_id: catBurger, name: 'Burger', price: 1000, quantity: 1 },
      { menu_item_id: boisson, category_id: catBoisson, name: 'Coca', price: 300, quantity: 1 },
    ];
    const totalAmount = 1300;
    const results = await callGetOptimizedOffers(foodtruckId, cart, totalAmount, 'BIENVENUE');

    const bundle = results.find((r) => r.offer_type === 'bundle');
    const promo = results.find((r) => r.offer_type === 'promo_code');

    expect(bundle).toBeDefined();
    expect(bundle!.calculated_discount).toBe(200); // 1300 - 1100

    expect(promo).toBeDefined();
    // 10% of 1300 = 130
    expect(promo!.calculated_discount).toBe(130);
  });
});

describe('Optimisation dual-strategy', () => {
  let foodtruckId: string;
  let userId: string;
  let catBurger: string;
  let catBoisson: string;
  let burger: string;
  let boisson: string;

  beforeAll(async () => {
    ({ foodtruckId, userId } = await createTestFoodtruck());
    catBurger = await createCategory(foodtruckId, { name: 'Burgers' });
    catBoisson = await createCategory(foodtruckId, { name: 'Boissons' });
    burger = await createMenuItem(foodtruckId, {
      name: 'Burger',
      price: 800,
      categoryId: catBurger,
    });
    boisson = await createMenuItem(foodtruckId, {
      name: 'Coca',
      price: 300,
      categoryId: catBoisson,
    });
  });

  afterAll(async () => {
    await cleanup(foodtruckId, userId);
  });

  it('dual strategy picks the combination with max discount', async () => {
    // Bundle: Burger + Boisson = 9€ (prix fixe)
    // Discount if bundle: (8+3) - 9 = 2€
    await createOffer(foodtruckId, {
      name: 'Menu Duo',
      offer_type: 'bundle',
      config: {
        fixed_price: 900,
        bundle_categories: [
          { category_id: catBurger, quantity: 1 },
          { category_id: catBoisson, quantity: 1 },
        ],
      },
    });

    // BxGy: 2 burgers achetés, 1 offert (on burgers category)
    await createOffer(foodtruckId, {
      name: '2+1 Burger',
      offer_type: 'buy_x_get_y',
      config: {
        trigger_quantity: 2,
        reward_quantity: 1,
        trigger_category_ids: [catBurger],
      },
    });

    // Cart: 3 burgers (8€ each) + 1 boisson (3€) = 27€
    const cart: CartItem[] = [
      { menu_item_id: burger, category_id: catBurger, name: 'Burger', price: 800, quantity: 3 },
      { menu_item_id: boisson, category_id: catBoisson, name: 'Coca', price: 300, quantity: 1 },
    ];

    const results = await callGetOptimizedOffers(foodtruckId, cart, 2700);
    const total = getTotalDiscount(results);

    // Strategy A (bundle first): bundle uses 1 burger + 1 boisson → discount 2€.
    //   Remaining: 2 burgers. BxGy needs X+Y=3, only 2 left → 0.
    //   Total A = 2€ = 200 cents
    //
    // Strategy B (BxGy first): BxGy on 3 burgers → discount 8€ = 800 cents.
    //   Remaining: 0 burgers + 1 boisson. Bundle needs burger+boisson → can't apply.
    //   Total B = 8€ = 800 cents
    //
    // Best = B = 800 cents
    expect(total).toBe(800);
    const bxgy = results.find((r) => r.offer_type === 'buy_x_get_y');
    expect(bxgy).toBeDefined();
    expect(bxgy!.calculated_discount).toBe(800);
  });

  it('scenario where bundle-first wins', async () => {
    // New foodtruck to avoid cross-contamination
    const { foodtruckId: ftId, userId: uid } = await createTestFoodtruck();
    const catPlat = await createCategory(ftId, { name: 'Plats' });
    const catDessert = await createCategory(ftId, { name: 'Desserts' });
    const plat = await createMenuItem(ftId, { name: 'Plat', price: 1200, categoryId: catPlat });
    const dessert = await createMenuItem(ftId, {
      name: 'Dessert',
      price: 500,
      categoryId: catDessert,
    });

    // Bundle: Plat + Dessert = 14€ → discount = (12+5) - 14 = 3€
    await createOffer(ftId, {
      name: 'Menu PD',
      offer_type: 'bundle',
      config: {
        fixed_price: 1400,
        bundle_categories: [
          { category_id: catPlat, quantity: 1 },
          { category_id: catDessert, quantity: 1 },
        ],
      },
    });

    // BxGy: 3 desserts achetés, 1 offert
    await createOffer(ftId, {
      name: '3+1 Dessert',
      offer_type: 'buy_x_get_y',
      config: {
        trigger_quantity: 3,
        reward_quantity: 1,
        trigger_category_ids: [catDessert],
      },
    });

    // Cart: 1 plat (12€) + 4 desserts (5€ each) = 32€
    const cart: CartItem[] = [
      { menu_item_id: plat, category_id: catPlat, name: 'Plat', price: 1200, quantity: 1 },
      { menu_item_id: dessert, category_id: catDessert, name: 'Dessert', price: 500, quantity: 4 },
    ];

    const results = await callGetOptimizedOffers(ftId, cart, 3200);
    const total = getTotalDiscount(results);

    // Strategy A (bundle first): bundle uses 1 plat + 1 dessert → discount 300.
    //   Remaining desserts: 3. BxGy needs 4 (X+Y=4), only 3 → 0.
    //   Total A = 300
    //
    // Strategy B (BxGy first): BxGy on 4 desserts → discount 500.
    //   Remaining: 1 plat + 0 desserts. Bundle needs dessert → can't.
    //   Total B = 500
    //
    // Best = B = 500
    expect(total).toBe(500);

    await cleanup(ftId, uid);
  });
});

describe('Validité temporelle', () => {
  let foodtruckId: string;
  let userId: string;
  let catId: string;
  let itemId: string;

  beforeAll(async () => {
    ({ foodtruckId, userId } = await createTestFoodtruck());
    catId = await createCategory(foodtruckId, { name: 'Items' });
    itemId = await createMenuItem(foodtruckId, { name: 'Item', price: 1000, categoryId: catId });
  });

  afterAll(async () => {
    await cleanup(foodtruckId, userId);
  });

  it('offre active=false → pas appliquée', async () => {
    await createOffer(foodtruckId, {
      name: 'Inactive',
      offer_type: 'threshold_discount',
      config: { min_amount: 500, discount_type: 'fixed', discount_value: 200 },
      is_active: false,
    });

    const cart: CartItem[] = [
      { menu_item_id: itemId, category_id: catId, name: 'Item', price: 1000, quantity: 1 },
    ];
    const results = await callGetOptimizedOffers(foodtruckId, cart, 1000);
    expect(results.find((r) => r.offer_name === 'Inactive')).toBeUndefined();
  });

  it('offre avec start_date dans le futur → pas appliquée', async () => {
    await createOffer(foodtruckId, {
      name: 'Futur',
      offer_type: 'threshold_discount',
      config: { min_amount: 500, discount_type: 'fixed', discount_value: 200 },
      start_date: '2099-01-01T00:00:00Z',
    });

    const cart: CartItem[] = [
      { menu_item_id: itemId, category_id: catId, name: 'Item', price: 1000, quantity: 1 },
    ];
    const results = await callGetOptimizedOffers(foodtruckId, cart, 1000);
    expect(results.find((r) => r.offer_name === 'Futur')).toBeUndefined();
  });

  it('offre avec end_date dans le passé → pas appliquée', async () => {
    await createOffer(foodtruckId, {
      name: 'Passé',
      offer_type: 'threshold_discount',
      config: { min_amount: 500, discount_type: 'fixed', discount_value: 200 },
      end_date: '2020-01-01T00:00:00Z',
    });

    const cart: CartItem[] = [
      { menu_item_id: itemId, category_id: catId, name: 'Item', price: 1000, quantity: 1 },
    ];
    const results = await callGetOptimizedOffers(foodtruckId, cart, 1000);
    expect(results.find((r) => r.offer_name === 'Passé')).toBeUndefined();
  });

  it('offre days_of_week=[0] (dimanche) ne s applique pas un mardi (p_check_date=mardi)', async () => {
    await createOffer(foodtruckId, {
      name: 'Dimanche only',
      offer_type: 'threshold_discount',
      config: { min_amount: 500, discount_type: 'fixed', discount_value: 200 },
      days_of_week: [0], // Sunday only
    });

    const cart: CartItem[] = [
      { menu_item_id: itemId, category_id: catId, name: 'Item', price: 1000, quantity: 1 },
    ];
    // 2026-05-26 is a Tuesday (DOW=2) in Paris timezone
    const tuesday = '2026-05-26T12:00:00+02:00';
    const results = await callGetOptimizedOffers(foodtruckId, cart, 1000, undefined, tuesday);
    const offer = results.find((r) => r.offer_name === 'Dimanche only');
    expect(offer).toBeUndefined();
  });

  it('offre days_of_week=[2] (mardi) s applique un mardi', async () => {
    await createOffer(foodtruckId, {
      name: 'Mardi only',
      offer_type: 'threshold_discount',
      config: { min_amount: 500, discount_type: 'fixed', discount_value: 150 },
      days_of_week: [2], // Tuesday only
    });

    const cart: CartItem[] = [
      { menu_item_id: itemId, category_id: catId, name: 'Item', price: 1000, quantity: 1 },
    ];
    const tuesday = '2026-05-26T12:00:00+02:00';
    const results = await callGetOptimizedOffers(foodtruckId, cart, 1000, undefined, tuesday);
    const offer = results.find((r) => r.offer_name === 'Mardi only');
    expect(offer).toBeDefined();
    expect(offer!.calculated_discount).toBe(150);
  });

  it('offre days_of_week=[1,2,3,4,5] (semaine) ne s applique pas un samedi', async () => {
    await createOffer(foodtruckId, {
      name: 'Semaine only',
      offer_type: 'threshold_discount',
      config: { min_amount: 500, discount_type: 'fixed', discount_value: 100 },
      days_of_week: [1, 2, 3, 4, 5], // Mon-Fri
    });

    const cart: CartItem[] = [
      { menu_item_id: itemId, category_id: catId, name: 'Item', price: 1000, quantity: 1 },
    ];
    // 2026-05-30 is a Saturday (DOW=6)
    const saturday = '2026-05-30T12:00:00+02:00';
    const results = await callGetOptimizedOffers(foodtruckId, cart, 1000, undefined, saturday);
    const offer = results.find((r) => r.offer_name === 'Semaine only');
    expect(offer).toBeUndefined();
  });

  it('offre avec days_of_week=null → appliquée tous les jours', async () => {
    await createOffer(foodtruckId, {
      name: 'Tous les jours',
      offer_type: 'threshold_discount',
      config: { min_amount: 500, discount_type: 'fixed', discount_value: 100 },
      days_of_week: null,
    });

    const cart: CartItem[] = [
      { menu_item_id: itemId, category_id: catId, name: 'Item', price: 1000, quantity: 1 },
    ];
    const results = await callGetOptimizedOffers(foodtruckId, cart, 1000);
    expect(results.find((r) => r.offer_name === 'Tous les jours')).toBeDefined();
  });
});

describe('Edge cases divers', () => {
  let foodtruckId: string;
  let userId: string;

  beforeAll(async () => {
    ({ foodtruckId, userId } = await createTestFoodtruck());
  });

  afterAll(async () => {
    await cleanup(foodtruckId, userId);
  });

  it('panier avec quantité > 1 sur un item → expand correctement', async () => {
    const catId = await createCategory(foodtruckId, { name: 'Pizzas' });
    const pizza = await createMenuItem(foodtruckId, {
      name: 'Pizza',
      price: 1000,
      categoryId: catId,
    });

    await createOffer(foodtruckId, {
      name: '3+1',
      offer_type: 'buy_x_get_y',
      config: { trigger_quantity: 3, reward_quantity: 1, trigger_category_ids: [catId] },
    });

    // quantity: 4 should be expanded to 4 individual items
    const cart: CartItem[] = [
      { menu_item_id: pizza, category_id: catId, name: 'Pizza', price: 1000, quantity: 4 },
    ];
    const results = await callGetOptimizedOffers(foodtruckId, cart, 4000);
    const bxgy = results.find((r) => r.offer_type === 'buy_x_get_y');
    expect(bxgy).toBeDefined();
    expect(bxgy!.calculated_discount).toBe(1000);
  });

  it('item du panier qui n existe plus en BDD → discount 0 (pas de crash)', async () => {
    const fakeItemId = '00000000-0000-0000-0000-000000000001';
    const fakeCatId = '00000000-0000-0000-0000-000000000002';

    const cart: CartItem[] = [
      { menu_item_id: fakeItemId, category_id: fakeCatId, name: 'Ghost', price: 1000, quantity: 1 },
    ];
    // Should not throw, just return empty results
    const results = await callGetOptimizedOffers(foodtruckId, cart, 1000);
    expect(getTotalDiscount(results)).toBe(0);
  });

  it('bundle avec quantité > 1 dans une catégorie', async () => {
    const catDrink = await createCategory(foodtruckId, { name: 'Drinks' });
    const drink = await createMenuItem(foodtruckId, {
      name: 'Jus',
      price: 400,
      categoryId: catDrink,
    });

    // Bundle: 2 drinks for 6€ (normally 8€)
    await createOffer(foodtruckId, {
      name: '2 Drinks 6€',
      offer_type: 'bundle',
      config: {
        fixed_price: 600,
        bundle_categories: [{ category_id: catDrink, quantity: 2 }],
      },
    });

    const cart: CartItem[] = [
      { menu_item_id: drink, category_id: catDrink, name: 'Jus', price: 400, quantity: 2 },
    ];
    const results = await callGetOptimizedOffers(foodtruckId, cart, 800);
    const bundle = results.find((r) => r.offer_name === '2 Drinks 6€');
    expect(bundle).toBeDefined();
    expect(bundle!.calculated_discount).toBe(200); // 800 - 600
  });

  it('promo code case-insensitive', async () => {
    await createOffer(foodtruckId, {
      name: 'Promo Case',
      offer_type: 'promo_code',
      config: { code: 'HELLO', discount_type: 'fixed', discount_value: 200 },
    });

    const catId = await createCategory(foodtruckId, { name: 'Misc' });
    const item = await createMenuItem(foodtruckId, {
      name: 'Thing',
      price: 500,
      categoryId: catId,
    });

    const cart: CartItem[] = [
      { menu_item_id: item, category_id: catId, name: 'Thing', price: 500, quantity: 1 },
    ];
    const results = await callGetOptimizedOffers(foodtruckId, cart, 500, 'hello');
    const promo = results.find((r) => r.offer_name === 'Promo Case');
    expect(promo).toBeDefined();
    expect(promo!.calculated_discount).toBe(200);
  });

  it('promo code wrong → no discount', async () => {
    const catId2 = await createCategory(foodtruckId, { name: 'Cat2' });
    const item2 = await createMenuItem(foodtruckId, {
      name: 'Item2',
      price: 500,
      categoryId: catId2,
    });

    const cart: CartItem[] = [
      { menu_item_id: item2, category_id: catId2, name: 'Item2', price: 500, quantity: 1 },
    ];
    const results = await callGetOptimizedOffers(foodtruckId, cart, 500, 'WRONGCODE');
    const promo = results.find((r) => r.offer_type === 'promo_code');
    expect(promo).toBeUndefined();
  });

  it('multiple bundles on different categories can stack', async () => {
    const { foodtruckId: ftId, userId: uid } = await createTestFoodtruck();
    const catA = await createCategory(ftId, { name: 'A' });
    const catB = await createCategory(ftId, { name: 'B' });
    const catC = await createCategory(ftId, { name: 'C' });
    const catD = await createCategory(ftId, { name: 'D' });
    const itemA = await createMenuItem(ftId, { name: 'ItemA', price: 800, categoryId: catA });
    const itemB = await createMenuItem(ftId, { name: 'ItemB', price: 400, categoryId: catB });
    const itemC = await createMenuItem(ftId, { name: 'ItemC', price: 700, categoryId: catC });
    const itemD = await createMenuItem(ftId, { name: 'ItemD', price: 300, categoryId: catD });

    // Bundle 1: A + B = 10€ → discount = 12-10 = 2€
    await createOffer(ftId, {
      name: 'Bundle AB',
      offer_type: 'bundle',
      config: {
        fixed_price: 1000,
        bundle_categories: [
          { category_id: catA, quantity: 1 },
          { category_id: catB, quantity: 1 },
        ],
      },
    });

    // Bundle 2: C + D = 8€ → discount = 10-8 = 2€
    await createOffer(ftId, {
      name: 'Bundle CD',
      offer_type: 'bundle',
      config: {
        fixed_price: 800,
        bundle_categories: [
          { category_id: catC, quantity: 1 },
          { category_id: catD, quantity: 1 },
        ],
      },
    });

    const cart: CartItem[] = [
      { menu_item_id: itemA, category_id: catA, name: 'ItemA', price: 800, quantity: 1 },
      { menu_item_id: itemB, category_id: catB, name: 'ItemB', price: 400, quantity: 1 },
      { menu_item_id: itemC, category_id: catC, name: 'ItemC', price: 700, quantity: 1 },
      { menu_item_id: itemD, category_id: catD, name: 'ItemD', price: 300, quantity: 1 },
    ];
    const results = await callGetOptimizedOffers(ftId, cart, 2200);
    const total = getTotalDiscount(results);
    expect(total).toBe(400); // 200 + 200

    await cleanup(ftId, uid);
  });
});
