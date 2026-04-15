import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
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

export default function InicioScreen({ navigation }) {
  const { user } = useAuth();
  const [business, setBusiness]     = useState(null);
  const [stats, setStats]           = useState({ followers: 0, activePromos: 0 });
  const [recentPromos, setRecentPromos] = useState([]);
  const [loading, setLoading]       = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const bizSnap = await getDocs(
        query(collection(db, 'businesses'), where('ownerId', '==', user.uid))
      );
      if (bizSnap.empty) return;

      const bizDoc  = bizSnap.docs[0];
      const bizData = { id: bizDoc.id, ...bizDoc.data() };
      setBusiness(bizData);

      const [promosSnap, followsSnap] = await Promise.all([
        getDocs(query(collection(db, 'promos'), where('businessId', '==', bizDoc.id))),
        getDocs(query(collection(db, 'follows'), where('businessId', '==', bizDoc.id))),
      ]);

      const promos      = promosSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const activeCount = promos.filter(isActive).length;
      setStats({ followers: followsSnap.size, activePromos: activeCount });

      const sorted = [...promos].sort((a, b) => {
        const aT = a.createdAt?.toDate?.() ?? new Date(0);
        const bT = b.createdAt?.toDate?.() ?? new Date(0);
        return bT - aT;
      });
      setRecentPromos(sorted.slice(0, 3));
    } catch (e) {
      // silent — screen just stays empty
    } finally {
      setLoading(false);
    }
  }, [user.uid]);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Inicio</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {business?.name ?? 'Mi negocio'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.followers}</Text>
            <Text style={styles.statLabel}>Seguidores</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.activePromos}</Text>
            <Text style={styles.statLabel}>Promos activas</Text>
          </View>
        </View>

        {/* Quick actions */}
        <Text style={styles.sectionLabel}>Acciones rápidas</Text>
        <View style={styles.actionsGrid}>
          <QuickAction
            icon="add-circle-outline"
            label="Nueva promo"
            onPress={() => navigation.navigate('PromosTab', { screen: 'CreatePromo' })}
          />
          <QuickAction
            icon="qr-code-outline"
            label="Canjear código"
            onPress={() => navigation.navigate('CanjearTab')}
          />
          <QuickAction
            icon="share-outline"
            label="Compartir QR"
            onPress={() =>
              navigation.navigate('PerfilTab', {
                screen: 'BusinessQR',
                params: { businessId: business?.id, businessName: business?.name },
              })
            }
          />
          <QuickAction
            icon="storefront-outline"
            label="Mi perfil"
            onPress={() => navigation.navigate('PerfilTab')}
          />
        </View>

        {/* Recent promos */}
        <Text style={styles.sectionLabel}>Promos recientes</Text>
        {recentPromos.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Aún no tienes promos.</Text>
            <Text style={styles.emptyHint}>
              Toca "Nueva promo" para atraer a tus clientes.
            </Text>
          </View>
        ) : (
          recentPromos.map((promo) => {
            const meta   = TYPE_META[promo.type] ?? { label: promo.type, bg: '#F5F5F5', color: '#555' };
            const active = isActive(promo);
            return (
              <View key={promo.id} style={styles.promoRow}>
                <View style={[styles.typeBadge, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.typeBadgeText, { color: meta.color }]}>{meta.label}</Text>
                </View>
                <Text style={styles.promoTitle} numberOfLines={1}>{promo.title}</Text>
                <View style={[styles.statusDot, { backgroundColor: active ? '#4CAF50' : '#CCC' }]} />
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.actionCard} activeOpacity={0.7} onPress={onPress}>
      <Ionicons name={icon} size={26} color="#FF6B35" />
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea:  { flex: 1, backgroundColor: '#fff' },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  content: { paddingHorizontal: 20, paddingBottom: 32 },

  statsRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginTop: 20,
    marginBottom: 28,
    overflow: 'hidden',
  },
  statCard:    { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statDivider: { width: 1, backgroundColor: '#E0E0E0' },
  statNumber:  { fontSize: 28, fontWeight: '700', color: '#FF6B35' },
  statLabel:   { fontSize: 12, color: '#888', marginTop: 2 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },

  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },
  actionCard: {
    width: '47.5%',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FAFAFA',
  },
  actionLabel: { fontSize: 13, fontWeight: '600', color: '#333' },

  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    gap: 10,
  },
  typeBadge:     { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  promoTitle:    { flex: 1, fontSize: 14, color: '#1A1A1A', fontWeight: '500' },
  statusDot:     { width: 8, height: 8, borderRadius: 4 },

  emptyCard: {
    paddingVertical: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    borderStyle: 'dashed',
  },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#555' },
  emptyHint: { fontSize: 13, color: '#999', marginTop: 6, textAlign: 'center', paddingHorizontal: 20 },
});
