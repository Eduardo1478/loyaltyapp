import { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

const CATEGORY_FILTERS = [
  { key: 'todos',       label: 'Todos'      },
  { key: 'restaurante', label: 'Restaurante'},
  { key: 'cafeteria',   label: 'Cafetería'  },
  { key: 'tienda',      label: 'Tienda'     },
  { key: 'otro',        label: 'Otro'       },
];

export default function DiscoverScreen({ navigation }) {
  const [allBusinesses, setAllBusinesses] = useState([]);
  const [search, setSearch]               = useState('');
  const [activeCategory, setActiveCategory] = useState('todos');
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState('');

  const fetchBusinesses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const snap = await getDocs(collection(db, 'businesses'));
      setAllBusinesses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      setError('No se pudieron cargar los negocios. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBusinesses();
    }, [fetchBusinesses])
  );

  // Apply search and category filter locally — no extra Firestore queries
  const filtered = allBusinesses.filter((b) => {
    const matchesCategory = activeCategory === 'todos' || b.category === activeCategory;
    const matchesSearch   = b.name?.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  function renderBusiness({ item }) {
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('BusinessPage', { businessId: item.id })}
      >
        <View style={styles.cardMain}>
          <Text style={styles.businessName}>{item.name}</Text>
          <Text style={styles.businessCategory} numberOfLines={1}>
            {item.category}
          </Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.followerCount}>{item.followerCount ?? 0}</Text>
          <Text style={styles.followerLabel}>seguidores</Text>
        </View>
      </TouchableOpacity>
    );
  }

  function renderEmpty() {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {search ? 'Sin resultados para tu búsqueda.' : 'Aún no hay negocios registrados.'}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explorar</Text>
      </View>

      {/* Search input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar negocio…"
          placeholderTextColor="#999"
          autoCapitalize="none"
          returnKeyType="search"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Category filter pills */}
      <View style={styles.filtersRow}>
        {CATEGORY_FILTERS.map(({ key, label }) => {
          const active = activeCategory === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.filterPill, active && styles.filterPillActive]}
              onPress={() => setActiveCategory(key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FF6B35" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchBusinesses}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderBusiness}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: {
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

  // Search
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  searchInput: {
    height: 44,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1A1A1A',
  },

  // Category pills
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  filterPillActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  filterPillText: { fontSize: 13, color: '#666', fontWeight: '500' },
  filterPillTextActive: { color: '#fff', fontWeight: '600' },

  // List
  listContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 32, flexGrow: 1 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    backgroundColor: '#FAFAFA',
  },
  cardMain: { flex: 1, marginRight: 12 },
  businessName: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 3 },
  businessCategory: { fontSize: 13, color: '#888', textTransform: 'capitalize' },
  cardRight: { alignItems: 'center' },
  followerCount: { fontSize: 18, fontWeight: '700', color: '#FF6B35' },
  followerLabel: { fontSize: 11, color: '#999' },

  // States
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyContainer: { paddingTop: 48, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center' },
  errorText: { fontSize: 14, color: '#D94F4F', textAlign: 'center', marginBottom: 16 },
  retryButton: {
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, backgroundColor: '#FF6B35',
  },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
