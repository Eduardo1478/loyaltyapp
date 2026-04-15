import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LivesScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lives</Text>
      </View>
      <View style={styles.centered}>
        <Text style={styles.icon}>📺</Text>
        <Text style={styles.title}>Lives</Text>
        <Text style={styles.subtitle}>
          Las transmisiones en vivo estarán disponibles próximamente.
        </Text>
      </View>
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
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  icon: { fontSize: 56, marginBottom: 16 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
  },
});
