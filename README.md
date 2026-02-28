# diet-shopping-list

A diet shopping list application based on a weekly meal plan.

## Data Files

| File | Description |
|------|-------------|
| `SzymonDieta.csv` | Original CSV export of the 7-day meal plan |
| `SzymonDieta.json` | Normalized JSON version of the meal plan (generated) |
| `convert_to_json.py` | Python script that converts the CSV to JSON |

## Generating the JSON

```bash
python3 convert_to_json.py
```

This reads `SzymonDieta.csv` and writes `SzymonDieta.json`.

## JSON Structure

The JSON is fully normalized to avoid duplication. Related entities are linked by integer IDs.

### Top-level keys

| Key | Description |
|-----|-------------|
| `units` | Measurement units (e.g. grams) |
| `ingredients` | Unique food ingredients |
| `meal_types` | Named meal slots (Śniadanie, Drugie śniadanie, …) |
| `dishes` | Recipes with ingredient lists |
| `days` | The 7-day plan, each day referencing meal types and dishes |

### Example extract

```json
{
  "units": [
    { "id": 1, "symbol": "g" }
  ],
  "ingredients": [
    { "id": 1, "name": "Bułka razowa" },
    { "id": 2, "name": "Ajvar pasta paprykow-bakłażanowa łagodna" }
  ],
  "meal_types": [
    { "id": 1, "name": "Śniadanie" },
    { "id": 2, "name": "Drugie śniadanie" },
    { "id": 3, "name": "Obiad" },
    { "id": 4, "name": "Podwieczorek" },
    { "id": 5, "name": "Kolacja" }
  ],
  "dishes": [
    {
      "id": 1,
      "name": "Bułka z szynką i ajvarem",
      "recipe": "Pieczywo posmaruj pastą. Połóż plastry szynki i warzyw, skrop oliwą.",
      "ingredients": [
        { "ingredient_id": 1, "amount": 70.0, "unit_id": 1 },
        { "ingredient_id": 2, "amount": 50.0, "unit_id": 1 }
      ]
    }
  ],
  "days": [
    {
      "id": 1,
      "name": "Dzień 1",
      "meals": [
        {
          "meal_type_id": 1,
          "dish_ids": [1, 2, 3]
        }
      ]
    }
  ]
}
```

### Design decisions

- **No duplicate strings** – ingredient names, unit symbols, meal-type names, and dish names each appear exactly once in their respective lookup arrays; everything else references them by ID.
- **`dishes` are shared** – if the same dish appears on multiple days it is stored once and referenced by ID from each day's meal entry.
- **Integer amounts** – weights are stored as numbers (not strings like `"70 g"`), enabling arithmetic and aggregation.
- **Extensible** – new units, ingredient metadata (calories, allergens, …), or dish categories can be added to the lookup objects without changing the referencing structure.