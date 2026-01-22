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

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Espèces', icon: 'Banknote' },
  { id: 'card', label: 'Carte bancaire', icon: 'CreditCard' },
  { id: 'contactless', label: 'Sans contact', icon: 'Smartphone' },
  { id: 'lydia', label: 'Lydia', icon: 'Wallet' },
  { id: 'paylib', label: 'Paylib', icon: 'Wallet' },
  { id: 'check', label: 'Chèque', icon: 'FileText' },
] as const;
