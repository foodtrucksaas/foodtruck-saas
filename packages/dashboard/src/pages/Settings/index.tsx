import { useState, useRef, useEffect } from 'react';
import {
  Store,
  Share2,
  Building,
  Wallet,
  QrCode,
  ShoppingBag,
  Tag,
  Palette,
  User,
  Link2,
  Code2,
} from 'lucide-react';
import { useSettings } from './useSettings';
import { ProfileSection } from './ProfileSection';
import { SocialMediaSection } from './SocialMediaSection';
import { PaymentMethodsSection } from './PaymentMethodsSection';
import { BusinessInfoSection } from './BusinessInfoSection';
import { QRCodeSection } from './QRCodeSection';
import { EmbedButtonSection } from './EmbedButtonSection';
import { OrderSettingsSection } from './OrderSettingsSection';
import { OffersSettingsSection } from './OffersSettingsSection';
import { AccountSection } from './AccountSection';
import ThemeSection from './ThemeSection';

// Navigation sections for mobile quick access
const SECTIONS = [
  { id: 'link', label: 'Lien', icon: Link2 },
  { id: 'profile', label: 'Profil', icon: Store },
  { id: 'social', label: 'Réseaux', icon: Share2 },
  { id: 'business', label: 'Entreprise', icon: Building },
  { id: 'payment', label: 'Paiement', icon: Wallet },
  { id: 'qr', label: 'QR Code', icon: QrCode },
  { id: 'embed', label: 'Bouton', icon: Code2 },
  { id: 'orders', label: 'Commandes', icon: ShoppingBag },
  { id: 'offers', label: 'Offres', icon: Tag },
  { id: 'theme', label: 'Thème', icon: Palette },
  { id: 'account', label: 'Compte', icon: User },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export default function Settings() {
  const {
    foodtruck,
    clientLink,
    editForm,
    editingField,
    editLoading,
    editError,
    startEditing,
    cancelEditing,
    saveField,
    toggleCuisineType,
    updateEditForm,
    copyClientLink,
    clearEditError,
    // Image uploads
    logoUploading,
    coverUploading,
    uploadLogo,
    removeLogo,
    uploadCover,
    removeCover,
  } = useSettings();

  const [activeSection, setActiveSection] = useState<SectionId>('link');
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const navRef = useRef<HTMLDivElement>(null);

  // Scroll to section on mobile
  const scrollToSection = (sectionId: SectionId) => {
    setActiveSection(sectionId);
    const element = sectionRefs.current[sectionId];
    if (element) {
      const headerOffset = 140; // Account for sticky nav
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
    }
  };

  // Update active section on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 160;

      for (const section of SECTIONS) {
        const element = sectionRefs.current[section.id];
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll nav to keep active item visible
  useEffect(() => {
    if (navRef.current) {
      const activeButton = navRef.current.querySelector(`[data-section="${activeSection}"]`);
      if (activeButton) {
        activeButton.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeSection]);

  return (
    <div className="space-y-4 sm:space-y-8 max-w-2xl">
      <p className="hidden sm:block text-gray-600">Gérez les informations de votre food truck</p>

      {/* Mobile Quick Navigation - sticky horizontal scroll */}
      <div className="sm:hidden sticky top-0 z-20 -mx-4 px-4 py-3 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200">
        <div
          ref={navRef}
          className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mb-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {SECTIONS.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                data-section={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-full text-sm font-medium whitespace-nowrap transition-all active:scale-95 flex-shrink-0 ${
                  isActive
                    ? 'bg-primary-500 text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {section.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Client Link */}
      <section
        ref={(el) => {
          sectionRefs.current['link'] = el;
        }}
        className="card p-4 sm:p-6 scroll-mt-36"
      >
        <h2 className="text-lg font-semibold text-gray-900 mb-4">URL de commande</h2>
        <p className="text-gray-600 mb-4">
          Partagez ce lien avec vos clients pour qu'ils puissent consulter votre menu et commander.
        </p>

        {/* Editable Slug */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Votre adresse personnalisée
          </label>
          {editingField === 'slug' ? (
            <div className="space-y-3">
              <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-2">
                <span className="text-gray-500 text-sm">https://</span>
                <input
                  type="text"
                  value={editForm.slug}
                  onChange={(e) =>
                    updateEditForm('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                  }
                  className="flex-1 bg-transparent border-none focus:outline-none text-sm font-medium"
                  placeholder="mon-foodtruck"
                  autoFocus
                />
                <span className="text-gray-500 text-sm">.onmange.app</span>
              </div>
              <p className="text-xs text-gray-500">
                Utilisez uniquement des lettres minuscules, chiffres et tirets. Minimum 3
                caractères.
              </p>
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
                Attention : changer votre adresse rendra vos anciens QR codes, boutons et liens
                partagés inaccessibles. Pensez à réimprimer vos supports.
              </p>
              {editError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2">{editError}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => saveField('slug')}
                  disabled={editLoading}
                  className="btn-primary text-sm py-2"
                >
                  {editLoading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    cancelEditing();
                    clearEditError();
                  }}
                  className="btn-secondary text-sm py-2"
                >
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-1 bg-gray-50 rounded-lg p-3">
                <span className="text-gray-500 text-sm">https://</span>
                <span className="text-sm font-medium text-gray-900">
                  {foodtruck?.slug || '...'}
                </span>
                <span className="text-gray-500 text-sm">.onmange.app</span>
              </div>
              <button
                type="button"
                onClick={() => startEditing('slug')}
                className="btn-secondary text-sm py-2.5 px-4"
              >
                Modifier
              </button>
            </div>
          )}
        </div>

        {/* Copy Link */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            readOnly
            value={clientLink}
            className="input flex-1 bg-gray-50 min-h-[44px]"
          />
          <button
            onClick={copyClientLink}
            className="btn-secondary min-h-[44px] w-full sm:w-auto active:scale-[0.98]"
          >
            Copier
          </button>
        </div>
      </section>

      {/* Profile Section */}
      <div
        ref={(el) => {
          sectionRefs.current['profile'] = el;
        }}
        className="scroll-mt-36"
      >
        <ProfileSection
          foodtruck={foodtruck}
          editForm={editForm}
          editingField={editingField}
          editLoading={editLoading}
          onStartEdit={startEditing}
          onSave={saveField}
          onCancel={cancelEditing}
          onUpdateForm={updateEditForm}
          onToggleCuisineType={toggleCuisineType}
          logoUploading={logoUploading}
          coverUploading={coverUploading}
          onUploadLogo={uploadLogo}
          onRemoveLogo={removeLogo}
          onUploadCover={uploadCover}
          onRemoveCover={removeCover}
        />
      </div>

      {/* Social Media Section */}
      <div
        ref={(el) => {
          sectionRefs.current['social'] = el;
        }}
        className="scroll-mt-36"
      >
        <SocialMediaSection foodtruck={foodtruck} />
      </div>

      {/* Business Info Section */}
      <div
        ref={(el) => {
          sectionRefs.current['business'] = el;
        }}
        className="scroll-mt-36"
      >
        <BusinessInfoSection foodtruck={foodtruck} />
      </div>

      {/* Payment Methods Section */}
      <div
        ref={(el) => {
          sectionRefs.current['payment'] = el;
        }}
        className="scroll-mt-36"
      >
        <PaymentMethodsSection foodtruck={foodtruck} />
      </div>

      {/* QR Code Section */}
      <div
        ref={(el) => {
          sectionRefs.current['qr'] = el;
        }}
        className="scroll-mt-36"
      >
        <QRCodeSection foodtruck={foodtruck} clientLink={clientLink} />
      </div>

      {/* Embed Button Section */}
      <div
        ref={(el) => {
          sectionRefs.current['embed'] = el;
        }}
        className="scroll-mt-36"
      >
        <EmbedButtonSection foodtruck={foodtruck} clientLink={clientLink} />
      </div>

      {/* Order Settings Section */}
      <div
        ref={(el) => {
          sectionRefs.current['orders'] = el;
        }}
        className="scroll-mt-36"
      >
        <OrderSettingsSection
          foodtruck={foodtruck}
          editForm={editForm}
          editingField={editingField}
          editLoading={editLoading}
          onStartEdit={startEditing}
          onSave={saveField}
          onCancel={cancelEditing}
          onUpdateForm={updateEditForm}
        />
      </div>

      {/* Offers Settings Section */}
      <div
        ref={(el) => {
          sectionRefs.current['offers'] = el;
        }}
        className="scroll-mt-36"
      >
        <OffersSettingsSection
          foodtruck={foodtruck}
          editForm={editForm}
          editingField={editingField}
          editLoading={editLoading}
          onStartEdit={startEditing}
          onSave={saveField}
          onCancel={cancelEditing}
          onUpdateForm={updateEditForm}
        />
      </div>

      {/* Theme Section */}
      <div
        ref={(el) => {
          sectionRefs.current['theme'] = el;
        }}
        className="scroll-mt-36"
      >
        <ThemeSection />
      </div>

      {/* Account Section */}
      <div
        ref={(el) => {
          sectionRefs.current['account'] = el;
        }}
        className="scroll-mt-36"
      >
        <AccountSection />
      </div>
    </div>
  );
}
