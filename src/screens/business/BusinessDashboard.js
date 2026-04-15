import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { signOut } from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';

export default function BusinessDashboard({ navigation }) {
  const { user } = useAuth();

  const [business, setBusiness] = useState(null);   // businesses doc
  const [coupons, setCoupons] = useState([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Find the business owned by this user
      const bizSnap = await getDocs(
        query(collection(db, 'businesses'), where('ownerId', '==', user.uid))
      );

      if (bizSnap.empty) {
        setError('No se encontró un negocio asociado a tu cuenta.');
        return;
      }

      const bizDoc = bizSnap.docs[0];
      const bizData = { id: bizDoc.id, ...bizDoc.data() };
      setBusiness(bizData);

      // 2. Fetch coupons and follower count in parallel
      const [couponsSnap, followsSnap] = await Promise.all([
        getDocs(query(collection(db, 'coupons'), where('businessId', '==', bizDoc.id))),
        getDocs(query(collection(db, 'follows'), where('businessId', '==', bizDoc.id))),
      ]);

      setCoupons(couponsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setFollowerCount(followsSnap.size);
    } catch (e) {
      setError('No se pudo cargar el panel. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [user.uid]);

  useFocusEffect(
    useCallback(() => {
      fetchDashboard();
    }, [fetchDashboard])
  );

  async function handleLogout() {
    try {
      await signOut(auth);
      // AuthContext clears user, Navigation swaps to AuthStack automatically
    } catch (e) {
      setError('No se pudo cerrar sesión. Intenta de nuevo.');
    }
  }

  // ── Coupon helpers ────────────────────────────────────────────────────────

  function isActive(coupon) {
    if (!coupon.expiresAt) return true;
    // expiresAt is a Firestore Timestamp
    const expiry = coupon.expiresAt.toDate ? coupon.expiresAt.toDate() : new Date(coupon.expiresAt);
    return expiry > new Date();
  }

  function formatExpiry(expiresAt) {
    if (!expiresAt) return 'Sin vencimiento';
    const date = expiresAt.toDate ? expiresAt.toDate() : new Date(expiresAt);
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  function renderCoupon({ item }) {
    const active = isActive(item);
    return (
      <View style={styles.couponCard}>
        <View style={styles.couponTop}>
          <Text style={styles.couponTitle} numberOfLines={1}>{item.title}</Text>
          <View style={[styles.badge, active ? styles.badgeActive : styles.badgeExpired]}>
            <Text style={[styles.badgeText, active ? styles.badgeTextActive : styles.badgeTextExpired]}>
              {active ? 'Activo' : 'Vencido'}
            </Text>
          </View>
        </View>
        <View style={styles.couponBottom}>
          <Text style={styles.couponDiscount}>{item.discount}</Text>
          <Text style={styles.couponExpiry}>Vence: {formatExpiry(item.expiresAt)}</Text>
        </View>
      </View>
    );
  }

  function renderListHeader() {
    const activeCoupons = coupons.filter(isActive).length;
    return (
      <>
        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{followerCount}</Text>
            <Text style={styles.statLabel}>Seguidores</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{activeCoupons}</Text>
            <Text style={styles.statLabel}>Cupones activos</Text>
          </View>
        </View>

        {/* Action buttons */}
        <TouchableOpacity
          style={styles.primaryButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('CreateCoupon')}
        >
          <Text style={styles.primaryButtonText}>＋  Crear cupón</Text>
        </TouchableOpacity>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('BusinessQR', {
              businessId: business.id,
              businessName: business.name,
            })}
          >
            <Text style={styles.secondaryButtonText}>Mi QR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.8}>
            <Text style={styles.secondaryButtonText}>Mi perfil</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Mis cupones</Text>
      </>
    );
  }

  function renderEmpty() {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Aún no tienes cupones.</Text>
        <Text style={styles.emptyHint}>
          Crea tu primer cupón para atraer clientes.
        </Text>
      </View>
    );
  }

  // ── States ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchDashboard}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.businessName} numberOfLines={1}>
          {business?.name ?? 'Mi negocio'}
        </Text>
        <TouchableOpacity onPress={handleLogout} activeOpacity={0.7}>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={coupons}
        keyExtractor={(item) => item.id}
        renderItem={renderCoupon}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  businessName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 12,
  },
  logoutText: {
    fontSize: 14,
    color: '#888',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FF6B35',
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },

  // Action buttons
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#FF6B35',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#555',
    fontSize: 15,
    fontWeight: '500',
  },

  // Section
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },

  // Coupon card
  couponCard: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#FAFAFA',
  },
  couponTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  couponTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeActive: {
    backgroundColor: '#E6F4EA',
  },
  badgeExpired: {
    backgroundColor: '#F5F5F5',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  badgeTextActive: {
    color: '#2E7D32',
  },
  badgeTextExpired: {
    color: '#999',
  },
  couponBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  couponDiscount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF6B35',
  },
  couponExpiry: {
    fontSize: 12,
    color: '#999',
  },

  // Empty state
  emptyContainer: {
    paddingTop: 48,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Error
  errorText: {
    fontSize: 14,
    color: '#D94F4F',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FF6B35',
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
