import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Gift, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatPrice, isValidEmail } from '@foodtruck/shared';
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
  LoyaltyCard,
  PromoCodeSection,
  TimeSlotPicker,
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
    notOpenYet,
  } = useTimeSlots(foodtruckId, selectedDate, allSchedules, exceptions, settings);

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
    loading: offersLoading,
    appliedOffers,
    bestOffer,
    totalOfferDiscount,
  } = useOffers(foodtruckId, items, total, form.email);

  // useBundleDetection is only for UI hints, not for discount calculation
  // get_optimized_offers already handles bundle discounts
  const {
    bestBundle,
    totalBundleSavings: _totalBundleSavings,
    loading: bundleLoading,
  } = useBundleDetection(foodtruckId, items);
  void _totalBundleSavings; // Suppress unused warning - discount is in totalOfferDiscount

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

  // The get_optimized_offers SQL function handles ALL offers including bundles
  // So we only use totalOfferDiscount - bundles are already included in it
  // totalBundleSavings from useBundleDetection is only for UI display, not calculation
  const offerDiscountValue = totalOfferDiscount || 0;

  // Don't use bundleDiscountValue separately - it's already in offerDiscountValue
  const appliedOfferDiscount = offerDiscountValue;
  const appliedBundleDiscount = 0; // Bundles already included in appliedOfferDiscount

  // Calculate promo discount AFTER offer/bundle discounts
  // Promo codes apply to the discounted total, not the original total
  const postOfferTotal = total - appliedOfferDiscount - appliedBundleDiscount;
  let promoDiscount = 0;
  if (appliedPromo) {
    if (appliedPromo.discountType === 'percentage') {
      // Recalculate percentage on post-offer total
      promoDiscount = Math.round(postOfferTotal * (appliedPromo.discountValue / 100));
    } else {
      // Fixed discount stays the same
      promoDiscount = appliedPromo.discount;
    }
    // Ensure discount doesn't exceed the remaining total
    promoDiscount = Math.min(promoDiscount, postOfferTotal);
  }

  const finalTotal = Math.max(0, postOfferTotal - promoDiscount - loyaltyDiscount);

  // Get selected slot for display
  const selectedSlot = slots.find(s => `${s.time}|${s.scheduleId}` === form.pickupTime);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields - pickupTime not required if ASAP
    if (!form.name || !form.email || (!form.isAsap && !form.pickupTime)) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (!isValidEmail(form.email)) {
      toast.error('Email invalide');
      return;
    }

    if (items.length === 0) {
      toast.error('Votre panier est vide');
      return;
    }

    setSubmitting(true);

    // For ASAP orders, use current time + min prep time as placeholder
    // The actual pickup time will be set by the merchant
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

    // Extract unique bundles used in this order
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
      // Legacy single deal (for backward compatibility)
      deal_id: appliedOfferDiscount > 0 && !appliedOffers.length ? bestOffer?.offer_id : undefined,
      deal_discount: appliedOfferDiscount > 0 && !appliedOffers.length ? appliedOfferDiscount : undefined,
      deal_free_item_name: appliedOfferDiscount > 0 && !appliedOffers.length ? bestOffer?.free_item_name : undefined,
      // New multi-offer system
      applied_offers: appliedOffers.length > 0 ? appliedOffers.map(o => ({
        offer_id: o.offer_id,
        times_applied: o.times_applied,
        discount_amount: o.discount_amount,
        items_consumed: o.items_consumed,
        free_item_name: o.free_item_name,
      })) : undefined,
      bundles_used: bundlesUsed.length > 0 ? bundlesUsed : undefined,
      items: items.flatMap((item) => {
        // For bundles, send each selection as a separate item with bundle info
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
            // Bundle info for server-side processing
            bundle_id: item.bundleInfo!.bundleId,
            bundle_name: item.bundleInfo!.bundleName,
            bundle_fixed_price: selIndex === 0 ? item.bundleInfo!.fixedPrice : 0, // Only charge once
            bundle_supplement: sel.supplement,
            bundle_free_options: item.bundleInfo!.freeOptions,
          }));
        }

        // Regular item
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
        toast.success('Commande confirmée !');
        navigate(`/order/${data.order_id}`);
      } else {
        toast.error(data.error || 'Erreur lors de la création de la commande');
      }
    } catch {
      toast.error('Une erreur est survenue');
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#FAFAFA]">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <span className="text-4xl">🛒</span>
        </div>
        <p className="text-gray-500 mb-4 text-lg">Votre panier est vide</p>
        <Link
          to={`/${foodtruckId}`}
          className="px-6 py-3 rounded-xl bg-primary-500 hover:bg-primary-600 text-white font-semibold transition-colors"
        >
          Voir le menu
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-8 bg-[#FAFAFA]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-anthracite" />
          </button>
          <h1 className="text-lg font-bold text-anthracite">Finaliser la commande</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
        {/* Order Summary */}
        <OrderSummaryCard
          items={items}
          total={total}
          promoDiscount={promoDiscount}
          loyaltyDiscount={loyaltyDiscount}
          dealDiscount={appliedOfferDiscount}
          dealName={appliedOfferDiscount > 0 ? (
            appliedOffers.length > 0
              ? appliedOffers.map(o => o.offer_name).join(' + ')
              : bestOffer?.offer_name
          ) : undefined}
          bundleDiscount={appliedBundleDiscount}
          bundleName={appliedBundleDiscount > 0 ? bestBundle?.bundle.name : undefined}
          finalTotal={finalTotal}
          selectedDate={selectedDate}
          selectedSlot={selectedSlot}
          schedules={schedules}
          getCartKey={getCartKey}
          onUpdateQuantity={updateQuantity}
          onRemoveItem={removeItem}
        />

        {/* Customer Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4" style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}>
          <h2 className="font-bold text-anthracite">Vos informations</h2>
          <div>
            <label className="label">Nom *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              placeholder="Jean Dupont"
              required
            />
          </div>
          <div>
            <label className="label">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input"
              placeholder="jean@exemple.com"
              required
            />

            {/* Loyalty Progress - hidden when opt-in is unchecked */}
            {loyaltyInfo && !loyaltyLoading && form.loyaltyOptIn && (
              <LoyaltyCard
                loyaltyInfo={loyaltyInfo}
                loading={loyaltyLoading}
                orderTotal={total}
                promoDiscount={promoDiscount}
                loyaltyDiscount={loyaltyDiscount}
                useLoyaltyReward={useLoyaltyReward}
                loyaltyOptIn={form.loyaltyOptIn}
                onToggleUseLoyaltyReward={setUseLoyaltyReward}
                onToggleLoyaltyOptIn={(optIn) => setForm(prev => ({ ...prev, loyaltyOptIn: optIn }))}
              />
            )}
          </div>
          <div>
            <label className="label">Téléphone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input"
              placeholder="06 12 34 56 78"
            />
          </div>

          {/* RGPD Opt-ins */}
          <div className="pt-2 space-y-3">
            {/* Loyalty consent: show when loyalty is enabled and user hasn't already opted in */}
            {settings?.loyaltyEnabled && (!loyaltyInfo || loyaltyInfo.loyalty_opt_in !== true) && (
              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.loyaltyOptIn}
                    onChange={(e) => setForm({ ...form, loyaltyOptIn: e.target.checked })}
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-600">
                    J'accepte que mon adresse email soit utilisée pour le suivi de mes achats dans le cadre du programme de fidélité
                  </span>
                </label>
                <p className="text-xs text-gray-400 italic ml-7 mt-1">
                  Participation facultative – désinscription à tout moment.
                </p>
              </div>
            )}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.emailOptIn}
                onChange={(e) => setForm({ ...form, emailOptIn: e.target.checked })}
                className="mt-1 w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600">
                J'accepte de recevoir des offres par email
              </span>
            </label>
            {form.phone && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.smsOptIn}
                  onChange={(e) => setForm({ ...form, smsOptIn: e.target.checked })}
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-600">
                  J'accepte de recevoir des offres par SMS
                </span>
              </label>
            )}
          </div>
        </div>

        {/* Date & Time Picker */}
        <TimeSlotPicker
          availableDates={availableDates}
          selectedDate={selectedDate}
          slots={slots}
          schedules={schedules}
          slotsLoading={slotsLoading}
          notOpenYet={notOpenYet}
          selectedSlotValue={form.pickupTime}
          onSlotChange={(value) => setForm({ ...form, pickupTime: value })}
          onOpenDatePicker={() => setShowDatePicker(true)}
          allSchedules={allSchedules}
          exceptions={exceptions}
          allowAsapOrders={settings?.allowAsapOrders}
          isAsapSelected={form.isAsap}
          onAsapChange={(isAsap) => setForm({ ...form, isAsap })}
        />

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5" style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}>
          <label className="label">Notes (optionnel)</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="input min-h-[80px] resize-none"
            placeholder="Instructions spéciales, allergies..."
          />
        </div>

        {/* Detected Bundle Section */}
        {bestBundle && !bundleLoading && (
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-200 p-5" style={{ boxShadow: '0 4px 12px rgba(147, 51, 234, 0.1)' }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-purple-800">
                  {bestBundle.bundle.name}
                </h3>
                <p className="text-sm text-purple-600 mt-1">
                  Vos articles correspondent à cette formule !
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-gray-500 line-through">
                    {formatPrice(bestBundle.originalPrice)}
                  </span>
                  <span className="text-lg font-bold text-purple-600">
                    {formatPrice(bestBundle.bundlePrice)}
                  </span>
                  <span className="px-2 py-0.5 bg-purple-500 text-white text-xs font-bold rounded-full">
                    -{formatPrice(bestBundle.savings)}
                  </span>
                </div>
                <p className="text-xs text-purple-500 mt-2">
                  Articles : {bestBundle.matchedItems.map(i => i.menuItem.name).join(' + ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Offers Section */}
        {applicableOffers.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5" style={{ boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)' }}>
            <h2 className="font-bold text-anthracite mb-4 flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-success-50 flex items-center justify-center">
                <Gift className="w-5 h-5 text-success-500" />
              </div>
              Offres disponibles
            </h2>
            {offersLoading ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Chargement...</span>
              </div>
            ) : (
              <OffersBanner offers={applicableOffers} />
            )}
          </div>
        )}

        {/* Promo Code Section */}
        {/* Only show promo section if:
            1. showPromoSection is true AND
            2. promo codes are stackable with offers OR there's no offer/bundle discount */}
        {showPromoSection && (settings?.promoCodesStackable || (appliedOfferDiscount === 0 && appliedBundleDiscount === 0)) && (
          <PromoCodeSection
            promoCode={promoCode}
            onPromoCodeChange={setPromoCode}
            appliedPromo={appliedPromo}
            promoLoading={promoLoading}
            promoError={promoError}
            onValidate={validatePromoCode}
            onRemove={removePromo}
          />
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || (!form.isAsap && (!form.pickupTime || slots.length === 0))}
          className="w-full py-4 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          style={{ boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)' }}
        >
          {submitting ? (
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          ) : (
            'Confirmer ma commande'
          )}
        </button>

        {/* Payment Notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
          <p className="text-sm text-amber-800 text-center">
            <strong>Montant à régler sur place : {formatPrice(finalTotal)}</strong>
            <br />
            <span className="text-xs">Le paiement s'effectue directement auprès du commerçant lors du retrait.</span>
          </p>
        </div>

        {/* Privacy Notice */}
        <p className="text-xs text-gray-400 text-center mt-4 px-4">
          En passant commande, vous acceptez que vos informations soient conservées pour le suivi de vos commandes.
        </p>
      </form>

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
    </div>
  );
}
