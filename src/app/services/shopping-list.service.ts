import { Injectable, signal, computed } from '@angular/core';
import { DietData, IngredientItem, IngredientType, CATEGORY_META } from '../models/diet.types';

export type AppScreen = 'days' | 'list' | 'summary';

const STEP = 10;
const DEFAULT_MULTIPLIER = 2;

const SIZE_WORDS = new Set([
  'mała', 'małe', 'mały',
  'duża', 'duże', 'duży',
  'średnia', 'średnie', 'średni',
]);

function normalizeMiara(miara: string): { quantity: number; unit: string } | null {
  const match = miara.trim().match(/^([\d.]+)\s+(.+)$/);
  if (!match) return null;
  const quantity = parseFloat(match[1]);
  if (isNaN(quantity)) return null;
  const parts = match[2].trim().split(/\s+/);
  const unit = (parts.length >= 2 && SIZE_WORDS.has(parts[0]))
    ? parts.slice(1).join(' ')
    : parts.join(' ');
  return { quantity, unit };
}

@Injectable({ providedIn: 'root' })
export class ShoppingListService {
  private _dietData = signal<DietData | null>(null);
  private _selectedDays = signal<Set<number>>(new Set());
  private _ingredients = signal<IngredientItem[]>([]);
  private _screen = signal<AppScreen>('days');
  private _dayMultipliers = signal<Record<number, Record<string, number>>>({});
  readonly replacingId = signal<string | null>(null);

  readonly dietData = this._dietData.asReadonly();
  readonly selectedDays = this._selectedDays.asReadonly();
  readonly ingredients = this._ingredients.asReadonly();
  readonly screen = this._screen.asReadonly();
  readonly dayMultipliers = this._dayMultipliers.asReadonly();

  readonly dayNumbers = computed(() => {
    const data = this._dietData();
    if (!data) return [];
    return [...new Set(data.days.map(d => d.day))].sort((a, b) => a - b);
  });

  readonly allSelected = computed(() => {
    const nums = this.dayNumbers();
    if (!nums.length) return false;
    const sel = this._selectedDays();
    return nums.every(d => sel.has(d));
  });

  readonly canGenerate = computed(() => this._selectedDays().size > 0);

  readonly activeIngredients = computed(() => this._ingredients().filter(i => !i.excluded));

  setDietData(data: DietData): void {
    this._dietData.set(data);
  }

  toggleDay(day: number): void {
    const current = new Set(this._selectedDays());
    if (current.has(day)) {
      current.delete(day);
    } else {
      current.add(day);
    }
    this._selectedDays.set(current);
  }

  toggleSelectAll(): void {
    if (this.allSelected()) {
      this._selectedDays.set(new Set());
    } else {
      this._selectedDays.set(new Set(this.dayNumbers()));
    }
  }

  generateList(): void {
    const days = [...this._selectedDays()];
    this._ingredients.set(this.buildIngredients(days));
    this._screen.set('list');
  }

  ownersForDay(day: number): string[] {
    const data = this._dietData();
    if (!data) return [];
    const owners = new Set<string>();
    for (const d of data.days) {
      if (d.day === day) owners.add(d.owner);
    }
    return [...owners].sort();
  }

  getMultiplier(day: number, owner: string): number {
    return this._dayMultipliers()[day]?.[owner] ?? DEFAULT_MULTIPLIER;
  }

  setMultiplier(day: number, owner: string, delta: number): void {
    this._dayMultipliers.update(m => {
      const current = m[day]?.[owner] ?? DEFAULT_MULTIPLIER;
      const next = Math.max(1, current + delta);
      return { ...m, [day]: { ...(m[day] ?? {}), [owner]: next } };
    });
  }

  private buildIngredients(days: number[]): IngredientItem[] {
    const data = this._dietData();
    if (!data) return [];
    const multipliers = this._dayMultipliers();

    const map: Record<string, IngredientItem> = {};
    const miaraAcc: Record<string, { quantity: number; unit: string }> = {};
    data.days
      .filter(d => days.includes(d.day))
      .forEach(dayEntry => {
        const factor = multipliers[dayEntry.day]?.[dayEntry.owner] ?? DEFAULT_MULTIPLIER;
        dayEntry.meals.forEach(meal => {
          meal.dishes.forEach(dish => {
            dish.ingredients.forEach(ing => {
              const key = `${ing.name.toLowerCase().trim()}|${ing.type}`;
              if (!map[key]) {
                map[key] = {
                  id: key,
                  name: ing.name,
                  type: (ing.type || 'vegetable') as IngredientType,
                  totalWeight: 0,
                  adjustedWeight: 0,
                  usages: [],
                  excluded: false,
                };
              }
              const scaledWeight = ing.weight * factor;
              map[key].totalWeight += scaledWeight;
              map[key].usages.push({
                day: dayEntry.day,
                owner: dayEntry.owner,
                meal: meal.mealName,
                dish: dish.dishName,
                weight: scaledWeight,
              });
              if (ing.miara) {
                const parsed = normalizeMiara(ing.miara);
                if (parsed) {
                  const scaledQty = parsed.quantity * factor;
                  if (!miaraAcc[key]) {
                    miaraAcc[key] = { quantity: scaledQty, unit: parsed.unit };
                  } else {
                    miaraAcc[key].quantity += scaledQty;
                  }
                }
              }
            });
          });
        });
      });

    Object.values(map).forEach(ing => {
      ing.adjustedWeight = ing.totalWeight;
      const acc = miaraAcc[ing.id];
      if (acc) {
        const qty = parseFloat(acc.quantity.toFixed(2));
        ing.miara = `${qty} ${acc.unit}`;
      }
    });
    return Object.values(map);
  }

  toggleExclude(id: string): void {
    this._ingredients.update(items =>
      items.map(i => i.id === id ? { ...i, excluded: !i.excluded } : i)
    );
  }

  adjustWeight(id: string, delta: number): void {
    this._ingredients.update(items =>
      items.map(i => i.id === id
        ? { ...i, adjustedWeight: Math.max(STEP, i.adjustedWeight + delta) }
        : i
      )
    );
  }

  replaceItem(id: string, newName: string): void {
    this._ingredients.update(items =>
      items.map(i => {
        if (i.id !== id) return i;
        const newId = `${newName.toLowerCase().trim()}|${i.type}`;
        return { ...i, id: newId, name: newName };
      })
    );
  }

  deleteItem(id: string): void {
    this._ingredients.update(items => items.filter(i => i.id !== id));
  }

  addCustomItem(name: string, type: IngredientType, freeQuantity: string): void {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const id = `custom|${trimmedName.toLowerCase()}|${type}|${Date.now()}`;
    const item: IngredientItem = {
      id,
      name: trimmedName,
      type,
      totalWeight: 0,
      adjustedWeight: 0,
      usages: [],
      excluded: false,
      custom: true,
      freeQuantity: freeQuantity.trim() || undefined,
    };
    this._ingredients.update(items => [...items, item]);
  }

  resetList(): void {
    const days = [...this._selectedDays()];
    this._ingredients.set(this.buildIngredients(days));
  }

  finalize(): void {
    this._screen.set('summary');
  }

  goToList(): void {
    this._screen.set('list');
  }

  goToDays(): void {
    this._screen.set('days');
  }

  startOver(): void {
    this._selectedDays.set(new Set());
    this._ingredients.set([]);
    this._dayMultipliers.set({});
    this._screen.set('days');
  }

  groupedIngredients(items: IngredientItem[]): [IngredientType, IngredientItem[]][] {
    const map: Partial<Record<IngredientType, IngredientItem[]>> = {};
    items.forEach(ing => {
      const t = (ing.type || 'vegetable') as IngredientType;
      if (!map[t]) map[t] = [];
      map[t]!.push(ing);
    });
    return (Object.entries(map) as [IngredientType, IngredientItem[]][])
      .sort(([a], [b]) => {
        const oa = CATEGORY_META[a]?.order ?? 99;
        const ob = CATEGORY_META[b]?.order ?? 99;
        return oa - ob;
      });
  }

  formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  }

  getSelectedDaysSorted(): number[] {
    return [...this._selectedDays()].sort((a, b) => a - b);
  }
}
