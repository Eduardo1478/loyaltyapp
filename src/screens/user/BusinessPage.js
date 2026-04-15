import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  doc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  collection,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';

function isActiveCoupon(coupon) {
  if (!coupon.expiresAt) return true;
  return new Date(coupon.expiresAt) > new Date();
}

function formatExpiry(isoString) {
  if (!isoString) return 'Sin vencimiento';
  return new Date(isoString).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function BusinessPage({ route, navigation }) {
  const { businessId } = route.params;
  const { user } = useAuth();

  const [business, setBusiness]       = useState(null);
  const [coupons, setCoupons]         = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followDocId, setFollowDocId] = useState(null); // needed to delete on unfollow
  const [followLoading, setFollowLoading] = useState(false);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');

  const fetchPage = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch business doc, coupons, and follow status in parallel
      const [bizSnap, couponsSnap, followsSnap] = await Promise.all([
        getDoc(doc(db, 'businesses', businessId)),
        getDocs(query(collection(db, 'coupons'), where('businessId', '==', businessId))),
        getDocs(query(
          collection(db, 'follows'),
          where('userId', '==', user.uid),
          where('businessId', '==', businessId)
        )),
      ]);

      if (!bizSnap.exists()) {
        setError('No se encontró este negocio.');
        return;
      }

      setBusiness({ id: bizSnap.id, ...bizSnap.data() });

      // Normalize expiresAt to ISO string so the object is serializable as a nav param
      const allCoupons = couponsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id:        d.id,
          title:     data.title,
          discount:  data.discount,
          expiresAt: data.expiresAt ? data.expiresAt.toDate().toISOString() : null,
          active:    data.active,
        };
      });
      setCoupons(allCoupons.filter(isActiveCoupon));

      if (!followsSnap.empty) {
        setIsFollowing(true);
        setFollowDocId(followsSnap.docs[0].id);
      } else {
        setIsFollowing(false);
        setFollowDocId(null);
      }
    } catch (e) {
      setError('No se pudo cargar el negocio. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [businessId, user.uid]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  async function handleFollowToggle() {
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await deleteDoc(doc(db, 'follows', followDocId));
        setIsFollowing(false);
        setFollowDocId(null);
      } else {
        const newDoc = await addDoc(collection(db, 'follows'), {
          userId:     user.uid,
          businessId,
          followedAt: serverTimestamp(),
        });
        setIsFollowing(true);
        setFollowDocId(newDoc.id);
      }
    } catch (e) {
      // Non-fatal: surface nothing, state stays as-is
    } finally {
      setFollowLoading(false);
    }
  }

  function renderCoupon({ item }) {
    return (
      <View style={styles.couponCard}>
        <View style={styles.couponInfo}>
          <Text style={styles.couponTitle}>{item.title}</Text>
          <Text style={styles.couponDiscount}>{item.discount}</Text>
          <Text style={styles.couponExpiry}>Vence: {formatExpiry(item.expiresAt)}</Text>
        </View>
        <TouchableOpacity
          style={styles.couponButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('CouponDetail', { coupon: item })}
        >
          <Text style={styles.couponButtonText}>Ver cupón</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderEmpty() {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Sin cupones activos por ahora.</Text>
        <Text style={styles.emptyHint}>Vuelve pronto para ver nuevas ofertas.</Text>
      </View>
    );
  }

  function renderHeader() {
    return (
      <View style={styles.businessHeader}>
        <Text style={styles.businessName}>{business.name}</Text>
        <Text style={styles.businessCategory}>{business.category}</Text>
        {business.description ? (
          <Text style={styles.businessDescription}>{business.description}</Text>
        ) : null}
        <Text style={styles.followerCount}>
          {business.followerCount ?? 0} seguidores
        </Text>

        <TouchableOpacity
          style={[styles.followButton, isFollowing && styles.followButtonActive]}
          onPress={handleFollowToggle}
          disabled={followLoading}
          activeOpacity={0.8}
        >
          {followLoading
            ? <ActivityIndicator color={isFollowing ? '#FF6B35' : '#fff'} size="small" />
            : <Text style={[styles.followButtonText, isFollowing && styles.followButtonTextActive]}>
                {isFollowing ? 'Siguiendo' : 'Seguir'}
              </Text>}
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Cupones disponibles</Text>
      </View>
    );
  }

  // ── States ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Atrás</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Atrás</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchPage}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Atrás</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={coupons}
        keyExtractor={(item) => item.id}
        renderItem={renderCoupon}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  navBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backText: {
    fontSize: 15,
    color: '#FF6B35',
    fontWeight: '500',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },

  // Business header block
  businessHeader: {
    paddingTop: 20,
    paddingBottom: 8,
  },
  businessName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  businessCategory: {
    fontSize: 14,
    color: '#888',
    marginBottom: 10,
    textTransform: 'capitalize',
  },
  businessDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 10,
  },
  followerCount: {
    fontSize: 13,
    color: '#999',
    marginBottom: 16,
  },
  followButton: {
    height: 44,
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
  },
  followButtonActive: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#FF6B35',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  followButtonTextActive: {
    color: '#FF6B35',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },

  // Coupon card
  couponCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#FAFAFA',
  },
  couponInfo: {
    flex: 1,
    marginRight: 12,
  },
  couponTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  couponDiscount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF6B35',
    marginBottom: 4,
  },
  couponExpiry: {
    fontSize: 12,
    color: '#999',
  },
  couponButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  couponButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },

  // Empty
  emptyContainer: {
    paddingTop: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#555',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyHint: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
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
