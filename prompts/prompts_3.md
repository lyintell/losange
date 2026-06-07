1. Je voudrais ajouter la possibilté pour un utilisateur admin A d'ajouter un ouvrage et ouvrage unité a partir de l ecran choix d ouvrage (nouvelle dimension). 
- Ajoute un bouton + (format recherche) en bas du bouton back (colonne droite) sur l ecran choix d ouvrage.
    Cela ouvre un modal dans le quel il y 3 inputs:
    - le metier et l entreprise sont determiner automatiquement
    - un input -> nom
    - un input -> choix de l unité
    - un input -> prix unitaire de l ouvrage

2. Je voudrais que les ouvrages et ouvrages unite cree sur mobile soit sync sur cloud

3. Ajoute les champs suivants
- date_actif_jusqua dans la table entreprise
- date_premier_login (datetime) dans la table profil

les tables locales et supabase.

4. Lorsque un utilisateur se connecte pour la premiere fois, la date et le temps sont enregistre dans date_premier_login
Un utilisateur sera toujours actif jusqu a la date date_actif_jusqua (uniquement pour les comptes Pro)
Sur chaque sync de ou vers supabase, check la date aujourd hui vs date_actif_jusqua. Si aujourd hui > date_actif_jusqua, alors automatiquement le compte devient inactif (ind_actif = 0)

5. date_facture est par default le jour ou la facture est creee.

6. une entreprise peut ne pas vouloir afficher de TVA et TTC sur son devis. 
Ajoute un champ ind_tva par defaut 0 à la table entreprise, par defaut 0.
Si 0 alors pas d affichage de TVA et TTC dans le devis. Juste le prix hors tax est affiché (en chiffre et lettre). Si 1 alors affichage de TVA et TTC dans le devis, inclant ttc dans le prix en lettre.

7. Dans l ecran master admin, je ne vois pas les nouveaux champs ajouté au formulaires et creation et modifications

8. Met a jour l ecran details du chantier. Lorsque l utilisateur est dans details du chantier:
- Le bouton Chantier devient Retour à la liste.
- Le bouton ...Plus devient Modifier
- Le bouton Modifier (FAB with pencil) devient le bouton devis (Changer apparence)
- Le bouton Devis (FAB) devient le bouton PDF. 
- Le bouton devis garde le meme comportement (tap et double tap).
- Le bouton PDF:
 - pas de double tap
 - on tap, ouvrir la possibilite de partager sur Whatsapp ou telecharger (meme actions que Devis). Cependant
 le format de PDF est different de devis. A modifier plus tard
 - couleur de retour a la liste (gris).

9. Pour le format de dimension (PDF),
   - Devis Estimatif -> Dimensions - xxx (nom du client) / xxx (nom du chantier)
   - Enleve client et chantiers.
   - Pas de tables, pas d entete de table. La liste des dimension (meme organisation que la colonne designation aujourd hui). Mais si dimension, afficher lxhxn.
   - Devant chaque dimension afficher --> notes de la ligne
   - Augmenter le font tres gros, aligner a gauche les dimensions
   - Pas d ecriture en bas (client/fournisseur, footer, etc)
   - Afficher les notes du chantier avec "Notes: xxx" avant la liste des dimensions

10. Les notes de lignes sont sur la meme ligne que le ligne releve. eg:
105 x 302 x 4 --> notes xxx

11. Reduit beaucoup les tailles des polices des notes de chantier et de ligne releve. La police des dimensions est bonne

13. Dans le menu ...Plus, Profil. Si l utilisateur est Admin, alors il peut modifier les information de l entreprise, particularly : 
- Nom de l entreprise
- Appliquer TVA Oui / Non (ind_TVA)
Lorsque l utilisateur est admin, sur l ecran de profil, Chantier devient Retour (gris). Pas de fleche retour.
...Plus deviens Modifier.
On clique sur Modifier, il peut changer seulement les champs Nom de l entreprise et Appliquer TVA (Oui ou Nom).
Pour le compte pro, automatiquement on save les donnees sont sync sur le cloud (ou queue existant si pas internet). Clique manuel sur sync aussi envoi les donnees si non synced

14. Dans le PDF, les ouvrages avec unites n n apparaisse pas (ind_unitaire=1). pour eux pas de lxhxn, mais n seulement.

15. Dans le menu ...Plus, ajoute Le bouton Base de données (avec icon).
Dans cette page, montre le bouton: Liste des clients (meme format que le bouton Profil avec icon)
        - Liste des clients montre la liste des clients. On clique montre les details. FAB Bouton modifier et supprimer (format + et format recherche) sont visible. On clique peut modifier et supprimer client respectivement

16. Dans ...Plus, Apres la premiere page (Plus), tout les boutons du bottom nav bar a gauche sont retour

17. Dans base de donnees ajoute le bouton Liste des ouvrages. On clique, montre le detail de l ouvrage, incluant les ouvrages unites. 

18. Dans les ecrans details (clients, ouvrage) dans Plus, changer Plus en Modifier. Enleve modifier FAB

19. Travaille sur la page modifier de l ouvrage (Plus)

20. Dans enregistrer (Client et chantier), ajoute un 

21. Travaillons sur les champs photo et logo maintenant.
    Ajoute les champs:
    table Chantier: photo_1, photo_2, photo_3
    table lignereleve : photo

Ces champs et le champ logo dans Entreprise sont des type fichiers. Enregistre local et Supabase.
Pour les comptes Gratuit, les images sont sauvegarder localement seulement.
Poru les comptes Pro, les images sont sauvegarder localement et Cloud (Supabase).

On travaille sur les formulaires et les pages details apres.

22. Sur le cloud (Pro), assure toi les entreprises et chantier ont des dossiers separer pour le stockage des images. Logo dans le dossier de l entreprise. Les photos de chantiers et lignereleve sauvegarder dans le dossier chantiers du dossier entreprise.

22. On travaille maintenant sur les formulaires et details:
- Entreprise (Profil Admin): Affiche le logo dans la page Profil (Admin). On clique sur modifier, affiche le input file pour Logo. Charge parmi les photos existants.
- Enteprise (Ecran Admin Web): Affiche le logo dans la page details de l entreprise. On clique sur modifier, le input logo est un file. Meme chose pour create. input logo doit etre file. 
Pour les comptes Gratuit, Logo est disabled. Dans Profil Admin aussi (mobile).
- Ecran Client et chantier, ajoute input file pour photo 1, 2 et 3 apres Notes. On clique, demande si utiliser camera ou charger photo existant.
- Details chantier, en bas de toutes les dimensions, boutons photo (1, 2, 3 dependemment de la photo qui existe). On clique sur le bouton view la photo. bouton supprimer visible. Si pas de photos, pas de bouton.
- Ligne releve, Ajoute bouton photo apres bouton Prix. Enleve les ecriture le notes et prix. Juste les icones (notes, prix, photo). On clique choix camera ou charger photo existant.
- Details chantier, si ligne releve a une photo, affiche le watermark de photo au centre de la card (bg, opacite reduite). On clique sur card avec photo, affiche la photo view. bouton supprimer visible.

23. Dans card ligne avec photo, pas la photo elle meme en bg, mais un icon photo (similaire a photo de chantier).

24. Pour les photos, ajoute le bouton Telecharger. Supprimer en gris

25. Dans le menu Plus, Ajoute un bouton Rapports en bas de base de données. On clique, montre un dashboard 
montrant les info pertinentes:
        - Pie chart: Nombre total de chantier par status
        - Bar chart: Nombre de chantiers par mois par status (stacked barchart), max 1 year back from current month
        - Ajoute un bouton, on clique change Nombre en Montant des charts
