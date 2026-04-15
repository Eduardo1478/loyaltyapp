import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Shared redemption logic ────────────────────────────────────────────────
async function processRedemption(trimmed) {
  const redemptionSnap = await getDoc(doc(db, 'redemptions', trimmed));
  if (!redemptionSnap.exists())
    throw Object.assign(new Error('Código inválido. Verifica e intenta de nuevo.'), { friendly: true });

  const redemption = redemptionSnap.data();
  if (redemption.redeemedAt !== null)
    throw Object.assign(new Error('Este código ya fue canjeado anteriormente.'), { friendly: true });
  if (redemption.expiresAt && redemption.expiresAt.toDate() < new Date())
    throw Object.assign(new Error('Código expirado. Pide al cliente que actualice su pantalla.'), { friendly: true });

  const [userSnap, promoSnap] = await Promise.all([
    getDoc(doc(db, 'users', redemption.userId)),
    getDoc(doc(db, 'promos', redemption.couponId)),
  ]);

  const promoData    = promoSnap.exists() ? promoSnap.data() : null;
  const customerName = userSnap.exists() ? userSnap.data().name : 'Cliente';
  const couponTitle  = promoData?.title ?? 'Cupón';
  const isStamp      = promoData?.type === 'stamp';
  const isNthVisit   = promoData?.type === 'nth_visit';
  const businessId   = redemption.businessId;
  const userId       = redemption.userId;

  await updateDoc(doc(db, 'redemptions', trimmed), { redeemedAt: serverTimestamp() });

  let prizeUnlocked = false;
  let rewardText    = '';
  let stampsNow     = null;
  let stampsTotal   = null;

  if ((isStamp || isNthVisit) && businessId && userId) {
    const progressRef  = doc(db, 'businesses', businessId, 'userProgress', userId);
    const progressSnap = await getDoc(progressRef);
    const prev         = progressSnap.exists() ? progressSnap.data() : { stamps: 0, totalVisits: 0 };

    const newStamps = (prev.stamps ?? 0) + 1;
    const newVisits = (prev.totalVisits ?? 0) + 1;

    await setDoc(progressRef, {
      stamps: newStamps, totalVisits: newVisits, lastVisit: serverTimestamp(),
    }, { merge: true });

    if (isStamp) {
      stampsTotal = promoData.stampsRequired ?? 10;
      if (newStamps >= stampsTotal) {
        await updateDoc(progressRef, { stamps: 0 });
        prizeUnlocked = true;
        rewardText    = promoData.stampReward ?? 'Premio especial';
        stampsNow     = 0;
      } else {
        stampsNow = newStamps;
      }
    }
    if (isNthVisit) {
      stampsTotal = promoData.visitNumber ?? 10;
      stampsNow   = newVisits;
      if (newVisits >= stampsTotal) {
        prizeUnlocked = true;
        rewardText    = promoData.visitReward ?? 'Premio especial';
      }
    }
  }

  return {
    customerName, couponTitle,
    isStamp: isStamp || isNthVisit,
    stampsNow, stampsTotal, prizeUnlocked, rewardText,
  };
}

// ── Component ──────────────────────────────────────────────────────────────
export default function RedeemCoupon() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  const [mode, setMode]       = useState('scan');   // 'scan' | 'manual'
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(null);

  const processingRef = useRef(false); // debounce scanner

  async function redeem(code) {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 8) { setError('El código debe tener 8 caracteres.'); return; }
    if (processingRef.current) return;
    processingRef.current = true;
    setError('');
    setLoading(true);
    try {
      const result = await processRedemption(trimmed);
      setSuccess(result);
    } catch (e) {
      setError(e.friendly ? e.message : 'Algo salió mal. Intenta de nuevo.');
    } finally {
      setLoading(false);
      processingRef.current = false;
    }
  }

  function handleReset() {
    setManualCode('');
    setError('');
    setSuccess(null);
    setMode('scan');
  }

  // ── Success overlay ──────────────────────────────────────────────────────
  if (success) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Canjear</Text>
        </View>
        <View style={styles.centeredFlex}>
          <View style={[styles.successCard, success.prizeUnlocked && styles.prizeCard]}>
            <Text style={styles.successIcon}>{success.prizeUnlocked ? '🏆' : '✓'}</Text>
            <Text style={[styles.successTitle, success.prizeUnlocked && styles.prizeTitleText]}>
              {success.prizeUnlocked ? '¡Premio desbloqueado!' : '¡Canje exitoso!'}
            </Text>
            <Text style={styles.successCustomer}>{success.customerName}</Text>
            <Text style={styles.successCoupon}>{success.couponTitle}</Text>

            {success.prizeUnlocked && success.rewardText ? (
              <View style={styles.rewardBadge}>
                <Text style={styles.rewardBadgeText}>{success.rewardText}</Text>
              </View>
            ) : null}

            {success.isStamp && !success.prizeUnlocked && success.stampsNow !== null ? (
              <View style={styles.stampProgress}>
                <Text style={styles.stampProgressText}>
                  {success.stampsNow} / {success.stampsTotal} sellos
                </Text>
                <View style={styles.stampTrack}>
                  <View style={[styles.stampFill, { width: `${(success.stampsNow / success.stampsTotal) * 100}%` }]} />
                </View>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.resetButton, success.prizeUnlocked && styles.resetButtonPrize]}
              onPress={handleReset}
              activeOpacity={0.8}
            >
              <Text style={[styles.resetButtonText, success.prizeUnlocked && styles.resetButtonTextPrize]}>
                Escanear otro
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Manual entry mode ────────────────────────────────────────────────────
  if (mode === 'manual') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setMode('scan'); setError(''); }} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Código manual</Text>
          <View style={{ width: 22 }} />
        </View>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.manualContainer}>
            <Text style={styles.instructions}>
              Ingresa el código de 8 caracteres que muestra el cliente.
            </Text>
            <TextInput
              style={styles.codeInput}
              placeholder="XXXXXXXX"
              placeholderTextColor="#CCC"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              returnKeyType="done"
              onSubmitEditing={() => redeem(manualCode)}
              value={manualCode}
              onChangeText={(t) => setManualCode(t.toUpperCase())}
              autoFocus
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <TouchableOpacity
              style={[styles.button, (loading || manualCode.trim().length !== 8) && styles.buttonDisabled]}
              onPress={() => redeem(manualCode)}
              disabled={loading || manualCode.trim().length !== 8}
              activeOpacity={0.8}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.buttonText}>Validar código</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── Camera permission not granted ────────────────────────────────────────
  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Canjear</Text>
        </View>
        <View style={styles.centeredFlex}>
          <Text style={styles.permissionTitle}>Permiso de cámara necesario</Text>
          <Text style={styles.permissionSubtitle}>
            Necesitamos acceso a tu cámara para escanear los códigos QR de los clientes.
          </Text>
          <TouchableOpacity style={styles.button} onPress={requestPermission} activeOpacity={0.8}>
            <Text style={styles.buttonText}>Permitir cámara</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.manualLink} onPress={() => setMode('manual')}>
            <Text style={styles.manualLinkText}>Ingresar código manualmente</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Scanner mode (default) ────────────────────────────────────────────────
  return (
    <View style={styles.fill}>
      {/* Safe area top bar */}
      <View style={[styles.scanHeader, { paddingTop: insets.top + 10 }]}>
        <Text style={styles.scanHeaderTitle}>Canjear</Text>
      </View>

      <CameraView
        style={styles.fill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={({ data }) => redeem(data)}
      />

      {/* Overlay */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {/* Viewfinder */}
        <View style={styles.viewfinderWrapper}>
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.scanHint}>
            {loading ? 'Procesando…' : 'Apunta al código QR del cliente'}
          </Text>
        </View>

        {/* Error toast */}
        {error ? (
          <View style={[styles.errorToast, { bottom: insets.bottom + 100 }]}>
            <Text style={styles.errorToastText}>{error}</Text>
            <TouchableOpacity onPress={() => { setError(''); processingRef.current = false; }} hitSlop={8}>
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Loading overlay */}
        {loading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FF6B35" />
          </View>
        ) : null}

        {/* Bottom bar */}
        <View style={[styles.scanBottom, { paddingBottom: insets.bottom + 20 }]}>
          <TouchableOpacity
            style={styles.manualButton}
            onPress={() => { setError(''); setMode('manual'); }}
            activeOpacity={0.8}
          >
            <Ionicons name="keypad-outline" size={18} color="#fff" />
            <Text style={styles.manualButtonText}>Ingresar código</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const CORNER_LEN = 24;
const CORNER_W   = 3;

const styles = StyleSheet.create({
  fill:    { flex: 1, backgroundColor: '#000' },
  flex:    { flex: 1 },
  safeArea: { flex: 1, backgroundColor: '#fff' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },

  centeredFlex: {
    flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32,
  },

  // Scanner header overlay
  scanHeader: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20, paddingBottom: 14, alignItems: 'center',
  },
  scanHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },

  // Viewfinder
  viewfinderWrapper: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  },
  viewfinder: { width: 240, height: 240, position: 'relative', marginBottom: 24 },
  corner: { position: 'absolute', width: CORNER_LEN, height: CORNER_LEN, borderColor: '#FF6B35' },
  cornerTL: { top: 0, left: 0,    borderTopWidth: CORNER_W, borderLeftWidth: CORNER_W },
  cornerTR: { top: 0, right: 0,   borderTopWidth: CORNER_W, borderRightWidth: CORNER_W },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_W, borderLeftWidth: CORNER_W },
  cornerBR: { bottom: 0, right: 0,borderBottomWidth: CORNER_W, borderRightWidth: CORNER_W },
  scanHint: { color: 'rgba(255,255,255,0.8)', fontSize: 14, textAlign: 'center' },

  // Error toast
  errorToast: {
    position: 'absolute', left: 20, right: 20,
    backgroundColor: '#D94F4F', borderRadius: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  errorToastText: { color: '#fff', fontSize: 13, fontWeight: '500', flex: 1, marginRight: 8 },

  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
  },

  // Bottom bar
  scanBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', paddingTop: 20,
  },
  manualButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10,
  },
  manualButtonText: { color: '#fff', fontSize: 14, fontWeight: '500' },

  // Manual mode
  manualContainer: { flex: 1, paddingHorizontal: 28, paddingTop: 40, alignItems: 'center' },
  instructions: { fontSize: 15, color: '#888', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  codeInput: {
    width: '100%', height: 72,
    borderWidth: 2, borderColor: '#E0E0E0', borderRadius: 14,
    textAlign: 'center', fontSize: 32, fontWeight: '700', color: '#1A1A1A',
    letterSpacing: 8, backgroundColor: '#FAFAFA', marginBottom: 16,
  },
  error: { color: '#D94F4F', fontSize: 13, marginBottom: 16, textAlign: 'center' },
  button: {
    width: '100%', height: 52, backgroundColor: '#FF6B35',
    borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  manualLink:     { marginTop: 20 },
  manualLinkText: { color: '#FF6B35', fontSize: 14, fontWeight: '500' },

  // Permission
  permissionTitle:    { fontSize: 18, fontWeight: '700', color: '#1A1A1A', textAlign: 'center', marginBottom: 10 },
  permissionSubtitle: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20, marginBottom: 28 },

  // Success / prize
  successCard: {
    width: '100%', backgroundColor: '#E6F4EA', borderRadius: 16, padding: 28, alignItems: 'center',
  },
  prizeCard:        { backgroundColor: '#FFF5E6' },
  successIcon:      { fontSize: 48, marginBottom: 8 },
  successTitle:     { fontSize: 22, fontWeight: '700', color: '#2E7D32', marginBottom: 12, textAlign: 'center' },
  prizeTitleText:   { color: '#E65100' },
  successCustomer:  { fontSize: 18, fontWeight: '600', color: '#1A1A1A', marginBottom: 4 },
  successCoupon:    { fontSize: 15, color: '#555', marginBottom: 16, textAlign: 'center' },
  rewardBadge:      { backgroundColor: '#FF6B35', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, marginBottom: 20 },
  rewardBadgeText:  { color: '#fff', fontWeight: '700', fontSize: 16, textAlign: 'center' },
  stampProgress:    { width: '100%', marginBottom: 20, alignItems: 'center' },
  stampProgressText:{ fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8 },
  stampTrack:       { width: '100%', height: 6, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 3, overflow: 'hidden' },
  stampFill:        { height: '100%', backgroundColor: '#FF6B35', borderRadius: 3 },
  resetButton:      { paddingHorizontal: 24, paddingVertical: 11, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#2E7D32' },
  resetButtonPrize: { borderColor: '#FF6B35' },
  resetButtonText:      { color: '#2E7D32', fontWeight: '600', fontSize: 14 },
  resetButtonTextPrize: { color: '#FF6B35' },
});
