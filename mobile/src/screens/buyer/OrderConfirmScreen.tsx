import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/common/Button';
import { Colors } from '../../constants/colors';
import type { BuyerStackParamList } from '../../types/navigation.types';

type RouteProps = RouteProp<BuyerStackParamList, 'OrderConfirm'>;
type Nav = NativeStackNavigationProp<BuyerStackParamList>;

export function OrderConfirmScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<Nav>();
  const { code } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="checkmark" size={48} color={Colors.white} />
        </View>

        <Text style={styles.title}>Pedido confirmado!</Text>
        <Text style={styles.subtitle}>Mostre este codigo ao vendedor na retirada</Text>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Codigo do pedido</Text>
          <Text style={styles.code}>{code}</Text>
        </View>

        <Button
          title="Voltar ao inicio"
          onPress={() => navigation.popToTop()}
          style={{ marginTop: 32 }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
  codeCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingHorizontal: 40,
    paddingVertical: 24,
    alignItems: 'center',
    marginTop: 32,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
  },
  codeLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  code: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.primary,
    marginTop: 8,
    letterSpacing: 4,
  },
});
