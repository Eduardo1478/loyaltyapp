import { useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import {
  collection, query, where, getDocs, doc, getDoc, deleteDoc, updateDoc, increment,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';

export default function FeedScreen({ navigation }) {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');

  const fetchFollowedBusinesses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const followsSnap = await getDocs(
        query(collection(db, 'follows'), where('userId', '==', user.uid))
      );
      if (followsSnap.empty) { setBusinesses([]); return; }

      const businessIds = followsSnap.docs.map((d) => d.data().businessId);
      const businessDocs = await Promise.all(
        businessIds.map((id) => getDoc(doc(db, 'businesses', id)))
      );
      const bizList = businessDocs
        .filter((d) => d.exists())
        .map((d) => ({ id: d.id, ...d.data() }));

      // Fetch all promos for each business (to find stamp/nth_visit promos)
      const promoSnaps = await Promise.all(
        bizList.map((b) =>
          getDocs(query(collection(db, 'promos'), where('businessId', '==', b.id)))
        )
      );

      // Find the best stamp promo per business (first stamp or nth_visit found)
      const stampPromoMap = {};
      promoSnaps.forEach((snap, i) => {
        const stampPromo = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .find((p) => p.type === 'stamp' || p.type === 'nth_visit');
        if (stampPromo) stampPromoMap[bizList[i].id] = stampPromo;
      });

      // Fetch userProgress for businesses that have stamp promos
      const bizIdsWithStamps = Object.keys(stampPromoMap);
      const progressSnaps = await Promise.all(
        bizIdsWithStamps.map((bizId) =>
          getDoc(doc(db, 'businesses', bizId, 'userProgress', user.uid))
        )
      );
      const progressMap = {};
      bizIdsWithStamps.forEach((bizId, i) => {
        progressMap[bizId] = progressSnaps[i].exists() ? progressSnaps[i].data() : null;
      });

      setBusinesses(
        bizList.map((b) => ({
          ...b,
          stampPromo: stampPromoMap[b.id] ?? null,
          progress:   progressMap[b.id]   ?? null,
        }))
      );
    } catch (e) {
      setError('No se pudieron cargar tus negocios. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [user.uid]);

  useFocusEffect(
    useCallback(() => { fetchFollowedBusinesses(); }, [fetchFollowedBusinesses])
  );

  async function handleUnfollow(item) {
    try {
      const followsSnap = await getDocs(
        query(
          collection(db, 'follows'),
          where('userId', '==', user.uid),
          where('businessId', '==', item.id)
        )
      );
      if (followsSnap.empty) return;
      await Promise.all([
        deleteDoc(doc(db, 'follows', followsSnap.docs[0].id)),
        updateDoc(doc(db, 'businesses', item.id), { followerCount: increment(-1) }),
      ]);
      setBusinesses((prev) => prev.filter((b) => b.id !== item.id));
    } catch {
      // Non-fatal
    }
  }

  function confirmUnfollow(item) {
    Alert.alert(
      item.name,
      '¿Dejar de seguir este negocio?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Dejar de seguir', style: 'destructive', onPress: () => handleUnfollow(item) },
      ]
    );
  }

  function renderBusiness({ item }) {
    const { stampPromo, progress } = item;

    let stampsNow  = 0;
    let stampsTotal = 0;
    let progressLabel = '';

    if (stampPromo) {
      if (stampPromo.type === 'stamp') {
        stampsNow   = progress?.stamps ?? 0;
        stampsTotal = stampPromo.stampsRequired ?? 10;
        progressLabel = `${stampsNow}/${stampsTotal} sellos`;
      } else if (stampPromo.type === 'nth_visit') {
        stampsNow   = progress?.totalVisits ?? 0;
        stampsTotal = stampPromo.visitNumber ?? 10;
        progressLabel = `${stampsNow}/${stampsTotal} visitas`;
      }
    }

    const progressPct = stampsTotal > 0
      ? Math.min((stampsNow / stampsTotal) * 100, 100)
      : 0;

    const initial = item.name?.charAt(0)?.toUpperCase() ?? '?';
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('BusinessPage', { businessId: item.id })}
        onLongPress={() => confirmUnfollow(item)}
        delayLongPress={400}
      >
        {/* Avatar */}
        <View style={styles.avatar}>
          {item.profilePhotoURL
            ? <Image source={{ uri: item.profilePhotoURL }} style={styles.avatarImage} />
            : <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>}
        </View>

        <View style={styles.cardLeft}>
          <Text style={styles.businessName}>{item.name}</Text>
          <Text style={styles.businessCategory}>{item.category}</Text>

          {stampPromo ? (
            <View style={styles.stampRow}>
              <View style={styles.stampTrack}>
                <View style={[styles.stampFill, { width: `${progressPct}%` }]} />
              </View>
              <Text style={styles.stampLabel}>{progressLabel}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.dealsButton}>
          <Text style={styles.dealsButtonText}>Ver ofertas</Text>
        </View>
      </TouchableOpacity>
    );
  }

  function renderEmpty() {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Aún no sigues ningún negocio.</Text>
        <Text style={styles.emptyHint}>
          Usa el botón central ⊙ para escanear un código QR y seguir tu primer negocio.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.appName}>LoyaltyApp</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchFollowedBusinesses} style={styles.retryButton}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={businesses}
          keyExtractor={(item) => item.id}
          renderItem={renderBusiness}
          ListHeaderComponent={null}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  appName: { fontSize: 22, fontWeight: '800', color: '#FF6B35' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  errorText: { fontSize: 14, color: '#D94F4F', textAlign: 'center', marginBottom: 16 },
  retryButton: {
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, backgroundColor: '#FF6B35',
  },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  listContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, flexGrow: 1 },

  avatar: {
    width: 44, height: 44, borderRadius: 22,
    overflow: 'hidden', marginRight: 12,
  },
  avatarImage:       { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarPlaceholder: { flex: 1, backgroundColor: '#FF6B35', justifyContent: 'center', alignItems: 'center' },
  avatarInitial:     { fontSize: 18, fontWeight: '700', color: '#fff' },

  card: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10,
    padding: 16, marginBottom: 12, backgroundColor: '#FAFAFA',
  },
  cardLeft: { flex: 1, marginRight: 12 },
  businessName:     { fontSize: 16, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 },
  businessCategory: { fontSize: 13, color: '#888' },

  // Stamp progress on feed card
  stampRow: { marginTop: 10 },
  stampTrack: {
    height: 5, backgroundColor: '#E0E0E0', borderRadius: 3,
    overflow: 'hidden', marginBottom: 4,
  },
  stampFill: { height: '100%', backgroundColor: '#FF6B35', borderRadius: 3 },
  stampLabel: { fontSize: 11, color: '#888', fontWeight: '500' },

  dealsButton: {
    backgroundColor: '#FF6B35', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
  },
  dealsButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, paddingTop: 60,
  },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#555', textAlign: 'center', marginBottom: 8 },
  emptyHint: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 },
});
