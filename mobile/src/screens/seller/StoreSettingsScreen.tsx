import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMyStore, useCreateStore, useUpdateStore, useToggleStoreOpen } from '../../hooks/useStores';
import { LoadingState } from '../../components/common/LoadingState';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Colors } from '../../constants/colors';

export function StoreSettingsScreen() {
  const { data: store, isLoading, refetch } = useMyStore();
  const createStore = useCreateStore();
  const updateStore = useUpdateStore();
  const toggleOpen = useToggleStoreOpen();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [pixKey, setPixKey] = useState('');

  useEffect(() => {
    if (store) {
      setName(store.name);
      setDescription(store.description);
      setWhatsapp(store.whatsapp);
      setPixKey(store.pixKey);
    }
  }, [store]);

  if (isLoading) return <LoadingState />;

  const handleSave = () => {
    if (!name || !description || !whatsapp || !pixKey) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    if (store) {
      updateStore.mutate(
        { id: store.id, name, description, whatsapp },
        {
          onSuccess: () => Alert.alert('Sucesso', 'Loja atualizada'),
          onError: () => Alert.alert('Erro', 'Falha ao atualizar'),
        },
      );
    } else {
      createStore.mutate(
        { name, description, whatsapp, pixKey },
        {
          onSuccess: () => {
            Alert.alert('Sucesso', 'Loja criada!');
            refetch();
          },
          onError: () => Alert.alert('Erro', 'Falha ao criar loja'),
        },
      );
    }
  };

  const handleToggle = () => {
    if (!store) return;
    toggleOpen.mutate(store.id, {
      onError: () => Alert.alert('Erro', 'Falha ao alterar status'),
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          {store ? 'Configuracoes da loja' : 'Criar sua loja'}
        </Text>

        {store && (
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Status:</Text>
            <Text
              style={[
                styles.statusValue,
                { color: store.isOpen ? Colors.success : Colors.error },
              ]}
            >
              {store.isOpen ? 'Aberta' : 'Fechada'}
            </Text>
            <Button
              title={store.isOpen ? 'Fechar' : 'Abrir'}
              variant="outline"
              onPress={handleToggle}
              loading={toggleOpen.isPending}
              style={{ marginLeft: 'auto', paddingHorizontal: 16, height: 36 }}
            />
          </View>
        )}

        <Input label="Nome da loja" value={name} onChangeText={setName} placeholder="Doces da Maria" />
        <Input label="Descricao" value={description} onChangeText={setDescription} placeholder="Doces caseiros feitos com amor" />
        <Input label="WhatsApp" value={whatsapp} onChangeText={setWhatsapp} placeholder="(21) 99999-9999" keyboardType="phone-pad" />
        <Input
          label="Chave Pix"
          value={pixKey}
          onChangeText={setPixKey}
          placeholder="CPF, email ou chave aleatoria"
          editable={!store}
        />

        <Button
          title={store ? 'Salvar alteracoes' : 'Criar loja'}
          onPress={handleSave}
          loading={createStore.isPending || updateStore.isPending}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 24,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  statusLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginRight: 8,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});
