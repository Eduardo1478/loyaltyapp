import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';

const CODE_TTL = 60; // seconds before QR refreshes
const CHARS    = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateCode() {
  return Array.from({ length: 8 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
}

function formatExpiry(isoString) {
  if (!isoString) return 'Sin vencimiento';
  return new Date(isoString).toLocaleDateString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

export default function CouponDetail({ route, navigation }) {
  const { coupon } = route.params;
  const { user }   = useAuth();

  const [code, setCode]           = useState(null);
  const [codeLoading, setCodeLoading] = useState(true);
  const [countdown, setCountdown] = useState(CODE_TTL);

  const intervalRef    = useRef(null);
  const countdownRef   = useRef(CODE_TTL);
  const refreshingRef  = useRef(false); // prevents double-refresh

  async function createNewCode() {
    const newCode  = generateCode();
    const expiresAt = Timestamp.fromDate(new Date(Date.now() + CODE_TTL * 1000));
    await setDoc(doc(db, 'redemptions', newCode), {
      couponId:   coupon.id,
      userId:     user.uid,
      businessId: coupon.businessId ?? '',
      createdAt:  serverTimestamp(),
      redeemedAt: null,
      expiresAt,
    });
    return newCode;
  }

  function startCountdown() {
    clearInterval(intervalRef.current);
    countdownRef.current = CODE_TTL;
    setCountdown(CODE_TTL);
    intervalRef.current = setInterval(() => {
      countdownRef.current -= 1;
      setCountdown(countdownRef.current);
      if (countdownRef.current <= 0) {
        clearInterval(intervalRef.current);
        doRefresh();
      }
    }, 1000);
  }

  async function doRefresh() {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const newCode = await createNewCode();
      setCode(newCode);
      startCountdown();
    } catch {
      // If offline, retry after 3s
      setTimeout(doRefresh, 3000);
    } finally {
      refreshingRef.current = false;
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const newCode = await createNewCode();
        if (!mounted) return;
        setCode(newCode);
        startCountdown();
      } catch {
        if (!mounted) return;
        setCode(generateCode()); // local fallback — won't be in Firestore
      } finally {
        if (mounted) setCodeLoading(false);
      }
    })();
    return () => {
      mounted = false;
      clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const progressPct = (countdown / CODE_TTL) * 100;
  const urgent      = countdown <= 10;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Atrás</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle}>Detalle del cupón</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Coupon info */}
        <View style={styles.infoCard}>
          <Text style={styles.couponTitle}>{coupon.title}</Text>
          <Text style={styles.couponDiscount}>{coupon.discount}</Text>
          <Text style={styles.couponExpiry}>Vence: {formatExpiry(coupon.expiresAt)}</Text>
        </View>

        {/* QR card */}
        <View style={styles.qrCard}>
          <Text style={styles.qrLabel}>Muestra al cajero para canjear</Text>

          <View style={styles.qrBox}>
            {codeLoading || !code
              ? <ActivityIndicator color="#FF6B35" size="large" style={{ width: 200, height: 200 }} />
              : <QRCode
                  value={code}
                  size={200}
                  color="#1A1A1A"
                  backgroundColor="#fff"
                  ecl="M"
                />}
          </View>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressPct}%` },
                urgent && styles.progressFillUrgent,
              ]}
            />
          </View>

          {/* Countdown */}
          <Text style={[styles.countdownText, urgent && styles.countdownUrgent]}>
            {codeLoading
              ? 'Generando código…'
              : `Actualiza en 0:${String(countdown).padStart(2, '0')}`}
          </Text>
        </View>

        <Text style={styles.disclaimer}>
          Este código es de un solo uso y se actualiza cada 60 segundos.{'\n'}
          No compartas capturas de pantalla.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  navBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backText:   { fontSize: 15, color: '#FF6B35', fontWeight: '500', width: 72 },
  navTitle:   { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
  navSpacer:  { width: 72 },

  container: {
    paddingHorizontal: 24, paddingTop: 28, paddingBottom: 48, alignItems: 'center',
  },

  // Info card
  infoCard: {
    width: '100%', borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 14,
    padding: 20, alignItems: 'center', backgroundColor: '#FAFAFA', marginBottom: 28,
  },
  couponTitle:    { fontSize: 18, fontWeight: '600', color: '#1A1A1A', textAlign: 'center', marginBottom: 8 },
  couponDiscount: { fontSize: 36, fontWeight: '800', color: '#FF6B35', marginBottom: 10 },
  couponExpiry:   { fontSize: 13, color: '#999' },

  // QR card
  qrCard: {
    width: '100%', alignItems: 'center',
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 16,
    paddingTop: 24, paddingBottom: 20, paddingHorizontal: 20,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    marginBottom: 24,
  },
  qrLabel: { fontSize: 13, color: '#888', marginBottom: 20, textAlign: 'center' },
  qrBox:   { marginBottom: 20 },

  // Progress bar
  progressTrack: {
    width: '100%', height: 4, backgroundColor: '#F0F0F0', borderRadius: 2,
    overflow: 'hidden', marginBottom: 10,
  },
  progressFill: {
    height: '100%', backgroundColor: '#FF6B35', borderRadius: 2,
  },
  progressFillUrgent: { backgroundColor: '#D94F4F' },

  // Countdown
  countdownText:   { fontSize: 13, color: '#999', fontWeight: '500' },
  countdownUrgent: { color: '#D94F4F', fontWeight: '700' },

  disclaimer: {
    fontSize: 12, color: '#BBB', textAlign: 'center', lineHeight: 18,
  },
});
