CAHIER DES CHARGES UI/UX - LOYALTYCORE SAAS

Version : 2.0 (Spécifications techniques détaillées)
Direction Artistique : B2B, Minimaliste, Trust-centric (Inspiration : Stripe, Vercel, Linear)

0. DIRECTIVES FONDAMENTALES

Zéro Emoji : Les emojis sont formellement proscrits. Seules des icônes vectorielles (SVG) géométriques, filaires (stroke-width: 1.5px) de type "Lucide" ou "Feather" sont autorisées.

Agnosticisme Technologique : Ce document décrit les comportements, les propriétés CSS standards (Flexbox, Grid, variables) et les états interactifs, applicables dans n'importe quel framework (React, Vue, HTML/CSS pur).

Approche Monochrome Haut Contraste : L'interface s'appuie sur la typographie et l'espace, plutôt que sur la couleur, pour hiérarchiser l'information.

1. DESIGN TOKENS (FONDATIONS)

Toutes ces valeurs doivent être converties en variables globales (ex: :root en CSS ou configuration Tailwind).

1.1. Palette de Couleurs (Couleurs Hexadécimales)

Fonds et Surfaces

bg-app : #FAFAFA (Gris extrêmement clair, fond principal des pages).

bg-surface : #FFFFFF (Blanc pur, utilisé pour les cartes, modales, header, zones de contenu).

bg-subtle : #F4F4F5 (Gris très clair, utilisé pour les états de survol neutres ou les en-têtes de tableau).

Bordures et Séparateurs

border-light : #E5E7EB (Bordures standard des cartes et diviseurs).

border-medium : #D1D5DB (Bordures des champs de formulaire au repos).

border-dark : #111827 (Bordures des éléments actifs ou cartes mises en avant).

Typographie

text-primary : #111827 (Noir profond, lisibilité maximale pour les titres et texte principal).

text-secondary : #4B5563 (Gris foncé, pour les sous-titres, descriptions et labels).

text-tertiary : #9CA3AF (Gris moyen, pour les placeholders, textes d'aide, et icônes inactives).

text-inverse : #FFFFFF (Blanc pur, pour le texte sur les boutons sombres).

Couleurs Sémantiques (Utilisées avec parcimonie)

success-bg : #ECFDF5 | success-text : #065F46 | success-border : #A7F3D0 (Vert professionnel).

error-bg : #FEF2F2 | error-text : #991B1B | error-border : #FECACA (Rouge d'alerte).

warning-bg : #FFFBEB | warning-text : #92400E | warning-border : #FDE68A (Jaune/Orange de prévention).

1.2. Typographie et Échelles

Famille de Polices : Inter, Roboto, ou à défaut la pile système (system-ui, -apple-system, sans-serif).

Échelle des Tailles (Font-Size) & Hauteur de ligne (Line-Height)

text-xs : 12px / LH: 16px (Badges, petits labels).

text-sm : 14px / LH: 20px (Texte des tableaux, boutons standard, labels de formulaires).

text-base : 16px / LH: 24px (Texte de corps de page standard).

text-lg : 18px / LH: 28px (Sous-titres, texte d'introduction).

text-xl : 20px / LH: 28px (Titres de modales ou de cartes).

text-2xl : 24px / LH: 32px (Titres de sections).

text-4xl : 36px / LH: 40px (Titres de pages H1).

text-5xl : 48px / LH: 1.1 (Titre Hero de la page d'accueil).

Graisses (Font-Weight)

Regular (400) : Corps de texte, placeholders.

Medium (500) : Boutons, onglets, en-têtes de tableaux.

SemiBold (600) : Labels de formulaires, sous-titres.

Bold (700) : Titres majeurs (H1, H2), éléments à forte mise en valeur.

Tracking (Espacement des lettres)

Titres (24px et +) : -0.025em (Resserré pour un aspect premium).

En-têtes de tableau (Majuscules) : 0.05em (Élargi pour la lisibilité).

1.3. Espacements, Rayons et Ombres

Système d'espacement (Multiples de 4px)

space-1 (4px) à space-8 (32px), space-12 (48px), space-16 (64px).

Rayons de bordure (Border-Radius)

radius-sm : 4px (Checkboxes).

radius-md : 8px (Champs de formulaire, boutons, petits badges).

radius-lg : 12px (Cartes standards, modales, conteneurs principaux).

radius-xl : 16px (Aperçu de la carte Wallet).

radius-full : 9999px (Badges de statut ronds, avatars).

Ombres (Box-Shadow)

shadow-sm : 0 1px 2px 0 rgba(0, 0, 0, 0.05) (Champs de texte, boutons secondaires).

shadow-md : 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03) (Cartes au survol léger, menus déroulants).

shadow-lg : 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.04) (Cartes principales, survols marqués).

shadow-xl : 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) (Modales centrales, popovers importants).

shadow-focus : 0 0 0 3px rgba(17, 24, 39, 0.1) (Anneau de focus pour l'accessibilité sur les inputs).

Transitions (Animation globale)

Durée : 200ms (0.2s)

Timing Function : cubic-bezier(0.4, 0, 0.2, 1) (ease-out standard fluide).

Propriétés affectées : background-color, border-color, color, fill, stroke, opacity, box-shadow, transform.

2. COMPOSANTS DE BASE (UI KIT)

2.1. Boutons (Buttons)

Tous les boutons partagent ces propriétés de base :

Display: inline-flex, Align-items: center, Justify-content: center.

Font-size: 14px, Font-weight: 500.

Padding: 8px 16px (Bouton standard), 12px 24px (Grand bouton).

Border-radius: 8px.

Transition complète activée.

Cursor: pointer (Sauf si désactivé).

Bouton Primaire (Primary)

Repos : Fond #111827, Texte #FFFFFF, Border none.

Survol (Hover) : Fond #1F2937, Transform translateY(-1px), Box-shadow shadow-md.

Actif (Active/Click) : Transform translateY(0).

Désactivé (Disabled) : Fond #E5E7EB, Texte #9CA3AF, Cursor not-allowed.

Bouton Secondaire (Outline/Default)

Repos : Fond #FFFFFF, Texte #111827, Border 1px solid #D1D5DB, Box-shadow shadow-sm.

Survol : Fond #F9FAFB, Border #9CA3AF.

Bouton Fantôme (Ghost / Tertiary)

Repos : Fond transparent, Texte #4B5563, Border none.

Survol : Fond #F3F4F6, Texte #111827.

Bouton Danger

Repos : Fond #FFFFFF, Texte #DC2626, Border 1px solid #FECACA.

Survol : Fond #FEF2F2.

2.2. Formulaires (Inputs, Selects)

Label

Display: block, Font-size: 13px, Font-weight: 600, Color: #4B5563, Margin-bottom: 6px.

Champ de saisie texte / Email / Password

Repos : Width 100%, Height 40px, Padding 8px 12px, Fond #FFFFFF, Border 1px solid #D1D5DB, Border-radius 8px, Font-size 14px, Color #111827. Placeholder Color #9CA3AF.

Focus : Border 1px solid #111827, Outline none, Box-shadow shadow-focus (Anneau gris très clair autour de la bordure noire).

Erreur : Border 1px solid #DC2626, Box-shadow (anneau rouge transparent).

Select (Liste déroulante)

Même style que l'Input Texte. Apparence native masquée (appearance: none), avec une icône [Icône: Chevron-Bas] positionnée en absolu à droite (Padding-right augmenté à 32px pour éviter le chevauchement du texte).

2.3. Badges de Statut

Structure : inline-flex, Align-items center, Padding 2px 10px, Font-size 12px, Font-weight 500, Border-radius 9999px.

Les couleurs dépendent du contexte sémantique (voir section 1.1). Exemple : Succès = Fond Vert clair, Texte Vert foncé, Bordure Vert moyen.

Aucune icône à l'intérieur du badge pour maintenir le minimalisme.

3. SPÉCIFICATIONS DES PAGES ET LAYOUTS

3.1. Page d'Accueil (Vitrine B2B)

Structure (Grid / Flexbox)

Header : Fixe en haut (position: sticky, top: 0, z-index: 50). Flexbox justify-between, alignement vertical centré. Padding horizontal 24px (max-width interne 1200px centré).

Main : Padding haut 80px, Padding bas 120px. Centrage via conteneur 1200px max.

Section Héro

Max-width du texte : 800px. Margin-bottom : 64px.

Le titre H1 ne doit pas dépasser 3 lignes sur bureau.

Grille de Cartes (Features)

Disposition : display: grid, grid-template-columns: repeat(3, 1fr). Gap de 24px. Sur mobile : grid-template-columns: 1fr.

Contenu de la carte : Flexbox direction column. L'en-tête de la carte contient une div pour l'icône et un texte de sur-titre aligné à droite (justify-between).

Liste des fonctionnalités (ul) : flex-grow: 1 pour pousser le bouton toujours en bas de la carte, quelle que soit la longueur du texte de description.

3.2. Pages de Connexion (Auth Layout)

Conteneur Parent

Display : flex, min-height: 100vh, align-items: center, justify-content: center.

Background : #FAFAFA uni.

Carte de Connexion (Auth Card)

Largeur stricte : max-width: 440px, width: 100%.

Padding interne : 48px sur tous les côtés (réduit à 32px sur mobile).

Organisation : Titre (H1 centré, 24px) -> Paragraphe sous-titre (centré, gris, mb-32px) -> Formulaire (Flex column avec gap de 20px).

Le bouton d'action primaire doit prendre 100% de la largeur (width: 100%) et être un peu plus haut (height: 44px).

3.3. Dashboard (Master Admin & Pro)

Layout de base (Shell)

Un "App Shell" classique. Header horizontal contenant le nom du compte à gauche et les actions utilisateur (déconnexion, profil) à droite.

Le fond sous le Header et derrière le contenu principal est #FAFAFA.

Système d'Onglets (Tabs)

Conteneur : display: flex, border-bottom: 1px solid #E5E7EB.

Bouton d'onglet : Padding 12px 16px, fond transparent. Marge inférieure de -1px (pour superposer la bordure de l'onglet actif sur la bordure du conteneur).

Onglet Actif : border-bottom: 2px solid #111827, texte #111827.

Tableaux de Données (Data Grids)

Layout : Structure table classique ou display: grid. Doit avoir overflow-x: auto pour la responsivité.

Cellules : Padding 16px 24px pour aérer la donnée. Alignement vertical au centre.

Colonne Actions : Toujours alignée à droite (text-align: right). Contient un groupe de boutons "Ghost" (Icônes [Éditer], [Suspendre], [Supprimer] de taille 18px).

3.4. Portail d'Enrôlement Client (Rejoindre le Wallet)

Layout Dual (Split Screen)

Sur Desktop (>1024px) : display: grid, grid-template-columns: 1fr 1fr. Hauteur minimale 100vh.

Colonne Gauche (Formulaire) : Fond #FFFFFF, padding 64px. Flex column centré verticalement. Max-width interne du contenu : 480px.

Colonne Droite (Aperçu) : Fond #FAFAFA, centrage horizontal et vertical. Contient le composant de prévisualisation de la carte.

Aperçu de la Carte (CustomerCard Preview)

Dimensions : Ratio strict de carte format portrait (ex: Largeur 320px, Hauteur ~500px).

Conteneur : Border-radius 16px, Ombre shadow-2xl pour la profondeur, overflow hidden.

Header de la carte : Logo en haut à gauche, texte des points en haut à droite.

Zone Code-Barre / QR : Doit reposer sur un fond blanc pur (même si la carte est d'une autre couleur), border-radius 8px, padding 16px. Le contraste du QR code doit toujours être optimal.

4. MODALES, DIALOGUES ET OVERLAYS

4.1. Backdrop (Arrière-plan assombri)

Position : fixed, inset: 0 (top, left, right, bottom 0). Z-index : 100.

Couleur : rgba(0, 0, 0, 0.5) (Noir à 50% d'opacité).

Filtre (Optionnel mais recommandé) : backdrop-filter: blur(4px).

Comportement : Un clic sur le backdrop doit fermer la modale (sauf si c'est une modale critique empêchant l'annulation).

4.2. Conteneur de la Modale

Position : fixed, centré horizontalement et verticalement (via Flexbox sur le parent ou transform translate). Z-index : 101.

Largeurs maximales standards : 400px (Confirmation/Alerte), 600px (Formulaire complexe).

Animation d'entrée : Opacité 0 -> 1, Transform Scale 0.95 -> 1.0 ou TranslateY 10px -> 0.

4.3. Structure interne de la Modale

Header : Padding 20px 24px. Border-bottom 1px solid #E5E7EB. Titre de niveau H2 (text-lg, font-semibold). Bouton croix [Icône: X] en haut à droite en absolu ou via flex-between.

Body (Contenu) : Padding 24px. Peut contenir du texte, des icônes d'avertissement, ou des formulaires. Ligne-height aérée (1.6) pour la lisibilité.

Footer (Actions) : Padding 16px 24px. Fond #F9FAFB (Gris très clair pour détacher la zone d'action). Border-top 1px solid #E5E7EB. Disposition en Flexbox justify-end (Boutons alignés à droite), gap de 12px. L'action secondaire à gauche, l'action primaire à droite.

5. DIRECTIVES SPÉCIFIQUES POUR L'IA FRONTEND

Si ce document est lu par une IA générant le code :

Sémantique HTML : Utilise les balises appropriées (<nav>, <main>, <section>, <article>, <dialog>).

Accessibilité (A11y) : Ajoute les attributs aria-label sur les boutons ne contenant que des icônes. Assure-toi que les inputs ont des identifiants (id) liés à leurs <label> via l'attribut for (ou htmlFor en React).

Responsive Design : L'approche par défaut doit être Mobile First. Utilise les Media Queries pour ajuster les paddings (réduire sur mobile), transformer les grilles en colonnes uniques, et gérer la taille des textes. Les flex-directions complexes doivent repasser en column sur les petits écrans.

Icônes : Utilise une bibliothèque d'icônes SVG intégrée en ligne ou par composant (Lucide React, Heroicons, etc.). N'utilise jamais d'émojis texte.

Fin des spécifications.