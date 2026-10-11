# LOCAPAY — Gestion des Stagiaires : contexte pour les assistants IA

> Fichier de contexte unique, lu par Claude Code (`CLAUDE.md`), et référencé par `AGENTS.md`
> et `.github/copilot-instructions.md` pour les autres outils. **Source de vérité du comportement
> attendu : le Cahier des charges v3.1.** En cas de doute entre ce fichier et le code, le code
> fait foi : vérifie avant d'affirmer, puis signale l'écart au mainteneur.

## 1. Le projet en 30 secondes

LOCAPAY est une proptech béninoise (Cotonou). Cette application sert à suivre le **cycle de vie complet
d'un stagiaire** : arrivée, suivi quotidien des activités, évaluations, puis **rapport de fin de stage
généré automatiquement** à l'échéance, signé électroniquement.

Quatre rôles (`UserRole`) : `ADMIN_RH`, `RESPONSABLE_RH`, `TUTEUR`, `STAGIAIRE`.
Cycle : la RH crée le dossier et assigne un tuteur → le stagiaire saisit ses activités chaque jour →
le tuteur valide ou rejette → entretiens périodiques (J+7, J+30, mi-parcours, fin) → à la date de fin,
un job génère le rapport final → signatures → archivage et analytics.

## 2. Comment travailler avec le mainteneur (important)

- Il apprend en faisant : **explique en deux ou trois phrases ce que tu vas faire avant de le faire**,
  puis exécute, puis dis ce que tu as changé et comment le vérifier.
- Reste **strictement dans le périmètre demandé**. Pas de refactor, renommage, mise à jour de
  dépendance ou reformatage hors sujet. Si une consigne est ambiguë, **pose la question** au lieu de supposer.
- Petits changements, relisibles. Ne présente jamais comme « terminé » ce que tu n'as pas exécuté :
  lance `pnpm typecheck` et `pnpm build` et rapporte le résultat réel.
- Langue : français (UI, commentaires, messages de commit). Identifiants de code en anglais, comme existant.
- Aucun emoji dans l'interface.

## 3. Stack et structure

Monorepo **pnpm** (Node >= 20, pnpm 9.15.4) :

```
apps/api            Express 4 + TypeScript + Prisma 6 + PostgreSQL, JWT, Zod, Puppeteer, node-cron, Swagger
apps/web            React 19 + Vite 6 + TypeScript, lucide-react, recharts
apps/mobile         Expo / React Native (un seul App.tsx : journal d'activités)
packages/shared-types   Types partagés (@locapay/shared-types) : User, Stagiaire, Activity, Evaluation, Report...
prisma/             schema.prisma (schéma unique) + seed.ts
docker-compose.yml  PostgreSQL 16 + Redis 7
```

## 4. Commandes

```bash
pnpm install
cp .env.example apps/api/.env && cp apps/web/.env.example apps/web/.env
docker compose up -d
pnpm --filter @locapay/api prisma:generate
pnpm --filter @locapay/api prisma:migrate -- --name <nom>
pnpm seed
pnpm dev                 # API :4000 + web :5173   (dev:api / dev:web / dev:mobile séparément)
pnpm typecheck           # tout le monorepo
pnpm build
```

Points d'accès : `GET /health`, Swagger sur `/api/docs`, PDF d'un rapport sur `GET /api/reports/:id/pdf`.

**Pièges connus (vérifiés) :**
1. `apps/web` importe `@locapay/shared-types` depuis son `dist/`. Sans build préalable, le typecheck du web
   échoue avec « Cannot find module '@locapay/shared-types' » : lancer d'abord
   `pnpm --filter @locapay/shared-types build`.
2. `docker-compose.yml` publie PostgreSQL sur le port **5433**, alors que `.env.example` pointe sur **5432**.
   À aligner (l'un ou l'autre) avant de diagnostiquer une erreur de connexion.
3. `apps/web/src/main.tsx` est volumineux (la plupart des vues y vivent). Extrais les vues en composants
   **une à la fois**, sur demande, jamais en masse.

Variables d'environnement : `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PORT`, `WEB_ORIGIN`,
`VITE_API_URL`. Comptes de démonstration (dev uniquement, mot de passe `Locapay2026!`) :
`admin.rh@locapay.bj`, `responsable.rh@locapay.bj`, `w.sacca@locapay.bj` (tuteur), un compte stagiaire (voir `prisma/seed.ts`).

## 5. Architecture de l'API (à respecter)

- Couches strictes : `routes/` (URL + `requireAuth(roles)` + validation) → `controllers/` (lit la requête,
  prépare la réponse) → `services/` (logique métier + Prisma). Un service ne connaît pas Express.
- Imports ESM avec extension `.js` (`import { prisma } from "../lib/prisma.js"`).
- Validation d'entrée avec **Zod** dans `schemas/`, appliquée par `middlewares/validate.middleware.ts`.
- `requireAuth(rolesAutorises?)` décode le JWT et pose `req.user = { sub: userId, role }`
  (type `AuthenticatedRequest`). Mots de passe hachés avec bcrypt.
- Job de fin de cycle : `jobs/endOfCycleReports.job.ts`, cron quotidien 02:00, **idempotent**
  (ne génère jamais deux rapports finals pour un stagiaire), bascule le statut du stage sur `TERMINE`.
  Ne casse pas cette idempotence.

## 6. Modèle de données (état réel du schéma)

Enums à utiliser tels quels (ne pas inventer d'autres valeurs) :
- `StageStatus` : `EN_COURS | TERMINE | ANNULE` — `StageType` : `OBLIGATOIRE | INITIATION | PROFESSIONNEL`
- `ActivityStatus` : `BROUILLON | SOUMISE | VALIDEE | REJETEE`
- `ActivityCategory` : `DEVELOPPEMENT | REUNION | FORMATION | RECHERCHE | DOCUMENTATION | AUTRE`
- `ReportType` : `MENSUEL | FINAL` — `ReportStatus` : `BROUILLON | GENERE | SIGNE`

**Écarts connus avec le cahier des charges** (décisions à trancher, ne pas « corriger » sans accord) :
- `Evaluation` : 4 scores fixes (technique, communication, autonomie, ponctualité) au lieu de la grille à
  8 critères (`criteriaJson`), et **pas de champ `type`** (J+7 / J+30 / mi-parcours / fin).
- `Report` : un seul `signedAt`, alors que le cahier prévoit trois signatures (tuteur, RH, stagiaire).
- Types de `ReportType` : `MENSUEL` ici, `MI_PARCOURS` dans le cahier.

## 7. Sécurité — règles non négociables

1. **Le rôle ne suffit pas : vérifier la propriété des données côté serveur.** Dériver la portée de
   `req.user`, jamais d'un paramètre ou d'un corps de requête :
   - `STAGIAIRE` : résoudre son profil via `userId = req.user.sub` et ne voir/créer que ses propres données.
   - `TUTEUR` : uniquement les stagiaires dont `tutorId === req.user.sub`.
   - `ADMIN_RH` / `RESPONSABLE_RH` : accès global.
2. Ne jamais faire confiance à un `stagiaireId` envoyé par le client sans le recouper avec l'appelant.
3. Jamais de secret réel dans le dépôt (`.env` ignoré par Git). Ne pas lire ni afficher le contenu d'un `.env`.
4. Pas de repli silencieux sur un secret par défaut : l'API doit refuser de démarrer sans `JWT_SECRET`
   et `JWT_REFRESH_SECRET`.
5. Les mots de passe ne sont jamais journalisés ni renvoyés après hachage ; un mot de passe temporaire
   n'est montré qu'une seule fois.
6. Les restrictions visibles dans l'interface (menus, boutons) ne remplacent jamais le contrôle serveur.

## 8. Frontend et identité visuelle

- Les données viennent **uniquement de l'API** (`lib/api.ts`, hook `useApiResource`). Aucune donnée simulée.
- Composants existants à réutiliser : `Shell`, `Sidebar`, `Topbar`, `KpiCard`, `DataTable`, `Badge`.
- Responsive obligatoire : tableaux qui deviennent des cartes sous ~760 px (motif `data-label`), menu en tiroir
  sous ~860 px, `prefers-reduced-motion` respecté.
- **Marque** : vert LOCAPAY **`#07C0A1`** (valeur mesurée sur le fichier logo), police **Poppins**,
  vrai logo en `<img>` fixe (jamais redessiné ni régénéré par une IA).
- **Contraste** : `#07C0A1` sur blanc n'atteint que 2,3:1. Pour du **texte** vert, utiliser `#047A66` (5,3:1) ;
  pour du texte sur fond `#07C0A1`, un texte sombre (`#0B1F1A`), pas du blanc.
- Tokens actuels de `styles.css` (hérités du prototype : `--pine: #0f5b45`, Fraunces/Inter) à **migrer
  progressivement** vers la marque ci-dessus, écran par écran. Les nouveaux composants portent leurs styles
  sous une classe racine (ex. `.registre`) pour ne pas fuir sur les autres écrans.
- Direction « carnet de stage » : lignes de registre numérotées (pas de grille de cartes), parcours en perles,
  statuts en « cachets » sans le trio rouge/orange/vert, apparition en cascade, pas d'emojis ni d'icônes génériques
  ajoutées à la volée.

Vocabulaire d'interface (n'altère jamais les enums du backend, c'est une table de correspondance d'affichage) :

| Backend (`ActivityStatus`) | Affichage |
|---|---|
| `VALIDEE` | Visé |
| `SOUMISE` | En attente |
| `REJETEE` | À revoir |
| `BROUILLON` | Brouillon |

## 9. État d'avancement

Fait : monorepo, schéma Prisma, API en couches (stagiaires, activités, évaluations, rapports,
notifications), auth JWT par rôle, job de fin de cycle, PDF Puppeteer, Swagger, front web connecté à l'API,
mobile minimal (journal d'activités).

À faire, par priorité (vérifier dans le code avant de s'y mettre ; état au commit `984f790`, 8 sept. 2026,
aucune de ces corrections n'était encore sur `main`) :
1. **[Sécurité] Portée par utilisateur** sur activités, stagiaires, évaluations, rapports (section 7.1).
   `POST /activities` et `PATCH /activities/:id/review` acceptent aujourd'hui un `stagiaireId` non recoupé.
2. **Signature à trois parties** du rapport (`signedByTutor/RH/Stagiaire` + migration) ; passage à `SIGNE`
   seulement quand les trois sont réunies, chacun ne signant que pour son rôle.
3. **Mot de passe temporaire** généré côté serveur à la création d'un stagiaire (retirer le champ du formulaire) +
   écran de changement de mot de passe à la première connexion.
4. **Fail-fast des secrets JWT** au démarrage (retirer `?? "dev-secret"` dans `auth.service.ts`).
5. Décider du sort de la **grille d'évaluation** (section 6) avant de construire l'interface dessus.
6. Refonte UI : « Registre des stagiaires » (patch fourni : `Registre.tsx`, `Registre.css`, `lib/registre.ts` —
   vérifier s'il est appliqué), puis `StampButton` (appui prolongé, Framer Motion, branché sur
   `PATCH /api/activities/:id/review`), fiche « Carnet de stage », « Suivi du jour », versions mobile.
7. Sidebar : intégrer le logo réel (`apps/web/public/`) ; aligner `docker-compose` / `.env.example` (port DB).
8. Plus tard : SSO LOCAPAY, synchro des employés, stockage S3 des documents, notifications push (FCM).

## 10. Définition de « terminé »

- `pnpm --filter @locapay/shared-types build` puis `pnpm typecheck` et `pnpm build` passent, sorties réelles à l'appui.
- Aucun nouveau secret ni `.env` dans le diff ; aucune nouvelle dépendance sans accord explicite.
- Toute route touchant des données personnelles porte `requireAuth([...])` **et** un filtrage par `req.user`.
- Le changement est expliqué : fichiers modifiés, raison, commande pour le vérifier.