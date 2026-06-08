import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Surface, Text } from 'react-native-paper';
import ClientFormModal from '../components/terrain/ClientFormModal';
import LosangeLogoLoader from '../components/terrain/LosangeLogoLoader';
import { FlowSmallFab, flowFabColors, getFabColumnPadding } from '../components/terrain/TerrainFlowFabs';
import { deleteClientLocal, getClientByIdLocal, getLoggedInProfilViewLocal } from '../db/querries';
import { canManageClients } from '../utils/terrainAccess';
import { chantierColors } from '../styles/theme';

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

export default function ClientDetailsScreen({
  clientId,
  editRequestId = 0,
  onClientUpdated,
  onClientDeleted,
}) {
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const lastEditRequestIdRef = useRef(0);

  const loadClient = useCallback(async () => {
    if (!clientId) {
      setClient(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getClientByIdLocal(clientId);
      setClient(data);
    } catch (error) {
      console.error('Erreur chargement client:', error);
      setClient(null);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadClient();
  }, [loadClient]);

  useEffect(() => {
    let cancelled = false;

    const loadAccess = async () => {
      try {
        const profil = await getLoggedInProfilViewLocal();
        if (!cancelled) {
          setCanManage(canManageClients(profil));
        }
      } catch (error) {
        console.error('Erreur chargement acces client:', error);
        if (!cancelled) {
          setCanManage(false);
        }
      }
    };

    loadAccess();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!canManage || !editRequestId || editRequestId === lastEditRequestIdRef.current || !client) {
      return;
    }
    lastEditRequestIdRef.current = editRequestId;
    setEditModalVisible(true);
  }, [editRequestId, client, canManage]);

  const handleSaved = (updatedClient) => {
    setClient(updatedClient);
    onClientUpdated?.(updatedClient);
  };

  const handleDeletePress = () => {
    if (!client?.id || deleting) return;

    Alert.alert(
      'Supprimer',
      `Voulez-vous supprimer le client "${client.nom_complet || ''}" ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteClientLocal(client.id);
              onClientDeleted?.(client);
            } catch (error) {
              console.error('Erreur suppression client:', error);
              Alert.alert('Erreur', error.message || 'Impossible de supprimer ce client.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          {client?.nom_complet || 'Client'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <LosangeLogoLoader size="large" />
        </View>
      ) : client ? (
        <Surface style={styles.card} elevation={1}>
          <InfoRow label="Nom complet" value={client.nom_complet} />
          <InfoRow label="Téléphone 1" value={client.telephone_1} />
          <InfoRow label="Téléphone 2" value={client.telephone_2} />
        </Surface>
      ) : (
        <Surface style={styles.card} elevation={1}>
          <Text variant="bodyLarge" style={styles.emptyText}>
            Client introuvable.
          </Text>
        </Surface>
      )}

      {client && canManage ? (
        <FlowSmallFab
          icon="delete"
          tierFromBottom={0}
          color={flowFabColors.muted}
          disabled={deleting}
          onPress={handleDeletePress}
        />
      ) : null}

      <ClientFormModal
        visible={editModalVisible}
        client={client}
        onDismiss={() => setEditModalVisible(false)}
        onSaved={handleSaved}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: chantierColors.background,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: getFabColumnPadding(0),
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: chantierColors.border,
    marginHorizontal: -12,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  title: {
    color: chantierColors.text,
    fontWeight: '800',
    fontSize: 28,
    marginBottom: 8,
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
  emptyText: {
    color: chantierColors.muted,
    fontWeight: '600',
  },
});
