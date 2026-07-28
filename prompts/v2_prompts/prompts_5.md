I. Corrections / Erreurs
- Sur l appli mobile, lorsque ind_dimension = 1, a la deuxieme mesure, le P.U appliqué est reset a 0. Fix it.
- La logique de MT (Montant) est fausse. Comme je l ai dit precedemment:
    - Montant = P.U appliqué x Quantité

II. Features
- Un chantier doit pouvoir exister sans releves.
Sur mobile
    - si, quelque soit # de releve, dans supprimer modal, demande si suppression de ce releve ou supprimer chantier. Si supprimer ce chantier, deuxieme modal de confirmation (danger).
    - Un chantier sans releve n apparait pas dans la liste des chantiers, mais, lors de l enregistrement d un releve, il peut apparaitre (durant la recherche si match client et nom de chantier)
- Ajoute la possibilite de modifier l ordre des metiers dans un releve particulier. Ajoute le champ approprie
Sur mobile, dans modifier releve, ajoute deux fleche (up et down) a cote du nom du metier. Cela permet de changer l ordre du metier (dans la section)

- Similaire a P.U appliqué, ajoute un champ P.R appliqué. meme fonctionnement que la relation P.U catalogue  / P.U appliqué. donc P.R catalogue (existe deja) / P.R appliqué. 
Sur mobile, il est visible on clique sur Prix (pavé), en bas de P.U appliqué. Donc ajoute P.R appliqué. Il est optionnel.

Sur web admin
    - Ajoute bouton Supprimer dans modifier (pret de enregistrer en gris) sur l ecran admin (pour modifier client et modifier chantier) - toujours modal de confirmation avant
    - pareille dans mdoifier devis, cependant supprimer devis supprime le releve  - toujours modal de confirmation avant

Sur Web admin, AJoute un bouton Télécharger Excel (en vers) pour devis, ceci permet de télécharger le dévis en version Excel.

Dans le devis pdf, quelques ajustement
    - separe renomme Quantite / Qté. separe unité du chiffre, ajoute une nouvelle colonne U
    - enleve les devise (FCFA) du P.U et du Montant dans la table.
    - Si ind_dimension et nom_unite n est pas u, enleve (formule x n). Exemple: l x h x n.
        dans les dimension (Chiffre), ajoute x n dans les chiffres

Sur web admin, 
    - Ajouter la possibilite d'ajouter un nouveau client (depuis l'écran liste de client) - modal
    - Ajouter la possibilite d'ajouter un chantier (depuis l'écran liste des chantiers) - modal
    - Ajouter la possibilite d'ajouter un devis (ie. relever) depuis l'écran liste des dévis (pas releves) - page. Page similaire avec modifier devis (choix de métier, choix / création d'ouvrage, modifier Quantité, modifier Prix appliqué)
    - Dans modifier devis, permettre les ajouts et modifications (comme creation). Lorsque un devis est deja cree (a partir du terrain, ie. l appli mobile) et qu il a ete modifier (ajoute les champs - ind_dimension_terrain et ind_changement et id_qui_change). ind_dimension_terrain = 1 si le releve a été pris sur l appli mobile, 0 autrement. et ind_changement = 1 si le releve a été modifie après la création initiale (quelque soit le changement - P.U, notes, etc), id_qui_change qui contient le username (X00X) de celui qui a modifier le plus récemment

*
Dans la création de devis (écran web admin), si ind_dimension = 1, on doit entrée les éléments de la formule (ex. largeur, hauteur, épaisseur).
Aussi dans le nom des unités, si ind_dimension, alors montrer la formule(nom_unité).
Inspire toi des meme elements dans le pavé (app mobile) pour mettre a jour les inputs.
Aussi ajoute les articles (Article existant et crée article)

aussi je veux un formulaire plus simple. Au lieu d un formulaire a chaque "Ajouter une ligne", affiche un formulaire unique en haut, avec
selection de métier, puis d'ouvrage (search dropdown), choix unité (si nombre unite > 1) ou l unité unique (ne peut etre modifier), puis les dimensions (basé sur le type, ie. si ind_dimension = 1, montrer les elements a entrée, nombre sinon), a la fin un bouton + (pour ajouter ligne) et un bouton reset avec icon (reset le formulaire).
Pour chaque ligne un bouton dupliquer et un bouton effacer (icons seulement).
Un bouton creer ouvrage, un bouton creer article, qui on clique, ouvre un modal de creation (comme celui du mobile), et on validate, set le formulaire avec les valeurs deja etablie, mais juste les quantites (et dimension si ind_dimension = 1) a remplir. ceci cree et persist automatiquement l ouvrage ou l article.

Dans devis web admin (creation et modification), permettre de modifier la quantite directement dans la ligne (comme P.U appliqué)
Le modal de creation d'ouvrage est hors d'écran. Ajuste pour fit within medium screen (with scroll if needed)

Ajoute un champ note_2 dans ligne releve. Cette note (si non blank) apparaitra en bas du nom de l'ouvrage entre parenthese (en dark gray). Il n apparait pas dans releve PDF.
Dans mobile, sur clique notes (ligne releve), montrer les deux notes (le premier est maintenant Note relevé, le deuxieme est Note devis).
Dans mobile, modifier releve, change: double clique va dupliquer (ecran de confirmation d abord), hold sur la ligne releve (pas le handle de position) va supprimer (avec ecran de confirmation d abord). 
Dans web admin, ajoute un bouton notes (icon seulement) avant dupliquer. On clique, modal de notes (seulement celui du devis).

Dans mobile, ecran plus, en haut du bouton actualisé, un bouton légende (avec icon), on clique, ouvre un modal avec les informations de tous les actions gestuelle (double clique, hold, etc) avec des icons illustrant.

J ai oublie, dans creation / modification devis dans web admin, on doit selectionner (ou creer) la section d'abord. Par default 'pas de section'. C est un search dropdown (comme Ouvrage), mais valeur par defaut est pas de section (selectionne deja).

Dans web admin, creation/modification devis, ajoute les fleche haut et bas (sur ligne releve et au niveau de metier) pour modifier l ordre d affichage (il y a deja un champ metier_prdre et ordre deja pour suivre cela )

Dans web admin, creation/modification devis, l affichage de liste/dropdown choix de ouvrage (et article) et choix de section par ordre alphabetique

Dans mobile, lors du choix de section et choix ouvrage (et article), trie les liste par ordre alphabetique
