# Instructions pour les agents IA

Lis d'abord **`CLAUDE.md`** à la racine : c'est le contexte complet du projet (stack, commandes, architecture,
sécurité, identité visuelle, backlog). Il fait référence.

Rappels essentiels si tu ne peux lire qu'un paragraphe :
- Reste strictement dans le périmètre demandé ; pose une question si c'est ambigu.
- Explique brièvement ce que tu vas faire avant de le faire ; ne dis « terminé » qu'après avoir exécuté
  `pnpm --filter @locapay/shared-types build`, `pnpm typecheck` et `pnpm build`.
- Sécurité : le rôle ne suffit pas, filtre toujours par `req.user.sub` côté serveur. Jamais de secret dans le dépôt.
- Marque : vert `#07C0A1`, police Poppins, texte vert en `#047A66`, aucun emoji, données réelles via l'API uniquement.