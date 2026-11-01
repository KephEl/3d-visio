# 3D Visio

Site de maquettes 3D de bâtiments générées par l'IA (Claude). Premier projet : **Église METL** (Pointe-Noire).

## Pages
- `/` : accueil et galerie des projets
- `/eglise/` : maquette complète de l'Église METL, avec son assistant IA
- `/creer/` : créer une maquette à partir d'une description ou d'une photo de plan, puis la modifier par message
- `/api/claude` : passerelle serveur vers l'API Anthropic (la clé reste secrète)

## Mise en ligne sur Vercel (gratuit)
1. Mets ce dossier dans ton dépôt GitHub `3d-visio`.
2. Sur https://vercel.com, connecte-toi avec GitHub et clique sur **Add New → Project**. Choisis `3d-visio`, puis **Deploy**. Aucun réglage n'est nécessaire.
3. Crée la clé IA : sur https://console.anthropic.com, ouvre **API Keys**, clique sur **Create Key** et copie la clé. Ajoute aussi un moyen de paiement et un plafond de dépenses dans **Billing → Limits**.
4. Dans Vercel, va dans **Settings → Environment Variables** et ajoute :
   - `ANTHROPIC_API_KEY` = ta clé (obligatoire)
   - `ACCESS_CODE` = un code de ton choix (facultatif mais conseillé). Les visiteurs devront le saisir pour utiliser l'IA, ce qui évite qu'un inconnu ne consomme ton crédit.
   - `MAX_REQ_PER_HOUR` = 40 (facultatif, limite par visiteur)
   - `ANTHROPIC_MODEL` = `claude-sonnet-5-5` (facultatif)
5. Va dans **Deployments**, ouvre le menu ⋯ et choisis **Redeploy**. Ton site est en ligne à l'adresse `https://3d-visio.vercel.app` (ou une adresse proche).

La visite 3D marche sans clé. Seules les fonctions IA (créer, modifier, assistant) en ont besoin.

## Format des maquettes
Voir `lib/engine.js` (`Visio.SCHEMA` et `Visio.GUIDE`). Exemple : `projets/maison-demo.json`.
Les maquettes créées sont enregistrées dans le navigateur du visiteur. On peut les exporter et les importer en fichier `.json`.
