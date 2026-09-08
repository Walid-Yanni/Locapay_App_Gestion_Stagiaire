# LOCAPAY — Gestion des Stagiaires

Application monorepo complète conforme au **Guide de mise en place** et au **Cahier des charges v3.1** : API REST Express/Prisma, frontend React/Vite, application mobile Expo (React Native) et types partagés `@locapay/shared-types`.

---

## 1. Prérequis

- **Node.js** : 20 LTS ou supérieur
- **pnpm** : 9 ou supérieur
- **PostgreSQL** : 15+ ou **Docker / Docker Compose**
- **Git**

---

## 2. Structure du Monorepo

```text
locapay-stagiaires/
├── apps/
│   ├── api/             # Backend Express + Prisma + Puppeteer + Swagger
│   ├── web/             # Frontend React 18 + Vite + Tokens du prototype
│   └── mobile/          # Application mobile Expo / React Native
├── packages/
│   └── shared-types/    # Types partagés (User, Stagiaire, Activity, Evaluation, Report, Notification, Skill, Document)
├── prisma/
│   ├── schema.prisma    # Schéma unique de données PostgreSQL
│   └── seed.ts          # Données de test (6 stagiaires, tuteur, RH, admin, activités, évaluations)
├── docker-compose.yml   # PostgreSQL (5432) + Redis (6379)
├── pnpm-workspace.yaml
└── package.json
```

---

## 3. Installation & Démarrage

### 3.1 Cloner et installer les dépendances
```bash
pnpm install
```

### 3.2 Configurer les variables d'environnement
```bash
cp .env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

### 3.3 Démarrer la base de données & Initialiser Prisma
```bash
# Lancement de PostgreSQL et Redis
docker compose up -d

# Application des migrations Prisma & génération du client typé
pnpm --filter @locapay/api prisma:generate
pnpm --filter @locapay/api prisma:migrate -- --name init

# Peuplement de la base avec les 6 stagiaires et données de test
pnpm seed
```

> **Comptes de test** (mot de passe : `Locapay2026!`) :
> - Admin RH : `admin.rh@locapay.bj`
> - Responsable RH : `responsable.rh@locapay.bj`
> - Tuteur : `w.sacca@locapay.bj`
> - Stagiaire : `aicha.boni@stagiaire.locapay.bj`

---

## 4. Commandes de Développement

```bash
# Lancer l'API backend et le Web en parallèle
pnpm dev

# Ou lancer chaque projet individuellement :
pnpm dev:api       # API sur http://localhost:4000
pnpm dev:web       # Web sur http://localhost:5173
pnpm dev:mobile    # Expo mobile

# Vérification des types TypeScript sur tout le monorepo
pnpm typecheck

# Build de production
pnpm build
```

---

## 5. Fonctionnalités et Points d'Accès

- **API Health Check** : `GET http://localhost:4000/health`
- **Documentation OpenAPI / Swagger** : `http://localhost:4000/api/docs`
- **Génération de rapports PDF (Puppeteer)** : `GET /api/reports/:id/pdf`
- **Automatisation fin de cycle** : Job cron quotidien planifié à 02h00 pour clôturer les stages échus et générer les rapports finaux.
- **Application Web** :
  - Connexion avec sélecteur de rôles (`ADMIN_RH`, `RESPONSABLE_RH`, `TUTEUR`, `STAGIAIRE`)
  - Navigation dynamique conditionnée aux droits (`NAV_BY_ROLE`)
  - Composants transversaux réutilisables : `Sidebar`, `Topbar`, `KpiCard`, `DataTable`, `Badge`
  - Gestion complète : Stagiaires, Journal d'activités avec validation, Évaluations multi-critères, Rapports avec signature et téléchargement PDF, Notifications internes
- **Application Mobile** :
  - Journal d'activités avec saisie rapide en mobilité
  - Filtrage par catégorie et suivi des heures validées
