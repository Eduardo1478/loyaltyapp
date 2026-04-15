import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';

const PANEL_WIDTH = Dimensions.get('window').width * 0.72;

export default function ProfileScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [panelVisible, setPanelVisible] = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  const slideAnim = useRef(new Animated.Value(PANEL_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const displayName = user?.displayName ?? user?.email?.split('@')[0] ?? 'Usuario';
  const initial     = displayName.charAt(0).toUpperCase();

  function openPanel() {
    setPanelVisible(true);
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
        speed: 20,
      }),
      Animated.timing(backdropAnim, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function closePanel(callback) {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: PANEL_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setPanelVisible(false);
      callback?.();
    });
  }

  async function handleLogout() {
    setLoading(true);
    closePanel(async () => {
      try {
        await signOut(auth);
      } catch (e) {
        setError('No se pudo cerrar sesión. Intenta de nuevo.');
        setLoading(false);
      }
    });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Perfil</Text>
        <TouchableOpacity onPress={openPanel} activeOpacity={0.7} hitSlop={12}>
          <Ionicons name="menu-outline" size={26} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarInitial}>{initial}</Text>
        </View>
        <Text style={styles.displayName}>{displayName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Slide-in settings panel */}
      <Modal visible={panelVisible} transparent animationType="none" onRequestClose={() => closePanel()}>
        {/* Backdrop */}
        <TouchableWithoutFeedback onPress={() => closePanel()}>
          <Animated.View
            style={[
              styles.backdrop,
              { opacity: backdropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }) },
            ]}
          />
        </TouchableWithoutFeedback>

        {/* Panel */}
        <Animated.View
          style={[
            styles.panel,
            { paddingTop: insets.top, transform: [{ translateX: slideAnim }] },
          ]}
        >
          {/* Panel header */}
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Configuración</Text>
            <TouchableOpacity onPress={() => closePanel()} hitSlop={12} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#555" />
            </TouchableOpacity>
          </View>

          {/* Options */}
          <View style={styles.panelBody}>
            <TouchableOpacity
              style={styles.panelRow}
              activeOpacity={0.7}
              onPress={handleLogout}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator size="small" color="#D94F4F" style={styles.panelRowIcon} />
                : <Ionicons name="log-out-outline" size={20} color="#D94F4F" style={styles.panelRowIcon} />}
              <Text style={styles.panelRowTextDestructive}>Cerrar sesión</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
  },

  avatarSection: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#888',
  },
  errorText: {
    fontSize: 13,
    color: '#D94F4F',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 32,
  },

  // Panel
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  panel: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: PANEL_WIDTH,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: -3, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 16,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  panelTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  panelBody: {
    paddingTop: 8,
  },
  panelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  panelRowIcon: {
    marginRight: 14,
  },
  panelRowTextDestructive: {
    fontSize: 15,
    fontWeight: '500',
    color: '#D94F4F',
  },
});
