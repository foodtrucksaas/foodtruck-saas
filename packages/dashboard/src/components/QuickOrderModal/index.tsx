import { X, Search } from 'lucide-react';
import { useQuickOrder } from './useQuickOrder';
import { ProductsGrid } from './ProductsGrid';
import { OptionsStep } from './OptionsStep';
import { DesktopCartPanel, MobileCartOverlay, FloatingCartButton } from './CartPanel';
import { DesktopCheckoutStep, MobileCheckoutOverlay } from './CheckoutForm';

interface QuickOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: () => void;
}

export default function QuickOrderModal({ isOpen, onClose, onOrderCreated }: QuickOrderModalProps) {
  const {
    categories,
    filteredItems,
    cart,
    cartTotal,
    cartItemsCount,
    loading,
    step,
    pendingItem,
    pendingOptions,
    customerName,
    pickupTime,
    notes,
    isSubmitting,
    showMobileCart,
    slotAvailability,
    availableTimeSlots,
    searchQuery,
    selectedCategory,
    setSearchQuery,
    setSelectedCategory,
    setStep,
    setCustomerName,
    setPickupTime,
    setNotes,
    setShowMobileCart,
    handleItemClick,
    toggleOption,
    confirmOptions,
    cancelOptions,
    updateQuantity,
    removeFromCart,
    handleSubmit,
  } = useQuickOrder(isOpen, onClose, onOrderCreated);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="absolute inset-0 bg-black/70 hidden sm:block" onClick={onClose} />

      <div className="relative flex w-full h-full sm:w-[calc(100%-16px)] md:w-[calc(100%-32px)] sm:h-[calc(100%-16px)] md:h-[calc(100%-32px)] sm:m-2 md:m-4 bg-gray-100 sm:rounded-2xl overflow-hidden shadow-2xl">
        <button
          onClick={onClose}
          className="hidden md:flex absolute top-4 right-4 z-10 min-w-[44px] min-h-[44px] w-11 h-11 items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Header with safe area padding on mobile */}
          <div
            className="bg-white px-3 md:px-6 py-3 md:py-4 border-b border-gray-200"
            style={{ paddingTop: 'max(env(safe-area-inset-top), 12px)' }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 md:gap-4 min-w-0">
                <div className="min-w-0">
                  <h2 className="text-lg md:text-xl font-bold text-gray-900 truncate">
                    Nouvelle commande
                  </h2>
                  <p className="text-sm text-gray-500 hidden md:block">Sélectionnez les produits</p>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <div className="relative w-48 md:w-64 hidden md:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 min-h-[44px] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <button
                  onClick={onClose}
                  className="md:hidden min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors flex-shrink-0 active:scale-95"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            {/* Mobile search */}
            <div className="relative mt-3 md:hidden">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 min-h-[44px] border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {step === 'options' && pendingItem && (
            <OptionsStep
              item={pendingItem}
              pendingOptions={pendingOptions}
              onToggleOption={toggleOption}
              onConfirm={confirmOptions}
              onCancel={cancelOptions}
            />
          )}

          {step === 'products' && (
            <ProductsGrid
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              items={filteredItems}
              loading={loading}
              onItemClick={handleItemClick}
            />
          )}

          {step === 'checkout' && (
            <DesktopCheckoutStep
              customerName={customerName}
              pickupTime={pickupTime}
              notes={notes}
              cartTotal={cartTotal}
              isSubmitting={isSubmitting}
              availableTimeSlots={availableTimeSlots}
              slotAvailability={slotAvailability}
              onCustomerNameChange={setCustomerName}
              onPickupTimeChange={setPickupTime}
              onNotesChange={setNotes}
              onSubmit={handleSubmit}
              onBack={() => setStep('products')}
            />
          )}
        </div>

        {step === 'products' && !showMobileCart && (
          <FloatingCartButton
            cartItemsCount={cartItemsCount}
            onClick={() => setShowMobileCart(true)}
          />
        )}

        {showMobileCart && (
          <MobileCartOverlay
            cart={cart}
            cartTotal={cartTotal}
            onUpdateQuantity={updateQuantity}
            onRemove={removeFromCart}
            onClose={() => setShowMobileCart(false)}
            onCloseModal={onClose}
            onContinue={() => {
              setShowMobileCart(false);
              setStep('checkout');
            }}
          />
        )}

        {step === 'checkout' && (
          <MobileCheckoutOverlay
            customerName={customerName}
            pickupTime={pickupTime}
            notes={notes}
            cartTotal={cartTotal}
            isSubmitting={isSubmitting}
            availableTimeSlots={availableTimeSlots}
            slotAvailability={slotAvailability}
            onCustomerNameChange={setCustomerName}
            onPickupTimeChange={setPickupTime}
            onNotesChange={setNotes}
            onSubmit={handleSubmit}
            onBack={() => setStep('products')}
            onClose={onClose}
          />
        )}

        <DesktopCartPanel
          cart={cart}
          cartTotal={cartTotal}
          cartItemsCount={cartItemsCount}
          onUpdateQuantity={updateQuantity}
          onRemove={removeFromCart}
          onContinue={() => setStep('checkout')}
        />
      </div>
    </div>
  );
}
