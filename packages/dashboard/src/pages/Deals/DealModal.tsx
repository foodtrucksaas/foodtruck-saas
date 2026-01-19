import { X, Gift, Tag, Percent, Euro } from 'lucide-react';
import type { Category, MenuItem, CategoryOption } from '@foodtruck/shared';
import type { DealFormState, DealWithOption } from './useDeals';

interface DealModalProps {
  editingDeal: DealWithOption | null;
  form: DealFormState;
  categories: Category[];
  menuItems: MenuItem[];
  categoryOptions: CategoryOption[];
  onFormChange: (form: DealFormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function DealModal({ editingDeal, form, categories, menuItems, categoryOptions, onFormChange, onSubmit, onClose }: DealModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">{editingDeal ? 'Modifier la formule' : 'Nouvelle formule'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={onSubmit} className="p-4 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'offre *</label>
            <input type="text" value={form.name} onChange={(e) => onFormChange({ ...form, name: e.target.value })} className="input w-full" placeholder="3 pizzas = boisson offerte" required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optionnel)</label>
            <input type="text" value={form.description} onChange={(e) => onFormChange({ ...form, description: e.target.value })} className="input w-full" placeholder="Offre valable tous les jours" />
          </div>

          <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div><div className="relative flex justify-center"><span className="bg-white px-3 text-sm font-medium text-gray-500">CONDITION</span></div></div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Quand le client achète...</label>
            <div className="flex items-center gap-3">
              <input type="number" min="2" value={form.triggerQuantity} onChange={(e) => onFormChange({ ...form, triggerQuantity: e.target.value })} onWheel={(e) => e.currentTarget.blur()} className="input w-20 text-center" required />
              <span className="text-gray-500">article(s) de</span>
              <select value={form.triggerCategoryId} onChange={(e) => onFormChange({ ...form, triggerCategoryId: e.target.value, triggerOptionId: '' })} className="input flex-1" required>
                <option value="">Sélectionner une catégorie</option>
                {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            {categoryOptions.length > 0 && (
              <div className="mt-3">
                <label className="block text-sm text-gray-600 mb-1">Filtrer par option (optionnel)</label>
                <select value={form.triggerOptionId} onChange={(e) => onFormChange({ ...form, triggerOptionId: e.target.value })} className="input w-full">
                  <option value="">Toutes les options</option>
                  {categoryOptions.map((opt) => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div><div className="relative flex justify-center"><span className="bg-white px-3 text-sm font-medium text-gray-500">RÉCOMPENSE</span></div></div>

          <div className="space-y-3">
            <RewardOption icon={Gift} label="Article offert" desc="Choisir un article spécifique" value="free_item" currentValue={form.rewardType} onChange={(v) => onFormChange({ ...form, rewardType: v, rewardValue: '' })}>
              {form.rewardType === 'free_item' && (
                <select value={form.rewardItemId} onChange={(e) => onFormChange({ ...form, rewardItemId: e.target.value })} className="input w-full mt-2">
                  <option value="">Sélectionner un article</option>
                  {menuItems.map((item) => <option key={item.id} value={item.id}>{item.name} ({(item.price / 100).toFixed(2)}€)</option>)}
                </select>
              )}
            </RewardOption>

            <RewardOption icon={Tag} label="Le moins cher offert" desc="L'article le moins cher de la catégorie dans le panier sera offert" value="cheapest_in_cart" currentValue={form.rewardType} onChange={(v) => onFormChange({ ...form, rewardType: v, rewardItemId: '', rewardValue: '' })} />

            <RewardOption icon={Percent} label="Réduction en %" value="percentage" currentValue={form.rewardType} onChange={(v) => onFormChange({ ...form, rewardType: v, rewardItemId: '' })}>
              {form.rewardType === 'percentage' && (
                <div className="relative mt-2">
                  <input type="number" min="1" max="100" value={form.rewardValue} onChange={(e) => onFormChange({ ...form, rewardValue: e.target.value })} onWheel={(e) => e.currentTarget.blur()} className="input w-full pr-8" placeholder="20" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                </div>
              )}
            </RewardOption>

            <RewardOption icon={Euro} label="Réduction en €" value="fixed" currentValue={form.rewardType} onChange={(v) => onFormChange({ ...form, rewardType: v, rewardItemId: '' })}>
              {form.rewardType === 'fixed' && (
                <div className="relative mt-2">
                  <input type="text" inputMode="decimal" value={form.rewardValue} onChange={(e) => onFormChange({ ...form, rewardValue: e.target.value.replace(/[^0-9.,]/g, '') })} className="input w-full pr-8" placeholder="5" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">€</span>
                </div>
              )}
            </RewardOption>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.stackable} onChange={(e) => onFormChange({ ...form, stackable: e.target.checked })} className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500" />
              <span className="text-sm text-gray-700">Cumulable avec les codes promo</span>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 py-3 border border-gray-300 rounded-xl font-medium hover:bg-gray-50">Annuler</button>
            <button type="submit" className="flex-1 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium">{editingDeal ? 'Enregistrer' : 'Créer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RewardOption({ icon: Icon, label, desc, value, currentValue, onChange, children }: { icon: React.ElementType; label: string; desc?: string; value: string; currentValue: string; onChange: (v: DealFormState['rewardType']) => void; children?: React.ReactNode }) {
  const isSelected = currentValue === value;
  return (
    <label className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}`}>
      <input type="radio" name="rewardType" value={value} checked={isSelected} onChange={() => onChange(value as DealFormState['rewardType'])} className="mt-0.5" />
      <div className="flex-1">
        <div className="flex items-center gap-2"><Icon className="w-4 h-4 text-primary-500" /><span className="font-medium">{label}</span></div>
        {desc && <p className="text-xs text-gray-500 mt-1">{desc}</p>}
        {children}
      </div>
    </label>
  );
}
