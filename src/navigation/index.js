import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/auth/LoginScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import CustomerHome from '../screens/user/CustomerHome';
import BusinessPage from '../screens/user/BusinessPage';
import CouponDetail from '../screens/user/CouponDetail';
import BusinessDashboard from '../screens/business/BusinessDashboard';
import CreateBusinessProfile from '../screens/business/CreateBusinessProfile';
import CreateCoupon from '../screens/business/CreateCoupon';
import BusinessQR from '../screens/business/BusinessQR';
import QRScanner from '../screens/user/QRScanner';

const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
    </Stack.Navigator>
  );
}

function CustomerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CustomerHome" component={CustomerHome} />
      <Stack.Screen name="QRScanner" component={QRScanner} />
      <Stack.Screen name="BusinessPage" component={BusinessPage} />
      <Stack.Screen name="CouponDetail" component={CouponDetail} />
    </Stack.Navigator>
  );
}

function BusinessStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BusinessDashboard" component={BusinessDashboard} />
      <Stack.Screen name="CreateCoupon" component={CreateCoupon} />
      <Stack.Screen name="BusinessQR" component={BusinessQR} />
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
      {user && role === 'customer'                    && <CustomerStack />}
      {isBusinessOwner && hasBusinessProfile === true  && <BusinessStack />}
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
