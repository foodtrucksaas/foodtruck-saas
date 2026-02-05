import { useParams, Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  MapPin,
  Clock,
  Phone,
  Mail,
  ShoppingBag,
  Tag,
  Globe,
  Instagram,
  Facebook,
  Banknote,
  CreditCard,
  Smartphone,
  Wallet,
  FileText,
  Building,
} from 'lucide-react';
import { formatPrice, formatTime, DAY_NAMES, PAYMENT_METHODS } from '@foodtruck/shared';
import LocationCard from '../../components/LocationCard';
import { OptimizedImage } from '../../components/OptimizedImage';
import BundleBuilder from '../../components/BundleBuilder';
import { useCart } from '../../contexts/CartContext';
import { useOffers, useBundleDetection } from '../../hooks';
import { useFoodtruck, type BundleOffer } from './useFoodtruck';
import MenuItemCard from './MenuItemCard';
import OptionsModal from './OptionsModal';

interface FoodtruckPageProps {
  slug?: string; // Optional slug from subdomain
}

export default function FoodtruckPage({ slug }: FoodtruckPageProps) {
  const { foodtruckId: paramId } = useParams<{ foodtruckId: string }>();
  // Use slug prop if provided (subdomain), otherwise use URL param
  const foodtruckId = slug || paramId;
  // On subdomain, use simple paths; otherwise include foodtruckId in URL
  const isSubdomain = !!slug;
  const checkoutPath = isSubdomain ? '/checkout' : `/${foodtruckId}/checkout`;
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<BundleOffer | null>(null);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const {
    // Data
    foodtruck,
    categories,
    menuItems,
    schedules,
    bundles,
    specificItemsBundles,
    buyXGetYOffers,
    loading,

    // Active tab
    activeTab,
    setActiveTab,

    // Options modal state
    selectedMenuItem,
    selectedCategory,
    showOptionsModal,

    // Computed values
    todaySchedules,
    todaySchedule,
    groupedItems,

    // Cart data
    total,
    itemCount,

    // Handlers
    getCategoryOptions,
    getItemQuantity,
    handleAddItem,
    handleOptionsConfirm,
    handleUpdateQuantity,
    closeOptionsModal,
    navigateBack,
  } = useFoodtruck(foodtruckId);

  // Get cart items for offer detection
  const { items, addBundleItem } = useCart();

  // Detect applicable offers in real-time
  const { applicableOffers, appliedOffers, bestOffer, totalOfferDiscount } = useOffers(
    foodtruckId,
    items,
    total
  );

  // Filter offers to show (exclude promo codes)
  const visibleOffers = applicableOffers.filter((o) => o.offer_type !== 'promo_code');

  // useBundleDetection is only for UI hints, not for discount calculation
  // get_optimized_offers already handles bundle discounts
  const { bestBundle: _bestBundle, totalBundleSavings: _totalBundleSavings } = useBundleDetection(
    foodtruckId,
    items
  );
  void _bestBundle;
  void _totalBundleSavings; // Suppress unused warnings

  // get_optimized_offers already handles ALL offers including bundles
  // So we just use totalOfferDiscount directly
  const appliedDiscount = totalOfferDiscount || 0;
  // For display name, check if we have applied offers from the API
  const appliedDiscountName =
    appliedOffers.length > 0
      ? appliedOffers.map((o) => o.offer_name).join(' + ')
      : bestOffer?.offer_name;
  const finalTotal = Math.max(0, total - appliedDiscount);

  // Track active category based on scroll position
  useEffect(() => {
    const observerCallback: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const categoryId = entry.target.getAttribute('data-category-id');
          if (categoryId) {
            setActiveCategory(categoryId);
          }
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, {
      rootMargin: '-100px 0px -70% 0px',
      threshold: 0,
    });

    Object.values(categoryRefs.current).forEach((element) => {
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [categories, groupedItems]);

  // Set first category as active by default
  useEffect(() => {
    if (!activeCategory && categories.length > 0) {
      const firstWithItems = categories.find((c) => groupedItems[c.id]?.length > 0);
      if (firstWithItems) {
        setActiveCategory(firstWithItems.id);
      }
    }
  }, [categories, groupedItems, activeCategory]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!foodtruck) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Food truck non trouve</p>
        <Link to="/" className="btn-primary">
          Retour a l'accueil
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="relative">
        {foodtruck.cover_image_url ? (
          <OptimizedImage
            src={foodtruck.cover_image_url}
            alt={foodtruck.name}
            className="w-full h-44"
            eager
            sizes="100vw"
            placeholderColor="#f97066"
          />
        ) : (
          <div className="w-full h-40 bg-gradient-to-br from-primary-400 via-primary-500 to-primary-600 relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
            <div className="absolute -bottom-20 -left-10 w-60 h-60 bg-white/5 rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-full px-4">
              <h1 className="text-white text-2xl font-bold drop-shadow-lg">{foodtruck.name}</h1>
              <p className="text-white/80 text-sm mt-1">{foodtruck.cuisine_types?.join(' - ')}</p>
              {/* Today's schedule info */}
              <div className="mt-3">
                {todaySchedules.length > 0 ? (
                  <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                    <Clock className="w-3.5 h-3.5 text-white" />
                    <span className="text-white text-xs font-medium">
                      {todaySchedules.length === 1 ? (
                        <>
                          Ouvert aujourd'hui
                          {todaySchedules[0].location?.name
                            ? ` à ${todaySchedules[0].location.name}`
                            : ''}{' '}
                          • {formatTime(todaySchedules[0].start_time)} -{' '}
                          {formatTime(todaySchedules[0].end_time)}
                        </>
                      ) : (
                        <>{todaySchedules.length} emplacements aujourd'hui</>
                      )}
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 bg-black/20 backdrop-blur-sm rounded-full px-3 py-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-white/90 text-xs font-medium">Fermé aujourd'hui</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={navigateBack}
          type="button"
          aria-label="Retour"
          className="absolute top-3 left-3 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <ArrowLeft className="w-5 h-5 text-anthracite" aria-hidden="true" />
        </button>

        {/* Open/Closed badge */}
        <div className="absolute top-3 right-3">
          {todaySchedules.length > 0 ? (
            <div className="flex items-center gap-1.5 bg-emerald-500 text-white px-3 py-1.5 rounded-full shadow-lg">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="text-xs font-semibold">Ouvert</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-gray-800 text-white px-3 py-1.5 rounded-full shadow-lg">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span className="text-xs font-semibold">Fermé</span>
            </div>
          )}
        </div>
      </div>

      {/* Info Card - Only show full card if there's a cover image */}
      {foodtruck.cover_image_url ? (
        <div className="px-4 -mt-8 relative z-10">
          <div
            className="bg-white rounded-2xl border border-gray-100/80 p-4"
            style={{ boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)' }}
          >
            <div className="flex gap-3">
              {foodtruck.logo_url ? (
                <OptimizedImage
                  src={foodtruck.logo_url}
                  alt={foodtruck.name}
                  width={56}
                  height={56}
                  className="rounded-lg -mt-7 border-2 border-white shadow-md"
                  eager
                  sizes="56px"
                  placeholderColor="#f97066"
                  fallback={
                    <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center -mt-7 border-2 border-white shadow-md">
                      <span className="text-xl font-bold text-white">
                        {foodtruck.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  }
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center -mt-7 border-2 border-white shadow-md">
                  <span className="text-xl font-bold text-white">
                    {foodtruck.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold text-anthracite truncate">{foodtruck.name}</h1>
                <p className="text-primary-500 font-medium text-sm">
                  {foodtruck.cuisine_types?.join(' - ') || 'Non specifie'}
                </p>
              </div>
            </div>

            {todaySchedules.length > 0 && (
              <div className="mt-2.5 space-y-1.5">
                {todaySchedules.map((sched, idx) => (
                  <div
                    key={sched.id}
                    className="flex items-center gap-1.5 text-xs text-gray-600 flex-wrap"
                  >
                    {idx === 0 && <span>Aujourd'hui :</span>}
                    <MapPin className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
                    <span>{sched.location.name}</span>
                    <span className="text-gray-300">-</span>
                    <Clock className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />
                    <span>
                      {formatTime(sched.start_time)} - {formatTime(sched.end_time)}
                    </span>
                    {todaySchedules.length > 1 && idx < todaySchedules.length - 1 && (
                      <span className="w-full h-0" /> // Line break between schedules
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Compact info bar when no cover image (info already in header) */
        <div className="px-4 pt-3">
          {foodtruck.is_mobile && todaySchedules.length > 0 ? (
            /* Itinerant: show all locations for today */
            <div
              className="bg-white rounded-xl border border-gray-100 p-3"
              style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-primary-500" />
                </div>
                <div className="flex-1 min-w-0">
                  {todaySchedules.length === 1 ? (
                    <>
                      <p className="text-sm font-semibold text-anthracite">
                        Aujourd'hui a {todaySchedules[0].location.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatTime(todaySchedules[0].start_time)} -{' '}
                        {formatTime(todaySchedules[0].end_time)}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-anthracite mb-1">Aujourd'hui</p>
                      <div className="space-y-1">
                        {todaySchedules.map((sched) => (
                          <p key={sched.id} className="text-xs text-gray-500">
                            <span className="font-medium text-gray-700">
                              {formatTime(sched.start_time)} - {formatTime(sched.end_time)}
                            </span>{' '}
                            a {sched.location.name}
                          </p>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : todaySchedule ? (
            /* Fixed: just show hours */
            <div
              className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3"
              style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)' }}
            >
              <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-primary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-anthracite">Ouvert aujourd'hui</p>
                <p className="text-xs text-gray-500">
                  {formatTime(todaySchedule.start_time)} - {formatTime(todaySchedule.end_time)}
                  {todaySchedule.location?.name && ` - ${todaySchedule.location.name}`}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Tabs - underline style, scrollable */}
      <nav
        className="bg-[#FAFAFA] border-b border-gray-100 mx-4 mt-3"
        aria-label="Navigation du contenu"
      >
        <div className="flex overflow-x-auto no-scrollbar" role="tablist">
          <button
            onClick={() => setActiveTab('menu')}
            type="button"
            role="tab"
            aria-selected={activeTab === 'menu'}
            aria-controls="tab-panel-menu"
            id="tab-menu"
            className={`flex-shrink-0 px-6 py-3 min-h-[48px] text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 relative ${
              activeTab === 'menu' ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Menu
            {activeTab === 'menu' && (
              <span className="absolute bottom-0 left-6 right-6 h-0.5 bg-primary-500 rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('info')}
            type="button"
            role="tab"
            aria-selected={activeTab === 'info'}
            aria-controls="tab-panel-info"
            id="tab-info"
            className={`flex-shrink-0 px-6 py-3 min-h-[48px] text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 relative ${
              activeTab === 'info' ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Infos et Planning
            {activeTab === 'info' && (
              <span className="absolute bottom-0 left-6 right-6 h-0.5 bg-primary-500 rounded-full" />
            )}
          </button>
        </div>
      </nav>

      {/* Category Quick Nav - only show if menu tab active and multiple categories */}
      {activeTab === 'menu' &&
        categories.filter((c) => groupedItems[c.id]?.length > 0).length > 1 && (
          <div className="sticky top-0 z-10 bg-[#FAFAFA]/95 backdrop-blur-sm px-4 py-2 border-b border-gray-100/50">
            <nav
              className="flex gap-2 overflow-x-auto no-scrollbar"
              aria-label="Categories du menu"
            >
              {categories
                .filter((c) => groupedItems[c.id]?.length > 0)
                .map((category) => {
                  const isActive = activeCategory === category.id;
                  return (
                    <button
                      key={category.id}
                      type="button"
                      aria-current={isActive ? 'true' : undefined}
                      onClick={() => {
                        setActiveCategory(category.id);
                        document
                          .getElementById(`category-${category.id}`)
                          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }}
                      className={`flex-shrink-0 px-4 py-2 min-h-[40px] text-sm font-medium rounded-full transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                        isActive
                          ? 'bg-gray-900 text-white shadow-sm'
                          : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                      }`}
                    >
                      {category.name}
                    </button>
                  );
                })}
            </nav>
          </div>
        )}

      {/* Content */}
      <div className="px-4 py-3">
        {activeTab === 'menu' ? (
          <div className="space-y-8">
            {/* Unified Offers Section - Clean white */}
            {(bundles.length > 0 ||
              specificItemsBundles.length > 0 ||
              buyXGetYOffers.length > 0 ||
              visibleOffers.filter((o) => o.offer_type !== 'bundle').length > 0) && (
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Tag className="w-4 h-4 text-primary-500" />
                  <h2 className="text-base font-bold text-gray-900">Nos offres</h2>
                </div>
                <p className="text-xs text-gray-400 mb-4">S'appliquent automatiquement au panier</p>
                <div className="space-y-2">
                  {/* Bundle offers - clickable to open builder */}
                  {bundles.map((bundle) => {
                    const bundleCats = bundle.config.bundle_categories || [];
                    const categoryNames =
                      bundleCats
                        .map((bc) => {
                          const catIds =
                            bc.category_ids || (bc.category_id ? [bc.category_id] : []);
                          return catIds
                            .map((id) => categories.find((c) => c.id === id)?.name)
                            .filter(Boolean)
                            .join('/');
                        })
                        .filter(Boolean)
                        .join(' + ') || '';

                    return (
                      <button
                        key={bundle.id}
                        onClick={() => setSelectedBundle(bundle)}
                        className="w-full bg-gray-50 hover:bg-gray-100 rounded-xl px-4 py-3 active:scale-[0.98] transition-all text-left"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm">{bundle.name}</p>
                            {categoryNames && (
                              <p className="text-xs text-gray-500 mt-0.5">{categoryNames}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-primary-600 whitespace-nowrap">
                              {formatPrice(bundle.config.fixed_price)}
                            </span>
                            <span className="text-xs px-2.5 py-1 bg-primary-500 text-white rounded-full font-medium">
                              Composer
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {/* Specific items bundles */}
                  {specificItemsBundles.map((bundle) => {
                    const itemNames = bundle.offer_items
                      .map((oi) => {
                        const item = menuItems.find((mi) => mi.id === oi.menu_item_id);
                        return item?.name;
                      })
                      .filter(Boolean)
                      .join(' + ');

                    return (
                      <div key={bundle.id} className="bg-gray-50 rounded-xl px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm">{bundle.name}</p>
                            {itemNames && (
                              <p className="text-xs text-gray-500 mt-0.5">{itemNames}</p>
                            )}
                          </div>
                          <span className="font-bold text-primary-600 whitespace-nowrap">
                            {formatPrice(bundle.config.fixed_price)}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Buy X Get Y offers */}
                  {buyXGetYOffers.map((offer) => (
                    <div key={offer.id} className="bg-gray-50 rounded-xl px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{offer.name}</p>
                        {offer.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{offer.description}</p>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Other offers with progress tracking */}
                  {visibleOffers
                    .filter((o) => o.offer_type !== 'bundle' && o.offer_type !== 'buy_x_get_y')
                    .map((offer) => {
                      const isApplicable = offer.is_applicable;
                      const hasProgress = offer.progress_required > 0;
                      const progress =
                        offer.progress_required > 0
                          ? Math.min(100, (offer.progress_current / offer.progress_required) * 100)
                          : 0;

                      return (
                        <div
                          key={offer.offer_id}
                          className={`rounded-xl px-4 py-3 ${isApplicable ? 'bg-emerald-50' : 'bg-gray-50'}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p
                                className={`font-semibold text-sm ${isApplicable ? 'text-emerald-700' : 'text-gray-900'}`}
                              >
                                {offer.offer_name}
                              </p>
                              {isApplicable ? (
                                <p className="text-xs text-emerald-600 mt-0.5">
                                  Appliquée à votre panier
                                </p>
                              ) : hasProgress ? (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {offer.progress_current}/{offer.progress_required} articles
                                </p>
                              ) : null}
                            </div>
                            {isApplicable && offer.calculated_discount > 0 && (
                              <span className="font-bold text-emerald-600 whitespace-nowrap">
                                -{formatPrice(offer.calculated_discount)}
                              </span>
                            )}
                          </div>
                          {!isApplicable && hasProgress && (
                            <div className="mt-2.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary-500 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Categories */}
            {categories.map((category) =>
              groupedItems[category.id]?.length > 0 ? (
                <div
                  key={category.id}
                  id={`category-${category.id}`}
                  data-category-id={category.id}
                  ref={(el) => {
                    categoryRefs.current[category.id] = el;
                  }}
                  className="scroll-mt-[120px]"
                >
                  <h2 className="text-lg font-bold text-gray-900 mb-4 mt-2">{category.name}</h2>
                  <div className="grid gap-3 stagger-children">
                    {groupedItems[category.id].map((item) => (
                      <MenuItemCard
                        key={item.id}
                        item={item}
                        hasOptions={!!getCategoryOptions(item.category_id)}
                        quantity={getItemQuantity(item.id)}
                        onAdd={() => handleAddItem(item)}
                        onUpdate={(delta) => handleUpdateQuantity(item.id, delta)}
                      />
                    ))}
                  </div>
                </div>
              ) : null
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Description */}
            {foodtruck.description && (
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
                <h2 className="font-bold text-anthracite mb-2">A propos</h2>
                <p className="text-gray-600 leading-relaxed">{foodtruck.description}</p>
              </div>
            )}

            {/* Contact */}
            <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
              <h2 className="font-bold text-anthracite mb-4">Contact</h2>
              <div className="space-y-3">
                {foodtruck.phone && (
                  <a
                    href={`tel:${foodtruck.phone}`}
                    className="flex items-center gap-3 text-gray-600 hover:text-primary-500 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-primary-500" />
                    </div>
                    <span className="font-medium">{foodtruck.phone}</span>
                  </a>
                )}
                {foodtruck.email && (
                  <a
                    href={`mailto:${foodtruck.email}`}
                    className="flex items-center gap-3 text-gray-600 hover:text-primary-500 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-primary-500" />
                    </div>
                    <span className="font-medium">{foodtruck.email}</span>
                  </a>
                )}
                {foodtruck.website_url && (
                  <a
                    href={
                      foodtruck.website_url.startsWith('http')
                        ? foodtruck.website_url
                        : `https://${foodtruck.website_url}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-gray-600 hover:text-primary-500 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                      <Globe className="w-5 h-5 text-primary-500" />
                    </div>
                    <span className="font-medium">
                      {foodtruck.website_url.replace(/^https?:\/\//, '')}
                    </span>
                  </a>
                )}
              </div>
            </div>

            {/* Social Media */}
            {(foodtruck.instagram_url || foodtruck.facebook_url || foodtruck.tiktok_url) && (
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
                <h2 className="font-bold text-anthracite mb-4">Réseaux sociaux</h2>
                <div className="flex flex-wrap gap-3">
                  {foodtruck.instagram_url && (
                    <a
                      href={foodtruck.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
                    >
                      <Instagram className="w-4 h-4" />
                      Instagram
                    </a>
                  )}
                  {foodtruck.facebook_url && (
                    <a
                      href={foodtruck.facebook_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 bg-[#1877F2] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
                    >
                      <Facebook className="w-4 h-4" />
                      Facebook
                    </a>
                  )}
                  {foodtruck.tiktok_url && (
                    <a
                      href={foodtruck.tiktok_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
                      </svg>
                      TikTok
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Payment Methods */}
            {foodtruck.payment_methods && foodtruck.payment_methods.length > 0 && (
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
                <h2 className="font-bold text-anthracite mb-4">Moyens de paiement acceptés</h2>
                <div className="flex flex-wrap gap-2">
                  {foodtruck.payment_methods.map((methodId) => {
                    const method = PAYMENT_METHODS.find((m) => m.id === methodId);
                    if (!method) return null;

                    const IconComponent =
                      {
                        Banknote,
                        CreditCard,
                        Smartphone,
                        Wallet,
                        FileText,
                      }[method.icon] || CreditCard;

                    return (
                      <div
                        key={methodId}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg text-sm text-gray-700"
                      >
                        <IconComponent className="w-4 h-4 text-primary-500" />
                        <span>{method.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Business Info (SIRET) */}
            {foodtruck.siret && (
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
                <h2 className="font-bold text-anthracite mb-4">Informations légales</h2>
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                    <Building className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">N° SIRET</p>
                    <p className="font-medium font-mono">
                      {foodtruck.siret.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, '$1 $2 $3 $4')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Schedule */}
            {schedules.length > 0 && (
              <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-5">
                <h2 className="font-bold text-anthracite mb-4">Planning de la semaine</h2>
                <div className="space-y-2">
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                    const isToday = day === new Date().getDay();
                    // Use todaySchedules for today (considers exceptions), otherwise use recurring schedules
                    const daySchedules = isToday
                      ? todaySchedules
                      : schedules
                          .filter((s) => s.day_of_week === day)
                          .sort((a, b) => a.start_time.localeCompare(b.start_time));
                    return (
                      <div
                        key={day}
                        className={`flex items-start justify-between py-3 px-3 rounded-xl transition-colors ${
                          isToday ? 'bg-primary-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold ${isToday ? 'text-primary-600' : 'text-anthracite'}`}
                          >
                            {DAY_NAMES[day]}
                          </span>
                          {isToday && (
                            <span className="text-xs bg-primary-500 text-white px-2.5 py-1 rounded-full font-semibold">
                              Aujourd'hui
                            </span>
                          )}
                        </div>
                        {daySchedules.length > 0 ? (
                          <div className="text-right space-y-1">
                            {daySchedules.map((sched) => (
                              <div key={sched.id}>
                                <p className="text-sm font-medium text-anthracite">
                                  {formatTime(sched.start_time)} - {formatTime(sched.end_time)}
                                </p>
                                {sched.location?.name && (
                                  <p className="text-xs text-gray-500">{sched.location.name}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 font-medium">Fermé</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Map - show all today's locations with coordinates */}
            {todaySchedules.filter((s) => s.location?.latitude && s.location?.longitude).length >
              0 && (
              <div>
                <h2 className="font-bold text-anthracite mb-3">
                  {todaySchedules.length > 1 ? "Nos emplacements aujourd'hui" : 'Position du jour'}
                </h2>
                <div className="space-y-4">
                  {todaySchedules
                    .filter((s) => s.location?.latitude && s.location?.longitude)
                    .map((sched) => (
                      <LocationCard
                        key={sched.id}
                        location={{
                          name: sched.location.name,
                          address: sched.location.address,
                          latitude: sched.location.latitude,
                          longitude: sched.location.longitude,
                          start_time: sched.start_time,
                          end_time: sched.end_time,
                        }}
                        showMap={true}
                        showHours={true}
                      />
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cart Bar */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-white/95 backdrop-blur-sm border-t border-gray-100 animate-slide-in-up">
          <Link
            to={checkoutPath}
            className="w-full rounded-xl bg-gradient-to-r from-primary-400 to-primary-500 hover:from-primary-500 hover:to-primary-600 text-white font-semibold transition-all active:scale-[0.98] block overflow-hidden"
            style={{ boxShadow: '0 4px 12px rgba(255, 107, 53, 0.3)' }}
          >
            {/* Discount banner integrated in button */}
            {appliedDiscount > 0 && appliedDiscountName && (
              <div className="bg-white/95 px-4 py-1.5 flex items-center justify-center gap-2 text-primary-600 text-sm">
                <Tag className="w-3.5 h-3.5" />
                <span className="font-medium truncate">{appliedDiscountName}</span>
                <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap">
                  -{formatPrice(appliedDiscount)}
                </span>
              </div>
            )}
            {/* Main button content */}
            <div className="flex items-center justify-between py-3 px-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                <span className="text-sm">Voir le panier</span>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs font-bold">
                  {itemCount}
                </span>
              </div>
              <div className="text-right flex items-center gap-2">
                {appliedDiscount > 0 ? (
                  <>
                    <span className="text-xs line-through opacity-70">{formatPrice(total)}</span>
                    <span className="font-bold text-lg">{formatPrice(finalTotal)}</span>
                  </>
                ) : (
                  <span className="font-bold text-lg">{formatPrice(total)}</span>
                )}
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Options Modal */}
      {showOptionsModal && selectedMenuItem && selectedCategory && (
        <OptionsModal
          menuItem={selectedMenuItem}
          category={selectedCategory}
          onClose={closeOptionsModal}
          onConfirm={handleOptionsConfirm}
        />
      )}

      {/* Bundle Builder Modal */}
      {selectedBundle && (
        <BundleBuilder
          bundle={selectedBundle}
          menuItems={menuItems}
          categories={categories}
          onAddToCart={addBundleItem}
          onClose={() => setSelectedBundle(null)}
        />
      )}
    </div>
  );
}
