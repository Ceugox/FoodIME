import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMyStore } from '../../hooks/useStores';
import { useProducts, useCreateProduct, useUpdateStock, useRemoveProduct } from '../../hooks/useProducts';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { StockBadge } from '../../components/common/StockBadge';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Colors } from '../../constants/colors';
import type { Product } from '../../types/models.types';

export function ProductsScreen() {
  const { data: store, isLoading: storeLoading } = useMyStore();
  const { data: products, isLoading, isError, refetch } = useProducts(store?.id || '');
  const createProduct = useCreateProduct();
  const updateStock = useUpdateStock();
  const removeProduct = useRemoveProduct();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stockQty, setStockQty] = useState('');

  if (storeLoading || isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const handleCreate = () => {
    if (!name || !price || !stockQty) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }
    createProduct.mutate(
      { name, price: parseFloat(price), stockQty: parseInt(stockQty, 10) },
      {
        onSuccess: () => {
          setShowModal(false);
          setName('');
          setPrice('');
          setStockQty('');
        },
        onError: () => Alert.alert('Erro', 'Falha ao criar produto'),
      },
    );
  };

  const handleStockChange = (id: string, currentQty: number, delta: number) => {
    const newQty = Math.max(0, currentQty + delta);
    updateStock.mutate({ id, stockQty: newQty });
  };

  const handleRemove = (product: Product) => {
    Alert.alert('Remover produto', `Deseja remover "${product.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => removeProduct.mutate(product.id) },
    ]);
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>R$ {Number(item.price).toFixed(2)}</Text>
        <StockBadge stockQty={item.stockQty} />
      </View>
      <View style={styles.stockControls}>
        <TouchableOpacity
          style={styles.stockBtn}
          onPress={() => handleStockChange(item.id, item.stockQty, -1)}
        >
          <Ionicons name="remove" size={16} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.stockQty}>{item.stockQty}</Text>
        <TouchableOpacity
          style={styles.stockBtn}
          onPress={() => handleStockChange(item.id, item.stockQty, 1)}
        >
          <Ionicons name="add" size={16} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => handleRemove(item)}>
          <Ionicons name="trash-outline" size={18} color={Colors.error} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Produtos</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={24} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum produto cadastrado</Text>
        }
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Novo produto</Text>
            <Input label="Nome" value={name} onChangeText={setName} placeholder="Ex: Brigadeiro" />
            <Input label="Preco (R$)" value={price} onChangeText={setPrice} placeholder="5.00" keyboardType="decimal-pad" />
            <Input label="Estoque" value={stockQty} onChangeText={setStockQty} placeholder="50" keyboardType="number-pad" />
            <Button title="Criar" onPress={handleCreate} loading={createProduct.isPending} />
            <Button title="Cancelar" variant="outline" onPress={() => setShowModal(false)} style={{ marginTop: 8 }} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    marginBottom: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardInfo: {
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
  stockControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stockQty: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    minWidth: 24,
    textAlign: 'center',
  },
  deleteBtn: {
    marginLeft: 8,
    padding: 4,
  },
  empty: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: 40,
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
});
