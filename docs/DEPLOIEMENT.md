# Déploiement sur le VPS de LOCAPAY

Trois conteneurs : `db` (PostgreSQL, jamais exposé), `api` (jamais exposée), `web` (nginx : site + relais de `/api`).
Seul `web` écoute, sur `127.0.0.1:8080` de la machine ; le reverse proxy du VPS (TLS) pointe dessus.

## Prérequis sur le VPS
- Docker et le plugin Compose (`docker compose version`).
- Un nom de domaine pointant vers le VPS, et un certificat TLS (Let's Encrypt).
- Au moins 2 Go de RAM (Chromium génère les PDF).

## 1. Récupérer le code
```bash
git clone https://github.com/Walid-Yanni/Locapay_App_Gestion_Stagiaire.git
cd Locapay_App_Gestion_Stagiaire
```

## 2. Configurer les secrets
```bash
cp .env.production.example .env.production
chmod 600 .env.production
# Remplir chaque valeur ; pour chaque secret :  openssl rand -hex 32
```
`JWT_SECRET` et `JWT_REFRESH_SECRET` doivent être différents. `WEB_ORIGIN` est l'adresse publique exacte
(`https://…`, sans `/` final). Ce fichier ne doit jamais être commité ni envoyé par message.

## 3. Construire et démarrer
```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml ps
curl -s http://127.0.0.1:8080/health     # {"status":"ok","service":"locapay-api"}
```
Les migrations sont appliquées automatiquement au démarrage de l'API (`prisma migrate deploy`, sans suppression de données).
**Ne jamais lancer le seed en production** : il vide la base (il refuse d'ailleurs toute base non locale).

## 4. Créer le premier compte administrateur RH
```bash
C="docker compose --env-file .env.production -f docker-compose.prod.yml exec -e NODE_PATH=/app/apps/api/node_modules api"
$C ./node_modules/.bin/tsx ../../scripts/creer-admin-initial.ts --email rh@exemple.bj --prenom Prénom --nom Nom
# Simulation d'abord ; si tout est correct, ajouter --confirmer.
```
Le mot de passe temporaire s'affiche une seule fois : le transmettre en main propre. Il doit être changé à la première connexion.
Ensuite, les autres comptes se créent depuis l'application (écran Stagiaires).

## 5. Reverse proxy du VPS (exemple nginx, TLS)
```nginx
server {
    listen 443 ssl http2;
    server_name stagiaires.exemple.bj;
    # ssl_certificate / ssl_certificate_key : voir certbot
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
server { listen 80; server_name stagiaires.exemple.bj; return 301 https://$host$request_uri; }
```
Avec ce proxy devant le conteneur `web`, `TRUST_PROXY=2` (déjà dans l'exemple) pour que le limiteur de
tentatives voie la vraie adresse IP des clients.

## 6. Sauvegardes (obligatoire)
```bash
mkdir -p ~/backups
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T db \
  pg_dump -U locapay locapay_stagiaires > ~/backups/locapay-$(date +%F_%H%M%S).sql
```
À planifier chaque nuit (cron) avec rotation, et à copier hors du VPS. **Tester une restauration** avant la mise en service :
```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T db \
  psql -U locapay -d locapay_stagiaires < ~/backups/<fichier>.sql   # sur une base vide de test
```

## 7. Mettre à jour
```bash
git pull
# Sauvegarde (étape 6), puis :
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

## Vérifications après déploiement
- Connexion avec le compte administrateur, changement du mot de passe temporaire.
- `https://…/api/docs` doit répondre 404 (documentation fermée en production).
- Huit mauvaises connexions successives sur une même adresse e-mail : la neuvième tentative reçoit une réponse 429.
- Génération d'un PDF de rapport (Chromium).
- Journal du conteneur API : `docker compose … logs api` (le job de fin de cycle tourne à 02:00 heure du Bénin).
