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


3. Compte Pro:
- Rapport visible pour Admin et Commercial 