import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../../store/cartStore';
import { useCreateOrder } from '../../hooks/useOrders';
import { Button } from '../../components/common/Button';
import { Colors } from '../../constants/colors';
import type { BuyerStackParamList } from '../../types/navigation.types';

type Nav = NativeStackNavigationProp<BuyerStackParamList>;

export function CartScreen() {
  const navigation = useNavigation<Nav>();
  const { items, storeId, storeName, updateQuantity, removeItem, clear, getTotal } =
    useCartStore();
  const createOrder = useCreateOrder();

  const handleCheckout = () => {
    if (!storeId || items.length === 0) return;

    createOrder.mutate(
      {
        storeId,
        items: items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
        })),
      },
      {
        onSuccess: (order) => {
          clear();
          navigation.navigate('Checkout', { orderId: order.id });
        },
        onError: () =>
          Alert.alert('Erro', 'Nao foi possivel criar o pedido'),
      },
    );
  };

  const renderItem = ({ item }: { item: (typeof items)[0] }) => (
    <View style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.name}>{item.product.name}</Text>
        <Text style={styles.price}>
          R$ {(Number(item.product.price) * item.quantity).toFixed(2)}
        </Text>
      </View>
      <View style={styles.qtyRow}>
        <TouchableOpacity
          style={styles.qtyBtn}
          onPress={() => updateQuantity(item.product.id, item.quantity - 1)}
        >
          <Ionicons name="remove" size={18} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.qtyText}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.qtyBtn}
          onPress={() => updateQuantity(item.product.id, item.quantity + 1)}
        >
          <Ionicons name="add" size={18} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => removeItem(item.product.id)}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Carrinho</Text>
        <View style={{ width: 24 }} />
      </View>

      {storeName && (
        <Text style={styles.storeLabel}>Pedido em: {storeName}</Text>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.product.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Seu carrinho esta vazio</Text>
        }
      />

      {items.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>R$ {getTotal().toFixed(2)}</Text>
          </View>
          <Button
            title="Fazer pedido"
            onPress={handleCheckout}
            loading={createOrder.isPending}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  storeLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 160,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  info: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  qtyText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    minWidth: 20,
    textAlign: 'center',
  },
  removeBtn: {
    marginLeft: 'auto',
    padding: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  empty: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: 40,
    fontSize: 15,
  },
});
