- bottom bar: 2 boutons seulement : Chantier et Plus
- Menu chantier : Affiche liste des chantiers et le bouton + (+ seulement au lieu de + Nouveau Chantier) en dark bleu.
        - Clique sur +: Demarrer processus d ajout de nouvelles dimensions (a decrire plus tard)
        - Clique sur un chantier: Affiche details du chantiers, ie, les dimensions prises ( = lignes des releves) et deux boutons "Pen" pour modifier (en dark yellow) et "File" pour devis (en dark red). Modifier et Devis a decrire plus tard

- Le bouton + en circle. Change + en icon + (gros remplissant le circle). couleur light bleu au lieu de dark bleu
- Augemente la taille des boutons Chantier et plus. remplissant tout le bottom bar, juste un peu de padding.
- ajoute un bouton avec l icon loupe en bas de boutou + en gray (plus petit que bouton +), sur clique va afficher une barre de recherche parmi les chantiers (nom du chantier, adresse, nom du client et numero du client). Background deviens blur white lorsque la barre de recherche est afficher

- amene les bouton + et loupe un peu plus bas, juste avant le bottom bar
- bouton + doit pulse frequement

- met a jour les boutons Pen et File. Applique le meme layout que + et loupe. 
Pen est un icon de bic et File est un icon de fichier. Modifier en dark yellow et devis en bleu

- enleve le box autour du bottom bar. Ajoute juste une ligne de separation en haut
- pareille pour header ( ligne de separation)

- couleurs des badges de status.
        - Dimension : gris
        - Devis : bleu
        - En cours : orange
        - Terminé : vert
        - Annulé : noir

- Remplace le bouton deconnxion juste par l icon. Utilise exactement le meme format que le bouton + dans Chantier

- Le nom de l ecran Profil est Plus. L icone est trois points (...). Dans l ecran Plus, montre un bouton avec icon profil. On clicque va vers l ecran Plus. Bouton de Retour (Icon seuelemnt meme format que le bouton Deconnexion)

- Ramene le bouton deconnexion a l ecran plus. En bas de profil, meme format que le bouton recherche sur chantier

- Remplace "Effacer" par un icon dans le pave numerique
- Deplace les bouton back et annuler a gauche en bas de suivant.
- A leur places, deux nouveau bouton:
        - un bouton nouvel ouvrage (meme metier)
        - un bouton nouveau metier 

- Lors de l entree des dimensions dans le pave numerique, remplacer le titre nouvelle dimension par le nom de l ouvrage

- Au lieu d avoir les champs de cote au milieur, montre les champs juste en bas du pave numerique (largeur, hauteur, nombre). Pour le moment on va ignore profondeur. Ajoute un bouton Notes au milieu (ou se trouve largeur maintenant), on clique ouvre un modal pour entrer une note.

Les champts ont exactement le meme layout que les boutons du pave. l = largeur, h = hauteur, n = nombre. Notes est en bas au milieu

- Deplace le pave en haut (juste en bas du header).
- montre la quantité en bas de Notes.

- Reduit le height les champs de cote pour ne pas overlapper avec le bouton suivant et +.
Change la couleur en dark gris si non active

- Qté un peu plus bas. Qté au lieu de Qt.

- Au lieu d avoir des boutons pour nouvel ouvrage et nouveau metier durant l entree des dimensions, on va utiliser un double press et triple press du bouton +.
double press du bouton plus ajoute nouvel ouvrage, triple press ajoute nouveau metier.
Remplace alors le bouton nouvel ouvrage par le bouton suivant (meme format que ouvrage)
Remplace le bouton nouveau metier par back.

- Non le bouton suivant et back on le meme format que recherche

Principe de design:
- Max 2 bouton dans la colonne de droite
- Si un seul bouton, alors le bouton est gros (meme format que +)
- Si deux bouton, alors l un est gros (format +) et l autre est petit (meme format que recherche).
- Lorsque on rentre dans le processus de nouvel dimension, dans la bar du bottom nav, le bouton du menu ...Plus devient icon x (annuler) Et le bouton Chantier devient enregistrer (icon)

- Dans l ecran Plus, respecte le design (1 seul bouton --> gros)
- Lorsque les info de la dimension ne sont pas complete, suivant est disabled (reduced opacity)

- Remplace le bouton suivant (lors de l entree d une mesure) par un icon liste. Sur clique, montrer le recap.
- On click sur le bouton Enregistrer, amener sur la page d enregistrement du client et du projet.

- Au lieu d un FAB pour profil, ajouter un bouton large dans l ecran (en bas du navbar). Update le format de deconnexion (format +)

- le bouton profil en haut (premiere ligne apres navbar/ Header)

- lorsque un ouvrage n a qu une seule unite, on clique sur l ouvrage, passer directement a l entree des dimensions. Si plus d une unites, permettre le choix de l unite (comme presentement).
- Trie la liste des ouvrages par ordre alphabetique
- l icon liste en bg jaune et icon noir
- Dans l ecran recap:
        - bouton back a droite, format +
        - Rename page "Récapitulatif"
- Annuler : Modal de confirmation "Voulez-vous vraiment annuler tout?"

- Card lignes de releve (recap), Qté à Droite

- Double click et triple click pour nouvel ouvrage et nouveau metier requis une nouvelle dimension. ie. si il y a deja des entres de largeur ou hauteur (>0), on double/triple clique, montrer un modal "Enregistrer cette mesure d'abord ou effacer les donnees avant de procéder".

- Pour simplifier, double click et triple click marche seulement quand + est disabled

- Change le bouton suivant dans recap, a continuer (+). On clique, aller a selection metier. Les donnees deja entree reste enregistree (ne pas effacer)

- Pas de bouton back dans recap

- separe les metiers dans recap et details.
- Les mesures sont groupe par metiers, trie par ordre alphabetique des metiers

- les unites pres de quantite sont nom_unite

- format de supprimer = recherche. FAB comme les autres a droite
- deplace le bouton supprimer dans recap (en bas de +)

- Au lieu de strickethrough, ajoute un watermark OK en vert au milieu de la card (pour ind_complete = 1) Transparent pour que ca soit en arriere des autres ecriture de la card

- CLique sur devis toggle on and off les prix. Les prix unitaires en bas de qté (meme alignement vertical) ne pas prendre plus d espace

- Met a jour le devis.
Pas de colonne Dimension. en lieu: Elargie la colonne designation.
Dans la colonne designation,
- D abord le nom du metier, puis le nom de l ouvrage, suivit des differentes dimensions pour cet ouvrage (centré). Les dimensions sont groupé par metier et ouvrage.

Aussi ajoute le montant en lettre: "Arreté le présent devis estimatif à la somme de xxx FCFA". le montant de la somme en bold.
Les devises sont FCFA

- Les metiers apparaissent une seule fois. Les montant sont groupé par metier et ouvrage. Seul les metiers sont separer par des lignes horizontales. Aussi les qté, PU et montant sont aligné avec la dimension (si demension exist). Si l unité n est pas une dimension, ne pas afficher l unité dans designation. Quantité est suffisant 
- n affiche pas le montant numerique dans la partie lettre. C est le montant en lettre qui est en gras

- Dans quantité, montre nom_unite. Color code les metiers
- Afficher "DEVIS ESTIMATIF" comme header en bas de la ligne (nom entreprise, etc).
- La date a droite
- Augmente la taille de CLient et Projet. Renomme Projet "Chantier"
- Ajoute en bas:
        - Le Client a gauche, Le Fournisseur a droite.
        - en bas des lignes sous chaque pour leur signatures respectives. Assez d espace entre le titre et la ligne
- Ajoute le double de cet espace entre titre et signature lignes.
- La couleur est juste le text du metier. pas les cells
- Date en bas de ligne Devis estimatif. sur la meme ligne que CLient.
- Ajoute TTC a la somme en lettre (CFA TTC)

- Dans l ecran admin master, met a jour les champs qui sont des valeurs binaires (exemple _synced) pour 

- Dans l entree des mesures, montre lxhxn en haut du pave numerique
- Dans le devis, il ne doit pas avoir de ligne horizontal entre les dimensions du meme ouvrage.

- Sur l ecran choix de metier et choix ouvrage, assure toi que scroll est possible si il y a beaucoup de donnees

- Au lieu de nouvelle dimension, renomme le header nouveau 

- Le logo de l app se trouve dans /prompts/logo.png. Change la couleur du premier losange (jaune) en dark orange (couleur de nos bouton orange dans l'app). Cree un nouveau fichier logo2.png

- Ajoute icon arrow back aux boutons retour (bottom nav)

- Oui logo2.png est le logo de l application. c est aussi l icon lorsque l app est installer. Il 
Apparait a la page de login. Il apparait aussi comme loading screen (pulsating rapidement) lorsque les ecrans charge. Il apparait en arriere plan (bg avec reduced opacity) dans la page ...Plus

- le nom de l app Losange dans les ecrans, pas losange_NEW

- Dans le formulaire Nouvel ouvrage (cree), Enleve le nom de l entreprise

- Changer la couleur des boutons dans ...Plus de full orange a white avec border orange. on click, orange

- Dans les boutons, augmente la taille des polices pour une meilleur lisibilite. Ne pas deborder hors des boutons

- Les ouvrage lors de nouveau releve en forme de liste centre, par ordre alphabetique, meme police que les boutons (metier)
- Le nom du metier aligne a gauche

- On clique sur n, meme comportement que l et h (efface automatiquement ce qui est la bas)

- Augment police de l , h et n. Remplace par largeur, hauteur, quantité respectivement

- Lors de la modification (dimensions), Annuler retourne au recapitulatif

- Cards liste des chantiers (2 lignes): 
        Nom du chantier
        Nom du Client / telephone 1 
        Badge corner bottom droite (meme ligne que nom du client)

- Cards liste des clients (1 ligne):
        Nom du Client / telephone 1

- Corrige le francais a travers l application. Accents, apostrophe, etc. Bon francais. Ne remplace pas les mots

- Ajoute le logo de l entreprise en bg right bottom corner et en header pour facture et PDF. Si compte gratuit ou logo non disponible, logo de l app losange

- Dans liste chantier, badge Relevés au lieu de dimension

- Dans la base de données, ajoute Métier après client. On clique montre la liste des métiers (cards). PAs de page details. L utilisateur peut trier la liste des metiers en hold la card et bougeant dans la liste. Le meme ordre des metier sera respecté lors du choix de metier pour chantier

- Liste des metiers dans ...Plus, scrollable pour montrer tout les metiers

- La devise dans l application est FCFA partout. Pas D euro (exemple Rapports).

- Dans rapport, relevés au lieu de dimensions. Ne montre pas l ecriture dans le chart. Legende suffit.

- Dans rapport, montant HT seulement (pas TTC)

- Enleve categorie Annulé du rapport.

- Corrige Chantier card. Relevé au lieu de dimension badge

- JE ne comprends pas le modal de synchronisation. Simplifié les le content et concise.

- dans creation ouvrage window, augmente les polices de unites dans la liste.
la derniere unite dans la liste n est pas tres visible.

- Dans details chantier et ecran recapitulatif, garde l ordre dans lequel les ligne de releve ont ete entrées. Le groupement par metier sera conserver. Si le meme metier en deux entree differente, alors il seront groupe mais l ordre est premier entree, deuxieme, ainsi de suite

Pour PDF, on applique le meme ordre.
 Ne change rien au devis