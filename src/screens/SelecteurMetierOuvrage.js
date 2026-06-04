import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button, Chip, Text } from 'react-native-paper';
import { getMetiersForEntrepriseLocal, getOuvragesByMetierAndEntreprise, getUnitesEtPrixParOuvrage } from '../db/querries';
import { chantierColors } from '../styles/theme';

export default function SelecteurMetierOuvrage({
  entrepriseId,
  onSelectionComplete,
  bottomOffset = 0,
}) {
  const [metiers, setMetiers] = useState([]);
  const [metierActif, setMetierActif] = useState(null);
  const [step, setStep] = useState('metier');
  const [ouvrages, setOuvrages] = useState([]);
  const [unitesPrix, setUnitesPrix] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMetiers, setLoadingMetiers] = useState(true);
  const [ouvrageActif, setOuvrageActif] = useState(null);
  const [uniteActive, setUniteActive] = useState(null);

  const hasMetier = useMemo(() => Boolean(metierActif), [metierActif]);

  useEffect(() => {
    const loadMetiers = async () => {
      if (!entrepriseId) {
        setMetiers([]);
        return;
      }
      try {
        setLoadingMetiers(true);
        const data = await getMetiersForEntrepriseLocal(entrepriseId);
        setMetiers(data || []);
      } catch (error) {
        console.error('Erreur chargement metiers:', error);
        setMetiers([]);
      } finally {
        setLoadingMetiers(false);
      }
    };
    loadMetiers();
  }, [entrepriseId]);

  const handleChooseMetier = async (metier) => {
    if (!entrepriseId) return;
    setMetierActif(metier);
    setStep('ouvrage-unite');
    setOuvrageActif(null);
    setUniteActive(null);
    setUnitesPrix([]);
    setLoading(true);
    try {
      const data = await getOuvragesByMetierAndEntreprise(metier.id, entrepriseId);
      setOuvrages(data || []);
    } catch (error) {
      console.error('Erreur chargement ouvrages:', error);
      setOuvrages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleChooseOuvrage = async (ouvrage) => {
    setOuvrageActif(ouvrage);
    setUniteActive(null);
    try {
      const data = await getUnitesEtPrixParOuvrage(ouvrage.id);
      setUnitesPrix(data || []);
      if (data?.length) {
        setUniteActive(data[0]);
      }
    } catch (error) {
      console.error('Erreur chargement unites/prix:', error);
      setUnitesPrix([]);
    }
  };

  const confirmSelection = () => {
    if (!metierActif || !ouvrageActif || !uniteActive) return;
    onSelectionComplete?.({
      metier: metierActif,
      ouvrage: ouvrageActif,
      ouvrageUnite: uniteActive,
    });
  };

  return (
    <View style={[styles.container, { paddingBottom: bottomOffset + 8 }]}>
      <Text variant="headlineSmall" style={styles.title}>
        1) Choisissez le metier
      </Text>
      {loadingMetiers ? (
        <ActivityIndicator size="large" color={chantierColors.primary} />
      ) : metiers.length === 0 ? (
        <Text style={styles.infoText}>Aucun metier disponible. Connectez-vous en ligne pour synchroniser le catalogue depuis Supabase.</Text>
      ) : (
        <View style={styles.metierGrid}>
          {metiers.map((metier) => (
            <Button
              key={metier.id}
              mode={metierActif?.id === metier.id ? 'contained' : 'outlined'}
              onPress={() => handleChooseMetier(metier)}
              style={styles.metierButton}
              contentStyle={styles.metierContent}
              buttonColor={metierActif?.id === metier.id ? chantierColors.primary : chantierColors.surface}
              textColor={metierActif?.id === metier.id ? '#FFFFFF' : chantierColors.text}
              disabled={!entrepriseId}
            >
              {metier.nom}
            </Button>
          ))}
        </View>
      )}

      {!entrepriseId && (
        <Text style={styles.infoText}>Entreprise non disponible. Connectez-vous apres synchronisation.</Text>
      )}

      {step === 'ouvrage-unite' && (
        <View style={styles.bottomPanel}>
          <Text variant="titleLarge" style={styles.subtitle}>
            2) Choisissez l'ouvrage
          </Text>

          {!hasMetier ? (
            <Text style={styles.infoText}>Selectionnez un metier pour charger ses ouvrages.</Text>
          ) : loading ? (
            <ActivityIndicator size="large" color={chantierColors.primary} />
          ) : ouvrages.length === 0 ? (
            <Text style={styles.infoText}>Aucun ouvrage trouve pour ce metier.</Text>
          ) : (
            <View style={styles.chipWrap}>
              {ouvrages.map((ouvrage) => (
                <Chip
                  key={ouvrage.id}
                  selected={ouvrageActif?.id === ouvrage.id}
                  onPress={() => handleChooseOuvrage(ouvrage)}
                  style={styles.chip}
                  selectedColor={chantierColors.primary}
                >
                  {ouvrage.nom}
                </Chip>
              ))}
            </View>
          )}

          {unitesPrix.length > 0 && (
            <View style={styles.prixPanel}>
              <Text style={styles.prixTitle}>3) Choisissez l'unite</Text>
              <View style={styles.chipWrap}>
                {unitesPrix.map((item) => (
                  <Chip
                    key={item.ouvrage_unite_id}
                    selected={uniteActive?.ouvrage_unite_id === item.ouvrage_unite_id}
                    onPress={() => setUniteActive(item)}
                    style={styles.chip}
                    selectedColor={chantierColors.success}
                  >
                    {item.nom} ({item.formule})
                  </Chip>
                ))}
              </View>
            </View>
          )}

          <Button
            mode="contained"
            onPress={confirmSelection}
            disabled={!ouvrageActif || !uniteActive}
            style={styles.confirmButton}
            contentStyle={styles.confirmContent}
            buttonColor={chantierColors.success}
            textColor="#FFFFFF"
          >
            Continuer vers la saisie
          </Button>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: chantierColors.background,
    paddingHorizontal: 12,
    paddingTop: 8,
    justifyContent: 'space-between',
  },
  title: {
    color: chantierColors.text,
    fontWeight: '800',
    marginBottom: 10,
  },
  metierGrid: {
    gap: 10,
    marginBottom: 12,
  },
  metierButton: {
    borderColor: chantierColors.border,
  },
  metierContent: {
    minHeight: 62,
  },
  bottomPanel: {
    minHeight: '42%',
    backgroundColor: chantierColors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: chantierColors.border,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  subtitle: {
    color: chantierColors.text,
    fontWeight: '700',
    marginBottom: 10,
  },
  infoText: {
    color: chantierColors.muted,
    fontSize: 16,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    backgroundColor: '#FFF5F1',
  },
  confirmButton: {
    marginTop: 8,
  },
  confirmContent: {
    minHeight: 58,
  },
  prixPanel: {
    marginBottom: 8,
  },
  prixTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: chantierColors.text,
    marginBottom: 6,
  },
});
