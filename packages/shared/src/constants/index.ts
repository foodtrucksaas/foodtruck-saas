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

export type PaymentMethodId = (typeof PAYMENT_METHODS)[number]['id'];

/**
 * 8 curated Mediterranean accent colors for food truck customization.
 * Each theme defines the primary color palette used in the client app.
 * See docs/brand/design-system.md section 11.2.
 */
export const COLOR_THEMES = [
  {
    id: 'corail',
    name: 'Corail',
    description: 'Chaleureux universel',
    textOnAccent: '#FFFFFF' as const,
    colors: {
      50: '#FFF1EF',
      100: '#FFE0DC',
      200: '#FFC5BD',
      300: '#FFA094',
      400: '#FB8477',
      500: '#F97066',
      600: '#E5534A',
      700: '#C44038',
    },
    preview: '#F97066',
  },
  {
    id: 'marine',
    name: 'Marine',
    description: 'Sobre, élégant',
    textOnAccent: '#FFFFFF' as const,
    colors: {
      50: '#EEF2F7',
      100: '#D4DFEB',
      200: '#A9BFD7',
      300: '#7E9FC3',
      400: '#4E6F91',
      500: '#1E3A5F',
      600: '#172E4D',
      700: '#11223B',
    },
    preview: '#1E3A5F',
  },
  {
    id: 'olive',
    name: 'Olive',
    description: 'Naturel, terroir',
    textOnAccent: '#FFFFFF' as const,
    colors: {
      50: '#F4F6EE',
      100: '#E4E9D5',
      200: '#CBD4AB',
      300: '#AEBA7D',
      400: '#8C9A5C',
      500: '#6B7A3F',
      600: '#566332',
      700: '#424C26',
    },
    preview: '#6B7A3F',
  },
  {
    id: 'terracotta',
    name: 'Terra cuite',
    description: 'Rustique, chaleureux',
    textOnAccent: '#FFFFFF' as const,
    colors: {
      50: '#FBF0ED',
      100: '#F5D8D1',
      200: '#E8AEA1',
      300: '#D98471',
      400: '#CA6550',
      500: '#B84A36',
      600: '#983C2C',
      700: '#782F23',
    },
    preview: '#B84A36',
  },
  {
    id: 'safran',
    name: 'Safran',
    description: 'Solaire, méditerranéen',
    textOnAccent: '#2D2D2D' as const,
    colors: {
      50: '#FBF5E8',
      100: '#F5E6C6',
      200: '#EDD19E',
      300: '#E3BB76',
      400: '#DBAD62',
      500: '#D4A04E',
      600: '#B8883F',
      700: '#966E32',
    },
    preview: '#D4A04E',
  },
  {
    id: 'anthracite',
    name: 'Anthracite',
    description: 'Minimal, premium',
    textOnAccent: '#FFFFFF' as const,
    colors: {
      50: '#F0F0F0',
      100: '#D9D9D9',
      200: '#B3B3B3',
      300: '#8C8C8C',
      400: '#5C5C5C',
      500: '#2D2D2D',
      600: '#222222',
      700: '#171717',
    },
    preview: '#2D2D2D',
  },
  {
    id: 'aubergine',
    name: 'Aubergine',
    description: 'Sophistiqué',
    textOnAccent: '#FFFFFF' as const,
    colors: {
      50: '#F5F0F3',
      100: '#E6D8E0',
      200: '#CDAFC0',
      300: '#B087A0',
      400: '#856170',
      500: '#5A3D4F',
      600: '#4A3241',
      700: '#3A2733',
    },
    preview: '#5A3D4F',
  },
  {
    id: 'vertsapin',
    name: 'Vert sapin',
    description: 'Forestier, brasserie',
    textOnAccent: '#FFFFFF' as const,
    colors: {
      50: '#EDF4F0',
      100: '#D2E4DA',
      200: '#A5C9B5',
      300: '#78AE90',
      400: '#4F836A',
      500: '#2D5944',
      600: '#244938',
      700: '#1B382B',
    },
    preview: '#2D5944',
  },
] as const;

export type ThemeId = (typeof COLOR_THEMES)[number]['id'];
