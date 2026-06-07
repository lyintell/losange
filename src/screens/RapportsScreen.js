import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Card, Text } from 'react-native-paper';
import { BarChart, PieChart } from 'react-native-gifted-charts';
import LosangeLogoLoader from '../components/terrain/LosangeLogoLoader';
import { getChantiersReportRowsLocal } from '../db/querries';
import { chantierColors } from '../styles/theme';
import {
  aggregateReportByMonthAndStatus,
  aggregateReportByStatus,
  buildLastTwelveMonthKeys,
  buildPieChartData,
  buildStackedBarData,
  buildStatusLegendItems,
  formatReportValue,
  getReportTotal,
} from '../utils/chantierReportStats';

const chartWidth = Dimensions.get('window').width - 48;

function StatusLegend() {
  return (
    <View style={styles.legendWrap}>
      {buildStatusLegendItems().map((item) => (
        <View key={item.status} style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: item.color }]} />
          <Text variant="bodySmall" style={styles.legendLabel}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}

function MetricToggle({ mode, onChange }) {
  return (
    <View style={styles.toggleRow}>
      <Pressable
        onPress={() => onChange('nombre')}
        style={[styles.toggleButton, mode === 'nombre' && styles.toggleButtonActive]}
      >
        <Text style={[styles.toggleLabel, mode === 'nombre' && styles.toggleLabelActive]}>
          Nombre
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChange('montant')}
        style={[styles.toggleButton, mode === 'montant' && styles.toggleButtonActive]}
      >
        <Text style={[styles.toggleLabel, mode === 'montant' && styles.toggleLabelActive]}>
          Montant
        </Text>
      </Pressable>
    </View>
  );
}

export default function RapportsScreen({ entrepriseId, refreshToken = 0 }) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [mode, setMode] = useState('nombre');

  const loadReportData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getChantiersReportRowsLocal(entrepriseId);
      setRows(data || []);
    } catch (error) {
      console.error('Erreur chargement rapports:', error);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [entrepriseId]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData, refreshToken]);

  const monthKeys = useMemo(() => buildLastTwelveMonthKeys(), []);

  const totalsByStatus = useMemo(
    () => aggregateReportByStatus(rows, mode),
    [rows, mode]
  );

  const pieData = useMemo(() => buildPieChartData(totalsByStatus), [totalsByStatus]);

  const stackedBarData = useMemo(() => {
    const byMonth = aggregateReportByMonthAndStatus(rows, mode, monthKeys);
    return buildStackedBarData(byMonth, monthKeys);
  }, [rows, mode, monthKeys]);

  const reportTotal = useMemo(() => getReportTotal(totalsByStatus), [totalsByStatus]);
  const valueFormatter = useCallback((value) => formatReportValue(value, mode), [mode]);
  const emptyPie = pieData.length === 0;
  const emptyBar = stackedBarData.length === 0;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadReportData} />}
      >
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>
            Rapports
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Vue d'ensemble des chantiers sur les 12 derniers mois.
          </Text>
        </View>

        <MetricToggle mode={mode} onChange={setMode} />

        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Chantiers par statut
            </Text>
            {loading && rows.length === 0 ? (
              <View style={styles.loadingState}>
                <LosangeLogoLoader size="medium" />
              </View>
            ) : emptyPie ? (
              <Text variant="bodyMedium" style={styles.emptyText}>
                Aucun chantier à afficher.
              </Text>
            ) : (
              <View style={styles.pieWrap}>
                <PieChart
                  data={pieData}
                  donut
                  radius={92}
                  innerRadius={56}
                  innerCircleColor={chantierColors.surface}
                  centerLabelComponent={() => (
                    <View style={styles.pieCenter}>
                      <Text style={styles.pieCenterValue}>{valueFormatter(reportTotal)}</Text>
                      <Text style={styles.pieCenterLabel}>
                        {mode === 'montant' ? 'Total HT' : 'Total'}
                      </Text>
                    </View>
                  )}
                  showText
                  textColor={chantierColors.text}
                  textSize={11}
                  fontWeight="700"
                  focusOnPress
                />
              </View>
            )}
            <StatusLegend />
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              {mode === 'montant' ? 'Montants par mois' : 'Chantiers par mois'}
            </Text>
            <Text variant="bodySmall" style={styles.sectionHint}>
              Empilé par statut, du mois courant jusqu'à 12 mois en arrière.
            </Text>
            {loading && rows.length === 0 ? (
              <View style={styles.loadingState}>
                <LosangeLogoLoader size="medium" />
              </View>
            ) : emptyBar ? (
              <Text variant="bodyMedium" style={styles.emptyText}>
                Aucune donnée sur les 12 derniers mois.
              </Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <BarChart
                  stackData={stackedBarData}
                  width={Math.max(chartWidth, stackedBarData.length * 54)}
                  height={240}
                  barWidth={28}
                  spacing={18}
                  initialSpacing={12}
                  endSpacing={12}
                  noOfSections={4}
                  yAxisTextStyle={styles.axisText}
                  xAxisLabelTextStyle={styles.axisText}
                  formatYLabel={valueFormatter}
                  hideRules={false}
                  rulesColor={chantierColors.border}
                  yAxisColor={chantierColors.border}
                  xAxisColor={chantierColors.border}
                />
              </ScrollView>
            )}
            <StatusLegend />
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: chantierColors.background,
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 28,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: chantierColors.border,
    marginHorizontal: -12,
    paddingHorizontal: 12,
    paddingBottom: 12,
    marginBottom: 12,
  },
  title: {
    color: chantierColors.text,
    fontWeight: '800',
    fontSize: 34,
    marginBottom: 6,
  },
  subtitle: {
    color: chantierColors.muted,
    lineHeight: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  toggleButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: chantierColors.primary,
    borderRadius: 12,
    backgroundColor: chantierColors.surface,
    paddingVertical: 12,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: chantierColors.primary,
  },
  toggleLabel: {
    color: chantierColors.primary,
    fontWeight: '700',
    fontSize: 16,
  },
  toggleLabelActive: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: chantierColors.surface,
    borderRadius: 12,
    marginBottom: 14,
  },
  sectionTitle: {
    color: chantierColors.text,
    fontWeight: '800',
    marginBottom: 4,
  },
  sectionHint: {
    color: chantierColors.muted,
    marginBottom: 12,
  },
  pieWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  pieCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieCenterValue: {
    color: chantierColors.text,
    fontWeight: '800',
    fontSize: 16,
  },
  pieCenterLabel: {
    color: chantierColors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  legendWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendLabel: {
    color: chantierColors.text,
  },
  loadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  emptyText: {
    color: chantierColors.muted,
    textAlign: 'center',
    paddingVertical: 24,
  },
  axisText: {
    color: chantierColors.muted,
    fontSize: 11,
  },
});
