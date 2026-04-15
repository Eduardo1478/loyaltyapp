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
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';

export default function CustomerHome({ navigation }) {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFollowedBusinesses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Get all follow documents for this user
      const followsQuery = query(
        collection(db, 'follows'),
        where('userId', '==', user.uid)
      );
      const followsSnap = await getDocs(followsQuery);

      if (followsSnap.empty) {
        setBusinesses([]);
        return;
      }

      // 2. Fetch each business document in parallel
      const businessIds = followsSnap.docs.map((d) => d.data().businessId);
      const businessDocs = await Promise.all(
        businessIds.map((id) => getDoc(doc(db, 'businesses', id)))
      );

      const result = businessDocs
        .filter((d) => d.exists())
        .map((d) => ({ id: d.id, ...d.data() }));

      setBusinesses(result);
    } catch (e) {
      setError('No se pudieron cargar tus negocios. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [user.uid]);

  useFocusEffect(
    useCallback(() => {
      fetchFollowedBusinesses();
    }, [fetchFollowedBusinesses])
  );

  async function handleLogout() {
    try {
      await signOut(auth);
      // AuthContext clears the user, Navigation unmounts this stack automatically
    } catch (e) {
      setError('No se pudo cerrar sesión. Intenta de nuevo.');
    }
  }

  function renderBusiness({ item }) {
    return (
      <View style={styles.card}>
        <View style={styles.cardInfo}>
          <Text style={styles.businessName}>{item.name}</Text>
          <Text style={styles.businessCategory}>{item.category}</Text>
        </View>
        <TouchableOpacity
          style={styles.dealsButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('BusinessPage', { businessId: item.id })}
        >
          <Text style={styles.dealsButtonText}>Ver ofertas</Text>
        </TouchableOpacity>
      </View>
    );
  }

  function renderEmpty() {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Aún no sigues ningún negocio.</Text>
        <Text style={styles.emptyHint}>
          Escanea un código QR para seguir tu primer negocio.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.appName}>LoyaltyApp</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => navigation.navigate('QRScanner')}
            activeOpacity={0.8}
          >
            <Text style={styles.scanButtonText}>Escanear QR</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} activeOpacity={0.7}>
            <Text style={styles.logoutText}>Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Body */}
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
          ListHeaderComponent={
            <Text style={styles.sectionTitle}>Mis negocios</Text>
          }
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
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
  appName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF6B35',
  },
  logoutText: {
    fontSize: 14,
    color: '#888',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
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
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 20,
    marginBottom: 14,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  cardInfo: {
    flex: 1,
    marginRight: 12,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  businessCategory: {
    fontSize: 13,
    color: '#888',
  },
  dealsButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  dealsButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 60,
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
});
