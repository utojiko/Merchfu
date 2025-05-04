import json
import re
import os
from collections import defaultdict

def check_duplicate_dates(json_path, specific_date=None):
    """
    Vérifie les objets qui ont des dates dupliquées dans leurs entrées de prix.
    
    Args:
        json_path: Chemin vers le fichier JSON à vérifier
        specific_date: Date spécifique à vérifier (ex: "2025-05-04"), si None, vérifie toutes les dates
    
    Returns:
        Un dictionnaire avec les items problématiques et leurs dates dupliquées
    """
    try:
        # Charger le fichier JSON
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Erreur lors de la lecture du fichier JSON: {e}")
        return {}
    
    problematic_items = {}
    
    # Parcourir tous les objets du JSON
    for item_name, item_data in data.items():
        # Vérifier si l'item a une liste de prix
        if "price" not in item_data:
            continue
        
        # Collecter les dates pour cet item
        dates_count = defaultdict(int)
        for price_entry in item_data["price"]:
            if "date" in price_entry:
                date = price_entry["date"]
                dates_count[date] += 1
        
        # Vérifier les doublons
        duplicates = {}
        for date, count in dates_count.items():
            # Si specific_date est spécifié, ne vérifier que cette date
            if specific_date and date != specific_date:
                continue
                
            if count > 1:
                duplicates[date] = count
        
        # Si des doublons sont trouvés, ajouter l'item à la liste des problématiques
        if duplicates:
            problematic_items[item_name] = duplicates
    
    return problematic_items

def print_results(problematic_items):
    """Affiche les résultats de manière formatée"""
    if not problematic_items:
        print("Aucun objet avec des dates dupliquées n'a été trouvé.")
        return
    
    print(f"Objets avec des dates dupliquées ({len(problematic_items)}):")
    print("-" * 50)
    
    for item_name, duplicates in problematic_items.items():
        print(f"\n• {item_name} :")
        for date, count in duplicates.items():
            print(f"  - Date '{date}' apparaît {count} fois")
    
    print("-" * 50)

def fix_duplicate_dates(json_path, output_path=None):
    """
    Corrige les dates dupliquées en ne gardant que la première occurrence.
    
    Args:
        json_path: Chemin vers le fichier JSON à corriger
        output_path: Chemin pour enregistrer le JSON corrigé, si None, écrase le fichier d'origine
    """
    try:
        # Charger le fichier JSON
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Erreur lors de la lecture du fichier JSON: {e}")
        return
    
    changes_made = 0
    
    # Parcourir tous les objets du JSON
    for item_name, item_data in data.items():
        # Vérifier si l'item a une liste de prix
        if "price" not in item_data:
            continue
        
        # Collecter les dates déjà rencontrées
        seen_dates = set()
        new_price_list = []
        
        for price_entry in item_data["price"]:
            if "date" not in price_entry:
                # Garder les entrées sans date
                new_price_list.append(price_entry)
            else:
                date = price_entry["date"]
                if date not in seen_dates:
                    # Première occurrence de cette date, la garder
                    seen_dates.add(date)
                    new_price_list.append(price_entry)
                else:
                    # Date déjà vue, ne pas l'ajouter
                    changes_made += 1
        
        # Remplacer la liste de prix par la nouvelle liste sans doublons
        if len(new_price_list) < len(item_data["price"]):
            item_data["price"] = new_price_list
    
    # Enregistrer les modifications
    if output_path is None:
        output_path = json_path
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
    
    print(f"{changes_made} entrées de prix dupliquées ont été supprimées.")
    print(f"Fichier JSON corrigé enregistré: {output_path}")

def main():
    # Chemin du fichier JSON
    json_path = r"c:\Users\roman\OneDrive\Documents\ProjetPerso\Merchfu\data\items.json"
    
    # Vérifier si le fichier existe
    if not os.path.exists(json_path):
        print(f"Le fichier {json_path} n'existe pas.")
        return
    
    print("Vérification des dates dupliquées...")
    
    # Option 1: Vérifier toutes les dates
    problematic_items = check_duplicate_dates(json_path)
    
    # Option 2: Vérifier une date spécifique
    # problematic_items = check_duplicate_dates(json_path, "2025-05-04")
    
    print_results(problematic_items)
    
    # Demander à l'utilisateur s'il souhaite corriger les doublons
    if problematic_items:
        answer = input("Voulez-vous corriger automatiquement les doublons de dates ? (o/n): ")
        if answer.lower() == 'o':
            # Option 1: Écraser le fichier original
            fix_duplicate_dates(json_path)
            
            # Option 2: Créer une copie corrigée
            # fix_duplicate_dates(json_path, json_path.replace(".json", "_corrected.json"))

if __name__ == "__main__":
    main()