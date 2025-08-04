from PIL import Image
import pytesseract
import json
import os
import shutil
from datetime import datetime
import re

# Constantes
DATE_CAPTURE = "2025-08-04"  # Date de la capture au format YYYY-MM-DD
HDV_DIR = "hdv"  # Répertoire contenant les images à analyser
ARCHIVES_DIR = "archives"  # Répertoire d'archives
JSON_PATH = r"c:\Users\roman\OneDrive\Documents\ProjetPerso\Merchfu\data\items.json"
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

# Extensions d'images supportées
SUPPORTED_EXTENSIONS = [".png", ".jpg", ".jpeg"]

# Dimensions approximatives pour chaque ligne
TOP_OFFSET = 380  # Position verticale du premier item
LINE_HEIGHT = 61  # Hauteur d'un bloc item
NUM_ITEMS = 9  # Nombre d'items visibles

# Coordonnées relatives pour le nom et le prix dans chaque ligne
NAME_BOX = (440, 0, 727, 61)  # (x1, y1, x2, y2) relative à chaque ligne
PRICE_BOX = (1058, 0, 1181, 61)


def extract_items(image_path):
    img = Image.open(image_path)
    items = []

    for i in range(NUM_ITEMS):
        top = TOP_OFFSET + i * LINE_HEIGHT

        # Découpe du nom
        name_crop = img.crop(
            (NAME_BOX[0], top + NAME_BOX[1], NAME_BOX[2], top + NAME_BOX[3])
        )
        name_text = pytesseract.image_to_string(name_crop, lang="fra").strip()

        # Normaliser les apostrophes dans le nom
        name_text = replace_special_characters(name_text)

        # Découpe du prix
        price_crop = img.crop(
            (PRICE_BOX[0], top + PRICE_BOX[1], PRICE_BOX[2], top + PRICE_BOX[3])
        )
        price_text = pytesseract.image_to_string(
            price_crop,
            lang="fra",
            config="--psm 7 -c tessedit_char_whitelist=0123456789",
        ).strip()

        if name_text and price_text:
            # Convertir le prix en entier
            try:
                price_value = int(price_text)
                items.append((name_text, price_value))
            except ValueError:
                print(
                    f"Impossible de convertir le prix '{price_text}' pour l'item '{name_text}'"
                )

    return items


def replace_special_characters(text):
    return (
        text.replace("’", "'")
        .replace(" IT", " II")
        .replace(" IIT", " III")
        .replace("\n", " ")
        .replace("Mélée", "Mêlée")
        .replace("ÿ", "g")
        .replace("Cyelothymie", "Cyclothymie")
        .replace("Grochets aquatiques", "Crochets aquatiques")
        .replace("Glepsydre", "Clepsydre")
        .replace("îf", "if")
        .replace("!@#dh\"-", "!@#dh`~")
        .replace("''", "'")
        .replace("1os Muertos", "los Muertos")
        .replace("Kwakwaife", "Kwakwaffe")
        .replace("Fuissante Ceinture", "Puissante Ceinture")
        .replace("Fraggment", "Fragment")
        .replace("Fragment de clet", "Fragment de clef")
        .replace("brêche", "brèche")
        .replace("N.L.O", "N.I.O")
        .replace("Chêne Moi", "Chêne Mou")
    )


def update_items_json(items_data):
    # Charger le JSON existant
    try:
        with open(JSON_PATH, "r", encoding="utf-8") as f:
            items_json = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        items_json = {}
        print("Fichier JSON non trouvé ou corrompu. Création d'un nouveau fichier.")

    # Créer un dictionnaire normalisé des clés existantes pour faciliter la recherche
    normalized_keys = {
        replace_special_characters(key): key for key in items_json.keys()
    }

    processed_names = set()
    unique_items = []
    for name, price in items_data:
        normalized_name = replace_special_characters(name)
        if normalized_name not in processed_names:
            processed_names.add(normalized_name)
            unique_items.append((name, price))
        else:
            print(f"Item ignoré (doublon): {name} - {price}")

    # Traitement de chaque item unique détecté
    for name, price in unique_items:
        # Normaliser le nom pour la recherche
        normalized_name = replace_special_characters(name)

        # Vérifier si l'item existe déjà (en utilisant le nom normalisé)
        if normalized_name in normalized_keys:
            # Utiliser la clé originale du JSON
            original_key = normalized_keys[normalized_name]

            # L'item existe déjà, vérifier si nous avons déjà un prix pour cette date
            if "price" not in items_json[original_key]:
                items_json[original_key]["price"] = []

            # Vérifier si un prix existe déjà pour cette date
            date_exists = any(
                entry.get("date") == DATE_CAPTURE
                for entry in items_json[original_key]["price"]
            )

            if date_exists:
                print(f"Prix ignoré pour {original_key}: un prix existe déjà pour la date {DATE_CAPTURE}")
            else:
                # Ajouter le nouveau prix avec la date
                items_json[original_key]["price"].append(
                    {"date": DATE_CAPTURE, "value": price}
                )
                print(f"Prix ajouté pour {original_key}: {price} à la date {DATE_CAPTURE}")
        else:
            # Nouvel item, créer une nouvelle entrée
            items_json[name] = {
                "type": "unknown",  # Type par défaut
                "price": [{"date": DATE_CAPTURE, "value": price}],
            }
            print(f"Nouvel item ajouté: {name} - {price}")

    # Sauvegarder le JSON mis à jour
    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(items_json, f, ensure_ascii=False, indent=4)

    print(f"Fichier JSON mis à jour: {JSON_PATH}")


def get_image_files(directory):
    """Récupère toutes les images dans le répertoire spécifié."""
    image_files = []

    if not os.path.exists(directory):
        print(f"Le répertoire '{directory}' n'existe pas.")
        return image_files

    for filename in os.listdir(directory):
        file_path = os.path.join(directory, filename)
        if os.path.isfile(file_path):
            _, extension = os.path.splitext(filename)
            if extension.lower() in SUPPORTED_EXTENSIONS:
                image_files.append(file_path)

    return image_files


def archive_images(image_files):
    """Déplace les images traitées vers le répertoire d'archives avec la date en cours."""
    # Créer le répertoire d'archives s'il n'existe pas
    if not os.path.exists(ARCHIVES_DIR):
        os.makedirs(ARCHIVES_DIR)
        print(f"Répertoire d'archives créé: {ARCHIVES_DIR}")

    # Créer le répertoire de date s'il n'existe pas
    date_dir = os.path.join(ARCHIVES_DIR, DATE_CAPTURE)
    if not os.path.exists(date_dir):
        os.makedirs(date_dir)
        print(f"Répertoire de date créé: {date_dir}")

    # Déplacer chaque image vers le répertoire d'archives
    for image_path in image_files:
        try:
            # Obtenir le nom du fichier sans le chemin
            filename = os.path.basename(image_path)
            # Créer le chemin de destination
            destination = os.path.join(date_dir, filename)
            # Déplacer le fichier
            shutil.move(image_path, destination)
            print(f"Image déplacée: {image_path} -> {destination}")
        except Exception as e:
            print(f"Erreur lors du déplacement de l'image {image_path}: {e}")

    return len(image_files)

def demander_confirmation_date(date_capture):
    """
    Demande à l'utilisateur de confirmer la date de capture.
    Si la date n'est pas confirmée, l'utilisateur peut en saisir une nouvelle.
    Retourne la date confirmée ou modifiée (au format YYYY-MM-DD).
    """
    print(f"Date de capture actuelle : {date_capture}")
    confirmation = input("Confirmez-vous cette date ? (o/n) : ").strip().lower()
    if confirmation == "o":
        return date_capture
    else:
        while True:
            nouvelle_date = input("Entrez la date de capture souhaitée (YYYY-MM-DD) : ").strip()
            # Vérification simple du format
            if re.match(r"^\d{4}-\d{2}-\d{2}$", nouvelle_date):
                return nouvelle_date
            else:
                print("Format invalide. Veuillez entrer la date au format YYYY-MM-DD.")


def main():
    global DATE_CAPTURE
    # Demander confirmation ou modification de la date
    DATE_CAPTURE = demander_confirmation_date(DATE_CAPTURE)

    # Récupérer toutes les images du répertoire HDV
    image_files = get_image_files(HDV_DIR)

    if not image_files:
        print(f"Aucune image trouvée dans le répertoire '{HDV_DIR}'.")
        return
    
    total_images = len(image_files)
    print(f"{total_images} images trouvées dans le répertoire '{HDV_DIR}'.")

    # Liste pour stocker tous les items détectés
    all_items = []

    # Traiter chaque image
    for index, image_path in enumerate(image_files, 1):
        print(f"\nTraitement de l'image: {image_path} ({index}/{total_images})")
        items_data = extract_items(image_path)


        if items_data:
            print(f"{len(items_data)} items détectés dans cette image:")
            for i, (nom, prix) in enumerate(items_data, 1):
                print(f"{i}. {prix} - {nom}")

            # Ajouter les items à la liste complète
            all_items.extend(items_data)
        else:
            print("Aucun item détecté dans cette image.")

    # Mettre à jour le fichier JSON avec tous les items détectés
    if all_items:
        print(f"\nAu total, {len(all_items)} items détectés dans toutes les images.")
        update_items_json(all_items)
    else:
        print("Aucun item détecté dans toutes les images.")

    # Archiver les images traitées
    if image_files:
        nb_archived = archive_images(image_files)
        print(
            f"\n{nb_archived} images archivées dans {os.path.join(ARCHIVES_DIR, DATE_CAPTURE)}"
        )


if __name__ == "__main__":
    main()
