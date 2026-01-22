import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Foodtruck, Category, MenuItem } from '@foodtruck/shared';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface FoodtruckContextType {
  foodtruck: Foodtruck | null;
  categories: Category[];
  menuItems: MenuItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  updateFoodtruck: (data: Partial<Foodtruck>) => Promise<void>;
}

const FoodtruckContext = createContext<FoodtruckContextType | undefined>(undefined);

export function FoodtruckProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [foodtruck, setFoodtruck] = useState<Foodtruck | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFoodtruck = async () => {
    if (!user) {
      setFoodtruck(null);
      setCategories([]);
      setMenuItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: foodtruckData, error: foodtruckError } = await supabase
        .from('foodtrucks')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (foodtruckError && foodtruckError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is expected for new users
        console.error('Erreur lors du chargement du food truck:', foodtruckError);
        setError('Impossible de charger les donnees de votre food truck. Veuillez recharger la page.');
        setLoading(false);
        return;
      }

      setFoodtruck(foodtruckData);

      if (foodtruckData) {
        const [categoriesRes, menuItemsRes] = await Promise.all([
          supabase
            .from('categories')
            .select('*')
            .eq('foodtruck_id', foodtruckData.id)
            .order('display_order'),
          supabase
            .from('menu_items')
            .select('*')
            .eq('foodtruck_id', foodtruckData.id)
            .or('is_archived.is.null,is_archived.eq.false')
            .order('display_order'),
        ]);

        if (categoriesRes.error) {
          console.error('Erreur lors du chargement des categories:', categoriesRes.error);
        }
        if (menuItemsRes.error) {
          console.error('Erreur lors du chargement du menu:', menuItemsRes.error);
        }

        setCategories(categoriesRes.data || []);
        setMenuItems(menuItemsRes.data || []);
      }
    } catch (err) {
      console.error('Erreur inattendue:', err);
      setError('Une erreur inattendue est survenue. Veuillez recharger la page.');
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchFoodtruck();
  }, [user]);

  const updateFoodtruck = async (data: Partial<Foodtruck>) => {
    if (!foodtruck) {
      toast.error('Impossible de mettre a jour: aucun food truck trouve');
      throw new Error('No foodtruck');
    }

    try {
      const { error: updateError } = await supabase
        .from('foodtrucks')
        .update(data)
        .eq('id', foodtruck.id);

      if (updateError) {
        console.error('Erreur lors de la mise a jour:', updateError);
        toast.error('Impossible de sauvegarder les modifications. Veuillez reessayer.');
        throw updateError;
      }

      setFoodtruck({ ...foodtruck, ...data });
    } catch (err) {
      console.error('Erreur inattendue lors de la mise a jour:', err);
      throw err;
    }
  };

  return (
    <FoodtruckContext.Provider
      value={{
        foodtruck,
        categories,
        menuItems,
        loading,
        error,
        refresh: fetchFoodtruck,
        updateFoodtruck,
      }}
    >
      {children}
    </FoodtruckContext.Provider>
  );
}

export function useFoodtruck() {
  const context = useContext(FoodtruckContext);
  if (context === undefined) {
    throw new Error('useFoodtruck must be used within a FoodtruckProvider');
  }
  return context;
}
