1. En plus des ouvrages et leur dimension pour cree un releve, on ajoute des articles avec leur prix.
D abord ajoute les tables (en images) dans la base de donnees. Montre moi d abord les models ecrit, je confirme l implementation
Article a les meme liens de Ouvrages

2. Implemente les nouvelles tables

3. Frontend: Met a jour le frontend comme suit:
- Apres le choix du metier, sur l ecran de l ouvrage, ajoute a sliding bouton en haut (en bas du metier, occupe toute la ligne) pour choisir entre ouvrage ou article. Par defaut, sur ouvrage.
- De la bas, exactement la meme chose comme si on ajoutais/choisissait un ouvrage.

4. Dans le modal nouvel article, ajoute le champ fournisseur. C est un champ search et input.
A l entree si le fournisseur existe (search nom et telephone 1 et 2), montre la liste des matchs, si n existe pas, alors sur cree, le fournisseur avec ce nom est aussi cree, avec un telephone +223. On travaillera sur comment modifier fournisseur apres

5. Apres reflection, je veux modifier le schema. Au lieu de cree article et article unite, je pense ajouter juste un ind_article = 0 par defaut a ouvrage.
La table ouvrage va alors herite de fournisseur (peut etre NULL).

Cependant les mis a jours au niveau du frontend reste valide, sauf que on ne va plus utiliser les tables articles et articles unite, mais juste le flag ind_article pour identifier la liste des articles et la creation d article. 

Que penses tu? n implemente rien d abord.

Applique ces modifications.

6. Pour les unites ou ind_dimension = 1, dans le choix de l unite montre entre parenthese le nom de l unite. Eg. lxh (u), lxh (m2), etc.

7. Pour l unite lxhxe, dans le pave ajoute le champ epaisseur. Donc largeur, hauteur, épaisseur. Si le nom de l unite est u, alors

8. Met a jour le pave numerique. Deplace les boutons inputs (largeur, etc) en haut. Ils remplace l x h x n. Ajoute x entre eux.

9. pour l unite lxhxe, ajoute un quatrieme champ epaisseur dans le pave (avant nombre).

10. Je n aime pas le champs fournisseur. J ai dit c est un seul champ nom du fournisseur (pas de telephone) qui agit comme un search bar aussi, pas de search bar separer. si des fournisseurs match le nom ou le numero de telephone 1 ou 2, alors affiche les dans un drop down. Si non, alors un nouveau fournisseur avec le nom entrée est cree automatiquement 

11. Dans PDF releve, ind_dimension = 1, alors affiche l unite (formule avec espace entre lettres). Pas toujour lxhxn. Ex. si lxhxe, alors l x h x e x n

12. Si lxhxe est l unite, dans modifier, e ne reconduit pas le chiffre

13. Dans devis, n affiche pas le libelle de l unite dans la designation (ex. lxhxn, u)

14. Lorsque ind_dimension = 1 et que nom_unite != u, alors:
- Dans pdf, apres les dimensions, affiche = x y, ou x est la formule (ex. lxh, lxhxe) et y est nom_unite (ex. m2)
- Dans devis, designation, affiche la formule (ex. lxh, lxhxe) et dans la quantite affiche la quantite total qui est formule x n (ex. lxhxn m2, etc)

15. Ajoute un champ remise a la table releve.
Dans l enregistrement client et chantier (user A et S seulement), affiche le champ remise en bas (apres photo 3).

16. Update le champ nom du client, meme chose que Fournisseur (new et search dropdown at the same time).
Meme chose que nom de chantier. search seulement parmi les chantiers du client selectionne

17. Ajoute le champ ind_tva a la table releve.
Dans client et chantier (frontend), ajoute un toggle TVA oui ou non en bas de remise. Le toggle est egale par default a ind_tva (1 or 0) dans entreprise.
Lorsque il est 0, alors on n applique pas de TVA a cette facture particuliere.
Aussi en bas de tva, montre tous les montant:
- montant Remise
- montant HT
- montant TVA (si ind_tva releve = 1)
- montant TTC (si ind_tva releve = 1)

Ajuste le contenu du devis aussi

18. Dans le mobile, en plus du bouton sync, lorsque un fait un pull de l'écran (sur les pages suivantes - liste chantiers, liste clients, liste métier, liste Ouvrage/articles), sync automatiquement (meme action que clique sur bouton sync)

19. Dans mobile, client et chantier, chantier search dropdown ne marche pas. 
Il doit etre similaire au nom du client. Lorsque le client est selectionné (et existant), alors, dans nom de chantier, search parmi les chantiers de client pour montre les matches.

20. Presentement, lorsque un chantier existe et que un nouveau releve est fait, il ecrase le releve precedent. Cela ne doit pas etre le cas. Il y a une difference entre cela et modifier un releve existant.
Lorsque un nouveau releve est cree pour un chantier existant, automatiquement cela cree un nouveau releve (n ecrase pas l existant). Dans le mobile, on voit deux releve different.
Dans l ecran admin web, c est un seul chantier, mais sur les details, on voit deux releve, deux devis.

21. Sur mobile, modifier, pdf et devis automatiquement selectionne le plus recent releve presentement dans details chantier.
Je veux les mdoifications suivantes:
Si nombre de releve > 1:
- Dans liste chantiers, au lieu de date et prise par, montre le nombre de releve de la forme: X Relevés, ou X est le nombre de releve.
- Dans details, montre la liste des relevés avec les dates et prises par (card similaire au card liste des chantiers).
- On clique, montre les details du releves (page details chantier presentement).

22. Ajoute un champ status a la table releve. Les valeurs possibles sont:
- E (En attente)
- V (Validé)
- N (Non-validé)

23. Un ouvrage peut avoir multiple unite, dans mobile, fait les changements suivants:
- Lors de la creation de ouvrage, nom ouvrage est un search drop down. Lorsque l entree match des ouvrage existant, affiche les pour selection. Si selection (ou non selection), cree nouveau ouvrage. Mais si selection et que la combinaison (ouvrage et unite) existe deja, alors cree disabled.
- Lors que un ouvrage est selectionné et nombre unité > 1, alors modal to select parmi les unites existant

24. Dans le devis, Il doit y avoir une difference entre l affichage des lignes releves pour les ind_dimension = 1 et nom_unite = u vs nom_unite = autres (Ex. m2, etc).
- Pour ind_dimension = 1 et nom_unite != u, dans le devis, dans la designation c est formule x n. Ex. si lxh, alors dans designation lxhxn.
Ne change rien dans le releve PDF.

25. 

Pour une unite dimensionel, si ind_dimension = 1 et nom_unite != u, alors il y a les particularite suivantes:
    - dans devis, designation affiche formule x n. Ex. si formule = lxh, alors affiche lxhxn (ie. ajoute x n)
    - dans details et recapitulatif et pave, quantite = formule x n.

P.U applique change pour ind_dimension dependemment de nom_unite.
    - si nom_unite != u, alors P.U applique est P.U catalogue toujours (ie. n est pas P.U x l x h). ie. Montant = P.U applique x n (meme chose dans devis)
    - si nom_unite = u, comportement actuel maintenu

26.
Ajoute les champ entete_1 et entete_2 a entreprise. Ceci apparaitra sur le DEVIS, sous nom de l entreprise. N affiche pas le numero de l entreprise sous le nom de l entreprise. juste les entete_1 and entete_2 apparaisse.

27. 
Enleve les entetes du footer dans devis.
Centre le nom de l entreprise sur les devis et le releve PDF
Le nom sur la meme ligne que le logo. Les entetes en bas du nom

28.