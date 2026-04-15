import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  doc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  collection,
  query,
  where,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 220;
const AVATAR_SIZE  = 90;

function promoDisplayValue(data) {
  switch (data.type) {
    case 'discount':  return data.discountValue ?? '';
    case 'bogo':      return `2x1${data.bogoItem ? ' en ' + data.bogoItem : ''}`;
    case 'stamp':     return `${data.stampsRequired ?? '?'} sellos`;
    case 'nth_visit': return `Visita ${data.visitNumber ?? '?'}`;
    default:          return data.discount ?? '';
  }
}

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
  const { businessId, autoFollow } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [business, setBusiness]           = useState(null);
  const [coupons, setCoupons]             = useState([]);
  const [isFollowing, setIsFollowing]     = useState(false);
  const [followDocId, setFollowDocId]     = useState(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');

  const fetchPage = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [bizSnap, couponsSnap, followsSnap] = await Promise.all([
        getDoc(doc(db, 'businesses', businessId)),
        getDocs(query(collection(db, 'promos'), where('businessId', '==', businessId))),
        getDocs(query(
          collection(db, 'follows'),
          where('userId', '==', user.uid),
          where('businessId', '==', businessId)
        )),
      ]);

      if (!bizSnap.exists()) { setError('No se encontró este negocio.'); return; }

      setBusiness({ id: bizSnap.id, ...bizSnap.data() });

      const allCoupons = couponsSnap.docs.map((d) => {
        const data = d.data();
        return {
          id:         d.id,
          businessId: data.businessId,
          title:      data.title,
          discount:   promoDisplayValue(data),
          expiresAt:  data.expiresAt ? data.expiresAt.toDate().toISOString() : null,
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

  useEffect(() => { fetchPage(); }, [fetchPage]);

  useEffect(() => {
    if (!autoFollow || loading || isFollowing) return;
    handleFollowToggle();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  async function handleFollowToggle() {
    setFollowLoading(true);
    const businessRef = doc(db, 'businesses', businessId);
    try {
      if (isFollowing) {
        await Promise.all([
          deleteDoc(doc(db, 'follows', followDocId)),
          updateDoc(businessRef, { followerCount: increment(-1) }),
        ]);
        setIsFollowing(false);
        setFollowDocId(null);
        setBusiness((prev) => ({ ...prev, followerCount: (prev.followerCount ?? 1) - 1 }));
      } else {
        const [newDoc] = await Promise.all([
          addDoc(collection(db, 'follows'), {
            userId:     user.uid,
            businessId,
            followedAt: serverTimestamp(),
          }),
          updateDoc(businessRef, { followerCount: increment(1) }),
        ]);
        setIsFollowing(true);
        setFollowDocId(newDoc.id);
        setBusiness((prev) => ({ ...prev, followerCount: (prev.followerCount ?? 0) + 1 }));
      }
    } catch (e) {
      // Non-fatal
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
    const initial = business?.name?.charAt(0)?.toUpperCase() ?? '?';
    return (
      <>
        {/* Cover photo */}
        <View style={styles.coverContainer}>
          {business?.coverPhotoURL
            ? <Image source={{ uri: business.coverPhotoURL }} style={styles.coverImage} />
            : <View style={styles.coverPlaceholder} />}
          <View style={styles.coverScrim} />
        </View>

        {/* Avatar */}
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
            <Text style={styles.followerNumber}>{business?.followerCount ?? 0}</Text>
            {'  seguidores'}
          </Text>
        </View>

        {/* About */}
        {business?.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Sobre nosotros</Text>
            <Text style={styles.descriptionText}>{business.description}</Text>
          </View>
        ) : null}

        {/* Follow button */}
        <View style={styles.actionsBlock}>
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
        </View>

        {/* Promos section title */}
        <View style={styles.promosTitleRow}>
          <Text style={styles.sectionTitle}>Cupones disponibles</Text>
        </View>
      </>
    );
  }

  // ── Top header bar ────────────────────────────────────────────────────────
  const headerBar = (
    <SafeAreaView style={styles.headerSafeArea} edges={['top', 'left', 'right']}>
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
          hitSlop={8}
          style={styles.headerBack}
        >
          <Ionicons name="chevron-back" size={22} color="#1A1A1A" />
          <Text style={styles.headerBackText}>Atrás</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  // ── States ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
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
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
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
    <View style={styles.safeArea}>
      {headerBar}
      <FlatList
        data={coupons}
        keyExtractor={(item) => item.id}
        renderItem={renderCoupon}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },

  navBar: {
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backText: { fontSize: 15, color: '#FF6B35', fontWeight: '500' },

  // Header bar
  headerSafeArea: { backgroundColor: '#fff' },
  headerBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  headerBack:     { flexDirection: 'row', alignItems: 'center', gap: 2 },
  headerBackText: { fontSize: 15, color: '#1A1A1A', fontWeight: '500' },

  // Cover
  coverContainer: { width: SCREEN_WIDTH, height: COVER_HEIGHT },
  coverImage:     { ...StyleSheet.absoluteFillObject, resizeMode: 'cover' },
  coverPlaceholder: { ...StyleSheet.absoluteFillObject, backgroundColor: '#2C2C2E' },
  coverScrim:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },

  // Avatar
  avatarWrapper: {
    alignItems: 'center',
    marginTop: -(AVATAR_SIZE / 2),
    marginBottom: 12,
  },
  avatarImageContainer: {
    width: AVATAR_SIZE, height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 4, borderColor: '#fff',
    overflow: 'hidden',
  },
  avatarImage:      { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarPlaceholder:{ flex: 1, backgroundColor: '#FF6B35', justifyContent: 'center', alignItems: 'center' },
  avatarInitial:    { fontSize: 32, fontWeight: '700', color: '#fff' },

  // Info block
  infoBlock: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  businessName:     { fontSize: 22, fontWeight: '800', color: '#1A1A1A', marginBottom: 4 },
  businessCategory: { fontSize: 14, color: '#888', textTransform: 'capitalize', marginBottom: 8 },
  followerCount:    { fontSize: 14, color: '#888' },
  followerNumber:   { fontWeight: '700', color: '#1A1A1A', fontSize: 16 },

  // About section
  section: {
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6,
  },
  descriptionText: { fontSize: 14, color: '#444', lineHeight: 20 },

  // Follow button
  actionsBlock: { padding: 20, paddingBottom: 8 },
  followButton: {
    height: 46, backgroundColor: '#FF6B35',
    borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  followButtonActive: {
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#FF6B35',
  },
  followButtonText:       { color: '#fff', fontSize: 15, fontWeight: '600' },
  followButtonTextActive: { color: '#FF6B35' },

  // Promos title
  promosTitleRow: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  sectionTitle:   { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },

  listContent: { paddingBottom: 40, flexGrow: 1 },

  // Coupon card
  couponCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10,
    padding: 14, marginHorizontal: 20, marginBottom: 10, backgroundColor: '#FAFAFA',
  },
  couponInfo:    { flex: 1, marginRight: 12 },
  couponTitle:   { fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 2 },
  couponDiscount:{ fontSize: 18, fontWeight: '700', color: '#FF6B35', marginBottom: 4 },
  couponExpiry:  { fontSize: 12, color: '#999' },
  couponButton: {
    backgroundColor: '#FF6B35', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
  },
  couponButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Empty
  emptyContainer: { paddingTop: 32, alignItems: 'center', paddingHorizontal: 20 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#555', textAlign: 'center', marginBottom: 6 },
  emptyHint: { fontSize: 13, color: '#999', textAlign: 'center' },

  // Error
  errorText: { fontSize: 14, color: '#D94F4F', textAlign: 'center', marginBottom: 16 },
  retryButton: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, backgroundColor: '#FF6B35' },
  retryText:   { color: '#fff', fontWeight: '600', fontSize: 14 },
});
