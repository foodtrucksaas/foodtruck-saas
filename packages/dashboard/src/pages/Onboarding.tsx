import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed,
  Loader2,
  Check,
  ArrowRight,
  ArrowLeft,
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { DEFAULT_CATEGORIES, generateSlug } from '@foodtruck/shared';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useFoodtruck } from '../contexts/FoodtruckContext';

const STEPS = [
  { id: 1, title: 'Votre Food Truck', icon: Truck },
  { id: 2, title: 'Vos plats', icon: UtensilsCrossed },
  { id: 3, title: 'Votre emplacement', icon: MapPin },
  { id: 4, title: 'Vos horaires', icon: Clock },
  { id: 5, title: 'Terminé !', icon: CheckCircle },
];

const DAYS_OF_WEEK = [
  { id: 1, label: 'Lun', fullLabel: 'Lundi' },
  { id: 2, label: 'Mar', fullLabel: 'Mardi' },
  { id: 3, label: 'Mer', fullLabel: 'Mercredi' },
  { id: 4, label: 'Jeu', fullLabel: 'Jeudi' },
  { id: 5, label: 'Ven', fullLabel: 'Vendredi' },
  { id: 6, label: 'Sam', fullLabel: 'Samedi' },
  { id: 0, label: 'Dim', fullLabel: 'Dimanche' },
];

interface TempMenuItem {
  name: string;
  price: string;
  categoryName: string;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refresh } = useFoodtruck();
  const [step, setStep] = useState(1);

  // Step 1: Base info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // Step 2: Menu items
  const [menuItems, setMenuItems] = useState<TempMenuItem[]>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<string>(DEFAULT_CATEGORIES[1].name); // "Plats" by default

  // Step 3: Location
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');

  // Step 4: Schedule
  const [scheduleDays, setScheduleDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('11:00');
  const [endTime, setEndTime] = useState('14:00');

  // General
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const canContinue = () => {
    if (step === 1) return name.trim().length > 0;
    return true; // Other steps are skippable
  };

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleAddMenuItem = () => {
    if (!newItemName.trim() || !newItemPrice.trim()) return;

    setMenuItems([
      ...menuItems,
      {
        name: newItemName.trim(),
        price: newItemPrice,
        categoryName: newItemCategory,
      },
    ]);
    setNewItemName('');
    setNewItemPrice('');
  };

  const handleRemoveMenuItem = (index: number) => {
    setMenuItems(menuItems.filter((_, i) => i !== index));
  };

  const toggleDay = (dayId: number) => {
    if (scheduleDays.includes(dayId)) {
      setScheduleDays(scheduleDays.filter((d) => d !== dayId));
    } else {
      setScheduleDays([...scheduleDays, dayId]);
    }
  };

  const schedulePreview = useMemo(() => {
    if (scheduleDays.length === 0) return null;

    const sortedDays = [...scheduleDays].sort((a, b) => {
      // Sort Monday first (1), then Tuesday (2), etc., Sunday (0) last
      const aVal = a === 0 ? 7 : a;
      const bVal = b === 0 ? 7 : b;
      return aVal - bVal;
    });

    const dayNames = sortedDays.map(
      (d) => DAYS_OF_WEEK.find((day) => day.id === d)?.fullLabel?.toLowerCase() || ''
    );

    const formatTime = (time: string) => {
      const [h, m] = time.split(':');
      return m === '00' ? `${parseInt(h)}h` : `${parseInt(h)}h${m}`;
    };

    if (dayNames.length === 1) {
      return `Tous les ${dayNames[0]}s de ${formatTime(startTime)} à ${formatTime(endTime)}`;
    }

    const lastDay = dayNames.pop();
    return `Tous les ${dayNames.join(', ')}s et ${lastDay}s de ${formatTime(startTime)} à ${formatTime(endTime)}`;
  }, [scheduleDays, startTime, endTime]);

  const handleSubmit = async () => {
    setError(null);
    if (!user) return;

    setLoading(true);

    try {
      // 1. Generate slug and check uniqueness
      const baseSlug = generateSlug(name.trim());

      // Check if slug already exists
      const { data: existingSlug } = await supabase
        .from('foodtrucks')
        .select('id')
        .eq('slug', baseSlug)
        .single();

      // Add timestamp suffix if slug exists
      const finalSlug = existingSlug
        ? `${baseSlug}-${Date.now().toString(36).slice(-4)}`
        : baseSlug;

      // 2. Create the foodtruck with slug
      const { data: foodtruck, error: foodtruckError } = await supabase
        .from('foodtrucks')
        .insert({
          user_id: user.id,
          name: name.trim(),
          slug: finalSlug,
          description: description.trim() || null,
          email: user.email,
        })
        .select()
        .single();

      if (foodtruckError) {
        throw new Error('Erreur lors de la création du food truck');
      }

      // 2. Create default categories
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .insert(
          DEFAULT_CATEGORIES.map((cat) => ({
            foodtruck_id: foodtruck.id,
            name: cat.name,
            display_order: cat.display_order,
          }))
        )
        .select();

      if (categoriesError) {
        console.error('Error creating categories:', categoriesError);
      }

      // 3. Create menu items if any
      if (menuItems.length > 0 && categories) {
        const categoryMap = new Map(categories.map((c) => [c.name, c.id]));

        const { error: menuError } = await supabase.from('menu_items').insert(
          menuItems.map((item, index) => ({
            foodtruck_id: foodtruck.id,
            category_id: categoryMap.get(item.categoryName) || categories[1]?.id,
            name: item.name,
            price: parseFloat(item.price),
            is_available: true,
            display_order: index,
          }))
        );

        if (menuError) {
          console.error('Error creating menu items:', menuError);
        }
      }

      // 4. Create location if provided
      let locationId: string | null = null;
      if (locationName.trim()) {
        const { data: location, error: locationError } = await supabase
          .from('locations')
          .insert({
            foodtruck_id: foodtruck.id,
            name: locationName.trim(),
            address: locationAddress.trim() || locationName.trim(),
          })
          .select()
          .single();

        if (locationError) {
          console.error('Error creating location:', locationError);
        } else {
          locationId = location.id;
        }
      }

      // 5. Create schedules if any days selected
      if (scheduleDays.length > 0 && locationId) {
        const { error: scheduleError } = await supabase.from('schedules').insert(
          scheduleDays.map((day) => ({
            foodtruck_id: foodtruck.id,
            location_id: locationId,
            day_of_week: day,
            start_time: startTime,
            end_time: endTime,
            is_active: true,
          }))
        );

        if (scheduleError) {
          console.error('Error creating schedules:', scheduleError);
        }
      }

      // Save id and slug for final step
      setCreatedId(foodtruck.id);
      setCreatedSlug(foodtruck.slug);

      // Move to final step
      setStep(5);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!createdSlug) return;
    // Use subdomain format: slug.onmange.app
    const url = `https://${createdSlug}.onmange.app`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Use subdomain format for the URL
  const foodtruckUrl = createdSlug ? `https://${createdSlug}.onmange.app` : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex flex-col">
      {/* Progress Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold text-gray-900">MonTruck</span>
            </div>
            <span className="text-sm text-gray-500">
              Étape {step} sur {STEPS.length}
            </span>
          </div>
          {/* Progress Bar */}
          <div className="flex gap-2">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`h-2 flex-1 rounded-full transition-all duration-300 ${
                  s.id <= step ? 'bg-primary-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-2xl mx-auto px-4 py-8">
          {error && (
            <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-xl text-error-700 text-sm">
              {error}
            </div>
          )}

          {/* Step 1: Name & Description */}
          {step === 1 && (
            <div className="animate-fadeIn">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Truck className="w-8 h-8 text-primary-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Comment s'appelle votre food truck ?
                </h1>
                <p className="text-gray-600">
                  Un bon nom aide vos clients à vous retrouver facilement
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
                <div>
                  <label htmlFor="name" className="label text-base">
                    Nom du food truck *
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input text-lg"
                    placeholder="Ex: Le Gourmet Roulant"
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor="description" className="label text-base">
                    Description <span className="text-gray-400 font-normal">(optionnelle)</span>
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input min-h-[100px] resize-none"
                    placeholder="Décrivez votre food truck, votre cuisine, ce qui vous rend unique..."
                  />
                </div>
              </div>

              <div className="bg-warning-50 border border-warning-200 rounded-xl p-4 mt-6">
                <p className="text-warning-800 text-sm">
                  <strong>Conseil :</strong> Choisissez un nom mémorable et facile à prononcer. Vous
                  pourrez le modifier plus tard dans les paramètres.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Menu Items */}
          {step === 2 && (
            <div className="animate-fadeIn">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <UtensilsCrossed className="w-8 h-8 text-primary-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Ajoutez vos plats</h1>
                <p className="text-gray-600">
                  Commencez à créer votre menu. Vous pourrez ajouter plus de plats ensuite.
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
                {/* List of added items */}
                {menuItems.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      Plats ajoutés ({menuItems.length})
                    </p>
                    {menuItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <span className="font-medium text-gray-900">{item.name}</span>
                          <span className="text-gray-500 mx-2">·</span>
                          <span className="text-gray-600">{item.price} €</span>
                          <span className="text-gray-400 mx-2">·</span>
                          <span className="text-gray-500 text-sm">{item.categoryName}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMenuItem(index)}
                          className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-error-600 transition-colors active:scale-95"
                          aria-label="Supprimer le plat"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add item form */}
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Ajouter un plat</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="input min-h-[44px]"
                      placeholder="Nom du plat"
                    />
                    <input
                      type="number"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      className="input min-h-[44px]"
                      placeholder="Prix (€)"
                      min="0"
                      step="0.5"
                    />
                    <select
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value)}
                      className="input min-h-[44px]"
                    >
                      {DEFAULT_CATEGORIES.map((cat) => (
                        <option key={cat.name} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMenuItem}
                    disabled={!newItemName.trim() || !newItemPrice.trim()}
                    className="btn-secondary flex items-center gap-2 mt-3 min-h-[44px]"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-6">
                <p className="text-gray-600 text-sm">
                  Vous pouvez passer cette étape et ajouter vos plats plus tard depuis le menu.
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Location */}
          {step === 3 && (
            <div className="animate-fadeIn">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-primary-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Où vous trouver ?</h1>
                <p className="text-gray-600">
                  Ajoutez votre emplacement principal pour que vos clients vous trouvent.
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
                <div>
                  <label htmlFor="locationName" className="label text-base">
                    Nom de l'emplacement
                  </label>
                  <input
                    id="locationName"
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    className="input"
                    placeholder="Ex: Marché de Belleville"
                  />
                </div>

                <div>
                  <label htmlFor="locationAddress" className="label text-base">
                    Adresse <span className="text-gray-400 font-normal">(optionnelle)</span>
                  </label>
                  <input
                    id="locationAddress"
                    type="text"
                    value={locationAddress}
                    onChange={(e) => setLocationAddress(e.target.value)}
                    className="input"
                    placeholder="Ex: Place du marché, 75020 Paris"
                  />
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-6">
                <p className="text-gray-600 text-sm">
                  Vous pouvez passer cette étape et configurer vos emplacements plus tard.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Schedule */}
          {step === 4 && (
            <div className="animate-fadeIn">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-primary-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Vos horaires</h1>
                <p className="text-gray-600">Indiquez les jours et heures où vous êtes présent.</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
                {/* Days selection */}
                <div>
                  <label className="label text-base mb-3">Jours de présence</label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => toggleDay(day.id)}
                        className={`px-4 py-2.5 min-h-[44px] rounded-lg font-medium transition-all ${
                          scheduleDays.includes(day.id)
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="startTime" className="label text-base">
                      Heure de début
                    </label>
                    <input
                      id="startTime"
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label htmlFor="endTime" className="label text-base">
                      Heure de fin
                    </label>
                    <input
                      id="endTime"
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="input"
                    />
                  </div>
                </div>

                {/* Preview */}
                {schedulePreview && (
                  <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg">
                    <p className="text-primary-800 text-sm font-medium">{schedulePreview}</p>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mt-6">
                <p className="text-gray-600 text-sm">
                  Vous pouvez passer cette étape et configurer votre planning plus tard.
                </p>
              </div>
            </div>
          )}

          {/* Step 5: Complete */}
          {step === 5 && (
            <div className="animate-fadeIn">
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-success-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Félicitations ! Votre food truck est créé
                </h1>
                <p className="text-gray-600">Voici le récapitulatif de votre configuration.</p>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-success-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-success-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{name}</p>
                    {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
                  </div>
                </div>

                {menuItems.length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-success-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-success-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {menuItems.length} plat{menuItems.length > 1 ? 's' : ''} ajouté
                        {menuItems.length > 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {menuItems.map((item) => item.name).join(', ')}
                      </p>
                    </div>
                  </div>
                )}

                {locationName && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-success-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-success-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Emplacement configuré</p>
                      <p className="text-sm text-gray-500 mt-1">{locationName}</p>
                    </div>
                  </div>
                )}

                {scheduleDays.length > 0 && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-success-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-success-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">Planning configuré</p>
                      <p className="text-sm text-gray-500 mt-1">{schedulePreview}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Share link */}
              {createdId && (
                <div className="bg-primary-50 border border-primary-200 rounded-2xl p-6 mt-6">
                  <p className="font-semibold text-primary-900 mb-2">Lien de votre food truck</p>
                  <p className="text-sm text-primary-700 mb-4">
                    Partagez ce lien avec vos clients pour qu'ils puissent commander.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={foodtruckUrl}
                      readOnly
                      className="input flex-1 bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="btn-secondary flex items-center gap-2"
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copié !
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copier
                        </>
                      )}
                    </button>
                  </div>
                  <a
                    href={foodtruckUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 mt-3"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Voir la page client
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons - Fixed at bottom */}
      <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-4 pb-6 px-4">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          {step > 1 && step < 5 ? (
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] text-gray-600 hover:text-gray-900 transition-colors rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
          ) : (
            <div />
          )}

          {step === 1 && (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canContinue()}
              className="btn-primary flex items-center gap-2 ml-auto"
            >
              Continuer
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step >= 2 && step <= 3 && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleNext}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Passer cette étape
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="btn-primary flex items-center gap-2"
              >
                Continuer
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Passer cette étape
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="btn-primary flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    Créer mon food truck
                    <Check className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          )}

          {step === 5 && (
            <button
              type="button"
              onClick={() => navigate('/')}
              className="btn-primary flex items-center gap-2 ml-auto"
            >
              Accéder au dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
