import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import PromosScreen        from '../screens/business/PromosScreen';
import CreatePromoScreen   from '../screens/business/CreatePromoScreen';
import RedeemCoupon        from '../screens/business/RedeemCoupon';
import DatosScreen         from '../screens/business/DatosScreen';
import LivesScreen         from '../screens/user/LivesScreen';
import BusinessPerfilScreen from '../screens/business/BusinessPerfilScreen';
import EditBusinessProfile from '../screens/business/EditBusinessProfile';
import BusinessQR          from '../screens/business/BusinessQR';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function PromosStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PromosScreen" component={PromosScreen} />
      <Stack.Screen name="CreatePromo"  component={CreatePromoScreen} />
    </Stack.Navigator>
  );
}

function CanjearStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="RedeemCoupon" component={RedeemCoupon} />
    </Stack.Navigator>
  );
}

function DatosStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DatosScreen" component={DatosScreen} />
    </Stack.Navigator>
  );
}

function PerfilStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BusinessPerfil"      component={BusinessPerfilScreen} />
      <Stack.Screen name="EditBusinessProfile"  component={EditBusinessProfile} />
      <Stack.Screen name="BusinessQR"           component={BusinessQR} />
    </Stack.Navigator>
  );
}

function icon(name) {
  return ({ color, size }) => <Ionicons name={name} size={size} color={color} />;
}

export default function BusinessTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FF6B35',
        tabBarInactiveTintColor: '#AAAAAA',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#EBEBEB',
          borderTopWidth: 1,
          height: 88,
          paddingBottom: 28,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="PromosTab"
        component={PromosStack}
        options={{ tabBarLabel: 'Promos', tabBarIcon: icon('pricetag-outline') }}
      />
      <Tab.Screen
        name="CanjearTab"
        component={CanjearStack}
        options={{ tabBarLabel: 'Canjear', tabBarIcon: icon('qr-code-outline') }}
      />
      <Tab.Screen
        name="DatosTab"
        component={DatosStack}
        options={{ tabBarLabel: 'Datos', tabBarIcon: icon('bar-chart-outline') }}
      />
      <Tab.Screen
        name="LivesTab"
        component={LivesScreen}
        options={{ tabBarLabel: 'Lives', tabBarIcon: icon('play-circle-outline') }}
      />
      <Tab.Screen
        name="PerfilTab"
        component={PerfilStack}
        options={{ tabBarLabel: 'Perfil', tabBarIcon: icon('storefront-outline') }}
      />
    </Tab.Navigator>
  );
}
