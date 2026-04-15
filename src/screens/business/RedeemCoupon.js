import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function RedeemCoupon() {
  const [code, setCode]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(null); // { customerName, couponTitle }

  async function handleRedeem() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length !== 8) {
      setError('El código debe tener 8 caracteres.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const redemptionSnap = await getDoc(doc(db, 'redemptions', trimmed));

      if (!redemptionSnap.exists()) {
        setError('Código inválido. Verifica e intenta de nuevo.');
        return;
      }

      const redemption = redemptionSnap.data();

      if (redemption.redeemedAt !== null) {
        setError('Este código ya fue canjeado anteriormente.');
        return;
      }

      // Fetch customer name and coupon title in parallel
      const [userSnap, couponSnap] = await Promise.all([
        getDoc(doc(db, 'users', redemption.userId)),
        getDoc(doc(db, 'promos', redemption.couponId)),
      ]);

      // Mark as redeemed
      await updateDoc(doc(db, 'redemptions', trimmed), {
        redeemedAt: serverTimestamp(),
      });

      setSuccess({
        customerName: userSnap.exists() ? userSnap.data().name : 'Cliente',
        couponTitle:  couponSnap.exists() ? couponSnap.data().title : 'Cupón',
        discount:     couponSnap.exists() ? couponSnap.data().discount : '',
      });
    } catch (e) {
      setError('Algo salió mal. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setCode('');
    setError('');
    setSuccess(null);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Canjear</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          {success ? (
            // ── Success state ──────────────────────────────────────────────
            <View style={styles.successCard}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.successTitle}>¡Canje exitoso!</Text>
              <Text style={styles.successCustomer}>{success.customerName}</Text>
              <Text style={styles.successCoupon}>{success.couponTitle}</Text>
              {success.discount ? (
                <Text style={styles.successDiscount}>{success.discount}</Text>
              ) : null}
              <TouchableOpacity style={styles.resetButton} onPress={handleReset} activeOpacity={0.8}>
                <Text style={styles.resetButtonText}>Canjear otro código</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // ── Input state ────────────────────────────────────────────────
            <>
              <Text style={styles.instructions}>
                Ingresa el código de 8 caracteres que muestra el cliente en su teléfono.
              </Text>

              <TextInput
                style={styles.codeInput}
                placeholder="XXXXXXXX"
                placeholderTextColor="#CCC"
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={8}
                returnKeyType="done"
                onSubmitEditing={handleRedeem}
                value={code}
                onChangeText={(t) => setCode(t.toUpperCase())}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.button, (loading || code.trim().length !== 8) && styles.buttonDisabled]}
                onPress={handleRedeem}
                disabled={loading || code.trim().length !== 8}
                activeOpacity={0.8}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.buttonText}>Validar código</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },

  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 40,
    alignItems: 'center',
  },
  instructions: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  codeInput: {
    width: '100%',
    height: 72,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 14,
    textAlign: 'center',
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 8,
    backgroundColor: '#FAFAFA',
    marginBottom: 16,
  },
  error: {
    color: '#D94F4F',
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    height: 52,
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // Success card
  successCard: {
    width: '100%',
    backgroundColor: '#E6F4EA',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 48,
    color: '#2E7D32',
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 16,
  },
  successCustomer: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  successCoupon: {
    fontSize: 15,
    color: '#555',
    marginBottom: 4,
    textAlign: 'center',
  },
  successDiscount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FF6B35',
    marginBottom: 24,
  },
  resetButton: {
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#2E7D32',
  },
  resetButtonText: { color: '#2E7D32', fontWeight: '600', fontSize: 14 },
});
