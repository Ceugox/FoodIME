import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

const STOCK_WARNING_THRESHOLD = 10;

interface StockBadgeProps {
  stockQty: number;
}

export function StockBadge({ stockQty }: StockBadgeProps) {
  if (stockQty === 0) {
    return (
      <View style={[styles.badge, styles.unavailable]}>
        <Text style={styles.unavailableText}>Indisponivel</Text>
      </View>
    );
  }

  if (stockQty < STOCK_WARNING_THRESHOLD) {
    return (
      <View style={[styles.badge, styles.warning]}>
        <Text style={styles.warningText}>Ultimas unidades</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  warning: {
    backgroundColor: '#FEF3C7',
  },
  warningText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D97706',
  },
  unavailable: {
    backgroundColor: '#FEE2E2',
  },
  unavailableText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.error,
  },
});
