import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Gift, ChevronDown } from 'lucide-react';
import { formatPrice, formatTime, isValidEmail } from '@foodtruck/shared';
import { useCart } from '../contexts/CartContext';
import OffersBanner from '../components/OffersBanner';

// Hooks
import {
  useCheckoutData,
  useTimeSlots,
  usePromoCode,
  useLoyalty,
  useOffers,
  useBundleDetection,
  calculateLoyaltyDiscount,
} from '../hooks';

// Components
import {
  DatePickerModal,
  OrderSummaryCard,
} from '../components/checkout';

export default function Checkout() {
  const { foodtruckId } = useParams<{ foodtruckId: string }>();
  const navigate = useNavigate();
  const { items, updateQuantity, removeItem, clearCart, total, getCartKey } = useCart();

  // Form state
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    pickupTime: '',
    notes: '',
    emailOptIn: false,
    smsOptIn: false,
    loyaltyOptIn: true,
    isAsap: false,
  });

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Custom hooks
  const {
    loading,
    allSchedules,
    exceptions,
    settings,
    availableDates,
    showPromoSection,
  } = useCheckoutData(foodtruckId);

  const {
    slots,
    schedules,
    loading: slotsLoading,
    notOpenYet: _notOpenYet,
  } = useTimeSlots(foodtruckId, selectedDate, allSchedules, exceptions, settings);
  void _notOpenYet;

  const {
    promoCode,
    setPromoCode,
    appliedPromo,
    promoLoading,
    promoError,
    validatePromoCode,
    removePromo,
  } = usePromoCode(foodtruckId, form.email, total);

  const {
    loyaltyInfo,
    loading: loyaltyLoading,
    useLoyaltyReward,
    setUseLoyaltyReward,
  } = useLoyalty(foodtruckId, form.email);

  const {
    applicableOffers,
    loading: _offersLoading,
    appliedOffers,
    bestOffer,
    totalOfferDiscount,
  } = useOffers(foodtruckId, items, total, form.email);
  void _offersLoading;

  const {
    bestBundle: _bestBundle,
    totalBundleSavings: _totalBundleSavings,
    loading: _bundleLoading,
  } = useBundleDetection(foodtruckId, items);
  void _bestBundle; void _totalBundleSavings; void _bundleLoading;

  // Set initial selected date when available dates are loaded
  useEffect(() => {
    if (availableDates.length > 0 && !loading) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, loading]);

  // Auto-select first available slot
  useEffect(() => {
    if (slots.length > 0) {
      const firstAvailable = slots.find((s) => s.available);
      if (firstAvailable) {
        setForm((prev) => ({ ...prev, pickupTime: `${firstAvailable.time}|${firstAvailable.scheduleId}` }));
      } else {
        setForm((prev) => ({ ...prev, pickupTime: '' }));
      }
    }
  }, [slots]);

  // Update loyalty opt-in when loyalty info is loaded
  useEffect(() => {
    if (loyaltyInfo?.loyalty_opt_in === true) {
      setForm(prev => ({ ...prev, loyaltyOptIn: true }));
    }
  }, [loyaltyInfo]);

  // Calculate discounts
  const { discount: loyaltyDiscount, rewardCount: loyaltyRewardCount } = calculateLoyaltyDiscount(
    loyaltyInfo,
    useLoyaltyReward,
    form.loyaltyOptIn
  );

  const offerDiscountValue = totalOfferDiscount || 0;
  const appliedOfferDiscount = offerDiscountValue;
  const appliedBundleDiscount = 0;

  const postOfferTotal = total - appliedOfferDiscount - appliedBundleDiscount;
  const postLoyaltyTotal = postOfferTotal - loyaltyDiscount;

  let promoDiscount = 0;
  if (appliedPromo) {
    if (appliedPromo.discountType === 'percentage') {
      promoDiscount = Math.round(postLoyaltyTotal * (appliedPromo.discountValue / 100));
    } else {
      promoDiscount = appliedPromo.discount;
    }
    promoDiscount = Math.min(promoDiscount, postLoyaltyTotal);
  }

  const finalTotal = Math.max(0, postLoyaltyTotal - promoDiscount);

  // Date label for display
  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const dateLabel = isToday
    ? "Aujourd'hui"
    : selectedDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.name || !form.email || (!form.isAsap && !form.pickupTime)) {
      setFormError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!isValidEmail(form.email)) {
      setFormError('Email invalide');
      return;
    }

    if (items.length === 0) {
      setFormError('Votre panier est vide');
      return;
    }

    setSubmitting(true);

    let pickupDateTime: string;
    if (form.isAsap) {
      const now = new Date();
      now.setMinutes(now.getMinutes() + (settings?.minPrepTime || 15));
      pickupDateTime = now.toISOString();
    } else {
      const [pickupTimeStr] = form.pickupTime.split('|');
      const [hours, minutes] = pickupTimeStr.split(':').map(Number);
      const pickupDate = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        hours,
        minutes,
        0
      );
      pickupDateTime = pickupDate.toISOString();
    }

    const bundlesUsed = items
      .filter(item => item.bundleInfo)
      .map(item => ({
        bundle_id: item.bundleInfo!.bundleId,
        quantity: item.quantity,
      }));

    const orderData = {
      foodtruck_id: foodtruckId,
      customer_email: form.email,
      customer_name: form.name,
      customer_phone: form.phone || undefined,
      pickup_time: pickupDateTime,
      is_asap: form.isAsap || undefined,
      notes: form.notes || undefined,
      email_opt_in: form.emailOptIn,
      sms_opt_in: form.smsOptIn && !!form.phone,
      loyalty_opt_in: form.loyaltyOptIn,
      promo_code_id: appliedPromo?.id,
      discount_amount: promoDiscount + loyaltyDiscount + appliedOfferDiscount + appliedBundleDiscount,
      use_loyalty_reward: loyaltyDiscount > 0,
      loyalty_customer_id: loyaltyDiscount > 0 ? loyaltyInfo?.customer_id : undefined,
      loyalty_reward_count: loyaltyRewardCount,
      deal_id: appliedOfferDiscount > 0 && !appliedOffers.length ? bestOffer?.offer_id : undefined,
      deal_discount: appliedOfferDiscount > 0 && !appliedOffers.length ? appliedOfferDiscount : undefined,
      deal_free_item_name: appliedOfferDiscount > 0 && !appliedOffers.length ? bestOffer?.free_item_name : undefined,
      applied_offers: appliedOffers.length > 0 ? appliedOffers.map(o => ({
        offer_id: o.offer_id,
        times_applied: o.times_applied,
        discount_amount: o.discount_amount,
        items_consumed: o.items_consumed,
        free_item_name: o.free_item_name,
      })) : undefined,
      bundles_used: bundlesUsed.length > 0 ? bundlesUsed : undefined,
      items: items.flatMap((item) => {
        if (item.bundleInfo) {
          return item.bundleInfo.selections.map((sel, selIndex) => ({
            menu_item_id: sel.menuItem.id,
            quantity: item.quantity,
            notes: undefined,
            selected_options: sel.selectedOptions?.map((opt) => ({
              option_id: opt.optionId,
              option_group_id: opt.optionGroupId,
              name: opt.name,
              group_name: opt.groupName,
              price_modifier: opt.priceModifier,
              is_size_option: opt.isSizeOption || false,
            })),
            bundle_id: item.bundleInfo!.bundleId,
            bundle_name: item.bundleInfo!.bundleName,
            bundle_fixed_price: selIndex === 0 ? item.bundleInfo!.fixedPrice : 0,
            bundle_supplement: sel.supplement,
            bundle_free_options: item.bundleInfo!.freeOptions,
          }));
        }
        return [{
          menu_item_id: item.menuItem.id,
          quantity: item.quantity,
          notes: item.notes,
          selected_options: item.selectedOptions?.map((opt) => ({
            option_id: opt.optionId,
            option_group_id: opt.optionGroupId,
            name: opt.name,
            group_name: opt.groupName,
            price_modifier: opt.priceModifier,
            is_size_option: opt.isSizeOption || false,
          })),
        }];
      }),
    };

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(orderData),
        }
      );

      const data = await response.json();

      if (data.order_id) {
        clearCart();
        navigate(`/order/${data.order_id}`);
      } else {
        setFormError(data.error || 'Erreur lors de la création de la commande');
      }
    } catch {
      setFormError('Une erreur est survenue');
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" role="status" aria-label="Chargement en cours">
        <div className="animate-spin w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full" aria-hidden="true" />
        <span className="sr-only">Chargement du formulaire de commande</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50" id="main-content">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4" aria-hidden="true">
          <span className="text-3xl">🛒</span>
        </div>
        <p className="text-gray-500 mb-4">Votre panier est vide</p>
        <Link
          to={`/${foodtruckId}`}
          className="px-5 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          Voir le menu
        </Link>
      </main>
    );
  }

  const canShowPromo = showPromoSection && (settings?.promoCodesStackable || (appliedOfferDiscount === 0 && appliedBundleDiscount === 0));

  return (
    <main className="min-h-screen bg-gray-50 animate-fade-in" id="main-content">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-gray-200/50">
        <div className="flex items-center gap-3 px-4 py-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Retour"
            className="w-11 h-11 flex items-center justify-center -ml-1.5 hover:bg-gray-100 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 active:scale-95"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" aria-hidden="true" />
          </button>
          <h1 className="font-semibold text-gray-900">Finaliser la commande</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="pb-32" id="checkout-form" aria-label="Formulaire de commande">
        {/* Form Error */}
        {formError && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm animate-fade-in-up" role="alert" aria-live="assertive">
            {formError}
          </div>
        )}

        {/* Order Summary */}
        <div className="p-4">
          <OrderSummaryCard
            items={items}
            total={total}
            promoDiscount={promoDiscount}
            loyaltyDiscount={loyaltyDiscount}
            appliedOffers={appliedOffers}
            finalTotal={finalTotal}
            getCartKey={getCartKey}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
            // Loyalty
            loyaltyInfo={loyaltyInfo}
            loyaltyLoading={loyaltyLoading}
            loyaltyOptIn={form.loyaltyOptIn}
            useLoyaltyReward={useLoyaltyReward}
            onToggleUseLoyaltyReward={setUseLoyaltyReward}
            // Promo code
            showPromoSection={canShowPromo}
            promoCode={promoCode}
            onPromoCodeChange={setPromoCode}
            onValidatePromoCode={validatePromoCode}
            onRemovePromo={removePromo}
            promoLoading={promoLoading}
            promoError={promoError}
            appliedPromo={appliedPromo}
          />
        </div>

        {/* Pending Offers (progress) */}
        {(() => {
          const pendingOffers = applicableOffers.filter(o => !o.is_applicable && o.progress_current > 0);
          if (pendingOffers.length === 0) return null;
          return (
            <div className="mx-4 mb-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-xs font-medium text-amber-700 mb-2 flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5" />
                Plus que quelques articles...
              </p>
              <OffersBanner offers={pendingOffers} />
            </div>
          );
        })()}

        {/* Main Form Section */}
        <div className="mx-4 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Pickup Time */}
          <div className="p-4 border-b border-gray-100">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Retrait</label>
            <div className="mt-2 flex items-center gap-2">
              {settings?.allowAsapOrders && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isAsap: !form.isAsap })}
                  className={`px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-all active:scale-95 ${
                    form.isAsap
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Dès que possible
                </button>
              )}
              {!form.isAsap && (
                <div className="flex-1 relative">
                  <select
                    value={form.pickupTime}
                    onChange={(e) => setForm({ ...form, pickupTime: e.target.value })}
                    className="w-full appearance-none bg-gray-100 rounded-lg px-3 py-2.5 min-h-[44px] pr-8 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={slotsLoading || slots.length === 0}
                  >
                    {slotsLoading ? (
                      <option>Chargement...</option>
                    ) : slots.length === 0 ? (
                      <option>Aucun créneau disponible</option>
                    ) : (
                      slots.filter(s => s.available).map((slot) => (
                        <option key={`${slot.time}|${slot.scheduleId}`} value={`${slot.time}|${slot.scheduleId}`}>
                          {dateLabel} · {formatTime(slot.time)}{schedules.length > 1 ? ` · ${slot.locationName}` : ''}
                        </option>
                      ))
                    )}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowDatePicker(true)}
                className="px-3 py-2.5 min-h-[44px] rounded-lg text-sm font-medium text-primary-600 hover:bg-primary-50 transition-colors active:scale-95"
              >
                Autre jour
              </button>
            </div>
            {/* Address display */}
            {!form.isAsap && form.pickupTime && (() => {
              const [, scheduleId] = form.pickupTime.split('|');
              const selectedSchedule = schedules.find(s => s.id === scheduleId);
              if (!selectedSchedule?.location?.address) return null;
              return (
                <p className="mt-2 text-xs text-gray-400">{selectedSchedule.location.address}</p>
              );
            })()}
          </div>

          {/* Contact Info */}
          <fieldset className="p-4 border-b border-gray-100 space-y-3">
            <legend className="text-xs font-medium text-gray-500 uppercase tracking-wide">Coordonnées</legend>
            <div>
              <label htmlFor="checkout-name" className="sr-only">Nom (obligatoire)</label>
              <input
                id="checkout-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
                placeholder="Nom *"
                required
                aria-required="true"
                autoComplete="name"
              />
            </div>
            <div>
              <label htmlFor="checkout-email" className="sr-only">Email (obligatoire)</label>
              <input
                id="checkout-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
                placeholder="Email *"
                required
                aria-required="true"
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="checkout-phone" className="sr-only">Telephone (optionnel)</label>
              <input
                id="checkout-phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
                placeholder="Téléphone (optionnel)"
                autoComplete="tel"
              />
            </div>
          </fieldset>

          {/* Notes - Collapsible */}
          <div className="p-4 border-b border-gray-100">
            {showNotes ? (
              <div>
                <label htmlFor="checkout-notes" className="text-xs font-medium text-gray-500 uppercase tracking-wide block">Instructions</label>
                <textarea
                  id="checkout-notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="mt-2 w-full bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[60px] resize-none"
                  placeholder="Allergies, instructions spéciales..."
                  autoFocus
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowNotes(true)}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded py-2 min-h-[44px]"
              >
                + Ajouter des instructions
              </button>
            )}
          </div>

          {/* Opt-ins - intégrés dans le formulaire */}
          <div className="p-4 space-y-3">
            {settings?.loyaltyEnabled && (!loyaltyInfo || loyaltyInfo.loyalty_opt_in !== true) && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.loyaltyOptIn}
                  onChange={(e) => setForm({ ...form, loyaltyOptIn: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-xs text-gray-500">J'accepte que mon adresse email soit utilisée pour le suivi de mes achats dans le cadre du programme de fidélité.</span>
              </label>
            )}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.emailOptIn}
                onChange={(e) => setForm({ ...form, emailOptIn: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-xs text-gray-500">Recevoir des offres par email</span>
            </label>
            {form.phone && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.smsOptIn}
                  onChange={(e) => setForm({ ...form, smsOptIn: e.target.checked })}
                  className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-xs text-gray-500">Recevoir des offres par SMS</span>
              </label>
            )}
          </div>
        </div>

        {/* Privacy */}
        <p className="text-[10px] text-gray-400 text-center mt-4 px-8">
          En confirmant, vous acceptez que vos informations soient conservées pour le suivi de vos commandes.
        </p>
      </form>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200/50 p-4 z-20">
        <button
          type="submit"
          form="checkout-form"
          onClick={handleSubmit}
          disabled={submitting || (!form.isAsap && (!form.pickupTime || slots.length === 0))}
          aria-busy={submitting}
          className="w-full py-3.5 min-h-[52px] rounded-xl bg-gradient-to-r from-primary-400 to-primary-500 hover:from-primary-500 hover:to-primary-600 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-primary-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              <span className="sr-only">Validation en cours</span>
            </>
          ) : (
            <>
              <span>Confirmer la commande</span>
              <span className="text-white/60" aria-hidden="true">.</span>
              <span>{formatPrice(finalTotal)}</span>
            </>
          )}
        </button>
      </div>

      {/* Date Picker Modal */}
      <DatePickerModal
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        availableDates={availableDates}
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        allSchedules={allSchedules}
        exceptions={exceptions}
      />
    </main>
  );
}
