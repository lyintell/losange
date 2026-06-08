1. Nous allons implementer des restrictions.

- Excepté compte A, aucun utilisateur ne peut modifier un chantier ou releve qu il n a pas pris lui meme
    ie. current user id is different from pris_par_id.
    Mais si current user est Admin (A), alors il peut modifier tout.
    
- Excepté compte A, aucun utilisateur ne peut modifier profil

- Compte C et T: 
    Dans details chantier,
        Masquer bouton devis
    Sur recapitulatif, 
        Masquer les P.U
    Dans le pave numerique (entree des lignes de releve)
        Masquer bouton Prix 
        Masquer P.U et Montant 

2. Comptes Gratuit:
- Max 10 chantiers a la fois
- Max 10 clients distinct a la fois
- Max 1 utilisateur
- Max choix de 3 metiers (basé sur tri dans Métier dans menu Plus)
- Max 10 ouvrages par metier a la fois
- Pas de OK par ligne releve (double tap)
- Pas de sync cloud excepte l entreprise et le profil
- Pas de partage whatsapp, juste telecharger
- Pas de TVA dans devis (et TVA disabled dans modifier Entreprise). 
- Pas de logo at all dans le header de devis et PDF
- Rapport disabled dans Plus


3. Lorsque un compte change de Gratuit a pro, la sync commence seulement a partir du moment ou le changement se passe (Ecran master).
Lorsque un compte change de Pro a gratuit, alors tous ses donnees supprimable sont supprimer (supprime_le set) automatiquement sur le cloud et les privileges sont enleve (max client et chantier appliqué, logo, etc).
Developpe un plan pour implementer ceci pour ma validation

Sauvegarde le plan dans /prompts/upgrade_downgrade.md et implemente le. Je valide les 5 points en utilisant tes recommendations

4. Compte pro, Rapport disabled pour user C et T

5. Base de donnees -> Metier et Ouvrages doit etre visible seulement pour A 
Base de donnees -> Client details, Modifier et Supprimer doivent etre disabled pour tout compte sauf A


6. 
C et T peuvent cree de nouvel ouvrage dans l ecran nouveau releve / modifier releve

Lors de la creation d ouvrage (nouveau releve), si nom de l ouvrage existe deja (ignorer capital / minuscule), disabled le bouton valider.

7.
Lorsque C ou T crée nouvel ouvrage, par defaut, P.U = 1 et ne peut pas etre changé
C et T ne peuvent pas modifier P.U appliqué dans pave

8.
Devis Telecharger ou Whatsapp change status en Devis.
PDF Telecharger ou Whatsapp ne doit pas changer le status

9. Liste de chantier
- Card : ajoute prise par xxx . ie. date (prise par xxx)
- Trier liste par date.

10. 
Compte S:
- Please Disable + cree nouveau releve et + ajouter ligne releve.
Cependant peut modifier information Client / chantier. Peut aussi modifier prix unitaire appliqué par ligne de releve. Ne peut pas modifier largeur et hauteur dans pavé. Peut modifier nombre. 

Peut voir et modifier ouvrages (dans base de données).

