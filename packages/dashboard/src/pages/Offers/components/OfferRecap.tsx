import {
  Check,
  AlertCircle,
  Clock,
  Calendar,
  Users,
  Package,
  Gift,
  Tag,
  TrendingUp,
} from 'lucide-react';
import type { OfferFormState, CategoryWithOptionGroups } from '../useOffers';

interface OfferRecapProps {
  form: OfferFormState;
  categories: CategoryWithOptionGroups[];
}

export function OfferRecap({ form, categories }: OfferRecapProps) {
  const getCategoryNames = (ids: string[]) =>
    ids
      .map((id) => categories.find((c) => c.id === id)?.name)
      .filter(Boolean)
      .join(', ');

  const getIcon = () => {
    switch (form.offerType) {
      case 'bundle':
        return <Package className="w-5 h-5 text-white" />;
      case 'buy_x_get_y':
        return <Gift className="w-5 h-5 text-white" />;
      case 'promo_code':
        return <Tag className="w-5 h-5 text-white" />;
      case 'threshold_discount':
        return <TrendingUp className="w-5 h-5 text-white" />;
    }
  };

  // Couleurs spécifiques aux offres (distinctes des statuts commandes)
  const getIconBgColor = () => {
    switch (form.offerType) {
      case 'bundle':
        return 'bg-violet-500';
      case 'buy_x_get_y':
        return 'bg-amber-500';
      case 'promo_code':
        return 'bg-indigo-500';
      case 'threshold_discount':
        return 'bg-teal-500';
    }
  };

  const getMainDescription = () => {
    switch (form.offerType) {
      case 'bundle': {
        const elements = form.bundleCategories
          .map((bc) => getCategoryNames(bc.categoryIds))
          .filter(Boolean);
        return (
          <span>
            {elements.join(' + ')} = <strong>{form.bundleFixedPrice}€</strong>
          </span>
        );
      }
      case 'buy_x_get_y': {
        const triggerCats = getCategoryNames(form.triggerCategoryIds);
        const rewardCats = getCategoryNames(form.rewardCategoryIds);
        return (
          <span>
            <strong>{form.triggerQuantity}</strong> {triggerCats} ={' '}
            <strong>{form.rewardQuantity}</strong> {rewardCats} offert
            {parseInt(form.rewardQuantity) > 1 ? 's' : ''}
          </span>
        );
      }
      case 'promo_code':
        return (
          <span>
            Code <strong className="font-mono">{form.promoCode}</strong> ={' '}
            <strong>
              -{form.promoCodeDiscountValue}
              {form.promoCodeDiscountType === 'percentage' ? '%' : '€'}
            </strong>
            {form.promoCodeMinOrderAmount && ` (min. ${form.promoCodeMinOrderAmount}€)`}
          </span>
        );
      case 'threshold_discount':
        return (
          <span>
            Dès <strong>{form.thresholdMinAmount}€</strong> d'achat ={' '}
            <strong>
              -{form.thresholdDiscountValue}
              {form.thresholdDiscountType === 'percentage' ? '%' : '€'}
            </strong>
          </span>
        );
    }
  };

  const warnings: string[] = [];
  const infos: string[] = [];

  // Vérifications
  if (!form.name.trim()) {
    warnings.push("Nom de l'offre manquant");
  }

  if (form.offerType === 'bundle') {
    if (!form.bundleFixedPrice || parseFloat(form.bundleFixedPrice) <= 0) {
      warnings.push('Prix de la formule manquant');
    }
    if (form.bundleCategories.length < 2) {
      warnings.push('Une formule doit avoir au moins 2 éléments');
    }
  }

  if (form.offerType === 'buy_x_get_y') {
    if (form.triggerCategoryIds.length === 0) {
      warnings.push('Sélectionnez les catégories à acheter');
    }
    if (form.rewardCategoryIds.length === 0) {
      warnings.push('Sélectionnez les catégories offertes');
    }
  }

  if (form.offerType === 'promo_code' && !form.promoCode.trim()) {
    warnings.push('Code promo manquant');
  }

  if (form.offerType === 'threshold_discount') {
    if (!form.thresholdMinAmount || parseFloat(form.thresholdMinAmount) <= 0) {
      warnings.push('Montant minimum manquant');
    }
  }

  // Infos sur les restrictions
  if (form.timeStart && form.timeEnd) {
    infos.push(`Disponible de ${form.timeStart.slice(0, 5)} à ${form.timeEnd.slice(0, 5)}`);
  }

  if (form.startDate || form.endDate) {
    const start = form.startDate
      ? new Date(form.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      : '';
    const end = form.endDate
      ? new Date(form.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
      : '';
    if (start && end) {
      infos.push(`Du ${start} au ${end}`);
    } else if (start) {
      infos.push(`À partir du ${start}`);
    } else if (end) {
      infos.push(`Jusqu'au ${end}`);
    }
  }

  if (form.maxUses) {
    infos.push(`Limité à ${form.maxUses} utilisations`);
  }

  if (form.maxUsesPerCustomer && form.maxUsesPerCustomer !== '1') {
    infos.push(`Max ${form.maxUsesPerCustomer}x par client`);
  }

  if (form.bundleFreeOptions && form.offerType === 'bundle') {
    infos.push('Suppléments gratuits inclus');
  }

  const isValid = warnings.length === 0;

  return (
    <div
      className={`rounded-xl border-2 p-4 bg-white ${
        isValid ? 'border-success-500' : 'border-warning-500'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${getIconBgColor()}`}>{getIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-gray-900 truncate">{form.name || 'Sans nom'}</h4>
            {isValid && <Check className="w-4 h-4 text-success-600 flex-shrink-0" />}
          </div>

          <p className="text-sm text-gray-700">{getMainDescription()}</p>

          {/* Infos */}
          {infos.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {infos.map((info, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-white/60 rounded-full text-gray-600"
                >
                  {info.includes('Disponible') && <Clock className="w-3 h-3" />}
                  {(info.includes('Du') || info.includes('partir') || info.includes("Jusqu'")) && (
                    <Calendar className="w-3 h-3" />
                  )}
                  {(info.includes('Limité') || info.includes('Max')) && (
                    <Users className="w-3 h-3" />
                  )}
                  {info}
                </span>
              ))}
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="mt-3 space-y-1">
              {warnings.map((warning, i) => (
                <p key={i} className="text-xs text-warning-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {warning}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
