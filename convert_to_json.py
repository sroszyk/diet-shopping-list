#!/usr/bin/env python3
"""
Convert SzymonDieta.csv to a normalized JSON structure.

Usage:
    python3 convert_to_json.py

Output:
    SzymonDieta.json
"""

import csv
import json
import re


def parse_weight(weight_str):
    """Parse a weight string like '70 g' into (amount, unit)."""
    match = re.match(r"^([0-9]+(?:\.[0-9]+)?)\s+(\S+)$", weight_str.strip())
    if match:
        return float(match.group(1)), match.group(2)
    return float(weight_str.strip()), "g"


def convert(csv_path, json_path):
    with open(csv_path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    # --- Build deduplicated lookup tables ---

    # units
    unit_name_to_id = {}
    units = []

    def get_unit_id(symbol):
        if symbol not in unit_name_to_id:
            uid = len(units) + 1
            unit_name_to_id[symbol] = uid
            units.append({"id": uid, "symbol": symbol})
        return unit_name_to_id[symbol]

    # ingredients
    ingredient_name_to_id = {}
    ingredients = []

    def get_ingredient_id(name):
        if name not in ingredient_name_to_id:
            iid = len(ingredients) + 1
            ingredient_name_to_id[name] = iid
            ingredients.append({"id": iid, "name": name})
        return ingredient_name_to_id[name]

    # meal types
    meal_type_name_to_id = {}
    meal_types = []

    def get_meal_type_id(name):
        if name not in meal_type_name_to_id:
            mid = len(meal_types) + 1
            meal_type_name_to_id[name] = mid
            meal_types.append({"id": mid, "name": name})
        return meal_type_name_to_id[name]

    # dishes: keyed by dish_name (assume same name => same dish)
    dish_name_to_id = {}
    dishes = []

    def get_or_create_dish(name, recipe):
        if name not in dish_name_to_id:
            did = len(dishes) + 1
            dish_name_to_id[name] = did
            dishes.append({"id": did, "name": name, "recipe": recipe, "ingredients": []})
        return dish_name_to_id[name]

    # --- Parse rows ---

    # day -> meal_type -> [dish_ids]  (ordered, preserving first occurrence)
    day_order = []
    day_meals = {}  # day_name -> {meal_type_id -> [dish_ids]}

    for row in rows:
        day_name = row["day"]
        dish_name = row["dish_name"]
        meal_name = row["meal_name"]
        ingredient_name = row["ingredient"]
        weight_str = row["weight"]
        recipe = row["recipe"]

        # Ensure day is registered in order
        if day_name not in day_meals:
            day_order.append(day_name)
            day_meals[day_name] = {}

        meal_type_id = get_meal_type_id(meal_name)
        dish_id = get_or_create_dish(dish_name, recipe)

        # Add dish to the meal (once per meal occurrence)
        meal_dishes = day_meals[day_name].setdefault(meal_type_id, [])
        if dish_id not in meal_dishes:
            meal_dishes.append(dish_id)

        # Add ingredient to dish (skip duplicates for dishes shared across days)
        amount, unit_symbol = parse_weight(weight_str)
        unit_id = get_unit_id(unit_symbol)
        ingredient_id = get_ingredient_id(ingredient_name)

        dish = dishes[dish_id - 1]
        already_listed = any(
            e["ingredient_id"] == ingredient_id and e["amount"] == amount
            for e in dish["ingredients"]
        )
        if not already_listed:
            dish["ingredients"].append(
                {"ingredient_id": ingredient_id, "amount": amount, "unit_id": unit_id}
            )

    # --- Build days list ---
    days = []
    for i, day_name in enumerate(day_order, start=1):
        meals_list = [
            {"meal_type_id": mt_id, "dish_ids": dish_ids}
            for mt_id, dish_ids in day_meals[day_name].items()
        ]
        days.append({"id": i, "name": day_name, "meals": meals_list})

    output = {
        "units": units,
        "ingredients": ingredients,
        "meal_types": meal_types,
        "dishes": dishes,
        "days": days,
    }

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"Converted {len(rows)} rows → {json_path}")
    print(f"  {len(units)} unit(s), {len(ingredients)} ingredient(s), "
          f"{len(meal_types)} meal type(s), {len(dishes)} dish(es), {len(days)} day(s)")


if __name__ == "__main__":
    import os
    base = os.path.dirname(os.path.abspath(__file__))
    convert(
        csv_path=os.path.join(base, "SzymonDieta.csv"),
        json_path=os.path.join(base, "SzymonDieta.json"),
    )
