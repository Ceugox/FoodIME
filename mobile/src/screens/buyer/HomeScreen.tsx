import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStores } from '../../hooks/useStores';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { Colors } from '../../constants/colors';
import type { BuyerStackParamList } from '../../types/navigation.types';
import type { Store } from '../../types/models.types';

type Nav = NativeStackNavigationProp<BuyerStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { data: stores, isLoading, isError, refetch } = useStores();

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState onRetry={refetch} />;

  const renderStore = ({ item }: { item: Store }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Store', { storeId: item.id })}
      activeOpacity={0.7}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Text style={styles.placeholderText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.cardContent}>
        <Text style={styles.storeName}>{item.name}</Text>
        <Text style={styles.storeDesc} numberOfLines={2}>
          {item.description}
        </Text>
        <Text style={styles.productCount}>
          {item.products?.length || 0} produtos
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>FoodIME</Text>
      <Text style={styles.subheader}>Vendedores abertos</Text>
      <FlatList
        data={stores}
        keyExtractor={(item) => item.id}
        renderItem={renderStore}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>Nenhum vendedor aberto no momento</Text>
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
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  subheader: {
    fontSize: 16,
    color: Colors.textSecondary,
    paddingHorizontal: 20,
    marginBottom: 16,
    marginTop: 4,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  image: {
    width: 100,
    height: 100,
  },
  placeholder: {
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.white,
  },
  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  storeDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  productCount: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 6,
  },
  empty: {
    textAlign: 'center',
    color: Colors.textSecondary,
    marginTop: 40,
    fontSize: 15,
  },
});
