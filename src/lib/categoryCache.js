import { supabase } from '@/lib/supabase';

const CATEGORY_CACHE_TTL_MS = 5 * 60 * 1000;

let cachedCategories = null;
let cachedAt = 0;
let categoriesRequest = null;

export function getCachedCategoriesSnapshot() {
  if (cachedCategories && Date.now() - cachedAt < CATEGORY_CACHE_TTL_MS) {
    return cachedCategories;
  }

  return null;
}

export function getCachedCategories() {
  const snapshot = getCachedCategoriesSnapshot();
  if (snapshot) return Promise.resolve(snapshot);

  if (!categoriesRequest) {
    categoriesRequest = supabase
      .from('categories')
      .select('id,name,slug,image_url,priority')
      .eq('is_active', true)
      .order('priority', { ascending: false })
      .then(({ data, error }) => {
        if (error) throw error;

        cachedCategories = data || [];
        cachedAt = Date.now();
        return cachedCategories;
      })
      .finally(() => {
        categoriesRequest = null;
      });
  }

  return categoriesRequest;
}
