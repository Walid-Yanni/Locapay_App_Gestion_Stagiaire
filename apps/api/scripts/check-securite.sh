#!/usr/bin/env bash
# scripts/check-securite.sh : vérifie la portée par utilisateur de l'API (développement uniquement).
# Usage : STAGIAIRE=prenom.nom@stagiaire.locapay.bj bash scripts/check-securite.sh
# L'API doit tourner (pnpm dev:api). Mot de passe des comptes du seed par défaut : Locapay2026!
BASE="${BASE:-http://localhost:4000}"
PASS="${PASS:-Locapay2026!}"
RH="${RH:-admin.rh@locapay.bj}"
TUTEUR="${TUTEUR:-w.sacca@locapay.bj}"
STAGIAIRE="${STAGIAIRE:?Indique un e-mail de stagiaire, ex. STAGIAIRE=x@stagiaire.locapay.bj bash scripts/check-securite.sh}"
TMP="$(mktemp -d)"; FAIL=0

login() { # $1 = e-mail -> "jeton|idUtilisateur"
  curl -s -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$PASS\"}" 2>/dev/null \
  | python3 -c "import sys,json;d=json.load(sys.stdin);print(d['accessToken']+'|'+d['user']['id'])" 2>/dev/null
}
get()  { curl -s "$BASE$2" -H "Authorization: Bearer $1"; }
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
check() { # $1 libellé, $2 obtenu, $3 attendu
  if [ "$2" = "$3" ]; then echo "  OK      $1"; else echo "  ÉCHEC   $1 (attendu : $3, obtenu : $2)"; FAIL=1; fi
}
skip() { echo "  IGNORÉ  $1"; }

IFS='|' read -r T_RH U_RH <<< "$(login "$RH")"
IFS='|' read -r T_TU U_TU <<< "$(login "$TUTEUR")"
IFS='|' read -r T_ST U_ST <<< "$(login "$STAGIAIRE")"
if [ -z "$T_RH" ] || [ -z "$T_TU" ] || [ -z "$T_ST" ]; then
  echo "Connexion impossible pour au moins un compte : l'API tourne-t-elle sur $BASE ? Les e-mails sont-ils ceux du seed ?"
  exit 1
fi
echo "Comptes utilisés : RH=$RH | tuteur=$TUTEUR | stagiaire=$STAGIAIRE"

get "$T_RH" /api/stagiaires > "$TMP/stag.json"
get "$T_RH" /api/activities > "$TMP/act.json"
get "$T_RH" /api/reports    > "$TMP/rep.json"

echo; echo "1. Sans jeton"
check "GET /api/activities sans authentification" "$(code "$BASE/api/activities")" "401"

echo; echo "2. Le stagiaire ne voit que ses propres données"
N=$(get "$T_ST" /api/activities | python3 -c "import sys,json;d=json.load(sys.stdin);print(len({a['stagiaire']['user']['id'] for a in d}),len(d))")
set -- $N
check "liste d'activités : $2 activité(s), de $1 personne(s) distincte(s)" "$([ "$1" -le 1 ] && echo oui || echo non)" "oui"
[ "$2" = "0" ] && echo "  (ce stagiaire n'a aucune activité : choisis-en un qui en a pour un test significatif)"
OTHER_ST=$(python3 -c "import json;d=json.load(open('$TMP/stag.json'));print(next((s['id'] for s in d if s['userId']!='$U_ST'),''))")
if [ -n "$OTHER_ST" ]; then
  check "GET fiche d'un AUTRE stagiaire" "$(code "$BASE/api/stagiaires/$OTHER_ST" -H "Authorization: Bearer $T_ST")" "404"
  check "POST activité au nom d'un AUTRE stagiaire" "$(code -X POST "$BASE/api/activities" -H "Authorization: Bearer $T_ST" -H 'Content-Type: application/json' \
    -d "{\"stagiaireId\":\"$OTHER_ST\",\"date\":\"2026-10-11T09:00:00.000Z\",\"category\":\"AUTRE\",\"description\":\"Test de securite ne doit pas etre cree\",\"durationMinutes\":30}")" "403"
else skip "aucun autre stagiaire en base"; fi
REP_F=$(python3 -c "import json;d=json.load(open('$TMP/rep.json'));print(next((r['id'] for r in d if r['stagiaire']['userId']!='$U_ST'),''))")
if [ -n "$REP_F" ]; then check "signer le rapport d'un AUTRE stagiaire" "$(code -X PATCH "$BASE/api/reports/$REP_F/sign" -H "Authorization: Bearer $T_ST")" "403"
else skip "aucun rapport appartenant à un autre stagiaire"; fi

echo; echo "3. Le tuteur ne voit que ses stagiaires"
V=$(get "$T_TU" /api/stagiaires | python3 -c "import sys,json;d=json.load(sys.stdin);print('vide' if not d else ('oui' if all(s['tutorId']=='$U_TU' for s in d) else 'non'))")
check "liste de stagiaires limitée aux siens" "$V" "oui"
ACT_F=$(python3 -c "import json;d=json.load(open('$TMP/act.json'));print(next((a['id'] for a in d if a['stagiaire']['tutorId']!='$U_TU'),''))")
if [ -n "$ACT_F" ]; then
  check "valider l'activité d'un stagiaire d'un AUTRE tuteur" "$(code -X PATCH "$BASE/api/activities/$ACT_F/review" -H "Authorization: Bearer $T_TU" -H 'Content-Type: application/json' -d '{"status":"VALIDEE"}')" "403"
else skip "aucune activité d'un autre tuteur en base"; fi

echo; [ "$FAIL" = "0" ] && echo "RÉSULTAT : tout est conforme." || echo "RÉSULTAT : au moins un contrôle a échoué, ne passe pas à la suite."
rm -rf "$TMP"; exit $FAIL