import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, addDoc, getDocs, query, where, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';

// Minimum expiry date is tomorrow
function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(23, 59, 59, 0);
  return d;
}

export default function CreateCoupon({ navigation }) {
  const { user } = useAuth();

  const [title, setTitle]           = useState('');
  const [discount, setDiscount]     = useState('');
  const [noExpiry, setNoExpiry]     = useState(false);
  const [expiryDate, setExpiryDate] = useState(tomorrow());
  // Android needs a separate flag to show/hide the picker dialog
  const [showPicker, setShowPicker] = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  function handleDateChange(event, selected) {
    // On Android the picker closes itself; on iOS it stays open
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type === 'dismissed') return;
    if (selected) setExpiryDate(selected);
  }

  async function handleSave() {
    if (!title.trim()) {
      setError('Por favor ingresa el título del cupón.');
      return;
    }
    if (!discount.trim()) {
      setError('Por favor ingresa el descuento.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      // Resolve the businessId for this owner
      const bizSnap = await getDocs(
        query(collection(db, 'businesses'), where('ownerId', '==', user.uid))
      );
      if (bizSnap.empty) {
        setError('No se encontró tu negocio. Intenta de nuevo.');
        return;
      }
      const businessId = bizSnap.docs[0].id;

      await addDoc(collection(db, 'coupons'), {
        title:      title.trim(),
        discount:   discount.trim(),
        businessId,
        expiresAt:  noExpiry ? null : Timestamp.fromDate(expiryDate),
        createdAt:  serverTimestamp(),
        active:     true,
      });

      navigation.goBack();
    } catch (e) {
      setError('No se pudo guardar el cupón. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  const formattedDate = expiryDate.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={styles.backText}>← Cancelar</Text>
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Nuevo cupón</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Title */}
        <Text style={styles.label}>Título del cupón</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. 2x1 en pizzas"
          placeholderTextColor="#999"
          autoCapitalize="sentences"
          returnKeyType="next"
          value={title}
          onChangeText={setTitle}
        />

        {/* Discount */}
        <Text style={styles.label}>Descuento</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. 50% off, 2x1, Bebida gratis"
          placeholderTextColor="#999"
          autoCapitalize="sentences"
          returnKeyType="done"
          value={discount}
          onChangeText={setDiscount}
        />

        {/* No-expiry toggle */}
        <View style={styles.toggleRow}>
          <Text style={styles.label}>Sin fecha de vencimiento</Text>
          <Switch
            value={noExpiry}
            onValueChange={setNoExpiry}
            trackColor={{ false: '#E0E0E0', true: '#FF6B35' }}
            thumbColor="#fff"
          />
        </View>

        {/* Date picker — hidden when noExpiry is on */}
        {!noExpiry && (
          <View style={styles.dateSection}>
            <Text style={styles.label}>Fecha de vencimiento</Text>

            {/* iOS: inline picker always visible */}
            {Platform.OS === 'ios' && (
              <DateTimePicker
                value={expiryDate}
                mode="date"
                display="inline"
                minimumDate={tomorrow()}
                onChange={handleDateChange}
                locale="es-MX"
                accentColor="#FF6B35"
                style={styles.iosPicker}
              />
            )}

            {/* Android: show selected date as a tappable row, picker opens on tap */}
            {Platform.OS === 'android' && (
              <>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowPicker(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dateButtonText}>{formattedDate}</Text>
                  <Text style={styles.dateButtonIcon}>▾</Text>
                </TouchableOpacity>

                {showPicker && (
                  <DateTimePicker
                    value={expiryDate}
                    mode="date"
                    display="default"
                    minimumDate={tomorrow()}
                    onChange={handleDateChange}
                  />
                )}
              </>
            )}
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Guardar cupón</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#fff' },
  container: {
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  backText: {
    fontSize: 15,
    color: '#FF6B35',
    fontWeight: '500',
  },
  screenTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerSpacer: {
    width: 72, // mirrors back button width so title stays centered
  },

  // Form
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1A1A1A',
    backgroundColor: '#FAFAFA',
    marginBottom: 20,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },

  // Date picker
  dateSection: {
    marginBottom: 20,
  },
  iosPicker: {
    marginTop: -8,
    marginHorizontal: -4,
  },
  dateButton: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  dateButtonText: {
    fontSize: 15,
    color: '#1A1A1A',
  },
  dateButtonIcon: {
    fontSize: 14,
    color: '#888',
  },

  // Submit
  error: {
    color: '#D94F4F',
    fontSize: 13,
    marginBottom: 12,
  },
  button: {
    height: 52,
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
