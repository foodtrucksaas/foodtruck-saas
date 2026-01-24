/**
 * Test fixtures and mock data for FoodTruck SaaS E2E tests
 */

// Test user credentials
export const TEST_CREDENTIALS = {
  validUser: {
    email: 'test@example.com',
    password: 'TestPassword123!',
  },
  invalidUser: {
    email: 'invalid@test.com',
    password: 'wrongpassword',
  },
};

// Test customer data for checkout
export const TEST_CUSTOMER = {
  name: 'Jean Dupont',
  email: 'jean.dupont@test.com',
  phone: '+33612345678',
};

// Test foodtruck data (should match seeded data if available)
export const TEST_FOODTRUCK = {
  id: 'test-foodtruck',
  name: 'Test FoodTruck',
  slug: 'test-foodtruck',
};

// Order statuses
export const ORDER_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  PICKED_UP: 'picked_up',
  CANCELLED: 'cancelled',
  NO_SHOW: 'no_show',
} as const;

// French text strings used in the app (for assertions)
export const UI_TEXT = {
  // Client app
  client: {
    emptyCart: 'Votre panier est vide',
    seeMenu: 'Voir le menu',
    addToCart: 'Ajouter',
    viewCart: 'Voir le panier',
    checkout: 'Finaliser',
    confirm: 'Confirmer',
    closedToday: 'Ferme aujourd\'hui',
    openToday: 'Ouvert aujourd\'hui',
    pickupTime: 'Retrait',
    asap: 'Des que possible',
    coordinates: 'Coordonnees',
    name: 'Nom',
    email: 'Email',
    phone: 'Telephone',
    instructions: 'Instructions',
    receiveOffers: 'Recevoir des offres',
    orderConfirmed: 'Commande confirmee',
    orderPending: 'En attente de validation',
    amountToPay: 'Montant a regler sur place',
  },
  // Dashboard app
  dashboard: {
    login: 'Se connecter',
    logout: 'Deconnexion',
    register: 'Creer un compte',
    forgotPassword: 'Mot de passe oublie',
    magicLink: 'magic link',
    dashboard: 'Tableau de bord',
    menu: 'Menu',
    orders: 'Commandes',
    schedule: 'Planning',
    analytics: 'Statistiques',
    settings: 'Parametres',
    customers: 'Clients',
    campaigns: 'Campagnes',
    noOrders: 'Aucune commande',
    accept: 'Accepter',
    cancel: 'Annuler',
    markReady: 'Prete',
    markPickedUp: 'Retiree',
    pending: 'Attente',
    confirmed: 'Acceptee',
    ready: 'Prete',
    pickedUp: 'Retiree',
  },
};

// Common selectors used across tests
export const SELECTORS = {
  // Client app
  client: {
    header: 'header',
    menuItem: '[data-testid="menu-item"], .menu-item',
    addButton: 'button:has-text("Ajouter")',
    cartButton: '[data-testid="cart-button"], a[href*="checkout"]',
    cartCount: '[data-testid="cart-count"]',
    checkoutForm: 'form',
    submitButton: 'button[type="submit"]',
    priceDisplay: '[data-testid="price"], .price',
    loadingSpinner: '.animate-spin',
    errorMessage: '[class*="error"], [role="alert"]',
  },
  // Dashboard app
  dashboard: {
    sidebar: '[data-testid="sidebar"], nav',
    loginForm: 'form',
    emailInput: 'input[type="email"]',
    passwordInput: 'input[type="password"]',
    submitButton: 'button[type="submit"]',
    orderCard: '[data-testid="order-card"], .order-card',
    statusBadge: '[data-testid="status-badge"], .status-badge',
    acceptButton: 'button:has-text("Accepter")',
    rejectButton: 'button:has-text("Annuler"), button:has-text("Refuser")',
    readyButton: 'button:has-text("Prete")',
    pickedUpButton: 'button:has-text("Retiree")',
    loadingSpinner: '.animate-spin',
  },
};

// Test timeouts
export const TIMEOUTS = {
  short: 3000,
  medium: 10000,
  long: 30000,
  navigation: 30000,
  animation: 500,
};

// Viewport sizes
export const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 720 },
  largeDesktop: { width: 1920, height: 1080 },
};

// Routes
export const ROUTES = {
  client: {
    home: '/',
    foodtruck: (id: string) => `/${id}`,
    checkout: (id: string) => `/${id}/checkout`,
    orderStatus: (id: string) => `/order/${id}`,
    orderHistory: '/orders',
    unsubscribe: '/unsubscribe',
  },
  dashboard: {
    login: '/login',
    register: '/register',
    forgotPassword: '/forgot-password',
    dashboard: '/',
    menu: '/menu',
    orders: '/orders',
    schedule: '/schedule',
    analytics: '/analytics',
    settings: '/settings',
    customers: '/customers',
    campaigns: '/campaigns',
    offers: '/offers',
    loyalty: '/loyalty',
    onboarding: '/onboarding',
  },
};
