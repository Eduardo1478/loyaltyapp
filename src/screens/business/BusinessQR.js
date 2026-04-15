import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

export default function BusinessQR({ route, navigation }) {
  const { businessId, businessName } = route.params;

  async function handleShare() {
    try {
      await Share.share({
        message: `Sigue a ${businessName} en LoyaltyApp y recibe ofertas exclusivas. ID: ${businessId}`,
      });
    } catch (e) {
      // User cancelled share sheet — no action needed
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Mi código QR</Text>
        <View style={styles.navSpacer} />
      </View>

      <View style={styles.container}>
        <Text style={styles.instructions}>
          Coloca este código en tu local para que los clientes puedan seguirte.
        </Text>

        {/* White card so the QR always has enough quiet zone regardless of bg */}
        <View style={styles.qrCard}>
          <QRCode
            value={businessId}
            size={220}
            color="#1A1A1A"
            backgroundColor="#fff"
          />
          <Text style={styles.businessName}>{businessName}</Text>
          <Text style={styles.scanHint}>Escanea para seguir este negocio</Text>
        </View>

        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
          activeOpacity={0.8}
        >
          <Text style={styles.shareButtonText}>Compartir código</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backText: {
    fontSize: 15,
    color: '#FF6B35',
    fontWeight: '500',
    width: 72,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  navSpacer: { width: 72 },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 32,
  },
  instructions: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  qrCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 40,
  },
  businessName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 20,
    marginBottom: 4,
    textAlign: 'center',
  },
  scanHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  shareButton: {
    width: '100%',
    height: 52,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#FF6B35',
    fontSize: 15,
    fontWeight: '600',
  },
});
