export const ORDER_STATUSES = {
  pending: { label: 'En attente', color: 'yellow' },
  confirmed: { label: 'Confirmée', color: 'blue' },
  preparing: { label: 'En préparation', color: 'orange' },
  ready: { label: 'Prête', color: 'green' },
  picked_up: { label: 'Retirée', color: 'gray' },
  cancelled: { label: 'Annulée', color: 'red' },
  no_show: { label: 'Non récupérée', color: 'red' },
} as const;

export const CUISINE_TYPES = [
  'Burger',
  'Pizza',
  'Tacos',
  'Asiatique',
  'Kebab',
  'Crêpes',
  'Fruits de mer',
  'Végétarien',
  'Vegan',
  'Barbecue',
  'Indien',
  'Mexicain',
  'Sushi',
  'Pâtes',
  'Sandwichs',
  'Salades',
  'Desserts',
  'Autre',
] as const;

export const DEFAULT_CATEGORIES = [
  { name: 'Entrées', display_order: 1 },
  { name: 'Plats', display_order: 2 },
  { name: 'Desserts', display_order: 3 },
  { name: 'Boissons', display_order: 4 },
] as const;

export const ALLERGENS = [
  'Gluten',
  'Crustacés',
  'Œufs',
  'Poissons',
  'Arachides',
  'Soja',
  'Lait',
  'Fruits à coque',
  'Céleri',
  'Moutarde',
  'Sésame',
  'Sulfites',
  'Lupin',
  'Mollusques',
] as const;

export const PICKUP_INTERVAL_MINUTES = 15;
export const MIN_PICKUP_BUFFER_MINUTES = 30;
export const MAX_ORDERS_PER_SLOT = 5;

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Espèces', icon: 'Banknote' },
  { id: 'card', label: 'Carte bancaire', icon: 'CreditCard' },
  { id: 'contactless', label: 'Sans contact', icon: 'Smartphone' },
  { id: 'lydia', label: 'Lydia', icon: 'Wallet' },
  { id: 'paylib', label: 'Paylib', icon: 'Wallet' },
  { id: 'check', label: 'Chèque', icon: 'FileText' },
] as const;

export type PaymentMethodId = typeof PAYMENT_METHODS[number]['id'];

/**
 * Theme color palettes for food truck customization
 * Each theme defines the primary color palette used in the client app
 */
export const COLOR_THEMES = [
  {
    id: 'coral',
    name: 'Corail',
    description: 'Chaleureux et accueillant',
    colors: {
      50: '#FFF5F3',
      100: '#FFE8E4',
      200: '#FFD4CC',
      300: '#FFB4A8',
      400: '#FB923C',
      500: '#F97066',
      600: '#E5634D',
      700: '#C94D3A',
    },
    preview: '#F97066',
  },
  {
    id: 'orange',
    name: 'Orange',
    description: 'Énergique et gourmand',
    colors: {
      50: '#FFF7ED',
      100: '#FFEDD5',
      200: '#FED7AA',
      300: '#FDBA74',
      400: '#FF8C5A',
      500: '#FF6B35',
      600: '#E55A2B',
      700: '#C2410C',
    },
    preview: '#FF6B35',
  },
  {
    id: 'emerald',
    name: 'Émeraude',
    description: 'Frais et naturel',
    colors: {
      50: '#ECFDF5',
      100: '#D1FAE5',
      200: '#A7F3D0',
      300: '#6EE7B7',
      400: '#34D399',
      500: '#10B981',
      600: '#059669',
      700: '#047857',
    },
    preview: '#10B981',
  },
  {
    id: 'blue',
    name: 'Océan',
    description: 'Rafraîchissant et moderne',
    colors: {
      50: '#EFF6FF',
      100: '#DBEAFE',
      200: '#BFDBFE',
      300: '#93C5FD',
      400: '#60A5FA',
      500: '#3B82F6',
      600: '#2563EB',
      700: '#1D4ED8',
    },
    preview: '#3B82F6',
  },
  {
    id: 'purple',
    name: 'Violet',
    description: 'Élégant et créatif',
    colors: {
      50: '#FAF5FF',
      100: '#F3E8FF',
      200: '#E9D5FF',
      300: '#D8B4FE',
      400: '#C084FC',
      500: '#A855F7',
      600: '#9333EA',
      700: '#7C3AED',
    },
    preview: '#A855F7',
  },
  {
    id: 'red',
    name: 'Rouge',
    description: 'Audacieux et passionné',
    colors: {
      50: '#FEF2F2',
      100: '#FEE2E2',
      200: '#FECACA',
      300: '#FCA5A5',
      400: '#F87171',
      500: '#EF4444',
      600: '#DC2626',
      700: '#B91C1C',
    },
    preview: '#EF4444',
  },
] as const;

export type ThemeId = typeof COLOR_THEMES[number]['id'];
