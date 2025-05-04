from PIL import Image
import pytesseract
import json
import os
from datetime import datetime
import re

# Constantes
DATE_CAPTURE = "2025-05-04"  # Date de la capture au format YYYY-MM-DD
IMG_PATH = "hdv_wakfu3.png"
JSON_PATH = r"c:\Users\roman\OneDrive\Documents\ProjetPerso\Merchfu\data\items.json"
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

# Dimensions approximatives pour chaque ligne
TOP_OFFSET = 380   # Position verticale du premier item
LINE_HEIGHT = 61   # Hauteur d'un bloc item
NUM_ITEMS = 9     # Nombre d'items visibles

# Coordonnées relatives pour le nom et le prix dans chaque ligne
NAME_BOX = (445, 0, 763, 61)  # (x1, y1, x2, y2) relative à chaque ligne
PRICE_BOX = (1058, 0, 1181, 61)

def extract_items(image_path):
    img = Image.open(image_path)
    items = []

    for i in range(NUM_ITEMS):
        top = TOP_OFFSET + i * LINE_HEIGHT

        # Découpe du nom
        name_crop = img.crop((NAME_BOX[0], top + NAME_BOX[1],
                              NAME_BOX[2], top + NAME_BOX[3]))
        name_text = pytesseract.image_to_string(name_crop, lang='eng').strip()
        
        # Normaliser les apostrophes dans le nom
        name_text = name_text.replace("’", "'")
        
        # Découpe du prix
        price_crop = img.crop((PRICE_BOX[0], top + PRICE_BOX[1],
                               PRICE_BOX[2], top + PRICE_BOX[3]))
        price_text = pytesseract.image_to_string(
            price_crop, lang='eng', config='--psm 7 -c tessedit_char_whitelist=0123456789'
        ).strip()

        if name_text and price_text:
            # Convertir le prix en entier
            try:
                price_value = int(price_text)
                items.append((name_text, price_value))
            except ValueError:
                print(f"Impossible de convertir le prix '{price_text}' pour l'item '{name_text}'")

    return items

def update_items_json(items_data):
    # Charger le JSON existant
    try:
        with open(JSON_PATH, 'r', encoding='utf-8') as f:
            items_json = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        items_json = {}
        print("Fichier JSON non trouvé ou corrompu. Création d'un nouveau fichier.")
    
    # Créer un dictionnaire normalisé des clés existantes pour faciliter la recherche
    normalized_keys = {key.replace("'", "'").replace("`", "'").replace("'", "'"): key for key in items_json.keys()}
    
    # Traitement de chaque item détecté
    for name, price in items_data:
        # Normaliser le nom pour la recherche
        normalized_name = name.replace("'", "'").replace("`", "'").replace("'", "'")
        
        # Vérifier si l'item existe déjà (en utilisant le nom normalisé)
        if normalized_name in normalized_keys:
            # Utiliser la clé originale du JSON
            original_key = normalized_keys[normalized_name]
            
            # L'item existe déjà, ajouter le nouveau prix
            if "price" not in items_json[original_key]:
                items_json[original_key]["price"] = []
            
            # Vérifier si ce prix existe déjà pour éviter les doublons
            price_exists = any(entry.get("value") == price for entry in items_json[original_key]["price"])
            
            if not price_exists:
                items_json[original_key]["price"].append({
                    "date": DATE_CAPTURE,
                    "value": price
                })
                print(f"Prix ajouté pour {original_key}: {price}")
        else:
            # Nouvel item, créer une nouvelle entrée
            items_json[name] = {
                "type": "unknown",  # Type par défaut
                "price": [{
                    "date": DATE_CAPTURE,
                    "value": price
                }]
            }
            print(f"Nouvel item ajouté: {name} - {price}")
    
    # Sauvegarder le JSON mis à jour
    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(items_json, f, ensure_ascii=False, indent=4)
    
    print(f"Fichier JSON mis à jour: {JSON_PATH}")

def main():
    print(f"Traitement de l'image: {IMG_PATH}")
    items_data = extract_items(IMG_PATH)
    
    if items_data:
        print(f"{len(items_data)} items détectés:")
        for i, (nom, prix) in enumerate(items_data, 1):
            print(f"{i}. {nom} - {prix}")
        
        update_items_json(items_data)
    else:
        print("Aucun item détecté dans l'image.")

if __name__ == "__main__":
    main()