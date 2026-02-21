import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSellerOrders, useUpdateOrderStatus } from '../../hooks/useOrders';
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

export function OrdersScreen() {
  const { data: orders, isLoading, isError, refetch } = useSellerOrders();
  const updateStatus = useUpdateOrderStatus();

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const handlePickup = (order: Order) => {
    Alert.alert(
      'Confirmar retirada',
      `Marcar pedido ${order.code} como retirado?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => updateStatus.mutate({ id: order.id, status: 'PICKED_UP' }),
        },
      ],
    );
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const status = STATUS_LABELS[item.status] || STATUS_LABELS.PENDING;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.code}>#{item.code}</Text>
            <Text style={styles.buyer}>{item.buyer?.name}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: status.color + '20' }]}>
            <Text style={[styles.badgeText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <View style={styles.itemsList}>
          {item.items.map((orderItem) => (
            <Text key={orderItem.id} style={styles.itemText}>
              {orderItem.quantity}x {orderItem.product?.name}
            </Text>
          ))}
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.total}>R$ {Number(item.totalAmount).toFixed(2)}</Text>
          {item.status === 'PAID' && (
            <TouchableOpacity
              style={styles.pickupBtn}
              onPress={() => handlePickup(item)}
            >
              <Text style={styles.pickupText}>Marcar retirado</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Pedidos</Text>
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum pedido ainda</Text>
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  code: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  buyer: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
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
  itemsList: {
    marginBottom: 12,
    gap: 4,
  },
  itemText: {
    fontSize: 14,
    color: Colors.text,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  total: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  pickupBtn: {
    backgroundColor: Colors.success,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pickupText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: 40,
    fontSize: 15,
  },
});
