import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Checkbox, Modal, Portal, Text } from 'react-native-paper';
import MobileButton from './MobileButton';
import { getMaxMetierPreselectionCount, preselectMetiersRemote } from '../../db/metiersPreselection';
import { DEFAULT_METIER_TEMPLATES } from '../../utils/defaultMetiers';
import { getMetierColor } from '../../utils/metierColors';
import { chantierColors } from '../../styles/theme';

const MODAL_BODY_MAX_HEIGHT = Math.round(Dimensions.get('window').height * 0.85);

export default function PreselectionMetiersModal({ visible, entrepriseId, onCompleted }) {
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [maxSelection, setMaxSelection] = useState(3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setSelectedKeys(new Set());
    setError('');
    getMaxMetierPreselectionCount().then(setMaxSelection).catch(() => setMaxSelection(3));
  }, [visible]);

  const selectionCount = selectedKeys.size;
  const canValidate = selectionCount > 0 && selectionCount <= maxSelection;

  const hint = useMemo(() => {
    if (maxSelection >= DEFAULT_METIER_TEMPLATES.length) {
      return 'Sélectionnez les métiers de votre entreprise.';
    }
    return `Compte gratuit : choisissez jusqu'à ${maxSelection} métiers.`;
  }, [maxSelection]);

  const toggleTemplate = (templateKey) => {
    setError('');
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(templateKey)) {
        next.delete(templateKey);
        return next;
      }
      if (next.size >= maxSelection) {
        setError(`Maximum ${maxSelection} métier${maxSelection > 1 ? 's' : ''}.`);
        return prev;
      }
      next.add(templateKey);
      return next;
    });
  };

  const handleValidate = async () => {
    if (!entrepriseId || !canValidate) return;
    setSaving(true);
    setError('');
    try {
      const result = await preselectMetiersRemote({
        entrepriseId,
        templateKeys: [...selectedKeys],
      });
      if (!result.ok) {
        setError(result.error || 'Enregistrement impossible.');
        return;
      }
      onCompleted?.();
    } catch (saveError) {
      setError(saveError?.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <Modal visible={visible} dismissable={false} contentContainerStyle={styles.modal}>
        <Text variant="headlineSmall" style={styles.title}>
          Choisissez vos métiers
        </Text>
        <Text style={styles.subtitle}>{hint}</Text>
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {DEFAULT_METIER_TEMPLATES.map((template) => {
            const checked = selectedKeys.has(template.templateKey);
            const color = getMetierColor(template.templateKey);
            return (
              <Pressable
                key={template.templateKey}
                style={[styles.row, checked && styles.rowSelected]}
                onPress={() => toggleTemplate(template.templateKey)}
              >
                <Checkbox status={checked ? 'checked' : 'unchecked'} color={chantierColors.accent} />
                <View style={styles.rowText}>
                  <Text style={[styles.metierName, { color }]}>{template.nom}</Text>
                  {template.abbrev ? <Text style={styles.abbrev}>{template.abbrev}</Text> : null}
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.counter}>
          {selectionCount} / {maxSelection} sélectionné{selectionCount > 1 ? 's' : ''}
        </Text>
        <MobileButton
          mode="contained"
          onPress={handleValidate}
          loading={saving}
          disabled={!canValidate || saving}
          style={styles.validateButton}
        >
          Valider mes métiers
        </MobileButton>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    marginHorizontal: 16,
    marginBottom: 24,
    maxHeight: MODAL_BODY_MAX_HEIGHT,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  title: {
    fontWeight: '700',
    color: chantierColors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    color: chantierColors.textSecondary,
    marginBottom: 12,
  },
  list: {
    maxHeight: MODAL_BODY_MAX_HEIGHT - 220,
  },
  listContent: {
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
  },
  rowSelected: {
    backgroundColor: '#fff4eb',
  },
  rowText: {
    flex: 1,
    marginLeft: 4,
  },
  metierName: {
    fontSize: 18,
    fontWeight: '600',
  },
  abbrev: {
    color: chantierColors.textSecondary,
    fontSize: 14,
  },
  error: {
    color: chantierColors.danger,
    marginTop: 8,
  },
  counter: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 12,
    color: chantierColors.textSecondary,
  },
  validateButton: {
    borderRadius: 12,
  },
});
