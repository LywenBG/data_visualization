#!/usr/bin/env python3
"""Reconstruction lisible du pipeline Borderless à partir des CSV Kaggle.

Aucune dépendance externe (bibliothèque standard Python 3).
Ce script n'écrit JAMAIS dans data/borderless-fixed.json : c'est le fichier
utilisé par le site existant et l'utilisateur a demandé de le conserver.

Utilisation :
    python3 scripts/prepare_data.py
    python3 scripts/prepare_data.py --check

Le CSV comporte des variations de casse dans certains codes IATA, par
exemple la route JED -> tas (ligne 32459). La normalisation en majuscules
permet de retrouver JED -> TAS et de reconstruire fidèlement le JSON du site.
"""
from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
OUT = ROOT / "data" / "processed" / "borderless-rebuilt.json"
ACTIVE = ROOT / "data" / "borderless-fixed.json"

PASS = RAW / "02_passeports_visas"
ROUTE = RAW / "03_routes_ducling"
EXT = RAW / "01_airports_openflights"

# Correspondance exacte entre les catégories du CSV et celles de l'application.
VISA_TYPES = {
    "visa_free_access": "free",
    "visa_on_arrival": "arrival",
    "electronic_travel_authorisation": "eta",
    "visa_online": "evisa",
    "visa_required": "required",
}


def csv_rows(path: Path):
    """CSV avec en-têtes, suppression du BOM si présent et gestion correcte des guillemets."""
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        yield from csv.DictReader(handle)


def normalize_code(value: str | None) -> str:
    """Normaliser les codes ISO2 et IATA sans inventer de correspondance."""
    return (value or "").strip().upper()


def visa_matrix_and_rankings():
    """Jointure logique : pays émetteur + pays de destination = type de visa."""
    countries = {
        normalize_code(row["country_code"]): row
        for row in csv_rows(PASS / "countries.csv")
    }
    matrix: dict[str, dict[str, str]] = {}
    invalid_visas = []
    visa_rows = 0
    for row in csv_rows(PASS / "visa_requirements.csv"):
        visa_rows += 1
        passport = normalize_code(row["from_country_code"])
        destination = normalize_code(row["to_country_code"])
        raw_type = row["requirement_type"].strip().lower()
        if passport not in countries or destination not in countries:
            invalid_visas.append((passport, destination, "country_code absent du référentiel"))
            continue
        if raw_type not in VISA_TYPES:
            invalid_visas.append((passport, destination, "catégorie inconnue : " + raw_type))
            continue
        # Cas spécial : pays du passeport = destination. Le statut est « own ».
        kind = "own" if passport == destination else VISA_TYPES[raw_type]
        matrix.setdefault(passport, {})[destination] = kind

    history = []
    for row in csv_rows(PASS / "passport_rankings.csv"):
        passport = normalize_code(row["country_code"])
        if passport not in countries:
            raise ValueError(f"Classement avec pays absent du référentiel : {passport}")
        history.append({
            "passport": passport,
            "year": int(row["year"]),
            "score": int(row["visa_free_count"]),
            "rank": int(row["rank"]),
        })
    return matrix, history, {
        "visaRows": visa_rows,
        "countriesReference": len(countries),
        "rankingRows": len(history),
        "visaInvalidRows": len(invalid_visas),
        "visaInvalidExamples": invalid_visas[:5],
    }


def airport_reference():
    """IATA -> pays ISO2 + longitude/latitude : c'est la clé des deux jointures.

    La source « ducling » fournit déjà un code pays ISO2 et les coordonnées.
    OpenFlights extended est conservé dans data/raw pour la traçabilité et pour
    effectuer un contrôle croisé. On ne remplace pas les champs de ducling par
    ceux d'OpenFlights : cela modifierait les données de l'application.
    """
    airports = {}
    raw_count = 0
    ignored = 0
    for row in csv_rows(ROUTE / "airports.csv"):
        raw_count += 1
        iata = normalize_code(row["iata"])
        country = normalize_code(row["country"])
        try:
            coordinate = [float(row["longitude"]), float(row["latitude"])]
        except (ValueError, TypeError):
            ignored += 1
            continue
        if len(iata) != 3 or len(country) != 2:
            ignored += 1
            continue
        airports[iata] = {"country": country, "coord": coordinate}

    # Lecture du troisième jeu de données pour comparer les codes IATA partagés.
    # Il ne remplace pas la source principale ; les noms de pays y sont en texte.
    extended_iata = set()
    with (EXT / "airports-extended.csv").open("r", encoding="utf-8-sig", newline="") as handle:
        for row in csv.reader(handle):
            if len(row) > 4:
                code = normalize_code(row[4])
                if len(code) == 3 and code != "\\N":
                    extended_iata.add(code)

    info = {
        "airportsRows": raw_count,
        "airportsKept": len(airports),
        "airportsIgnored": ignored,
        "extendedIataCount": len(extended_iata),
        "sharedIataCount": len(set(airports) & extended_iata),
    }
    return airports, info


def routes_join_and_deduplicate(airports):
    """Deux jointures IATA, filtre international, groupement (dep, arr).

    Deux compagnies sur CDG -> JFK comptent pour une liaison aéroportuaire
    distincte dans le graphique, mais « rows » garde le nombre de lignes.
    Le sens est conservé : CDG -> JFK != JFK -> CDG.
    """
    by_pair: dict[tuple[str, str], dict] = {}
    counts = Counter()
    for row in csv_rows(ROUTE / "routes.csv"):
        counts["raw"] += 1
        source_iata = normalize_code(row["dep"])
        target_iata = normalize_code(row["arr"])
        source_airport = airports.get(source_iata)
        target_airport = airports.get(target_iata)
        if source_airport is None or target_airport is None:
            counts["unmapped"] += 1
            continue
        source_country = source_airport["country"]
        target_country = target_airport["country"]
        if source_country == target_country:
            counts["domestic"] += 1
            continue
        counts["international_rows"] += 1
        key = (source_iata, target_iata)
        if key in by_pair:
            by_pair[key]["rows"] += 1
            counts["duplicate_rows"] += 1
        else:
            by_pair[key] = {
                "year": None,  # Il n'y a PAS de colonne d'année dans routes.csv.
                "from": source_country,
                "to": target_country,
                "src": source_iata,
                "dst": target_iata,
                "sourceCoord": source_airport["coord"],
                "targetCoord": target_airport["coord"],
                "rows": 1,
            }

    counts["unique_pairs"] = len(by_pair)
    # Contrôle de cohérence : chaque enregistrement brut a un statut unique.
    assert counts["raw"] == counts["unmapped"] + counts["domestic"] + counts["international_rows"]
    assert counts["international_rows"] == counts["unique_pairs"] + counts["duplicate_rows"]
    return list(by_pair.values()), dict(counts)


def build_dataset():
    matrix, history, visa_info = visa_matrix_and_rankings()
    airports, airport_info = airport_reference()
    routes, route_info = routes_join_and_deduplicate(airports)
    years = sorted({row["year"] for row in history})
    payload = {
        "visaYear": years[-1] if years else None,
        "matrix": matrix,
        "history": history,
        "routes": routes,
        "meta": {
            "visa": "Kaggle · exigences de visa (2026)",
            "routes": "Kaggle ducling · routes sans année documentée",
            "history": "Kaggle · classement des passeports, 2026 seulement",
        },
        "coverage": {
            "visaRows": visa_info["visaRows"],
            "countries": len(matrix),
            "rankingRows": len(history),
            "routesRows": route_info["raw"],
            "routesPairs": len(routes),
            "routesUnmapped": route_info["unmapped"],
            "domesticExcluded": route_info["domestic"],
            "historyYears": years,
            "routeYears": [],
        },
    }
    info = {"visa": visa_info, "airports": airport_info, "routes": route_info}
    return payload, info


def compare_with_live(rebuilt: dict):
    """Vérifie les contenus indépendamment de l'ordre et isole les écarts."""
    current = json.loads(ACTIVE.read_text(encoding="utf-8"))
    matrix_equal = rebuilt["matrix"] == current["matrix"]
    rankings_equal = rebuilt["history"] == current["history"]
    rebuilt_routes = {(r["src"], r["dst"]): r for r in rebuilt["routes"]}
    existing_routes = {(r["src"], r["dst"]): r for r in current["routes"]}
    only_in_existing = sorted(set(existing_routes) - set(rebuilt_routes))
    only_in_rebuilt = sorted(set(rebuilt_routes) - set(existing_routes))
    differences = sorted(k for k in set(existing_routes) & set(rebuilt_routes) if existing_routes[k] != rebuilt_routes[k])

    print("\nCOMPARAISON AVEC LE JSON ACTUEL DU SITE (conservé inchangé)")
    print(f"  Matrice visas identique : {matrix_equal}")
    print(f"  Classements identiques : {rankings_equal}")
    print(f"  Routes communes avec valeurs différentes : {len(differences)}")
    print(f"  Routes présentes seulement dans l'application : {only_in_existing}")
    print(f"  Routes présentes seulement dans la reconstruction : {only_in_rebuilt}")
    identical = (rebuilt == current)
    print(f"  JSON identique après reconstruction : {identical}")
    if not identical:
        print("  ATTENTION : la reconstruction diffère du JSON actuel. Vérifiez les sources.")
    return identical


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="contrôler les données et la correspondance avec le site")
    args = parser.parse_args()
    dataset, info = build_dataset()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(dataset, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"JSON reconstruit depuis les CSV : {OUT.relative_to(ROOT)}")
    print("\nBILAN DU TRAITEMENT")
    print(f"  Exigences de visa : {info['visa']['visaRows']:,} lignes, {len(dataset['matrix'])} passeports")
    print(f"  Classements : {len(dataset['history'])} lignes ({dataset['visaYear']})")
    print(f"  Aéroports ducling exploitables : {info['airports']['airportsKept']:,}")
    print(f"  Codes IATA présents aussi dans OpenFlights : {info['airports']['sharedIataCount']:,}")
    r=info["routes"]
    print(f"  Routes brutes : {r['raw']:,}")
    print(f"  Routes sans association à deux aéroports valides : {r['unmapped']:,}")
    print(f"  Routes domestiques exclues : {r['domestic']:,}")
    print(f"  Routes internationales avant suppression des doublons : {r['international_rows']:,}")
    print(f"  Doublons regroupés : {r['duplicate_rows']:,}")
    print(f"  Routes internationales orientées uniques : {r['unique_pairs']:,}")

    expected = compare_with_live(dataset)
    if args.check:
        assert info["visa"]["visaRows"] == 45173
        assert len(dataset["history"]) == 199
        assert r["raw"] == 33322
        assert r["domestic"] == 16417
        assert r["unmapped"] == 2439
        assert r["unique_pairs"] == 11731
        assert expected, "Un écart supplémentaire, non documenté, a été détecté."
        print("\nVÉRIFICATION RÉUSSIE : le JSON a été reconstruit à l’identique.")


if __name__ == "__main__":
    main()
