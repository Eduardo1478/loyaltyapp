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
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';

const TYPE_META = {
  discount:  { label: 'Descuento', bg: '#FFF3EE', color: '#FF6B35' },
  bogo:      { label: '2x1',       bg: '#F3E8FF', color: '#9B59B6' },
  stamp:     { label: 'Sellos',    bg: '#E8F5E9', color: '#2E7D32' },
  nth_visit: { label: 'Visita N',  bg: '#E3F2FD', color: '#1565C0' },
};

function isActive(promo) {
  if (!promo.expiresAt) return true;
  const exp = promo.expiresAt.toDate ? promo.expiresAt.toDate() : new Date(promo.expiresAt);
  return exp > new Date();
}

function getSubtitle(promo) {
  switch (promo.type) {
    case 'discount':  return promo.discountValue ?? '';
    case 'bogo':      return `${promo.bogoItem ?? ''}${promo.bogoCondition ? ' · ' + promo.bogoCondition : ''}`;
    case 'stamp':     return `${promo.stampsRequired} sellos → ${promo.stampReward ?? ''}`;
    case 'nth_visit': return `Visita ${promo.visitNumber} → ${promo.visitReward ?? ''}`;
    default:          return '';
  }
}

export default function PromosScreen({ navigation }) {
  const { user } = useAuth();
  const [promos, setPromos]   = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPromos = useCallback(async () => {
    setLoading(true);
    try {
      const bizSnap = await getDocs(
        query(collection(db, 'businesses'), where('ownerId', '==', user.uid))
      );
      if (bizSnap.empty) return;

      const bId       = bizSnap.docs[0].id;
      const promosSnap = await getDocs(
        query(collection(db, 'promos'), where('businessId', '==', bId))
      );

      const list = promosSnap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const aT = a.createdAt?.toDate?.() ?? new Date(0);
          const bT = b.createdAt?.toDate?.() ?? new Date(0);
          return bT - aT;
        });
      setPromos(list);
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user.uid]);

  useFocusEffect(useCallback(() => { fetchPromos(); }, [fetchPromos]));

  function renderPromo({ item }) {
    const meta   = TYPE_META[item.type] ?? { label: item.type, bg: '#F5F5F5', color: '#555' };
    const active = isActive(item);
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={[styles.typeBadge, { backgroundColor: meta.bg }]}>
            <Text style={[styles.typeBadgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <View style={[styles.statusBadge, active ? styles.statusActive : styles.statusExpired]}>
            <Text style={[styles.statusText, active ? styles.statusTextActive : styles.statusTextExpired]}>
              {active ? 'Activa' : 'Vencida'}
            </Text>
          </View>
        </View>
        <Text style={styles.promoTitle}>{item.title}</Text>
        {getSubtitle(item) ? (
          <Text style={styles.promoSubtitle}>{getSubtitle(item)}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Promos</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('CreatePromo')}
          activeOpacity={0.7}
          hitSlop={12}
        >
          <Ionicons name="add-circle-outline" size={28} color="#FF6B35" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : (
        <FlatList
          data={promos}
          keyExtractor={(item) => item.id}
          renderItem={renderPromo}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="pricetag-outline" size={48} color="#E0E0E0" />
              <Text style={styles.emptyText}>Aún no tienes promos.</Text>
              <Text style={styles.emptyHint}>Toca + para crear tu primera promoción.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:  { flex: 1, backgroundColor: '#fff' },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  listContent: { padding: 20, paddingBottom: 32, flexGrow: 1 },

  card: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  cardTop: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusActive:  { backgroundColor: '#E8F5E9' },
  statusExpired: { backgroundColor: '#F5F5F5' },
  statusText:         { fontSize: 11, fontWeight: '600' },
  statusTextActive:   { color: '#2E7D32' },
  statusTextExpired:  { color: '#999' },
  promoTitle:    { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 },
  promoSubtitle: { fontSize: 13, color: '#888' },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#555', marginTop: 8 },
  emptyHint: { fontSize: 14, color: '#999' },
});
