import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { BuyerNavigator } from './BuyerNavigator';
import { SellerNavigator } from './SellerNavigator';

export function RootNavigator() {
  const user = useAuthStore((s) => s.user);

  return (
    <NavigationContainer>
      {!user ? (
        <AuthNavigator />
      ) : user.role === 'SELLER' ? (
        <SellerNavigator />
      ) : (
        <BuyerNavigator />
      )}
    </NavigationContainer>
  );
}
