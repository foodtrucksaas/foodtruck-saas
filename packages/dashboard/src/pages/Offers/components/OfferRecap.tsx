import { CheckCircle2, Info } from 'lucide-react';
import type { OfferFormState, CategoryWithOptionGroups } from '../useOffers';

// ============================================
// Recap Banner — positive summary of what's configured
// ============================================

interface OfferRecapBannerProps {
  form: OfferFormState;
  categories: CategoryWithOptionGroups[];
}

function getCategoryNames(ids: string[], categories: CategoryWithOptionGroups[]) {
  return ids
    .map((id) => categories.find((c) => c.id === id)?.name)
    .filter(Boolean)
    .join(' / ');
}

function getBundleRecapText(
  form: OfferFormState,
  categories: CategoryWithOptionGroups[]
): string | null {
  if (!form.bundleFixedPrice || form.bundleCategories.length < 2) return null;
  const elements = form.bundleCategories
    .map((bc) => getCategoryNames(bc.categoryIds, categories))
    .filter(Boolean);
  if (elements.length < 2) return null;
  const name = form.name?.trim() || 'Formule';
  return `${name} = ${elements.join(' + ')} pour ${form.bundleFixedPrice}\u202F€`;
}

function getBuyXGetYRecapText(
  form: OfferFormState,
  categories: CategoryWithOptionGroups[]
): string | null {
  if (form.triggerCategoryIds.length === 0 || form.rewardCategoryIds.length === 0) return null;
  const triggerCats = getCategoryNames(form.triggerCategoryIds, categories);
  const rewardCats = getCategoryNames(form.rewardCategoryIds, categories);
  if (!triggerCats || !rewardCats) return null;
  const plural = parseInt(form.rewardQuantity) > 1 ? 's' : '';
  return `${form.triggerQuantity} ${triggerCats} acheté${parseInt(form.triggerQuantity) > 1 ? 's' : ''} = ${form.rewardQuantity} ${rewardCats} offert${plural}`;
}

function getPromoCodeRecapText(form: OfferFormState): string | null {
  if (!form.promoCode.trim() || !form.promoCodeDiscountValue) return null;
  const unit = form.promoCodeDiscountType === 'percentage' ? '%' : '\u202F€';
  let text = `Code ${form.promoCode} = -${form.promoCodeDiscountValue}${unit}`;
  if (form.promoCodeMinOrderAmount) {
    text += `, minimum ${form.promoCodeMinOrderAmount}\u202F€`;
  }
  return text;
}

function getThresholdRecapText(form: OfferFormState): string | null {
  if (!form.thresholdMinAmount || !form.thresholdDiscountValue) return null;
  const unit = form.thresholdDiscountType === 'percentage' ? '%' : '\u202F€';
  return `Dès ${form.thresholdMinAmount}\u202F€ d'achat = -${form.thresholdDiscountValue}${unit} automatiquement`;
}

export function getRecapText(
  form: OfferFormState,
  categories: CategoryWithOptionGroups[]
): string | null {
  switch (form.offerType) {
    case 'bundle':
      return getBundleRecapText(form, categories);
    case 'buy_x_get_y':
      return getBuyXGetYRecapText(form, categories);
    case 'promo_code':
      return getPromoCodeRecapText(form);
    case 'threshold_discount':
      return getThresholdRecapText(form);
    default:
      return null;
  }
}

export function OfferRecapBanner({ form, categories }: OfferRecapBannerProps) {
  const recapText = getRecapText(form, categories);
  if (!recapText) return null;

  return (
    <div
      className="flex items-center gap-2.5 px-4 py-3 bg-success-50 border border-success-200 rounded-xl"
      data-testid="offer-recap-banner"
    >
      <CheckCircle2 className="w-5 h-5 text-success-600 flex-shrink-0" />
      <p className="text-sm font-medium text-success-700">{recapText}</p>
    </div>
  );
}

// ============================================
// Validation Errors — red bullet list
// ============================================

interface OfferValidationErrorsProps {
  form: OfferFormState;
}

export function getValidationErrors(form: OfferFormState): string[] {
  const errors: string[] = [];

  if (!form.name.trim()) {
    errors.push("Nom de l'offre manquant");
  }

  if (form.offerType === 'bundle') {
    if (!form.bundleFixedPrice || parseFloat(form.bundleFixedPrice) <= 0) {
      errors.push('Prix de la formule manquant');
    }
    if (form.bundleCategories.length < 2) {
      errors.push('Une formule doit avoir au moins 2 éléments');
    }
  }

  if (form.offerType === 'buy_x_get_y') {
    if (form.triggerCategoryIds.length === 0) {
      errors.push('Choisis les catégories à acheter.');
    }
    if (form.rewardCategoryIds.length === 0) {
      errors.push('Choisis les catégories offertes.');
    }
  }

  if (form.offerType === 'promo_code' && !form.promoCode.trim()) {
    errors.push('Code promo manquant');
  }

  if (form.offerType === 'threshold_discount') {
    if (!form.thresholdMinAmount || parseFloat(form.thresholdMinAmount) <= 0) {
      errors.push('Montant minimum manquant');
    }
  }

  return errors;
}

export function OfferValidationErrors({ form }: OfferValidationErrorsProps) {
  const errors = getValidationErrors(form);
  if (errors.length === 0) return null;

  return (
    <div className="space-y-1.5" data-testid="offer-validation-errors">
      {errors.map((error, i) => (
        <p key={i} className="text-sm text-red-600 flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
          {error}
        </p>
      ))}
    </div>
  );
}

// ============================================
// Info block — "Comment ça marche pour vos clients"
// ============================================

interface OfferInfoBlockProps {
  offerType: OfferFormState['offerType'];
}

const INFO_TEXTS: Record<string, string> = {
  bundle:
    'Le client compose son menu en choisissant un article par élément. Il paie le prix fixe que vous avez défini, quel que soit le choix.',
  buy_x_get_y:
    'Quand le client met X articles éligibles dans son panier, le moins cher des articles « offerts » est gratuit. Le système choisit automatiquement le bon.',
  promo_code: 'Le client tape ce code dans son panier à la caisse pour bénéficier de la réduction.',
  threshold_discount:
    "S'applique automatiquement dès que le panier atteint le montant minimum. Aucun code à saisir pour le client.",
};

export function OfferInfoBlock({ offerType }: OfferInfoBlockProps) {
  const text = INFO_TEXTS[offerType];
  if (!text) return null;

  return (
    <div
      className="flex items-start gap-2.5 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl"
      data-testid="offer-info-block"
    >
      <Info className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-xs font-medium text-gray-500 mb-0.5">
          Comment ça marche pour vos clients
        </p>
        <p className="text-sm text-gray-600">{text}</p>
      </div>
    </div>
  );
}

// Legacy default export for backward compat during transition
// (can remove once OfferWizard is updated)
export function OfferRecap({
  form,
  categories,
}: {
  form: OfferFormState;
  categories: CategoryWithOptionGroups[];
}) {
  return (
    <>
      <OfferRecapBanner form={form} categories={categories} />
      <OfferValidationErrors form={form} />
    </>
  );
}
