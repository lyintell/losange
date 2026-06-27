1. Renomme AdminScreen comme MasterScreen. Nous allons cree un admin screen qui sera pour les comptes A et S, qui sera different de l ecran du Master Admin

2. Dans le dossier /webapps, cree un webapp utilisant Nextjs. JS seulement, pas TS. L'application utilisera la base de données supabase existante.
Sépare les components des pages. Je veux une app bien structurer, le code très facile a comprendre, et les dossiers facile à lire.

2. Pour le webapps admin, on utilisera les mêmes couleurs et thèmes que le mobile app. Crée les écrans suivants:
- le login screen, similaire au login screen du mobile.
Implémente l'authentication, utilisant les mêmes identifiants et mot de passe que le mobile. Sauf que, seul les comptes A, S et T peuvent se connecter.
Le compte master (Y62L) peut se connecter à n'importe quel Admin screen.
- Le home page (accueil), avec un jumbotron Bienvenue x, ou x est le prenom de l utilisateur. Le logo et nom de l'entreprise dans le nav bar. Si le logo de l'entreprise n'est pas chargé (disponible), alors utilise le logo de l'application (/assets/logo2.png)
- Il y a un sidebar à gauche (fixé) avec les menus suivant:
    - Accueil
    - Tableau de bord
    - Chantiers
    - Clients
    - Ouvrages
    - Articles
    - Paramètres
    - Profil (en bas footer)

Chaque menu a une page vierge avec un navbar avec icon et nom du menu. 
Nous allons populer chaque page après

3. Menu Chantiers.
- La page montre la liste des chantiers, inclu le numéro du chantier, le nom, le nom du client, l'adresse et le status.
- Bar de recherche par nom du chantier, adresse, nom du client, numéro de telephone 1 et 2 du client.
- Sur clique d'un chantier, page détails du chantier avec 2 tabs.
    - Les relévés
    - Les devis. un chantier peut avoir plus de 1 devis.
- Sur clique des relevés et devis, montres exactement le contenu (comme dans fichier PDF et devis mobile). Ajoute bouton modifier et supprimer pour devis.
- Sur modifier devis, on peut modifier les prix unitaire de chaque ligne relevés.
- Enleve le bouton modifier sur ligne devis.
- Sur pages (VOIR) de PDF et Devis, affiche les boutons suivant:
    - Telecharger PDF pour Releve et Devis
    - Modifier pour Devis

4. Dans admin web, 
- Dans le libellé de relevé, enlève Facture
- Dans la ligne de devis, après voir, ajoute 1 bouton status. On clique, ouvre le modal pour selectionner le status.
- Aussi, lorsque on telecharge, ou on imprime le devis, automatiquement le status (si Releve), passe à Devis

5. Dans admin web,
- Montres des icons pour les boutons : Voir, Modifier info,

6. Considerations:
- Lorsque un releve est cree, automatiquement il est mis en attente.
- Lorsque un releve est validé (au moins 1 si releve > 1 pour le chantier), automatiquement le chantier status = en cours
- Lorsque un revele (releve unique pour chantier) est non-validé, alors chantier est set à devis. Si releve > 1, chantier est set a devis seulement si tous les relevés sont non-validé.


****
Things to consider:
- imprimer Releve (choix de print tout, ou métier spécifiques ou ouvrage spécifique)
- dupliquer devis et on peut modifier le contenu du devis (nombre, quantité, etc)
****

7. Renome Chantier (dans webapp) comme Chantiers et devis

Au lieu de Chantiers et devis, Nous allons les deplacer dans Clients. Renomme Clients comme Clients et chantiers. Sur clique, on a la liste des clients. On clique sur un client, on a la liste des chantiers du client. (Comme chantiers et devis presentement). Enleve Chantier et devis

8. Quelques changements
- Dans details clients,
    - Affiche Nom du client - telephone 1 (/ telephone 2 si telephone 2 exist)
    - Ajoute bouton modifier client a droite. On clique, modal formulaire modification du client
    - Retour à la liste des clients (au lieu de retour clients et chantiers)
    - Recherche cherche match dans nom du chantier, adresse, ou notes du chantier. Pas client et telephone. Cela est reserve a la liste des clients
    - Hover sur les lignes highlight en dark orange. Sur clique de la ligne, ouvre les details (peu importe ou sur la ligne, not limited to the name). Cela s applique a toutes les listes

9. Populare la page Ouvrage, similaire a Clients et chantier - layout et contenu (liste puis details avec modifier bouton)

10. Populate la page Article, similaire a Ouvrage

11. Je veux pouvoir permettre et a chaque entreprise de cree leur propre métier en plus des metiers par défaut existant. Chaque entreprise pourra ajouter ou supprimer des métiers, ainsi que leur ordre d'affichage lors de la prise de dimension à partir du compte admin (mobile. Nous ferrons le web après)

12. En plus de supprime le dans metier entreprise, ajoute ind_actif 0/1, 1 par defaut. 
Remplace delete bouton dans mobile par une case qui est coche ou non. Cocher veut dire ind_actif = 1, donc il apparait lors des prises de dimension. Non-cocher, ind_actif = 0, donc n apparait pas lors de la prise de nouvelle dimension. 
Fait la meme chose pour ouvrage. Un ouvrage peut etre actif ou non.

Note: Pour un releve existant, ind_actif n a pas d effet. ie. si un metier (ou ouvrage) est inactif, si il avait ete ajoute a un releve precedent, le releve montre toujours le metier (ou ouvrage).

13. Ajoute un ordre pour les ouvrages aussi (par metier). Donc si un metier est selectionné, les ouvrages seront ordonné par rapport à l ordre. Dans liste ouvrage (mobile), similair a metier, permet a un admin de reordonner respectivement.


14. Dans web, au lieu de Ouvrages, on cree Métiers et ouvrage.
Similaire Clients et chantiers, liste des métiers d'abord, puis liste des ouvrages dans ce métiers, etc. Meme layout que Clients et chantiers.
Fait pareil pour Articles. Donc on a Métiers et articles.
Similaire Clients et chantiers, liste des métiers d'abord, puis liste des articles dans ce métiers, etc. Meme layout que Clients et chantiers.


16. Voici les métiers par defaut, défini pour tout les nouveaux comptes et comptes existants.
Menuiserie alu
Menuiserie métallique
Vitrage et verre
Gros oeuvres
Peinture
Carrélage
Électricité et clim
Courant faible
Plomberie et sanitaire
Étanchéité et toiture
Divers


17. Persiste deux champ dans table entreprise (ind_admin_connecte_mobile et ind_metiers_preselectionnes).
ind_admin_connecte_mobile = 1 des que 1 admin (au moins 1 si plusieurs admin) de l entreprise se connectera SUR mobile (pas webadmin).
ind_metiers_preselectionnes = 1 des que 1 admin preselectionne les metiers pour une premiere fois.

18. Je trouve que la table metier_entreprise et metier sont redondant. Les metiers doivent etre lie aux entreprise de toute facon. A la creation d une entreprise, a la premiere connexion de l admin (sur mobile), voici les actions suivantes:
- ind_admin_connecte_mobile passe de 0 a 1
- puis, il verra un pop up ou il devra selectionner (pas creation ici) les metiers pour son entreprise (a partir de la liste par defaut). Les comptes free peuvent choisir max 3.
Les metiers sont alors cree pour ces entreprise dans la table metier en base (unique table maintenant assiciant le id de l entreprise avec ses metiers). Sur validation des metiers, alors ind_metiers_preselectionnes = 1 et acces a l ecran chantier.

15. Deplace parametres juste en haut de profil.
- Dans paramètres, permet de modifier les info de l'entreprise (comme dans mobile)
- De meme que 