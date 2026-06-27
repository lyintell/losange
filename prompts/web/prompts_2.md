1. Dans webapp, lors de modifier devis, affiche les dimensions devant l ouvrage (tel qu elles apparaissent sur devis)

2. Pour le moment dans webapp, enleve parametres.
Remplace Accueil par Tableau de bord.
Dans la nav (la ou ecrit accueil), Bonjour x (x=prenom de l utilisateur).
Montres des statistiques pertinentes dans le contenu dans des cards colorees avec icons:
- Nombre de chantier total et par status
- Nombre de devis (releve) par status
- Montant total devis, moyen total devis, moyen par status

3. Je veux ajouter une table section dans la base de donnee, avec le field nom obligatoire.
Cette table sera pour pouvoir entrer les dimensions par section (ex. RDC, salon, étage, etc).
- La section est effecté par entreprise (comme métier).
- Met a jour le master screen en conséquence (données section)
- Nous travaillerons sur l'utilisation après (mobile)

Ajoute section_releve aussi, pour tenir compte du fait dans un releve on peut avoir plusieurs sections, comme une section peut aussi etre présente dans plusieurs relevés.

Ajoute le champ ordre à section_releve, qui contiendra l'ordre dans lequel une section apparait dans un releve particulier (ex. RDC en 1er, puis Étage 1 en 2eme, etc)

4. Dans mobile, lors de la création de relevés, section vient juste après le choix de l'ouvrage. Selectionne ou créer (meme format que selection ou création de ouvrage).
le back a partir des ouvrages ramène à la selection de section.

Dans le récapitulatif, les ouvrages sont triés par section. On peut aussi réordonner les sections a partir du récapitulatif (en drag and drop les section). Tout ligne releve en bas d une section appartient a cette section.

Nous discuterons de l apparence dans devis et PDF après. Pour le moment focus on comment ajouté une section.

Non, je me suis trompé. Le choix de la section vient avant l ouvrage

5. Ajoute un champ ordre dans ligne releve. Ceci sera utilise pour trier l ordre des lignes
dans les devis et les releves pdf. 

6. Dans recapitulatif, on peut drag et drop les lignes de releves. Cela determine l ordre.
On peut deplacer les lignes de releves d une section a une autre.
Enleve le drag and drop pour les sections. On clique sur la section, on peut changer la section (choix section).

7. Lorsque une entreprise est cree, automatiquement la section "Pas de section" est creee. 
Cette section reste en tete sur mobile (choix de section).

8. L ordre n est pas consistent! surtout apres retour.
Toujours, que ce soit nouveau releve, ou modifier (recap)
Section -> Metier -> Ouvrage -> Ligne
Les boutons retours vont dans ce sens aussi, et si on est n importe ou dans l etape, ca suit cet ordre