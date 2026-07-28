import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Surface, Text, TextInput } from 'react-native-paper';
import { changeTerrainPassword } from '../auth/terrainAuth';
import LosangeLogoLoader from '../components/terrain/LosangeLogoLoader';
import TerrainPhotoInput from '../components/terrain/TerrainPhotoInput';
import {
  getLoggedInProfilViewLocal,
  isLoggedInAdminLocal,
  setEntrepriseLogoLocal,
  updateEntrepriseAdminLocal,
} from '../db/querries';
import { resolveTerrainImageUri } from '../db/terrainImageStorage';
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

function TvaToggle({ value, onChange, disabled = false }) {
  const isOui = Number(value) === 1;

  return (
    <View style={styles.tvaToggleRow}>
      <Pressable
        disabled={disabled}
        onPress={() => onChange(1)}
        style={[styles.tvaOption, isOui && styles.tvaOptionActive]}
      >
        <Text style={[styles.tvaOptionText, isOui && styles.tvaOptionTextActive]}>Oui</Text>
      </Pressable>
      <Pressable
        disabled={disabled}
        onPress={() => onChange(0)}
        style={[styles.tvaOption, !isOui && styles.tvaOptionActive]}
      >
        <Text style={[styles.tvaOptionText, !isOui && styles.tvaOptionTextActive]}>Non</Text>
      </Pressable>
    </View>
  );
}

const formatTvaLabel = (value) => (Number(value) === 1 ? 'Oui' : 'Non');

export default function ProfilScreen({
  entrepriseId,
  editing = false,
  saveRequestId = 0,
  bottomOffset = 0,
  onAdminStatusChange,
  onEditingChange,
  onSaveComplete,
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profil, setProfil] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [entrepriseNom, setEntrepriseNom] = useState('');
  const [entete1, setEntete1] = useState('');
  const [entete2, setEntete2] = useState('');
  const [indTva, setIndTva] = useState(0);
  const [logoPreviewUri, setLogoPreviewUri] = useState(null);
  const [logoMimeType, setLogoMimeType] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const loadProfil = useCallback(async () => {
    try {
      setLoading(true);
      const [data, admin] = await Promise.all([
        getLoggedInProfilViewLocal(),
        isLoggedInAdminLocal(),
      ]);
      setProfil(data);
      setIsAdmin(admin);
      setEntrepriseNom(data?.entreprise_nom || '');
      setEntete1(data?.entreprise_entete_1 || '');
      setEntete2(data?.entreprise_entete_2 || '');
      setIndTva(Number(data?.entreprise_ind_tva) === 1 ? 1 : 0);
      setLogoPreviewUri(null);
      setLogoMimeType(null);
      onAdminStatusChange?.(admin);
    } catch (error) {
      console.error('Erreur chargement profil:', error);
      setProfil(null);
      setIsAdmin(false);
      onAdminStatusChange?.(false);
    } finally {
      setLoading(false);
    }
  }, [onAdminStatusChange]);

  useEffect(() => {
    loadProfil();
  }, [loadProfil]);

  useEffect(() => {
    if (!editing || !profil) return;
    setEntrepriseNom(profil.entreprise_nom || '');
    setEntete1(profil.entreprise_entete_1 || '');
    setEntete2(profil.entreprise_entete_2 || '');
    setIndTva(Number(profil.entreprise_ind_tva) === 1 ? 1 : 0);
    setLogoPreviewUri(null);
    setLogoMimeType(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }, [editing, profil]);

  useEffect(() => {
    if (editing) return;
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }, [editing]);

  const handleSave = useCallback(async () => {
    if (saving) return;

    const canEditEntreprise = isAdmin && editing;
    const wantsPasswordChange = Boolean(
      currentPassword.trim() || newPassword.trim() || confirmPassword.trim()
    );

    if (canEditEntreprise) {
      const trimmedNom = entrepriseNom.trim();
      if (!trimmedNom) {
        Alert.alert('Entreprise', "Le nom de l'entreprise est requis.");
        return;
      }
    } else if (!wantsPasswordChange) {
      Alert.alert('Profil', 'Aucune modification à enregistrer.');
      return;
    }

    if (wantsPasswordChange) {
      if (!currentPassword.trim()) {
        Alert.alert('Mot de passe', 'Indiquez votre mot de passe actuel.');
        return;
      }
      if (!newPassword.trim()) {
        Alert.alert('Mot de passe', 'Indiquez le nouveau mot de passe.');
        return;
      }
      if (newPassword !== confirmPassword) {
        Alert.alert('Mot de passe', 'La confirmation ne correspond pas.');
        return;
      }
    }

    try {
      setSaving(true);

      if (canEditEntreprise && entrepriseId) {
        await updateEntrepriseAdminLocal(entrepriseId, {
          nom: entrepriseNom.trim(),
          entete_1: entete1,
          entete_2: entete2,
          ind_tva: profil?.is_pro ? indTva : 0,
        });
        if (logoPreviewUri && profil?.is_pro) {
          await setEntrepriseLogoLocal(entrepriseId, logoPreviewUri, { mimeType: logoMimeType });
        }
      }

      if (wantsPasswordChange) {
        const passwordResult = await changeTerrainPassword(currentPassword, newPassword);
        if (!passwordResult.ok) {
          throw new Error(passwordResult.error || 'Impossible de changer le mot de passe.');
        }
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }

      await loadProfil();
      onEditingChange?.(false);
      onSaveComplete?.();
      Alert.alert('Profil', 'Modifications enregistrées.');
    } catch (error) {
      console.error('Erreur sauvegarde profil:', error);
      Alert.alert('Erreur', error.message || 'Impossible d’enregistrer les modifications.');
    } finally {
      setSaving(false);
    }
  }, [
    confirmPassword,
    currentPassword,
    entete1,
    entete2,
    entrepriseId,
    entrepriseNom,
    indTva,
    isAdmin,
    loadProfil,
    logoMimeType,
    logoPreviewUri,
    newPassword,
    onEditingChange,
    onSaveComplete,
    profil?.is_pro,
    saving,
    editing,
  ]);

  useEffect(() => {
    if (!saveRequestId || !editing) return;
    handleSave();
  }, [saveRequestId, editing, handleSave]);

  const canEditEntreprise = isAdmin && editing;
  const canShowLogo = Boolean(profil?.is_pro && isAdmin);
  const logoStorageKey = profil?.entreprise_logo || null;
  const logoDisplayUri =
    logoPreviewUri || (logoStorageKey ? resolveTerrainImageUri(logoStorageKey) : null);

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
          <LosangeLogoLoader size="large" />
        </View>
      ) : profil ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomOffset + 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Surface style={styles.card} elevation={1}>
            {canShowLogo && !canEditEntreprise && logoDisplayUri ? (
              <View style={styles.logoPreviewWrap}>
                <Image source={{ uri: logoDisplayUri }} style={styles.logoPreview} resizeMode="contain" />
              </View>
            ) : null}
            <InfoRow label="Rôle" value={profil.role_label} />
            {canEditEntreprise && canShowLogo ? (
              <TerrainPhotoInput
                label="Logo entreprise"
                previewUri={logoPreviewUri}
                storageKey={logoPreviewUri ? null : logoStorageKey}
                disabled={saving}
                onPicked={({ uri, mimeType }) => {
                  setLogoPreviewUri(uri);
                  setLogoMimeType(mimeType);
                }}
                onClear={() => {
                  setLogoPreviewUri(null);
                  setLogoMimeType(null);
                }}
              />
            ) : null}
            {canEditEntreprise ? (
              <View style={styles.infoRow}>
                <Text variant="labelLarge" style={styles.infoLabel}>
                  Nom de l'entreprise
                </Text>
                <TextInput
                  mode="outlined"
                  value={entrepriseNom}
                  onChangeText={setEntrepriseNom}
                  style={styles.textInput}
                  dense
                />
              </View>
            ) : (
              <InfoRow label="Entreprise" value={profil.entreprise_nom} />
            )}
            {canEditEntreprise ? (
              <>
                <TextInput
                  mode="outlined"
                  label="En-tête 1 du devis"
                  value={entete1}
                  onChangeText={setEntete1}
                  style={styles.textInput}
                  dense
                  disabled={saving}
                />
                <TextInput
                  mode="outlined"
                  label="En-tête 2 du devis"
                  value={entete2}
                  onChangeText={setEntete2}
                  style={styles.textInput}
                  dense
                  disabled={saving}
                />
              </>
            ) : (
              <>
                <InfoRow label="En-tête 1 du devis" value={profil.entreprise_entete_1} />
                <InfoRow label="En-tête 2 du devis" value={profil.entreprise_entete_2} />
              </>
            )}
            {canEditEntreprise ? (
              <View style={styles.infoRow}>
                <Text variant="labelLarge" style={styles.infoLabel}>
                  Appliquer TVA
                </Text>
                <TvaToggle value={indTva} onChange={setIndTva} disabled={saving || !profil.is_pro} />
              </View>
            ) : (
              <InfoRow label="Appliquer TVA" value={formatTvaLabel(profil.entreprise_ind_tva)} />
            )}
            {!profil.is_pro && canEditEntreprise ? (
              <Text style={styles.fieldHint}>TVA disponible uniquement pour les comptes Pro.</Text>
            ) : null}
            <InfoRow label="Prénom" value={profil.prenom} />
            <InfoRow label="Nom" value={profil.nom} />
            {profil.identifiant ? <InfoRow label="Identifiant" value={profil.identifiant} /> : null}

            {editing ? (
              <View style={styles.passwordSection}>
                <Text variant="titleMedium" style={styles.passwordTitle}>
                  Mot de passe
                </Text>
                <TextInput
                  mode="outlined"
                  label="Mot de passe actuel"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.textInput}
                  dense
                  disabled={saving}
                />
                <TextInput
                  mode="outlined"
                  label="Nouveau mot de passe"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.textInput}
                  dense
                  disabled={saving}
                />
                <TextInput
                  mode="outlined"
                  label="Confirmer le mot de passe"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.textInput}
                  dense
                  disabled={saving}
                />
              </View>
            ) : null}
          </Surface>
        </ScrollView>
      ) : (
        <Surface style={styles.card} elevation={1}>
          <Text variant="bodyLarge" style={styles.emptyText}>
            Profil introuvable.
          </Text>
        </Surface>
      )}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
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
  textInput: {
    backgroundColor: chantierColors.surface,
  },
  tvaToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  tvaOption: {
    minWidth: 88,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: chantierColors.border,
    backgroundColor: chantierColors.surface,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  tvaOptionActive: {
    borderColor: chantierColors.primary,
    backgroundColor: '#EFF6FF',
  },
  tvaOptionText: {
    color: chantierColors.text,
    fontWeight: '700',
    fontSize: 18,
  },
  tvaOptionTextActive: {
    color: chantierColors.primary,
  },
  logoPreviewWrap: {
    alignItems: 'center',
    marginBottom: 4,
  },
  logoPreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  fieldHint: {
    color: chantierColors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  passwordSection: {
    gap: 10,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: chantierColors.border,
  },
  passwordTitle: {
    color: chantierColors.text,
    fontWeight: '800',
  },
});
