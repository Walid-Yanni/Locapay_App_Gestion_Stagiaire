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
- Garde ce fichier **court et exact** : n'y inscris que ce qui est vérifié dans le code, aucune promesse.

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

Contrôle de sécurité (API démarrée, développement uniquement) :
`STAGIAIRE=<email d'un stagiaire du seed> bash scripts/check-securite.sh`
(ex. `faridath.lawson@stagiaire.locapay.bj`). Sections : 1. sans jeton → 401 ; 2. le stagiaire ne voit
que ses données (liste, fiche, activité et signature d'un autre refusées) ; 3. le tuteur ne voit que ses
stagiaires ; 4. stagiaire de test créé par la RH : format du mot de passe temporaire, `mustChangePassword`,
blocage puis `change-password` ; 5. `GET /api/users/tutors` réservé aux RH, réponse limitée à id/prénom/nom ;
6. aucun `password` / `passwordHash` dans les réponses. Le compte de test de la section 4 est supprimé à la
sortie (même après échec ou Ctrl+C), **seulement si `BASE` est locale** ; sinon il est laissé et signalé.

Nettoyage des comptes de test : `pnpm --filter @locapay/api exec tsx ../../scripts/nettoyer-comptes-test.ts`
vise `test.mdp.*` et `test.dates.*` en `@stagiaire.locapay.bj`. **Simulation par défaut** ; `--email <adresse>`
ne vise que ce compte ; `--confirmer` supprime réellement. Refus si la base de `DATABASE_URL` n'est pas locale
ou si un compte protégé est dans la sélection. Comptes protégés (liste `PROTEGES`) : les 9 du seed et 5 comptes
créés depuis l'interface (`livai0471@gmail.com`, `mougiraibine@gmail.com`, `Stagiaire2@gmail.com`,
`Stagiaire3@gmail.com`, `Stagiairestest@gmail.com`).

**Pièges connus (vérifiés) :**
1. `apps/web` importe `@locapay/shared-types` depuis son `dist/`. Sans build préalable, le typecheck du web
   échoue avec « Cannot find module '@locapay/shared-types' » : lancer d'abord
   `pnpm --filter @locapay/shared-types build`.
2. Base de données : `docker-compose.yml` publie PostgreSQL sur le port **5433** ; `.env.example` et
   `apps/api/.env.example` sont alignés sur 5433. Migration initiale : `prisma/migrations/20261011163209_init`.
3. `apps/web/src/main.tsx` est volumineux (la plupart des vues y vivent). Extrais les vues en composants
   **une à la fois**, sur demande, jamais en masse.

Variables d'environnement : `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PORT`, `WEB_ORIGIN`,
`VITE_API_URL`. Comptes de démonstration (dev uniquement, mot de passe `Locapay2026!`) :
`admin.rh@locapay.bj`, `responsable.rh@locapay.bj`, `w.sacca@locapay.bj` (tuteur), stagiaires en
`@stagiaire.locapay.bj` (voir `prisma/seed.ts`).

## 5. Architecture de l'API (à respecter)

- Couches strictes : `routes/` (URL + `requireAuth(roles)` + validation) → `controllers/` (lit la requête,
  prépare la réponse) → `services/` (logique métier + Prisma). Un service ne connaît pas Express.
- Imports ESM avec extension `.js` (`import { prisma } from "../lib/prisma.js"`).
- Validation d'entrée avec **Zod** dans `schemas/`, appliquée par `middlewares/validate.middleware.ts`.
- `requireAuth(rolesAutorises?, options?)` décode le JWT et pose `req.user = { sub: userId, role }`
  (type `AuthenticatedRequest`). Il **relit l'utilisateur en base à chaque requête** : compte absent ou
  inactif → 401 ; `mustChangePassword` → 403 avec `code: "PASSWORD_CHANGE_REQUIRED"` (sauf
  `allowPendingPasswordChange`, utilisé par `POST /api/auth/change-password`). Mots de passe hachés avec bcrypt.
- Démarrage : `server.ts` refuse de démarrer si `JWT_SECRET` ou `JWT_REFRESH_SECRET` est absent ou fait
  moins de 32 caractères.
- Création de stagiaire : le tuteur doit exister, avoir le rôle `TUTEUR` et être actif (sinon 400) ; date de fin
  postérieure à la date de début (400, issue sur `endDate`) ; e-mail déjà utilisé → 409. Le mot de passe temporaire
  est généré côté serveur (`lib/temporary-password.ts` : 12 caractères, `crypto.randomInt`, alphabet de 57 caractères
  sans `I O l 0 1`), renvoyé une seule fois, et le compte est créé avec `mustChangePassword`.
- `GET /api/users/tutors` : RH uniquement (`ADMIN_RH`, `RESPONSABLE_RH`), tuteurs actifs, champs `id`, `firstName`,
  `lastName` seulement.
- Rapports : `signReport` est atomique (`prisma.$transaction`), chaque rôle ne pose que son indicateur
  (`signedByTutor` / `signedByRH` / `signedByStagiaire`), statut `SIGNE` seulement quand les trois sont réunis.
  Le PDF renvoie 403 si l'accès est refusé, 404 si le rapport n'existe pas.
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
- Types de `ReportType` : `MENSUEL` ici, `MI_PARCOURS` dans le cahier.

## 7. Sécurité — règles non négociables

1. **Le rôle ne suffit pas : vérifier la propriété des données côté serveur.** Dériver la portée de
   `req.user`, jamais d'un paramètre ou d'un corps de requête :
   - `STAGIAIRE` : résoudre son profil via `userId = req.user.sub` et ne voir/créer que ses propres données.
   - `TUTEUR` : uniquement les stagiaires dont `tutorId === req.user.sub`.
   - `ADMIN_RH` / `RESPONSABLE_RH` : accès global.

   En place sur stagiaires, activités, évaluations et rapports ; contrôlé par `scripts/check-securite.sh` (§4).
2. Ne jamais faire confiance à un `stagiaireId` envoyé par le client sans le recouper avec l'appelant.
3. Jamais de secret réel dans le dépôt (`.env` ignoré par Git). Ne pas lire ni afficher le contenu d'un `.env`.
4. Pas de repli silencieux sur un secret par défaut : l'API refuse de démarrer sans `JWT_SECRET`
   et `JWT_REFRESH_SECRET` d'au moins 32 caractères. Ne réintroduis jamais de valeur par défaut.
5. Les mots de passe ne sont jamais journalisés ni renvoyés après hachage ; un mot de passe temporaire
   n'est montré qu'une seule fois. Le client Prisma exclut `User.password` par défaut (`omit` global dans
   `lib/prisma.ts`, relations comprises) ; seuls le login et `changePassword` (`auth.service.ts`) le réactivent
   avec `omit: { password: false }`. Tout nouveau code qui doit lire le hash fait de même, explicitement.
6. Les restrictions visibles dans l'interface (menus, boutons) ne remplacent jamais le contrôle serveur.

## 8. Frontend et identité visuelle

- Les données viennent **uniquement de l'API** (`lib/api.ts`, hook `useApiResource`). Aucune donnée simulée.
  `api()` lève une `ApiError` (`status`, et `issues` pour une 400 de validation Zod) : s'en servir pour afficher
  les erreurs sous le champ concerné.
- Dates de calendrier : `lib/dates.ts` (`todayLocal`, `addMonthsClamped`, `dayToIsoUtc`), format AAAA-MM-JJ, sans
  `new Date(chaîne locale)` (décalage d'un jour).
- `NouveauStagiaireModal` : création de stagiaire (tuteurs via `/api/users/tutors`, dates, niveau, erreurs par champ),
  monté seulement à l'ouverture. `TemporaryPasswordDialog` : affiche le mot de passe temporaire une seule fois
  (copie, piège à focus) ; **le fond ne ferme pas, Échap ne ferme qu'après une copie réussie**, le bouton
  « J'ai transmis le mot de passe » ferme toujours ; le mot de passe n'est gardé que dans l'état React.
- **Design « Carnet RH » : référence dans `DESIGN.md`** (couleurs, typographie, gabarit, écrans).
- Composants existants à réutiliser : `Shell`, `Sidebar`, `PageHeader`, `KpiCard`, `DataTable`, `Badge`,
  `Registre` (`components/Registre.tsx` + `lib/registre.ts`). `Topbar.tsx` est conservé mais n'est plus rendu.
- Responsive obligatoire : tableaux qui deviennent des cartes sous ~700 px (motif `data-label`), menu en tiroir
  sous **900 px**, `prefers-reduced-motion` respecté.
- **Marque** : vert LOCAPAY **`#07C0A1`** (valeur mesurée sur le fichier logo), police **Poppins**,
  vrai logo en `<img>` fixe (jamais redessiné ni régénéré par une IA).
- **Contraste** : `#07C0A1` sur blanc n'atteint que 2,3:1. Pour du **texte** vert, utiliser `#047A66` (5,3:1) ;
  pour du texte sur fond `#07C0A1`, un texte sombre (`#0B1F1A`), pas du blanc.
- Tokens : **`apps/web/src/tokens.css`** (variables `--lp-*`), seule source des couleurs et de la police.
  Les anciennes variables de `styles.css` (`--pine`, `--ink`...) en sont des alias. Poppins seule (plus de
  Fraunces ni d'Inter). Gabarit commun en place : barre latérale sombre, `PageHeader` sur toutes les vues,
  fond tramé de losanges. Les nouveaux composants portent leurs styles sous une classe racine
  (ex. `.registre`) pour ne pas fuir sur les autres écrans.
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

Fait (vérifié au 15 oct. 2026) : monorepo, schéma Prisma et migration initiale, API en couches, auth JWT
par rôle **avec portée par utilisateur** (§7.1), changement de mot de passe obligatoire (API + écran web),
mot de passe temporaire généré côté serveur sans caractères ambigus, hash exclu de toutes les lectures,
secrets JWT validés au démarrage, signature tripartite atomique, job de fin de cycle, PDF Puppeteer, Swagger,
port DB aligné, scripts de contrôle et de nettoyage (§4). Front : gabarit « Carnet RH » (tokens, Poppins,
barre latérale avec logo réel, `PageHeader`, fond tramé, tiroir sous 900 px), Registre des stagiaires,
formulaire de création de stagiaire et dialogue du mot de passe temporaire. Mobile minimal (journal d'activités).

À faire, dans cet ordre (vérifier dans le code avant de s'y mettre) :
1. **Carnet de stage** : fiche stagiaire en double page (DESIGN.md §5).
2. **Suivi du jour** avec cachet à maintenir (`StampButton`, appui long pour viser, branché sur
   `PATCH /api/activities/:id/review`).
3. **[Sécurité] Limitation des tentatives de connexion** (`express-rate-limit`), **obligatoire avant la mise en ligne**.
4. Libellé de la barre latérale selon le rôle (« CARNET RH » ou « CARNET DE STAGE »).
5. Décisions produit en attente : champ « Lieu », absent du modèle (DESIGN.md §8) ; qui saisit les activités
   dans Suivi du jour ; grille d'évaluation (§6).
6. Tests automatisés.
7. Comptes gmail de test (protégés dans `nettoyer-comptes-test.ts`) à trier.
8. Modal de création : un clic sur le fond ferme et perd la saisie (à durcir).
9. Secrets et comptes du seed (mot de passe commun) à remplacer avant la production.
10. Fixer le fuseau du job de fin de cycle (timezone Africa/Porto-Novo dans la planification) avant la production :
    sur un serveur en UTC, 02:00 UTC = 03:00 au Bénin.

Plus tard : versions mobile des écrans
« Carnet RH », SSO LOCAPAY, synchro des employés, stockage S3 des documents, notifications push (FCM).

## 10. Définition de « terminé »

- `pnpm --filter @locapay/shared-types build` puis `pnpm typecheck` et `pnpm build` passent, sorties réelles à l'appui.
- Aucun nouveau secret ni `.env` dans le diff ; aucune nouvelle dépendance sans accord explicite.
- Toute route touchant des données personnelles porte `requireAuth([...])` **et** un filtrage par `req.user`.
- Le changement est expliqué : fichiers modifiés, raison, commande pour le vérifier.