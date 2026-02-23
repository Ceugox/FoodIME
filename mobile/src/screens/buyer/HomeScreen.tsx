import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
      activeOpacity={0.75}
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
        <View style={styles.cardFooter}>
          <View style={styles.productCountWrap}>
            <Ionicons name="fast-food-outline" size={12} color={Colors.textLight} />
            <Text style={styles.productCount}>
              {item.products?.length || 0} produtos
            </Text>
          </View>
          <View style={styles.openBadge}>
            <View style={styles.openDot} />
            <Text style={styles.openText}>Aberto</Text>
          </View>
        </View>
      </View>
      <View style={styles.arrow}>
        <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.appName}>FoodIME</Text>
          <Text style={styles.subheader}>Vendedores abertos agora</Text>
        </View>
        <View style={styles.logoSmall}>
          <Image
            source={require('../../../assets/icon.png')}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>
      </View>

      <FlatList
        data={stores}
        keyExtractor={(item) => item.id}
        renderItem={renderStore}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="storefront-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>Nenhum vendedor aberto</Text>
            <Text style={styles.emptySubtitle}>Volte mais tarde</Text>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.accent,
    letterSpacing: 0.5,
  },
  subheader: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  logoSmall: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logoImg: {
    width: 40,
    height: 40,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    alignItems: 'center',
  },
  image: {
    width: 88,
    height: 88,
  },
  placeholder: {
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 30,
    fontWeight: '700',
    color: Colors.accent,
  },
  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
    gap: 4,
  },
  storeName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  storeDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  productCountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  productCount: {
    fontSize: 11,
    color: Colors.textLight,
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(91, 148, 72, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  openDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  openText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.success,
  },
  arrow: {
    paddingRight: 12,
  },
  emptyWrap: {
    alignItems: 'center',
    marginTop: 64,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.textLight,
  },
});
