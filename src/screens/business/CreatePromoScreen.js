import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { notifyFollowers } from '../../config/notifications';

const PROMO_TYPES = [
  {
    key: 'discount',
    label: 'Descuento simple',
    description: '% o valor fijo de descuento',
    icon: 'pricetag-outline',
    color: '#FF6B35',
    bg: '#FFF3EE',
  },
  {
    key: 'bogo',
    label: '2x1 / BOGO',
    description: 'Compra uno, lleva dos',
    icon: 'gift-outline',
    color: '#9B59B6',
    bg: '#F3E8FF',
  },
  {
    key: 'stamp',
    label: 'Tarjeta de sellos',
    description: 'Colecciona sellos para un premio',
    icon: 'checkmark-circle-outline',
    color: '#2E7D32',
    bg: '#E8F5E9',
  },
  {
    key: 'nth_visit',
    label: 'Premio en visita N',
    description: 'Premia la visita número N',
    icon: 'trophy-outline',
    color: '#1565C0',
    bg: '#E3F2FD',
  },
];

const TYPE_DISPLAY = { discount: 'Descuento', bogo: '2x1', stamp: 'Sellos', nth_visit: 'Visita N' };

export default function CreatePromoScreen({ navigation }) {
  const { user } = useAuth();

  const [step, setStep]               = useState(1);
  const [selectedType, setSelectedType] = useState(null);

  // Common
  const [title, setTitle]     = useState('');
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState(new Date(Date.now() + 30 * 86400000));
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Discount
  const [discountValue, setDiscountValue] = useState('');

  // BOGO
  const [bogoItem, setBogoItem]           = useState('');
  const [bogoCondition, setBogoCondition] = useState('');

  // Stamp
  const [stampsRequired, setStampsRequired] = useState('10');
  const [stampReward, setStampReward]       = useState('');

  // Nth visit
  const [visitNumber, setVisitNumber] = useState('5');
  const [visitReward, setVisitReward] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  function handleTypeSelect(type) {
    setSelectedType(type);
    setStep(2);
  }

  function validate() {
    if (!title.trim()) return 'Agrega un título a la promo.';
    if (selectedType.key === 'discount' && !discountValue.trim())
      return 'Especifica el descuento (ej. 20%).';
    if (selectedType.key === 'bogo' && !bogoItem.trim())
      return 'Especifica el producto del 2x1.';
    if (selectedType.key === 'stamp') {
      const n = Number(stampsRequired);
      if (!stampsRequired || isNaN(n) || n < 2) return 'El número de sellos debe ser al menos 2.';
      if (!stampReward.trim()) return 'Especifica el premio al completar.';
    }
    if (selectedType.key === 'nth_visit') {
      const n = Number(visitNumber);
      if (!visitNumber || isNaN(n) || n < 2) return 'El número de visita debe ser al menos 2.';
      if (!visitReward.trim()) return 'Especifica el premio.';
    }
    return null;
  }

  async function handleSave() {
    const err = validate();
    if (err) { setError(err); return; }

    setSaving(true);
    setError('');
    try {
      const bizSnap = await getDocs(
        query(collection(db, 'businesses'), where('ownerId', '==', user.uid))
      );
      if (bizSnap.empty) throw new Error('no business');
      const bizDoc = bizSnap.docs[0];

      const promoData = {
        businessId: bizDoc.id,
        type:       selectedType.key,
        title:      title.trim(),
        createdAt:  serverTimestamp(),
        expiresAt:  hasExpiry ? expiryDate : null,
      };

      if (selectedType.key === 'discount') {
        promoData.discountValue = discountValue.trim();
      } else if (selectedType.key === 'bogo') {
        promoData.bogoItem = bogoItem.trim();
        if (bogoCondition.trim()) promoData.bogoCondition = bogoCondition.trim();
      } else if (selectedType.key === 'stamp') {
        promoData.stampsRequired = Number(stampsRequired);
        promoData.stampReward    = stampReward.trim();
      } else if (selectedType.key === 'nth_visit') {
        promoData.visitNumber = Number(visitNumber);
        promoData.visitReward = visitReward.trim();
      }

      await addDoc(collection(db, 'promos'), promoData);

      notifyFollowers({
        businessId:   bizDoc.id,
        businessName: bizDoc.data().name,
        couponTitle:  title.trim(),
        discount:     selectedType.key === 'discount'
          ? discountValue
          : TYPE_DISPLAY[selectedType.key],
      }).catch(() => {});

      navigation.goBack();
    } catch (e) {
      setError('No se pudo guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  // ── Step 1: type selection ────────────────────────────────────────────────

  if (step === 1) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nueva promo</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.typeContent}>
          <Text style={styles.stepHint}>¿Qué tipo de promo quieres crear?</Text>
          {PROMO_TYPES.map((type) => (
            <TouchableOpacity
              key={type.key}
              style={styles.typeCard}
              activeOpacity={0.7}
              onPress={() => handleTypeSelect(type)}
            >
              <View style={[styles.typeIconBox, { backgroundColor: type.bg }]}>
                <Ionicons name={type.icon} size={26} color={type.color} />
              </View>
              <View style={styles.typeInfo}>
                <Text style={styles.typeLabel}>{type.label}</Text>
                <Text style={styles.typeDesc}>{type.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CCC" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Step 2: details form ──────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setStep(1)} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{selectedType.label}</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">

          <Field label="Título">
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Ej. 20% de descuento en tu próxima visita"
              placeholderTextColor="#BBB"
            />
          </Field>

          {selectedType.key === 'discount' && (
            <Field label="Valor del descuento">
              <TextInput
                style={styles.input}
                value={discountValue}
                onChangeText={setDiscountValue}
                placeholder="Ej. 20%, $50 MXN"
                placeholderTextColor="#BBB"
              />
            </Field>
          )}

          {selectedType.key === 'bogo' && (
            <>
              <Field label="Producto">
                <TextInput
                  style={styles.input}
                  value={bogoItem}
                  onChangeText={setBogoItem}
                  placeholder="Ej. hamburguesas, cafés"
                  placeholderTextColor="#BBB"
                />
              </Field>
              <Field label="Condición (opcional)">
                <TextInput
                  style={styles.input}
                  value={bogoCondition}
                  onChangeText={setBogoCondition}
                  placeholder="Ej. los martes, hasta las 2pm"
                  placeholderTextColor="#BBB"
                />
              </Field>
            </>
          )}

          {selectedType.key === 'stamp' && (
            <>
              <Field label="Sellos requeridos">
                <TextInput
                  style={styles.input}
                  value={stampsRequired}
                  onChangeText={setStampsRequired}
                  keyboardType="number-pad"
                  placeholder="Ej. 10"
                  placeholderTextColor="#BBB"
                />
              </Field>
              <Field label="Premio al completar">
                <TextInput
                  style={styles.input}
                  value={stampReward}
                  onChangeText={setStampReward}
                  placeholder="Ej. 1 café gratis"
                  placeholderTextColor="#BBB"
                />
              </Field>
            </>
          )}

          {selectedType.key === 'nth_visit' && (
            <>
              <Field label="Número de visita premiada">
                <TextInput
                  style={styles.input}
                  value={visitNumber}
                  onChangeText={setVisitNumber}
                  keyboardType="number-pad"
                  placeholder="Ej. 5"
                  placeholderTextColor="#BBB"
                />
              </Field>
              <Field label="Premio">
                <TextInput
                  style={styles.input}
                  value={visitReward}
                  onChangeText={setVisitReward}
                  placeholder="Ej. orden gratis"
                  placeholderTextColor="#BBB"
                />
              </Field>
            </>
          )}

          {/* Expiry toggle */}
          <View style={styles.expiryRow}>
            <Text style={styles.fieldLabel}>Fecha de vencimiento</Text>
            <Switch
              value={hasExpiry}
              onValueChange={setHasExpiry}
              trackColor={{ false: '#E0E0E0', true: '#FF6B35' }}
              thumbColor="#fff"
            />
          </View>

          {hasExpiry && (
            <>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="calendar-outline" size={18} color="#FF6B35" />
                <Text style={styles.dateText}>
                  {expiryDate.toLocaleDateString('es-MX', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={expiryDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  minimumDate={new Date()}
                  onChange={(_, date) => {
                    if (Platform.OS === 'android') setShowDatePicker(false);
                    if (date) setExpiryDate(date);
                  }}
                />
              )}
            </>
          )}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.saveButtonText}>Crear promo</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }) {
  return (
    <View style={{ marginTop: 18 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A1A' },

  // Type selection
  typeContent: { padding: 20 },
  stepHint: { fontSize: 15, color: '#555', marginBottom: 20 },
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
    gap: 14,
  },
  typeIconBox: {
    width: 48, height: 48, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  typeInfo: { flex: 1 },
  typeLabel: { fontSize: 15, fontWeight: '600', color: '#1A1A1A', marginBottom: 2 },
  typeDesc:  { fontSize: 13, color: '#888' },

  // Form
  formContent: { padding: 20, paddingBottom: 48 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#1A1A1A',
    backgroundColor: '#FAFAFA',
  },
  expiryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    borderWidth: 1,
    borderColor: '#FF6B35',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  dateText: { fontSize: 14, color: '#FF6B35', fontWeight: '500' },
  errorText: {
    fontSize: 13, color: '#D94F4F',
    textAlign: 'center', marginTop: 16,
  },
  saveButton: {
    height: 52, backgroundColor: '#FF6B35',
    borderRadius: 12, justifyContent: 'center',
    alignItems: 'center', marginTop: 28,
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
