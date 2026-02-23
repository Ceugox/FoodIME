import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const STOCK_WARNING_THRESHOLD = 10;

interface StockBadgeProps {
  stockQty: number;
}

export function StockBadge({ stockQty }: StockBadgeProps) {
  if (stockQty === 0) {
    return (
      <View style={[styles.badge, styles.unavailable]}>
        <Text style={styles.unavailableText}>Indisponível</Text>
      </View>
    );
  }

  if (stockQty < STOCK_WARNING_THRESHOLD) {
    return (
      <View style={[styles.badge, styles.warning]}>
        <Text style={styles.warningText}>Últimas unidades</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  warning: {
    backgroundColor: 'rgba(197, 160, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(197, 160, 68, 0.4)',
  },
  warningText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C5A044',
  },
  unavailable: {
    backgroundColor: 'rgba(199, 80, 80, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(199, 80, 80, 0.4)',
  },
  unavailableText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#C75050',
  },
});
