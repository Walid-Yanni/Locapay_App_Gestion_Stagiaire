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

login() { # $1 = e-mail, $2 = mot de passe (défaut $PASS) -> "jeton|idUtilisateur"
  curl -s -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"${2:-$PASS}\"}" 2>/dev/null \
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

echo; echo "4. Changement de mot de passe obligatoire"
# Crée un stagiaire de test (e-mail horodaté) : il reste en base après l'exécution.
MDP_EMAIL="test.mdp.$(date +%s)@stagiaire.locapay.bj"
TEMP_PASS=$(curl -s -X POST "$BASE/api/stagiaires" -H "Authorization: Bearer $T_RH" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$MDP_EMAIL\",\"firstName\":\"Test\",\"lastName\":\"Motdepasse\",\"tutorId\":\"$U_TU\",\"school\":\"Test\",\"fieldOfStudy\":\"Test\",\"level\":\"L3\",\"startDate\":\"2026-10-01T00:00:00.000Z\",\"endDate\":\"2026-12-31T00:00:00.000Z\",\"typeStage\":\"INITIATION\",\"subject\":\"Test securite\",\"service\":\"Test\"}" \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['temporaryPassword'])" 2>/dev/null)
if [ -n "$TEMP_PASS" ]; then
  MUST=$(curl -s -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' -d "{\"email\":\"$MDP_EMAIL\",\"password\":\"$TEMP_PASS\"}" \
    | python3 -c "import sys,json;print(json.load(sys.stdin)['user'].get('mustChangePassword'))" 2>/dev/null)
  check "la connexion signale mustChangePassword" "$MUST" "True"
  IFS='|' read -r T_MDP U_MDP <<< "$(login "$MDP_EMAIL" "$TEMP_PASS")"
  NEW_PASS="Nouveau-mot-de-passe-$(date +%s)"
  check "GET /api/activities bloqué tant que le mot de passe n'est pas changé" "$(code "$BASE/api/activities" -H "Authorization: Bearer $T_MDP")" "403"
  # Corps JSON construits dans des variables : avec le bash 3.2 de macOS, un JSON contenant une virgule
  # placé dans "$(...)" en argument subit l'expansion d'accolades et part en plusieurs requêtes invalides.
  BODY_BAD="{\"currentPassword\":\"mauvais-mot-de-passe\",\"newPassword\":\"$NEW_PASS\"}"
  BODY_SHORT="{\"currentPassword\":\"$TEMP_PASS\",\"newPassword\":\"court\"}"
  BODY_OK="{\"currentPassword\":\"$TEMP_PASS\",\"newPassword\":\"$NEW_PASS\"}"
  check "change-password avec un mauvais ancien mot de passe" "$(code -X POST "$BASE/api/auth/change-password" -H "Authorization: Bearer $T_MDP" -H 'Content-Type: application/json' -d "$BODY_BAD")" "400"
  check "change-password avec un nouveau mot de passe trop court" "$(code -X POST "$BASE/api/auth/change-password" -H "Authorization: Bearer $T_MDP" -H 'Content-Type: application/json' -d "$BODY_SHORT")" "400"
  check "change-password valide" "$(code -X POST "$BASE/api/auth/change-password" -H "Authorization: Bearer $T_MDP" -H 'Content-Type: application/json' -d "$BODY_OK")" "200"
  check "GET /api/activities autorisé après le changement (même jeton)" "$(code "$BASE/api/activities" -H "Authorization: Bearer $T_MDP")" "200"
else
  check "création du stagiaire de test par la RH" "échec" "mot de passe temporaire reçu"
fi

echo; echo "5. Liste des tuteurs (réservée aux RH)"
check "GET /api/users/tutors sans authentification" "$(code "$BASE/api/users/tutors")" "401"
check "GET /api/users/tutors par un tuteur" "$(code "$BASE/api/users/tutors" -H "Authorization: Bearer $T_TU")" "403"
check "GET /api/users/tutors par un stagiaire" "$(code "$BASE/api/users/tutors" -H "Authorization: Bearer $T_ST")" "403"
check "GET /api/users/tutors par la RH" "$(code "$BASE/api/users/tutors" -H "Authorization: Bearer $T_RH")" "200"
CHAMPS=$(get "$T_RH" /api/users/tutors | python3 -c "import sys,json;d=json.load(sys.stdin);print('oui' if d and all(set(t)=={'id','firstName','lastName'} for t in d) else 'non')" 2>/dev/null)
check "réponse limitée à id, prénom, nom (ni mot de passe ni e-mail)" "$CHAMPS" "oui"

echo; [ "$FAIL" = "0" ] && echo "RÉSULTAT : tout est conforme." || echo "RÉSULTAT : au moins un contrôle a échoué, ne passe pas à la suite."
rm -rf "$TMP"; exit $FAIL
