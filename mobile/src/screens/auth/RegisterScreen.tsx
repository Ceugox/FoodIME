import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Colors } from '../../constants/colors';
import { useRegister } from '../../hooks/useAuth';
import type { AuthStackParamList } from '../../types/navigation.types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const register = useRegister();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'BUYER' | 'SELLER'>('BUYER');

  const normalizePhone = (value: string) => value.replace(/\D/g, '');

  const handleRegister = () => {
    if (!name || !email || !phone || !password) {
      Alert.alert('Atenção', 'Preencha todos os campos');
      return;
    }
    register.mutate(
      { name, email, phone: normalizePhone(phone), password, role },
      {
        onError: (error: any) => {
          const message = error?.response?.data?.message;
          Alert.alert('Erro', Array.isArray(message) ? message[0] : message || 'Não foi possível criar a conta');
        },
      },
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.logoSmall}>
            <Image
              source={require('../../../assets/icon.png')}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>
        </View>

        <Text style={styles.title}>Criar conta</Text>
        <Text style={styles.subtitle}>Junte-se ao FoodIME</Text>

        {/* Role selector */}
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleBtn, role === 'BUYER' && styles.roleBtnActive]}
            onPress={() => setRole('BUYER')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="bag-handle-outline"
              size={20}
              color={role === 'BUYER' ? Colors.accent : Colors.textLight}
            />
            <Text style={[styles.roleText, role === 'BUYER' && styles.roleTextActive]}>
              Comprador
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleBtn, role === 'SELLER' && styles.roleBtnActive]}
            onPress={() => setRole('SELLER')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="storefront-outline"
              size={20}
              color={role === 'SELLER' ? Colors.accent : Colors.textLight}
            />
            <Text style={[styles.roleText, role === 'SELLER' && styles.roleTextActive]}>
              Vendedor
            </Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <Input label="Nome" placeholder="Seu nome completo" value={name} onChangeText={setName} />
        <Input
          label="Email"
          placeholder="seu@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Input
          label="Telefone"
          placeholder="(21) 99999-9999"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Input
          label="Senha"
          placeholder="Mínimo 8 caracteres, com maiúscula, minúscula e número"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Button
          title="Criar conta"
          onPress={handleRegister}
          loading={register.isPending}
          style={{ marginTop: 8 }}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Já tem conta? </Text>
          <Text style={styles.link} onPress={() => navigation.goBack()}>
            Entrar
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flexGrow: 1,
    padding: 28,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
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
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 28,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  roleBtn: {
    flex: 1,
    height: 64,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
  },
  roleBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(109, 124, 58, 0.1)',
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textLight,
  },
  roleTextActive: {
    color: Colors.accent,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  link: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
});
