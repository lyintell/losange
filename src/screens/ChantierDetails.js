import React, { useCallback, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { Card, FAB, Text } from 'react-native-paper';
import { getLignesByChantierLocal } from '../db/querries';
import { chantierColors } from '../styles/theme';

export default function ChantierDetails({ chantier, bottomOffset = 0 }) {
  const [loading, setLoading] = useState(false);
  const [lignes, setLignes] = useState([]);

  const loadLignes = useCallback(async () => {
    if (!chantier?.id) return;
    try {
      setLoading(true);
      const data = await getLignesByChantierLocal(chantier.id);
      setLignes(data || []);
    } catch (error) {
      console.error('Erreur chargement lignes chantier:', error);
      setLignes([]);
    } finally {
      setLoading(false);
    }
  }, [chantier?.id]);

  React.useEffect(() => {
    loadLignes();
  }, [loadLignes]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          {chantier?.nom || 'Detail Chantier'}
        </Text>
        <Text variant="bodyMedium" style={styles.subTitle}>
          Client: {chantier?.client_nom || 'Non renseigne'}
        </Text>
      </View>

      <FlatList
        data={lignes}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadLignes} />}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomOffset + 24 }]}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.ouvrage}>{item.ouvrage_nom}</Text>
              <Text style={styles.rowText}>
                L:{item.largeur ?? '-'} H:{item.hauteur ?? '-'} Nb:{item.nombre ?? 1}
              </Text>
              <Text style={styles.rowText}>
                Qt: {item.quantite} {item.unite_nom} | PU: {item.prix_unitaire_applique} | Mt: {item.montant}
              </Text>
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Aucune dimension enregistree pour ce chantier.</Text>
            </View>
          ) : null
        }
      />

      <FAB
        icon="pencil"
        style={[styles.penFab, { bottom: bottomOffset + 20 }]}
        color="#000000"
        customSize={70}
      />
      <FAB
        icon="file-document"
        style={[styles.fileFab, { bottom: bottomOffset - 44 }]}
        color="#FFFFFF"
        customSize={50}
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
  },
  title: {
    color: chantierColors.text,
    fontWeight: '800',
    fontSize: 28,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: chantierColors.border,
    marginHorizontal: -12,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  subTitle: {
    color: chantierColors.muted,
    marginTop: 4,
    marginBottom: 8,
  },
  listContent: {
    gap: 8,
  },
  card: {
    backgroundColor: chantierColors.surface,
    borderWidth: 1,
    borderColor: chantierColors.border,
  },
  ouvrage: {
    color: chantierColors.text,
    fontWeight: '700',
    marginBottom: 4,
  },
  rowText: {
    color: chantierColors.text,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 42,
  },
  emptyText: {
    color: chantierColors.muted,
    textAlign: 'center',
  },
  penFab: {
    position: 'absolute',
    right: 14,
    backgroundColor: '#FACC15',
    borderRadius: 999,
  },
  fileFab: {
    position: 'absolute',
    right: 24,
    backgroundColor: '#1D4ED8',
    borderRadius: 999,
  },
});
