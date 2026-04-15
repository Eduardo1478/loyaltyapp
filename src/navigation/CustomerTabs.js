import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import FeedScreen     from '../screens/user/FeedScreen';
import LivesScreen    from '../screens/user/LivesScreen';
import ProfileScreen  from '../screens/user/ProfileScreen';
import DiscoverScreen from '../screens/user/DiscoverScreen';
import QRScanner      from '../screens/user/QRScanner';
import BusinessPage   from '../screens/user/BusinessPage';
import CouponDetail   from '../screens/user/CouponDetail';

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// ── Nested stacks ─────────────────────────────────────────────────────────────

function FeedStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FeedScreen"   component={FeedScreen} />
      <Stack.Screen name="BusinessPage" component={BusinessPage} />
      <Stack.Screen name="CouponDetail" component={CouponDetail} />
    </Stack.Navigator>
  );
}

function ExplorarStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DiscoverScreen" component={DiscoverScreen} />
      <Stack.Screen name="BusinessPage"   component={BusinessPage} />
      <Stack.Screen name="CouponDetail"   component={CouponDetail} />
    </Stack.Navigator>
  );
}

function ScanStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="QRScanner"    component={QRScanner} />
      <Stack.Screen name="BusinessPage" component={BusinessPage} />
      <Stack.Screen name="CouponDetail" component={CouponDetail} />
    </Stack.Navigator>
  );
}

function LivesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="LivesScreen" component={LivesScreen} />
    </Stack.Navigator>
  );
}

function PerfilStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

// ── Tab icon helper ────────────────────────────────────────────────────────────

function icon(name) {
  return ({ color, size }) => <Ionicons name={name} size={size} color={color} />;
}

// ── Tab navigator ─────────────────────────────────────────────────────────────

export default function CustomerTabs() {
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
        name="FeedTab"
        component={FeedStack}
        options={{
          tabBarLabel: 'Inicio',
          tabBarIcon: icon('home-outline'),
        }}
      />
      <Tab.Screen
        name="ExplorarTab"
        component={ExplorarStack}
        options={{
          tabBarLabel: 'Explorar',
          tabBarIcon: icon('compass-outline'),
        }}
      />
      <Tab.Screen
        name="ScanTab"
        component={ScanStack}
        options={{
          tabBarLabel: 'Escanear',
          tabBarIcon: icon('qr-code-outline'),
        }}
      />
      <Tab.Screen
        name="LivesTab"
        component={LivesStack}
        options={{
          tabBarLabel: 'Lives',
          tabBarIcon: icon('play-circle-outline'),
        }}
      />
      <Tab.Screen
        name="PerfilTab"
        component={PerfilStack}
        options={{
          tabBarLabel: 'Perfil',
          tabBarIcon: icon('person-outline'),
        }}
      />
    </Tab.Navigator>
  );
}
