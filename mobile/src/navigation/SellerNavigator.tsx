import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { DashboardScreen } from '../screens/seller/DashboardScreen';
import { OrdersScreen } from '../screens/seller/OrdersScreen';
import { ProductsScreen } from '../screens/seller/ProductsScreen';
import { StoreSettingsScreen } from '../screens/seller/StoreSettingsScreen';
import { Colors } from '../constants/colors';
import { useSocket } from '../hooks/useSocket';
import type { SellerTabParamList } from '../types/navigation.types';

const Tab = createBottomTabNavigator<SellerTabParamList>();

export function SellerNavigator() {
  // Mantém conexão Socket.io ativa em todas as tabs do seller
  useSocket();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textLight,
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarLabel: 'Pedidos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Products"
        component={ProductsScreen}
        options={{
          tabBarLabel: 'Produtos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="fast-food-outline" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="StoreSettings"
        component={StoreSettingsScreen}
        options={{
          tabBarLabel: 'Loja',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
