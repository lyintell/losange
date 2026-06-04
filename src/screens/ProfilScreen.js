import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Surface, Text } from 'react-native-paper';
import { FlowBackFab } from '../components/terrain/TerrainFlowFabs';
import { getLoggedInProfilViewLocal } from '../db/querries';
import { chantierColors } from '../styles/theme';

function AccountBadge({ isPro }) {
  return (
    <View style={[styles.badge, isPro ? styles.badgePro : styles.badgeFree]}>
      <Text style={[styles.badgeText, isPro ? styles.badgeTextPro : styles.badgeTextFree]}>
        {isPro ? 'PRO' : 'Gratuit'}
      </Text>
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text variant="labelLarge" style={styles.infoLabel}>
        {label}
      </Text>
      <Text variant="bodyLarge" style={styles.infoValue}>
        {value || '—'}
      </Text>
    </View>
  );
}

export default function ProfilScreen({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [profil, setProfil] = useState(null);

  const loadProfil = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getLoggedInProfilViewLocal();
      setProfil(data);
    } catch (error) {
      console.error('Erreur chargement profil:', error);
      setProfil(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfil();
  }, [loadProfil]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text variant="headlineSmall" style={styles.title}>
            Profil
          </Text>
          {!loading && profil ? <AccountBadge isPro={profil.is_pro} /> : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={chantierColors.primary} />
        </View>
      ) : profil ? (
        <Surface style={styles.card} elevation={1}>
          <InfoRow label="Role" value={profil.role_label} />
          <InfoRow label="Entreprise" value={profil.entreprise_nom} />
          <InfoRow label="Prenom" value={profil.prenom} />
          <InfoRow label="Nom" value={profil.nom} />
        </Surface>
      ) : (
        <Surface style={styles.card} elevation={1}>
          <Text variant="bodyLarge" style={styles.emptyText}>
            Profil introuvable.
          </Text>
        </Surface>
      )}

      <FlowBackFab onPress={onBack} smallCountBelow={0} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: chantierColors.background,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: chantierColors.border,
    marginHorizontal: -12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  title: {
    color: chantierColors.text,
    fontWeight: '800',
    fontSize: 34,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  badgePro: {
    backgroundColor: '#FEE2E2',
  },
  badgeFree: {
    backgroundColor: '#E9ECEF',
  },
  badgeText: {
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.4,
  },
  badgeTextPro: {
    color: chantierColors.danger,
  },
  badgeTextFree: {
    color: chantierColors.muted,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 12,
    backgroundColor: chantierColors.surface,
    borderWidth: 1,
    borderColor: chantierColors.border,
    padding: 16,
    gap: 14,
  },
  emptyText: {
    color: chantierColors.muted,
    fontWeight: '600',
  },
  infoRow: {
    gap: 4,
  },
  infoLabel: {
    color: chantierColors.muted,
    fontWeight: '700',
  },
  infoValue: {
    color: chantierColors.text,
    fontWeight: '600',
  },
});
