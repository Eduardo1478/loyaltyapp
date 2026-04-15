import { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  Animated,
  Dimensions,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 260;
const AVATAR_SIZE  = 110;
const PANEL_WIDTH  = SCREEN_WIDTH * 0.72;

export default function BusinessPerfilScreen({ navigation }) {
  const { user } = useAuth();
  const insets   = useSafeAreaInsets();

  const [business, setBusiness]           = useState(null);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading]             = useState(true);
  const [panelVisible, setPanelVisible]   = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const slideAnim    = useRef(new Animated.Value(PANEL_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const fetchBusiness = useCallback(async () => {
    try {
      const bizSnap = await getDocs(
        query(collection(db, 'businesses'), where('ownerId', '==', user.uid))
      );
      if (bizSnap.empty) return;
      const bizDoc  = bizSnap.docs[0];
      const bizData = { id: bizDoc.id, ...bizDoc.data() };
      setBusiness(bizData);

      const followsSnap = await getDocs(
        query(collection(db, 'follows'), where('businessId', '==', bizDoc.id))
      );
      setFollowerCount(followsSnap.size);
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user.uid]);

  useFocusEffect(useCallback(() => { fetchBusiness(); }, [fetchBusiness]));

  function openPanel() {
    setPanelVisible(true);
    Animated.parallel([
      Animated.spring(slideAnim,    { toValue: 0,          useNativeDriver: true, bounciness: 0, speed: 20 }),
      Animated.timing(backdropAnim, { toValue: 1,          duration: 220,         useNativeDriver: true }),
    ]).start();
  }

  function closePanel(callback) {
    Animated.parallel([
      Animated.timing(slideAnim,    { toValue: PANEL_WIDTH, duration: 200, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0,           duration: 200, useNativeDriver: true }),
    ]).start(() => { setPanelVisible(false); callback?.(); });
  }

  async function handleLogout() {
    setLogoutLoading(true);
    closePanel(async () => {
      try { await signOut(auth); }
      catch (e) { setLogoutLoading(false); }
    });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </SafeAreaView>
    );
  }

  const initial = business?.name?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi negocio</Text>
        <TouchableOpacity
          style={styles.headerMenuButton}
          onPress={openPanel}
          activeOpacity={0.8}
          hitSlop={8}
        >
          <Ionicons name="menu-outline" size={24} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      <ScrollView bounces={false} showsVerticalScrollIndicator={false}>

        {/* Cover photo */}
        <View style={styles.coverContainer}>
          {business?.coverPhotoURL
            ? <Image source={{ uri: business.coverPhotoURL }} style={styles.coverImage} />
            : <View style={styles.coverPlaceholder} />}
          <View style={styles.coverScrim} />
        </View>

        {/* Avatar — display only */}
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarImageContainer}>
            {business?.profilePhotoURL
              ? <Image source={{ uri: business.profilePhotoURL }} style={styles.avatarImage} />
              : <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>{initial}</Text>
                </View>}
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoBlock}>
          <Text style={styles.businessName}>{business?.name ?? '—'}</Text>
          <Text style={styles.businessCategory}>{business?.category ?? '—'}</Text>
          <Text style={styles.followerCount}>
            <Text style={styles.followerNumber}>{followerCount}</Text>
            {'  seguidores'}
          </Text>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Sobre nosotros</Text>
          <Text style={styles.descriptionText}>
            {business?.description || 'Sin descripción. Toca "Editar perfil" para agregar una.'}
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actionsBlock}>
          <TouchableOpacity
            style={styles.editButton}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate('EditBusinessProfile', {
                businessId:      business.id,
                name:            business.name,
                category:        business.category,
                description:     business.description ?? '',
                coverPhotoURL:   business.coverPhotoURL ?? null,
                profilePhotoURL: business.profilePhotoURL ?? null,
              })
            }
          >
            <Ionicons name="pencil-outline" size={16} color="#FF6B35" />
            <Text style={styles.editButtonText}>Editar perfil</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.qrButton}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate('BusinessQR', {
                businessId:   business.id,
                businessName: business.name,
              })
            }
          >
            <Ionicons name="qr-code-outline" size={16} color="#555" />
            <Text style={styles.qrButtonText}>Ver QR</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Settings panel */}
      <Modal
        visible={panelVisible}
        transparent
        animationType="none"
        onRequestClose={() => closePanel()}
      >
        <TouchableWithoutFeedback onPress={() => closePanel()}>
          <Animated.View
            style={[
              styles.backdrop,
              { opacity: backdropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }) },
            ]}
          />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[styles.panel, { paddingTop: insets.top, transform: [{ translateX: slideAnim }] }]}
        >
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Configuración</Text>
            <TouchableOpacity onPress={() => closePanel()} hitSlop={12}>
              <Ionicons name="close" size={22} color="#555" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.panelRow}
            activeOpacity={0.7}
            onPress={handleLogout}
            disabled={logoutLoading}
          >
            {logoutLoading
              ? <ActivityIndicator size="small" color="#D94F4F" style={{ marginRight: 14 }} />
              : <Ionicons name="log-out-outline" size={20} color="#D94F4F" style={{ marginRight: 14 }} />}
            <Text style={styles.panelRowDestructive}>Cerrar sesión</Text>
          </TouchableOpacity>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle:      { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  headerMenuButton: { padding: 4 },

  coverContainer: { width: SCREEN_WIDTH, height: COVER_HEIGHT },
  coverImage:     { ...StyleSheet.absoluteFillObject, resizeMode: 'cover' },
  coverPlaceholder: { ...StyleSheet.absoluteFillObject, backgroundColor: '#2C2C2E' },
  coverScrim:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  avatarWrapper: {
    alignItems: 'center',
    marginTop: -(AVATAR_SIZE / 2),
    marginBottom: 14,
  },
  avatarImageContainer: {
    width: AVATAR_SIZE, height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 4, borderColor: '#fff',
    overflow: 'hidden',
  },
  avatarImage:      { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarPlaceholder:{ flex: 1, backgroundColor: '#FF6B35', justifyContent: 'center', alignItems: 'center' },
  avatarInitial:    { fontSize: 40, fontWeight: '700', color: '#fff' },

  infoBlock: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  businessName:     { fontSize: 22, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  businessCategory: { fontSize: 14, color: '#888', textTransform: 'capitalize', marginBottom: 10 },
  followerCount:    { fontSize: 14, color: '#888' },
  followerNumber:   { fontWeight: '700', color: '#1A1A1A', fontSize: 16 },

  section: {
    paddingHorizontal: 20, paddingVertical: 20,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8,
  },
  descriptionText: { fontSize: 14, color: '#444', lineHeight: 20 },

  actionsBlock: { flexDirection: 'row', gap: 10, padding: 20 },
  editButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, height: 44,
    borderWidth: 1.5, borderColor: '#FF6B35', borderRadius: 10,
  },
  editButtonText: { fontSize: 14, fontWeight: '600', color: '#FF6B35' },
  qrButton: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, height: 44,
    paddingHorizontal: 20,
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10,
  },
  qrButtonText: { fontSize: 14, fontWeight: '500', color: '#555' },

  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#000' },
  panel: {
    position: 'absolute', top: 0, right: 0, bottom: 0,
    width: PANEL_WIDTH, backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: -3, height: 0 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 16,
  },
  panelHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  panelTitle:          { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },
  panelRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F8F8F8',
  },
  panelRowDestructive: { fontSize: 15, fontWeight: '500', color: '#D94F4F' },
});
