import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Foodtruck, Category, MenuItem } from '@foodtruck/shared';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface FoodtruckContextType {
  foodtruck: Foodtruck | null;
  categories: Category[];
  menuItems: MenuItem[];
  loading: boolean;
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

  const fetchFoodtruck = async () => {
    if (!user) {
      setFoodtruck(null);
      setCategories([]);
      setMenuItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data: foodtruckData } = await supabase
      .from('foodtrucks')
      .select('*')
      .eq('user_id', user.id)
      .single();

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

      setCategories(categoriesRes.data || []);
      setMenuItems(menuItemsRes.data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchFoodtruck();
  }, [user]);

  const updateFoodtruck = async (data: Partial<Foodtruck>) => {
    if (!foodtruck) return;

    const { error } = await supabase
      .from('foodtrucks')
      .update(data)
      .eq('id', foodtruck.id);

    if (!error) {
      setFoodtruck({ ...foodtruck, ...data });
    }
  };

  return (
    <FoodtruckContext.Provider
      value={{
        foodtruck,
        categories,
        menuItems,
        loading,
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
