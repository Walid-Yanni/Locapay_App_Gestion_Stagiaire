# DESIGN.md — LOCAPAY « Carnet RH »

Référence de design de l'application. Source : trois maquettes Framer
(`design/maquettes/registre`, `carnet`, `suivi-du-jour`). En cas de doute, la maquette fait foi.

## 1. Principe
Un carnet de stage numérique, pas un tableau de bord SaaS : lignes de journal numérotées,
perles de progression, cachets de visa. Sobre, clair, une seule couleur de marque.

## 2. Couleurs (valeurs mesurées sur les maquettes)
| Rôle | Valeur | Usage |
|---|---|---|
| Vert LOCAPAY | `#07C0A1` | boutons principaux, onglet actif, perles, cachet « Visé », accents |
| Encre | `#0E1F1E` | titres, texte principal, perle « semaine en cours », chip actif |
| Sidebar | `#0F1F1E` | fond de la barre latérale (vert-noir) |
| Fond de page | `#FEFDFB` | blanc cassé, jamais blanc pur |
| Carte | `#FFFFFF` | cartes et fiche |
| Aplat vert pâle | `#ECFCF9` | encadré « Le fil du stage », zone de cachet |
| Avatar | `#D9F3EE` | pastille d'initiales (alternance : pastille pleine / cercle contour encre) |
| Gris texte secondaire | `#5B6B66` | libellés, heures, sous-titres |
| Filets | `#E3EAE6` | séparateurs, en pointillés dans les registres |

Règle : le vert vif `#07C0A1` est la seule couleur forte. Pour du **texte vert sur fond clair**
(petits libellés), utiliser `#047A66` (contraste 5,3:1) ; `#07C0A1` seul n'atteint que 2,3:1.
Sur fond vert, le texte est en encre `#0B1F1A`, jamais en blanc.

## 3. Typographie
Poppins uniquement (400 / 500 / 600 / 700). Aucune police serif, aucune seconde famille.
- Titre de page : 600, ~34 px.
- Petit libellé de section (« eyebrow ») : 500, 11 px, majuscules, espacement 0,12 em, vert.
- Libellés de colonne : 500, 11 px, majuscules, espacement 0,1 em, gris.
- Texte courant et données : 400, 14 px.

## 4. Gabarit commun
- **Sidebar** : fond sidebar, logo LOCAPAY (version claire) en haut, libellé « CARNET RH »,
  entrées Registre / Carnets / Suivi du jour / Rapports / Équipe ; entrée active = pilule `#07C0A1`
  texte encre ; en bas, carte utilisateur à bordure pointillée (initiales, nom, rôle · ville).
- **En-tête de page** : eyebrow vert + titre ; bouton pilule vert à droite (verbe d'action).
- **Fond** : blanc cassé avec une trame de losanges très pâles en filigrane (traits fins, ~4 % d'opacité).
- **Pictogrammes** : dessinés sur mesure (pas de bibliothèque générique). Provisoire : marqueurs géométriques simples.

## 5. Écrans
### Registre des stagiaires
Bandeau de 4 chiffres (en poste, entrées de la semaine, visas en attente, rapports à signer) ;
tableau N° / Stagiaire / Pôle / Parcours (perles) / Dernière entrée (+ « il y a … ») / Visa.
Lignes séparées par des filets pointillés.

### Carnet de stage (fiche stagiaire)
Double page. Gauche : identité (initiales, nom, école · niveau · filière), Période, Tuteur,
Lieu, Objectif, encadré « Le fil du stage » (perles dont la **taille reflète l'intensité de la
semaine**, perle sombre = semaine en cours, « Semaine 14 / 26 »), puces de compétences.
Droite : « Journal d'activités » en frise verticale avec légende des marqueurs.
Bouton : « Signer le rapport mensuel ».

### Suivi du jour
Gauche : liste horaire des entrées du jour, chacune avec un cachet rond (« VISÉ » vert, ou
« À VISER » pointillé). Droite : panneau « Consigner une activité » (stagiaire, texte, durée en
puces 30 min / 1 h / 3 h / Journée, zone de cachet : **maintenir puis relâcher pour viser**).

## 6. Marqueurs de statut (évitent le trio rouge-orange-vert)
| Statut API | Libellé interface | Marqueur |
|---|---|---|
| VALIDEE | Visé | cachet vert plein légèrement incliné ; dans la frise : disque vert avec coche |
| SOUMISE | En attente | cadre pointillé ; dans la frise : cercle pointillé |
| REJETEE | À revoir | cadre encre plein ; dans la frise : barre oblique |
| BROUILLON | Brouillon | pointillé gris |
Le backend et ses statuts ne changent pas : seule la table de correspondance de l'interface les renomme.

## 7. Mouvement
Apparition des listes en cascade (≈45 ms entre lignes), transitions élastiques, effet « tampon »
à la validation. Toujours respecter `prefers-reduced-motion`.

## 8. Correspondance avec les données
| Maquette | Source dans l'application |
|---|---|
| Période, Tuteur, École, Niveau, Filière | `Stagiaire` (startDate/endDate, tutor, school, level, fieldOfStudy) |
| Objectif | `Stagiaire.subject` |
| Lieu | **n'existe pas** dans le modèle : à décider (champ à ajouter ou à retirer) |
| Semaine X / Y | calculée depuis startDate / endDate |
| Taille d'une perle | minutes d'activités VALIDEE de la semaine |
| Puces de compétences | `StagiaireSkill` |
| Rapport mensuel | `Report` de type MENSUEL |
