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
} from 'react-native';
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

  const handleRegister = () => {
    if (!name || !email || !phone || !password) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }
    register.mutate(
      { name, email, phone, password, role },
      {
        onError: () => Alert.alert('Erro', 'Nao foi possivel criar a conta'),
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
      >
        <Text style={styles.title}>Criar conta</Text>

        <Input label="Nome" placeholder="Seu nome" value={name} onChangeText={setName} />
        <Input
          label="Email"
          placeholder="seu@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
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
          placeholder="Minimo 6 caracteres"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Text style={styles.roleLabel}>Eu sou:</Text>
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleBtn, role === 'BUYER' && styles.roleBtnActive]}
            onPress={() => setRole('BUYER')}
          >
            <Text
              style={[
                styles.roleText,
                role === 'BUYER' && styles.roleTextActive,
              ]}
            >
              Comprador
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleBtn, role === 'SELLER' && styles.roleBtnActive]}
            onPress={() => setRole('SELLER')}
          >
            <Text
              style={[
                styles.roleText,
                role === 'SELLER' && styles.roleTextActive,
              ]}
            >
              Vendedor
            </Text>
          </TouchableOpacity>
        </View>

        <Button
          title="Cadastrar"
          onPress={handleRegister}
          loading={register.isPending}
          style={{ marginTop: 8 }}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Ja tem conta? </Text>
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
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 32,
    textAlign: 'center',
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  roleBtn: {
    flex: 1,
    height: 44,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF7ED',
  },
  roleText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  roleTextActive: {
    color: Colors.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  link: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
});
