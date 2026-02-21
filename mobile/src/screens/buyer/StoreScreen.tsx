import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../hooks/useStores';
import { useCartStore } from '../../store/cartStore';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { StockBadge } from '../../components/common/StockBadge';
import { Button } from '../../components/common/Button';
import { Colors } from '../../constants/colors';
import type { BuyerStackParamList } from '../../types/navigation.types';
import type { Product } from '../../types/models.types';

type RouteProps = RouteProp<BuyerStackParamList, 'Store'>;
type Nav = NativeStackNavigationProp<BuyerStackParamList>;

export function StoreScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<Nav>();
  const { data: store, isLoading, isError, refetch } = useStore(route.params.storeId);
  const addItem = useCartStore((s) => s.addItem);
  const itemCount = useCartStore((s) => s.getItemCount());

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;
  if (!store) return <ErrorState message="Loja nao encontrada" />;

  const handleAdd = (product: Product) => {
    if (product.stockQty === 0) {
      Alert.alert('Indisponivel', 'Este produto esta sem estoque');
      return;
    }
    addItem(product, store.name);
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>R$ {Number(item.price).toFixed(2)}</Text>
        <StockBadge stockQty={item.stockQty} />
      </View>
      <TouchableOpacity
        style={[styles.addBtn, item.stockQty === 0 && styles.addBtnDisabled]}
        onPress={() => handleAdd(item)}
        disabled={item.stockQty === 0}
      >
        <Ionicons name="add" size={24} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.storeName}>{store.name}</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.description}>{store.description}</Text>

      <FlatList
        data={store.products}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum produto disponivel</Text>
        }
      />

      {itemCount > 0 && (
        <View style={styles.cartBar}>
          <Button
            title={`Ver carrinho (${itemCount})`}
            onPress={() => navigation.navigate('Cart')}
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
  storeName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  productInfo: {
    flex: 1,
    gap: 4,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: {
    backgroundColor: Colors.textLight,
  },
  cartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  empty: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: 40,
  },
});
