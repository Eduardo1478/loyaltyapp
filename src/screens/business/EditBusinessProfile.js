import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

const CATEGORIES = [
  { key: 'restaurante', label: 'Restaurante' },
  { key: 'cafeteria',   label: 'Cafetería'   },
  { key: 'tienda',      label: 'Tienda'      },
  { key: 'otro',        label: 'Otro'        },
];

export default function EditBusinessProfile({ route, navigation }) {
  const { businessId, name: initialName, category: initialCategory, description: initialDescription } = route.params;

  const [name, setName]               = useState(initialName ?? '');
  const [category, setCategory]       = useState(initialCategory ?? 'restaurante');
  const [description, setDescription] = useState(initialDescription ?? '');
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      setError('Por favor ingresa el nombre del negocio.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await updateDoc(doc(db, 'businesses', businessId), {
        name:        name.trim(),
        category,
        description: description.trim(),
      });
      // useFocusEffect in BusinessDashboard will re-fetch the updated data on return
      navigation.goBack();
    } catch (e) {
      setError('No se pudo guardar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

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
          <Text style={styles.screenTitle}>Editar perfil</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Business name */}
        <Text style={styles.label}>Nombre del negocio</Text>
        <TextInput
          style={styles.input}
          placeholder="Ej. Tacos El Güero"
          placeholderTextColor="#999"
          autoCapitalize="words"
          returnKeyType="next"
          value={name}
          onChangeText={setName}
        />

        {/* Category selector */}
        <Text style={styles.label}>Categoría</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map(({ key, label }) => {
            const selected = category === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.categoryOption, selected && styles.categoryOptionSelected]}
                onPress={() => setCategory(key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.categoryText, selected && styles.categoryTextSelected]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Description */}
        <Text style={styles.label}>
          Descripción corta <Text style={styles.optional}>(opcional)</Text>
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Cuéntale a los clientes qué hace especial a tu negocio…"
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          returnKeyType="done"
          value={description}
          onChangeText={setDescription}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>Guardar cambios</Text>}
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
  headerSpacer: { width: 80 },

  // Form
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  optional: {
    fontWeight: '400',
    color: '#AAA',
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
  textArea: {
    height: 90,
    paddingTop: 14,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  categoryOption: {
    width: '47%',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  categoryOptionSelected: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF5F1',
  },
  categoryText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '500',
  },
  categoryTextSelected: {
    color: '#FF6B35',
    fontWeight: '600',
  },
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
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
