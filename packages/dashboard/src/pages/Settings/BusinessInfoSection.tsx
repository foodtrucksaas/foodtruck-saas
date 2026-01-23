import { useState } from 'react';
import { Building, Check, X } from 'lucide-react';
import type { Foodtruck } from '@foodtruck/shared';
import { useFoodtruck } from '../../contexts/FoodtruckContext';
import { ErrorAlert, SuccessAlert } from '../../components/Alert';

interface BusinessInfoSectionProps {
  foodtruck: Foodtruck | null;
}

export function BusinessInfoSection({ foodtruck }: BusinessInfoSectionProps) {
  const { updateFoodtruck } = useFoodtruck();
  const [editingSiret, setEditingSiret] = useState(false);
  const [siretValue, setSiretValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const startEditSiret = () => {
    setEditingSiret(true);
    setSiretValue(foodtruck?.siret || '');
  };

  const cancelEditSiret = () => {
    setEditingSiret(false);
    setSiretValue('');
  };

  const saveSiret = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      // Remove spaces and validate SIRET format (14 digits)
      const cleanSiret = siretValue.replace(/\s/g, '');

      if (cleanSiret && !/^\d{14}$/.test(cleanSiret)) {
        setError('Le SIRET doit contenir 14 chiffres');
        setLoading(false);
        return;
      }

      await updateFoodtruck({ siret: cleanSiret || null });
      setSuccessMessage('SIRET mis a jour');
      setTimeout(() => setSuccessMessage(null), 2000);
      setEditingSiret(false);
      setSiretValue('');
    } catch {
      setError('Erreur lors de la mise a jour');
      setTimeout(() => setError(null), 3000);
    }
    setLoading(false);
  };

  // Format SIRET for display (XXX XXX XXX XXXXX)
  const formatSiret = (siret: string) => {
    return siret.replace(/(\d{3})(\d{3})(\d{3})(\d{5})/, '$1 $2 $3 $4');
  };

  return (
    <section className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <Building className="w-6 h-6 text-primary-500" />
        <h2 className="text-lg font-semibold text-gray-900">Informations entreprise</h2>
      </div>

      <div className="space-y-4">
        {/* SIRET */}
        <div className="py-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-500 mb-1">Numéro SIRET</label>
              {editingSiret ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={siretValue}
                    onChange={(e) => setSiretValue(e.target.value.replace(/[^\d\s]/g, ''))}
                    placeholder="123 456 789 12345"
                    className="input flex-1"
                    maxLength={17}
                    autoFocus
                  />
                  <button
                    onClick={saveSiret}
                    disabled={loading}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={cancelEditSiret}
                    disabled={loading}
                    className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <p className="text-gray-900">
                  {foodtruck?.siret ? formatSiret(foodtruck.siret) : <span className="text-gray-400">Non renseigné</span>}
                </p>
              )}
            </div>
            {!editingSiret && (
              <button
                onClick={startEditSiret}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {foodtruck?.siret ? 'Modifier' : 'Ajouter'}
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Affiché sur votre page pour rassurer vos clients
          </p>
          {error && <ErrorAlert className="mt-2">{error}</ErrorAlert>}
          {successMessage && <SuccessAlert className="mt-2">{successMessage}</SuccessAlert>}
        </div>
      </div>
    </section>
  );
}
