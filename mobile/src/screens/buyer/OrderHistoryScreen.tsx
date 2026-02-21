import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBuyerOrders } from '../../hooks/useOrders';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { Colors } from '../../constants/colors';
import type { Order } from '../../types/models.types';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendente', color: Colors.warning },
  PAID: { label: 'Pago', color: Colors.success },
  PICKED_UP: { label: 'Retirado', color: Colors.textSecondary },
  CANCELLED: { label: 'Cancelado', color: Colors.error },
};

export function OrderHistoryScreen() {
  const { data: orders, isLoading, isError, refetch } = useBuyerOrders();

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const renderOrder = ({ item }: { item: Order }) => {
    const status = STATUS_LABELS[item.status] || STATUS_LABELS.PENDING;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.storeName}>{item.store?.name}</Text>
          <View style={[styles.badge, { backgroundColor: status.color + '20' }]}>
            <Text style={[styles.badgeText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>
        <Text style={styles.code}>Codigo: {item.code}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.itemCount}>{item.items.length} item(ns)</Text>
          <Text style={styles.total}>R$ {Number(item.totalAmount).toFixed(2)}</Text>
        </View>
        <Text style={styles.date}>
          {new Date(item.createdAt).toLocaleDateString('pt-BR')}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Meus pedidos</Text>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Voce ainda nao fez nenhum pedido</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    paddingHorizontal: 20,
    paddingTop: 8,
    marginBottom: 16,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  code: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemCount: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  total: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  date: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 8,
  },
  empty: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: 40,
    fontSize: 15,
  },
});
