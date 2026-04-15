import { useState, useCallback } from 'react';
import {
  View,
  Text,
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

const PLACEHOLDER_METRICS = [
  {
    icon: 'trending-up-outline',
    label: 'Seguidores en el tiempo',
    description: 'Gráfica de crecimiento semanal',
  },
  {
    icon: 'eye-outline',
    label: 'Vistas vs canjes',
    description: 'Tasa de conversión por promo',
  },
  {
    icon: 'trophy-outline',
    label: 'Promo más canjeada',
    description: 'Ranking de popularidad',
  },
  {
    icon: 'checkmark-circle-outline',
    label: 'Completación de sellos',
    description: 'Tasa de llenado de tarjetas',
  },
  {
    icon: 'person-add-outline',
    label: 'Nuevos seguidores',
    description: 'Esta semana vs el mes',
  },
  {
    icon: 'time-outline',
    label: 'Días más activos',
    description: 'Basado en horarios de canje',
  },
];

function isActive(promo) {
  if (!promo.expiresAt) return true;
  const exp = promo.expiresAt.toDate ? promo.expiresAt.toDate() : new Date(promo.expiresAt);
  return exp > new Date();
}

export default function DatosScreen() {
  const { user }  = useAuth();
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const bizSnap = await getDocs(
        query(collection(db, 'businesses'), where('ownerId', '==', user.uid))
      );
      if (bizSnap.empty) return;
      const bizId = bizSnap.docs[0].id;

      const [promosSnap, followsSnap] = await Promise.all([
        getDocs(query(collection(db, 'promos'), where('businessId', '==', bizId))),
        getDocs(query(collection(db, 'follows'), where('businessId', '==', bizId))),
      ]);

      const promos = promosSnap.docs.map((d) => d.data());
      setStats({
        followers:    followsSnap.size,
        totalPromos:  promos.length,
        activePromos: promos.filter(isActive).length,
      });
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user.uid]);

  useFocusEffect(useCallback(() => { fetchStats(); }, [fetchStats]));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Datos</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Live stats */}
          <Text style={styles.sectionLabel}>Resumen actual</Text>
          <View style={styles.statsGrid}>
            <StatCard icon="people-outline"   value={stats?.followers    ?? 0} label="Seguidores" />
            <StatCard icon="pricetag-outline"  value={stats?.activePromos ?? 0} label="Promos activas" />
            <StatCard icon="layers-outline"    value={stats?.totalPromos  ?? 0} label="Total promos" />
          </View>

          {/* Placeholder analytics */}
          <Text style={styles.sectionLabel}>Próximamente</Text>
          {PLACEHOLDER_METRICS.map((m) => (
            <View key={m.label} style={styles.placeholderCard}>
              <View style={styles.placeholderLeft}>
                <Ionicons name={m.icon} size={22} color="#CCC" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.placeholderTitle}>{m.label}</Text>
                  <Text style={styles.placeholderSubtitle}>{m.description}</Text>
                </View>
              </View>
              <View style={styles.soonBadge}>
                <Text style={styles.soonText}>Pronto</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={22} color="#FF6B35" style={{ marginBottom: 6 }} />
      <Text style={styles.statNumber}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
  content: { padding: 20, paddingBottom: 32 },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
    marginTop: 4,
  },

  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  statNumber: { fontSize: 24, fontWeight: '700', color: '#1A1A1A' },
  statLabel:  { fontSize: 11, color: '#888', marginTop: 2, textAlign: 'center' },

  placeholderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  placeholderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  placeholderTitle:    { fontSize: 14, fontWeight: '600', color: '#AAA' },
  placeholderSubtitle: { fontSize: 12, color: '#CCC', marginTop: 2 },
  soonBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  soonText: { fontSize: 11, color: '#AAA', fontWeight: '600' },
});
