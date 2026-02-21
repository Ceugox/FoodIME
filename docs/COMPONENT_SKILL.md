# Component Skill — FoodIME

> Consulte este documento antes de criar qualquer componente React Native.
> Define padrões de TypeScript, StyleSheet, loading/error states e acessibilidade.

---

## 1. Anatomia de um Componente

Todo componente segue esta estrutura obrigatória, nesta ordem:

```typescript
// components/buyer/StoreCard.tsx

import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';

// 1. Types/Props — sempre tipados
interface StoreCardProps {
  store: {
    id: string;
    name: string;
    description: string;
    imageUrl: string | null;
    isOpen: boolean;
  };
  onPress: (storeId: string) => void;
}

// 2. Componente — function declaration, não arrow function no export
export function StoreCard({ store, onPress }: StoreCardProps) {
  // 3. Handlers antes do return
  const handlePress = () => onPress(store.id);

  // 4. Render
  return (
    <TouchableOpacity
      style={[styles.container, !store.isOpen && styles.containerClosed]}
      onPress={handlePress}
      disabled={!store.isOpen}
      accessibilityRole="button"
      accessibilityLabel={`Loja ${store.name}, ${store.isOpen ? 'aberta' : 'fechada'}`}
    >
      <Image
        source={store.imageUrl ? { uri: store.imageUrl } : require('../../assets/store-placeholder.png')}
        style={styles.image}
      />
      <View style={styles.info}>
        <Text style={styles.name}>{store.name}</Text>
        <Text style={styles.description} numberOfLines={2}>
          {store.description}
        </Text>
        {!store.isOpen && (
          <Text style={styles.closedBadge}>Fechado</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// 5. Styles — sempre no final, StyleSheet.create obrigatório
const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  containerClosed: {
    opacity: 0.5,
  },
  image: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  closedBadge: {
    marginTop: 4,
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
});
```

---

## 2. Loading State

Nunca deixar uma tela ou seção sem feedback visual de carregamento.

### Componente base
```typescript
// components/common/LoadingState.tsx
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
}

export function LoadingState({ message, fullScreen = false }: LoadingStateProps) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size="large" color="#F97316" />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreen: {
    flex: 1,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
});
```

### Skeleton loader para listas
```typescript
// components/common/SkeletonCard.tsx
import { View, StyleSheet, Animated } from 'react-native';
import { useEffect, useRef } from 'react';

export function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <View style={styles.image} />
      <View style={styles.content}>
        <View style={styles.title} />
        <View style={styles.subtitle} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', padding: 12, marginBottom: 12 },
  image: { width: 72, height: 72, borderRadius: 8, backgroundColor: '#e0e0e0' },
  content: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  title: { height: 16, backgroundColor: '#e0e0e0', borderRadius: 4, marginBottom: 8, width: '70%' },
  subtitle: { height: 12, backgroundColor: '#e0e0e0', borderRadius: 4, width: '90%' },
});
```

---

## 3. Error State

```typescript
// components/common/ErrorState.tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = 'Algo deu errado. Tente novamente.',
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>⚠️</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>Tentar novamente</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  message: { fontSize: 15, color: '#444', textAlign: 'center', lineHeight: 22 },
  button: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#F97316',
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
```

---

## 4. Badge "Últimas Unidades"

```typescript
// components/buyer/StockBadge.tsx
import { View, Text, StyleSheet } from 'react-native';
import { STOCK_WARNING_THRESHOLD } from '../../constants';

interface StockBadgeProps {
  stockQty: number;
}

export function StockBadge({ stockQty }: StockBadgeProps) {
  if (stockQty <= 0) {
    return (
      <View style={[styles.badge, styles.badgeEmpty]}>
        <Text style={styles.text}>Esgotado</Text>
      </View>
    );
  }

  if (stockQty < STOCK_WARNING_THRESHOLD) {
    return (
      <View style={[styles.badge, styles.badgeWarning]}>
        <Text style={styles.text}>Últimas {stockQty} unidades</Text>
      </View>
    );
  }

  return null; // estoque normal — não exibe badge
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  badgeWarning: { backgroundColor: '#FFF3CD' },
  badgeEmpty: { backgroundColor: '#F8D7DA' },
  text: { fontSize: 11, fontWeight: '600', color: '#664D03' },
});
```

---

## 5. Componente de Edição Rápida de Estoque

```typescript
// components/seller/StockEditor.tsx
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { useState } from 'react';

interface StockEditorProps {
  productId: string;
  initialQty: number;
  onUpdate: (productId: string, qty: number) => void;
  isLoading?: boolean;
}

export function StockEditor({ productId, initialQty, onUpdate, isLoading }: StockEditorProps) {
  const [qty, setQty] = useState(String(initialQty));
  const [editing, setEditing] = useState(false);

  const handleConfirm = () => {
    const parsed = parseInt(qty, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdate(productId, parsed);
      setEditing(false);
    }
  };

  if (!editing) {
    return (
      <TouchableOpacity onPress={() => setEditing(true)} style={styles.display}>
        <Text style={styles.qty}>{initialQty}</Text>
        <Text style={styles.editHint}>toque para editar</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.editContainer}>
      <TextInput
        style={styles.input}
        value={qty}
        onChangeText={setQty}
        keyboardType="number-pad"
        autoFocus
        selectTextOnFocus
      />
      <TouchableOpacity
        style={styles.confirmButton}
        onPress={handleConfirm}
        disabled={isLoading}
      >
        <Text style={styles.confirmText}>{isLoading ? '...' : '✓'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setEditing(false)} style={styles.cancelButton}>
        <Text style={styles.cancelText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  display: { alignItems: 'center' },
  qty: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  editHint: { fontSize: 10, color: '#aaa' },
  editContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    width: 64,
    borderWidth: 1,
    borderColor: '#F97316',
    borderRadius: 6,
    padding: 6,
    textAlign: 'center',
    fontSize: 16,
  },
  confirmButton: { backgroundColor: '#F97316', borderRadius: 6, padding: 6 },
  confirmText: { color: '#fff', fontWeight: '700' },
  cancelButton: { padding: 6 },
  cancelText: { color: '#999', fontSize: 16 },
});
```

---

## 6. Paleta de Cores do Projeto

```typescript
// constants/colors.ts
export const Colors = {
  primary: '#F97316',       // laranja — cor principal
  primaryDark: '#EA580C',   // laranja escuro — pressed state
  background: '#FAFAFA',    // fundo geral
  surface: '#FFFFFF',       // cards e modais
  textPrimary: '#1a1a1a',   // texto principal
  textSecondary: '#666666', // texto secundário
  textMuted: '#999999',     // texto desabilitado
  border: '#E5E7EB',        // bordas
  success: '#16A34A',       // verde — confirmação
  warning: '#D97706',       // amarelo — alerta de estoque
  danger: '#DC2626',        // vermelho — erro/esgotado
  overlay: 'rgba(0,0,0,0.5)',
};
```

---

## 7. Componente Button Padrão

```typescript
// components/common/Button.tsx
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  style,
}: ButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], (disabled || isLoading) && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled || isLoading}
      accessibilityRole="button"
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : Colors.primary} />
      ) : (
        <Text style={[styles.label, variant !== 'primary' && styles.labelAlt]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  primary: { backgroundColor: Colors.primary },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary },
  ghost: { backgroundColor: 'transparent' },
  disabled: { opacity: 0.5 },
  label: { color: '#fff', fontSize: 16, fontWeight: '600' },
  labelAlt: { color: Colors.primary },
});
```

---

## 8. Regras de Estilo

- **Nunca** usar `style` inline para valores fixos — sempre `StyleSheet.create`
- Valores dinâmicos (como cores condicionais) podem usar array de styles: `style={[styles.base, isActive && styles.active]}`
- Espaçamento: usar múltiplos de 4 (4, 8, 12, 16, 20, 24)
- Border radius padrão: `8` para inputs e cards pequenos, `12` para cards maiores
- Fontes: `fontSize` de 11 (labels pequenos) a 24 (títulos de tela)
- **Nunca** usar `flex: 1` em componentes reutilizáveis — deixar para as screens controlarem o layout

---

## 9. Checklist antes de criar um componente

- [ ] Props tipadas com interface?
- [ ] StyleSheet.create usado para todos os estilos fixos?
- [ ] Loading state tratado (ActivityIndicator ou Skeleton)?
- [ ] Error state tratado onde aplicável?
- [ ] accessibilityRole e accessibilityLabel definidos em elementos interativos?
- [ ] Componente exportado como named export (não default)?
- [ ] Cores usando a paleta `Colors` do projeto?
