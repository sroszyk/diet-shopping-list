#!/usr/bin/env python3
"""
convert_to_json.py

Converts a diet CSV file (columns: day, dish_name, meal_name, ingredient, weight, recipe)
into a normalized JSON structure for the diet-shopping-list app.

Usage:
    python3 convert_to_json.py <input_csv> [output_json]

Examples:
    python3 convert_to_json.py MagdaDieta.csv MagdaDieta.json
    python3 convert_to_json.py SzymonDieta.csv SzymonDieta.json

Normalized JSON schema
----------------------
{
  "ingredients": {          // unique ingredient registry, keyed by ID
    "1": { "id": 1, "name": "Jajko" },
    ...
  },
  "dishes": {               // unique dish registry, keyed by ID
    "1": { "id": 1, "name": "Jaja na miękko z warzywami w paseczkach", "recipe": "..." },
    ...
  },
  "plan": [                 // ordered list of days
    {
      "day": "Dzień 1",
      "meals": [
        {
          "meal_name": "Śniadanie",
          "dishes": [
            {
              "dish_id": 1,   // references dishes[1]
              "ingredients": [
                { "ingredient_id": 1, "weight": "120 g" },
                ...
              ]
            }
          ]
        }
      ]
    }
  ]
}
"""

import csv
import json
import sys
from collections import OrderedDict


def convert(csv_path, json_path):
    # ── 1. Read CSV ──────────────────────────────────────────────────────────
    rows = []
    with open(csv_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            rows.append(row)

    # ── 2. Build unique registries ───────────────────────────────────────────
    ingredient_name_to_id = {}  # name -> int id
    ingredient_registry = OrderedDict()  # id -> {id, name}

    dish_name_to_id = {}   # name -> int id
    dish_registry = OrderedDict()   # id -> {id, name, recipe}

    def get_ingredient_id(name):
        if name not in ingredient_name_to_id:
            new_id = len(ingredient_name_to_id) + 1
            ingredient_name_to_id[name] = new_id
            ingredient_registry[new_id] = {"id": new_id, "name": name}
        return ingredient_name_to_id[name]

    def get_dish_id(name, recipe):
        if name not in dish_name_to_id:
            new_id = len(dish_name_to_id) + 1
            dish_name_to_id[name] = new_id
            dish_registry[new_id] = {"id": new_id, "name": name, "recipe": recipe}
        return dish_name_to_id[name]

    # ── 3. Build plan structure ───────────────────────────────────────────────
    # plan_data: OrderedDict day -> OrderedDict meal_name -> OrderedDict dish_name -> list of (ingredient_id, weight)
    plan_data = OrderedDict()

    for row in rows:
        day = row["day"].strip()
        dish_name = row["dish_name"].strip()
        meal_name = row["meal_name"].strip()
        ingredient = row["ingredient"].strip()
        weight = row["weight"].strip()
        recipe = row["recipe"].strip()

        dish_id = get_dish_id(dish_name, recipe)
        ingredient_id = get_ingredient_id(ingredient)

        if day not in plan_data:
            plan_data[day] = OrderedDict()
        if meal_name not in plan_data[day]:
            plan_data[day][meal_name] = OrderedDict()
        if dish_name not in plan_data[day][meal_name]:
            plan_data[day][meal_name][dish_name] = []

        plan_data[day][meal_name][dish_name].append({
            "ingredient_id": ingredient_id,
            "weight": weight,
        })

    # ── 4. Serialize plan ────────────────────────────────────────────────────
    plan = []
    for day, meals_dict in plan_data.items():
        meals = []
        for meal_name, dishes_dict in meals_dict.items():
            dishes = []
            for dish_name, ingredients in dishes_dict.items():
                dishes.append({
                    "dish_id": dish_name_to_id[dish_name],
                    "ingredients": ingredients,
                })
            meals.append({
                "meal_name": meal_name,
                "dishes": dishes,
            })
        plan.append({
            "day": day,
            "meals": meals,
        })

    # ── 5. Assemble output ───────────────────────────────────────────────────
    output = {
        "ingredients": {str(v["id"]): v for v in ingredient_registry.values()},
        "dishes": {str(v["id"]): v for v in dish_registry.values()},
        "plan": plan,
    }

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"Converted '{csv_path}' -> '{json_path}'")
    print(f"  {len(ingredient_registry)} unique ingredients")
    print(f"  {len(dish_registry)} unique dishes")
    print(f"  {len(plan)} days")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    input_csv = sys.argv[1]
    output_json = sys.argv[2] if len(sys.argv) > 2 else input_csv.replace(".csv", ".json")

    convert(input_csv, output_json)
