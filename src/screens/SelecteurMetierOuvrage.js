import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';
import ChoixUniteModal from '../components/terrain/ChoixUniteModal';
import LosangeLogoLoader from '../components/terrain/LosangeLogoLoader';
import MobileButton from '../components/terrain/MobileButton';
import { getMetiersForSelectionLocal, getOuvragesByMetierAndEntreprise, getUnitesEtPrixParOuvrage } from '../db/querries';
import { formatUniteChoiceLabel } from '../utils/formatUniteChoiceLabel';
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
  const [loading, setLoading] = useState(false);
  const [loadingMetiers, setLoadingMetiers] = useState(true);
  const [ouvrageActif, setOuvrageActif] = useState(null);
  const [uniteActive, setUniteActive] = useState(null);
  const [choixUniteModal, setChoixUniteModal] = useState({
    visible: false,
    ouvrage: null,
    unites: [],
  });

  const hasMetier = useMemo(() => Boolean(metierActif), [metierActif]);

  useEffect(() => {
    const loadMetiers = async () => {
      if (!entrepriseId) {
        setMetiers([]);
        return;
      }
      try {
        setLoadingMetiers(true);
        const data = await getMetiersForSelectionLocal(entrepriseId);
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
    setLoading(true);
    try {
      const data = await getOuvragesByMetierAndEntreprise(metier.id, entrepriseId);
      const sorted = [...(data || [])].sort((a, b) =>
        String(a.nom || '').localeCompare(String(b.nom || ''), 'fr', { sensitivity: 'base' })
      );
      setOuvrages(sorted);
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
      const unites = data || [];

      if (unites.length === 1) {
        setUniteActive(unites[0]);
        return;
      }

      if (unites.length > 1) {
        setChoixUniteModal({ visible: true, ouvrage, unites });
      }
    } catch (error) {
      console.error('Erreur chargement unites/prix:', error);
    }
  };

  const handleChooseUniteFromModal = (unite) => {
    setChoixUniteModal({ visible: false, ouvrage: null, unites: [] });
    setUniteActive(unite);
  };

  const handleDismissChoixUniteModal = () => {
    setChoixUniteModal({ visible: false, ouvrage: null, unites: [] });
    setOuvrageActif(null);
    setUniteActive(null);
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
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomOffset + 16 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        <Text variant="headlineSmall" style={styles.title}>
          1) Choisissez le métier
        </Text>
        {loadingMetiers ? (
          <LosangeLogoLoader size="large" />
        ) : metiers.length === 0 ? (
          <Text style={styles.infoText}>Aucun métier disponible. Connectez-vous en ligne pour synchroniser le catalogue depuis Supabase.</Text>
        ) : (
          <View style={styles.metierGrid}>
            {metiers.map((metier) => (
              <MobileButton
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
              </MobileButton>
            ))}
          </View>
        )}

        {!entrepriseId && (
          <Text style={styles.infoText}>Entreprise non disponible. Connectez-vous après synchronisation.</Text>
        )}

        {step === 'ouvrage-unite' && (
          <View style={styles.bottomPanel}>
            <Text variant="titleLarge" style={styles.subtitle}>
              2) Choisissez l'ouvrage
            </Text>

            {!hasMetier ? (
              <Text style={styles.infoText}>Sélectionnez un métier pour charger ses ouvrages.</Text>
            ) : loading ? (
              <LosangeLogoLoader size="large" />
            ) : ouvrages.length === 0 ? (
              <Text style={styles.infoText}>Aucun ouvrage trouvé pour ce métier.</Text>
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

            {uniteActive ? (
              <View style={styles.prixPanel}>
                <Text style={styles.prixTitle}>Unité sélectionnée</Text>
                <Text style={styles.uniteSelectedLabel}>{formatUniteChoiceLabel(uniteActive)}</Text>
              </View>
            ) : null}

            <MobileButton
              mode="contained"
              onPress={confirmSelection}
              disabled={!ouvrageActif || !uniteActive}
              style={styles.confirmButton}
              contentStyle={styles.confirmContent}
              buttonColor={chantierColors.success}
              textColor="#FFFFFF"
            >
              Continuer vers la saisie
            </MobileButton>
          </View>
        )}
      </ScrollView>

      <ChoixUniteModal
        visible={choixUniteModal.visible}
        ouvrageNom={choixUniteModal.ouvrage?.nom || ''}
        unites={choixUniteModal.unites}
        onDismiss={handleDismissChoixUniteModal}
        onSelect={handleChooseUniteFromModal}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: 0,
    backgroundColor: chantierColors.background,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    gap: 12,
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
    minHeight: 64,
  },
  bottomPanel: {
    backgroundColor: chantierColors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: chantierColors.border,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 8,
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
    minHeight: 62,
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
  uniteSelectedLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: chantierColors.success,
  },
});
