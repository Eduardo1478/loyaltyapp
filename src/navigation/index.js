import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import CustomerTabs from './CustomerTabs';
import BusinessTabs from './BusinessTabs';
import CreateBusinessProfile from '../screens/business/CreateBusinessProfile';

const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}


function CreateBusinessProfileStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CreateBusinessProfile" component={CreateBusinessProfile} />
    </Stack.Navigator>
  );
}

export default function Navigation() {
  const { user, role, hasBusinessProfile, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  const isBusinessOwner = user && role === 'business_owner';

  return (
    <NavigationContainer>
      {!user                                          && <AuthStack />}
      {user && role === 'customer'                    && <CustomerTabs />}
      {isBusinessOwner && hasBusinessProfile === true  && <BusinessTabs />}
      {isBusinessOwner && hasBusinessProfile === false && <CreateBusinessProfileStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
