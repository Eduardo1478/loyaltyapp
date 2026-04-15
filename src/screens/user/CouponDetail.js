import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateCode() {
  return Array.from({ length: 8 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
}

function formatExpiry(isoString) {
  if (!isoString) return 'Sin vencimiento';
  return new Date(isoString).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function CouponDetail({ route, navigation }) {
  const { coupon } = route.params;

  // Code is stable for the lifetime of this screen instance
  const code = useMemo(() => generateCode(), []);

  const [redeemed, setRedeemed] = useState(false);

  function handleRedeem() {
    // Placeholder — real redemption logic (Firestore write, one-time use) will go here
    setRedeemed(true);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Detalle del cupón</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Coupon info card */}
        <View style={styles.infoCard}>
          <Text style={styles.couponTitle}>{coupon.title}</Text>
          <Text style={styles.couponDiscount}>{coupon.discount}</Text>
          <Text style={styles.couponExpiry}>Vence: {formatExpiry(coupon.expiresAt)}</Text>
        </View>

        {/* Redemption code block */}
        <View style={styles.codeSection}>
          <Text style={styles.codeLabel}>Código de canje</Text>
          <Text style={styles.codeLabel2}>Muestra este código al cajero</Text>
          <View style={styles.codeBox}>
            <Text style={styles.codeText}>{code}</Text>
          </View>
        </View>

        {/* Redeem button / success state */}
        {redeemed ? (
          <View style={styles.successBox}>
            <Text style={styles.successTitle}>¡Cupón canjeado!</Text>
            <Text style={styles.successSubtitle}>
              Presenta este código al cajero para obtener tu descuento.
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.redeemButton}
            onPress={handleRedeem}
            activeOpacity={0.8}
          >
            <Text style={styles.redeemButtonText}>Canjear cupón</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.disclaimer}>
          Este cupón es de un solo uso. Una vez canjeado no podrá utilizarse de nuevo.
        </Text>
      </ScrollView>
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
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 48,
    alignItems: 'center',
  },

  // Info card
  infoCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    marginBottom: 32,
  },
  couponTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  couponDiscount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FF6B35',
    marginBottom: 10,
  },
  couponExpiry: {
    fontSize: 13,
    color: '#999',
  },

  // Code block
  codeSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 32,
  },
  codeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 4,
  },
  codeLabel2: {
    fontSize: 13,
    color: '#999',
    marginBottom: 16,
  },
  codeBox: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    paddingVertical: 22,
    paddingHorizontal: 36,
  },
  codeText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 8,
    fontVariant: ['tabular-nums'],
  },

  // Redeem
  redeemButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  redeemButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Success
  successBox: {
    width: '100%',
    backgroundColor: '#E6F4EA',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 14,
    color: '#388E3C',
    textAlign: 'center',
    lineHeight: 20,
  },

  disclaimer: {
    fontSize: 12,
    color: '#BBB',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
});
