import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';
import { Skeleton } from './Skeleton';

export function LoadingState() {
  return (
    <View style={styles.container}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.card}>
          <Skeleton width={72} height={72} borderRadius={12} />
          <View style={styles.lines}>
            <Skeleton width="55%" height={16} borderRadius={6} />
            <Skeleton width="80%" height={12} borderRadius={6} style={{ marginTop: 10 }} />
            <Skeleton width="35%" height={12} borderRadius={6} style={{ marginTop: 8 }} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 20,
    paddingTop: 24,
  },
  card: {
    flexDirection: 'row',
    gap: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  lines: {
    flex: 1,
    justifyContent: 'center',
  },
});
