import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import PaveNumerique from '../components/terrain/PaveNumerique';
import { insertLigneReleveLocal } from '../db/querries';
import { chantierColors } from '../styles/theme';
import {
  computeQuantiteLigneReleve,
  getRequiredCotesFromFormula,
  usesDimensionCotes,
} from '../utils/ligneReleveCalcul';

export default function PaveSaisieOneHand({
  releveId = '',
  ouvrageUniteId = '',
  prixUnitaireApplique = 0,
  isDimension = true,
  isUnitaire = false,
  uniteFormule = '',
  onSaved,
  bottomOffset = 0,
}) {
  const usesDimension = usesDimensionCotes(isDimension ? 1 : 0, isUnitaire ? 1 : 0);
  const requiredCotes = useMemo(
    () => getRequiredCotesFromFormula(uniteFormule, isDimension ? 1 : 0, isUnitaire ? 1 : 0),
    [uniteFormule, isDimension, isUnitaire]
  );

  const champs = useMemo(() => {
    if (!usesDimension) return ['nombre'];
    const fields = [];
    if (requiredCotes.needsLargeur) fields.push('largeur');
    if (requiredCotes.needsHauteur) fields.push('hauteur');
    if (requiredCotes.needsProfondeur) fields.push('profondeur');
    if (!fields.length) fields.push('largeur', 'hauteur');
    fields.push('nombre');
    return fields;
  }, [usesDimension, requiredCotes]);

  const [focusIndex, setFocusIndex] = useState(0);
  const [form, setForm] = useState({
    largeur: '',
    hauteur: '',
    profondeur: '',
    nombre: '1',
  });
  const [saving, setSaving] = useState(false);

  const focusField = champs[focusIndex];

  const quantitePreview = useMemo(() => {
    try {
      return computeQuantiteLigneReleve({
        indDimension: isDimension ? 1 : 0,
        indUnitaire: isUnitaire ? 1 : 0,
        formule: uniteFormule,
        largeur: form.largeur,
        hauteur: form.hauteur,
        profondeur: form.profondeur,
        nombre: form.nombre,
      });
    } catch {
      return 0;
    }
  }, [form.hauteur, form.largeur, form.profondeur, form.nombre, isDimension, isUnitaire, uniteFormule]);

  const handleKeyPress = (value) => {
    if (!focusField) return;
    if (value === 'Effacer') {
      setForm((prev) => ({ ...prev, [focusField]: prev[focusField].slice(0, -1) }));
      return;
    }
    if (value === '.' && form[focusField].includes('.')) return;
    setForm((prev) => ({ ...prev, [focusField]: `${prev[focusField]}${value}` }));
  };

  const moveToNextField = () => {
    setFocusIndex((prev) => (prev < champs.length - 1 ? prev + 1 : prev));
  };

  const handleSaveLine = async () => {
    if (!releveId || !ouvrageUniteId) {
      Alert.alert('Contexte incomplet', 'Le releve ou l ouvrage est manquant.');
      return;
    }

    const largeur = parseFloat(form.largeur || '0');
    const hauteur = parseFloat(form.hauteur || '0');
    const profondeur = parseFloat(form.profondeur || '0');
    const nombre = parseInt(form.nombre || '1', 10);
    let quantite = 0;

    try {
      quantite = computeQuantiteLigneReleve({
        indDimension: isDimension ? 1 : 0,
        indUnitaire: isUnitaire ? 1 : 0,
        formule: uniteFormule,
        largeur,
        hauteur,
        profondeur,
        nombre,
      });
    } catch (error) {
      Alert.alert('Formule invalide', error.message || 'Impossible de calculer la quantite.');
      return;
    }

    if (usesDimension) {
      if (requiredCotes.needsLargeur && !largeur) {
        Alert.alert('Valeurs invalides', 'Saisissez une largeur valide.');
        return;
      }
      if (requiredCotes.needsHauteur && !hauteur) {
        Alert.alert('Valeurs invalides', 'Saisissez une hauteur valide.');
        return;
      }
      if (requiredCotes.needsProfondeur && !profondeur) {
        Alert.alert('Valeurs invalides', 'Saisissez une profondeur valide.');
        return;
      }
      if (!nombre || !quantite) {
        Alert.alert('Valeurs invalides', 'Saisissez un nombre valide pour calculer la quantite.');
        return;
      }
    } else if (!nombre || !quantite) {
      Alert.alert('Valeurs invalides', 'Saisissez un Nombre valide.');
      return;
    }

    try {
      setSaving(true);
      await insertLigneReleveLocal(releveId, ouvrageUniteId, {
        largeur: usesDimension && requiredCotes.needsLargeur ? largeur : null,
        hauteur: usesDimension && requiredCotes.needsHauteur ? hauteur : null,
        profondeur: usesDimension && requiredCotes.needsProfondeur ? profondeur : null,
        nombre,
        quantite,
        prixUnitaireApplique,
      });

      setForm({ largeur: '', hauteur: '', profondeur: '', nombre: '1' });
      setFocusIndex(0);
      onSaved?.();
    } catch (error) {
      console.error('Erreur insertion ligne releve:', error);
      Alert.alert('Erreur', "Impossible d'enregistrer la ligne.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingBottom: bottomOffset + 8 }]}>
      <View style={styles.topResume}>
        <Text variant="titleMedium" style={styles.resumeTitle}>
          {usesDimension ? 'Cotes en cours' : 'Quantite en cours'}
        </Text>
        <Text style={styles.resumeText}>
          {usesDimension
            ? `L: ${form.largeur || '-'} | H: ${form.hauteur || '-'} | P: ${form.profondeur || '-'} | Nb: ${form.nombre || '1'} | Qt: ${quantitePreview.toFixed(2)}`
            : `Nb: ${form.nombre || '1'} | Qt: ${quantitePreview.toFixed(2)}`}
        </Text>
      </View>

      <View style={styles.center}>
        {champs.map((field, index) => (
          <Card
            key={field}
            style={[styles.valueCard, focusIndex === index && styles.valueCardActive]}
            onPress={() => setFocusIndex(index)}
          >
            <Card.Content>
              <Text style={styles.cardLabel}>{field.toUpperCase()}</Text>
              <Text style={styles.cardValue}>{form[field] || '0'}</Text>
            </Card.Content>
          </Card>
        ))}

        <Button
          mode="contained-tonal"
          onPress={moveToNextField}
          style={styles.nextButton}
          contentStyle={styles.nextButtonContent}
        >
          Champ suivant
        </Button>
      </View>

      <View style={styles.bottom}>
        <Button
          mode="contained"
          onPress={handleSaveLine}
          loading={saving}
          disabled={saving}
          style={styles.saveButton}
          contentStyle={styles.saveContent}
          buttonColor={chantierColors.success}
          textColor="#FFFFFF"
          labelStyle={styles.saveLabel}
        >
          VALIDER LA LIGNE
        </Button>
        <PaveNumerique onKeyPress={handleKeyPress} disabled={saving} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: chantierColors.background,
    justifyContent: 'space-between',
  },
  topResume: {
    paddingTop: 14,
    paddingHorizontal: 12,
  },
  resumeTitle: {
    color: chantierColors.text,
    fontWeight: '800',
  },
  resumeText: {
    marginTop: 4,
    color: chantierColors.muted,
    fontSize: 15,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    paddingHorizontal: 12,
    gap: 10,
    paddingTop: 12,
  },
  valueCard: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: chantierColors.border,
    backgroundColor: chantierColors.surface,
  },
  valueCardActive: {
    borderColor: chantierColors.primary,
    backgroundColor: '#FFF4EF',
  },
  cardLabel: {
    color: chantierColors.muted,
    fontWeight: '700',
  },
  cardValue: {
    marginTop: 4,
    fontSize: 34,
    fontWeight: '900',
    color: chantierColors.text,
  },
  nextButton: {
    marginTop: 4,
  },
  nextButtonContent: {
    minHeight: 54,
  },
  bottom: {
    minHeight: '42%',
    justifyContent: 'flex-end',
  },
  saveButton: {
    marginHorizontal: 12,
    marginBottom: 8,
  },
  saveContent: {
    minHeight: 62,
  },
  saveLabel: {
    fontSize: 18,
    fontWeight: '900',
  },
});
