import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSellerMetrics } from '../../hooks/useOrders';
import { useMyStore } from '../../hooks/useStores';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { Button } from '../../components/common/Button';
import { Colors } from '../../constants/colors';
import { useAuthStore } from '../../store/authStore';

type Period = 'today' | 'week' | 'month';

export function DashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.clearAuth);
  const { data: store, isLoading: storeLoading } = useMyStore();
  const { data: metrics, isLoading, isError, refetch } = useSellerMetrics();
  const [period, setPeriod] = useState<Period>('today');

  if (isLoading || storeLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const revenue = metrics?.revenue[period] ?? 0;
  const orderCount = metrics?.orders[period] ?? 0;
  const chart = metrics?.weeklyChart ?? [];
  const maxRevenue = Math.max(...chart.map((d) => d.revenue), 1);

  const periodLabels: Record<Period, string> = {
    today: 'Hoje',
    week: 'Semana',
    month: 'Mes',
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Ola, {user?.name}!</Text>
            <Text style={styles.storeName}>
              {store?.name || 'Configure sua loja'}
            </Text>
          </View>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: store?.isOpen ? Colors.success : Colors.error },
            ]}
          />
        </View>

        {/* Commission Rate */}
        {store?.commissionRate !== undefined && (
          <View style={styles.commissionBadge}>
            <Ionicons name="pricetag-outline" size={14} color={Colors.primary} />
            <Text style={styles.commissionText}>
              Taxa FoodIME: {(Number(store.commissionRate) * 100).toFixed(0)}%
            </Text>
          </View>
        )}

        {/* Period Selector */}
        <View style={styles.periodRow}>
          {(['today', 'week', 'month'] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
              onPress={() => setPeriod(p)}
            >
              <Text
                style={[
                  styles.periodText,
                  period === p && styles.periodTextActive,
                ]}
              >
                {periodLabels[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Main Metrics */}
        <View style={styles.revenueCard}>
          <Text style={styles.revenueLabel}>Receita</Text>
          <Text style={styles.revenueValue}>R$ {revenue.toFixed(2)}</Text>
          <Text style={styles.revenueOrders}>{orderCount} pedido(s)</Text>
        </View>

        {/* Weekly Chart */}
        <Text style={styles.sectionTitle}>Ultimos 7 dias</Text>
        <View style={styles.chartContainer}>
          {chart.map((item, index) => (
            <View key={index} style={styles.chartColumn}>
              <View style={styles.barWrapper}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max((item.revenue / maxRevenue) * 100, 4)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.chartLabel}>{item.day}</Text>
            </View>
          ))}
        </View>

        {/* Top Product */}
        {metrics?.topProduct && (
          <View style={styles.topProductCard}>
            <Ionicons name="trophy-outline" size={20} color={Colors.warning} />
            <View style={styles.topProductInfo}>
              <Text style={styles.topProductLabel}>Mais vendido do mes</Text>
              <Text style={styles.topProductName}>{metrics.topProduct.name}</Text>
            </View>
            <Text style={styles.topProductQty}>
              {metrics.topProduct.totalSold} un.
            </Text>
          </View>
        )}

        {/* Transactions */}
        <Text style={styles.sectionTitle}>Ultimas transacoes</Text>
        {metrics?.transactions.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma transacao ainda</Text>
        ) : (
          metrics?.transactions.slice(0, 10).map((tx) => (
            <View key={tx.id} style={styles.txCard}>
              <View style={styles.txLeft}>
                <Text style={styles.txCode}>#{tx.orderCode}</Text>
                <Text style={styles.txDate}>
                  {new Date(tx.date).toLocaleDateString('pt-BR')}
                </Text>
              </View>
              <View style={styles.txRight}>
                <Text style={styles.txGross}>R$ {tx.grossAmount.toFixed(2)}</Text>
                <Text style={styles.txCommission}>
                  -{tx.commission.toFixed(2)} taxa
                </Text>
                <Text style={styles.txNet}>R$ {tx.netAmount.toFixed(2)}</Text>
              </View>
            </View>
          ))
        )}

        <Button
          title="Sair da conta"
          variant="outline"
          onPress={logout}
          style={{ marginTop: 32, marginBottom: 20 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  storeName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 2,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  commissionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  commissionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  periodBtnActive: {
    backgroundColor: Colors.primary,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  periodTextActive: {
    color: Colors.white,
  },
  revenueCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  revenueLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  revenueValue: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.text,
    marginTop: 4,
  },
  revenueOrders: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  chartContainer: {
    flexDirection: 'row',
    height: 120,
    gap: 4,
    marginBottom: 24,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    paddingBottom: 0,
  },
  chartColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '60%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
    minHeight: 4,
  },
  chartLabel: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 6,
    marginBottom: 8,
  },
  topProductCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  topProductInfo: {
    flex: 1,
  },
  topProductLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  topProductName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 2,
  },
  topProductQty: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.warning,
  },
  emptyText: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  txCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  txLeft: {
    justifyContent: 'center',
  },
  txCode: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  txDate: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  txGross: {
    fontSize: 13,
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  txCommission: {
    fontSize: 11,
    color: Colors.error,
  },
  txNet: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.success,
    marginTop: 2,
  },
});
