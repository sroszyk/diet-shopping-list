export type IngredientType = 'fruit' | 'vegetable' | 'dairy' | 'meat' | 'bread';

export interface IngredientTypeConfig {
  name: string;
  icon: string;
}

export interface AdminConfig {
  ingredientTypes: IngredientTypeConfig[];
}

export interface Ingredient {
  name: string;
  weight: number;
  type: IngredientType;
  miara?: string;
}

export interface Dish {
  dishName: string;
  ingredients: Ingredient[];
  recipe?: string;
}

export interface Meal {
  mealName: string;
  dishes: Dish[];
}

export interface DayEntry {
  day: number;
  date: string;
  owner: string;
  meals: Meal[];
}

export interface DietData {
  days: DayEntry[];
}

export interface IngredientUsage {
  day: number;
  owner: string;
  meal: string;
  dish: string;
  weight: number;
}

export interface IngredientItem {
  id: string;
  name: string;
  type: IngredientType;
  totalWeight: number;
  adjustedWeight: number;
  usages: IngredientUsage[];
  excluded: boolean;
  miara?: string;
}

export const CATEGORY_META: Record<IngredientType, { label: string; icon: string; order: number }> = {
  fruit:     { label: 'Fruit',     icon: '🍎', order: 1 },
  vegetable: { label: 'Vegetable', icon: '🥦', order: 2 },
  dairy:     { label: 'Dairy',     icon: '🧀', order: 3 },
  meat:      { label: 'Meat',      icon: '🥩', order: 4 },
  bread:     { label: 'Bread',     icon: '🍞', order: 5 },
};
