import { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { db, storage } from '../../config/firebase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COVER_HEIGHT = 160;
const AVATAR_SIZE  = 80;

const CATEGORIES = [
  { key: 'restaurante', label: 'Restaurante' },
  { key: 'cafeteria',   label: 'Cafetería'   },
  { key: 'tienda',      label: 'Tienda'      },
  { key: 'otro',        label: 'Otro'        },
];

async function uriToBlob(uri) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload  = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });
}

async function pickAndUpload(storagePath) {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    alert('Necesitamos acceso a tu galería para cambiar las fotos.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.8,
  });
  if (result.canceled) return null;

  const blob    = await uriToBlob(result.assets[0].uri);
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, blob);
  blob.close?.();
  return getDownloadURL(fileRef);
}

export default function EditBusinessProfile({ route, navigation }) {
  const {
    businessId,
    name:            initialName,
    category:        initialCategory,
    description:     initialDescription,
    coverPhotoURL:   initialCover,
    profilePhotoURL: initialAvatar,
  } = route.params;

  const [name, setName]               = useState(initialName ?? '');
  const [category, setCategory]       = useState(initialCategory ?? 'restaurante');
  const [description, setDescription] = useState(initialDescription ?? '');
  const [coverURL, setCoverURL]       = useState(initialCover ?? null);
  const [avatarURL, setAvatarURL]     = useState(initialAvatar ?? null);
  const [uploading, setUploading]     = useState(null); // 'cover' | 'avatar'
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);

  const initial = name?.charAt(0)?.toUpperCase() ?? '?';

  async function handleChangeCover() {
    setUploading('cover');
    try {
      const url = await pickAndUpload(`business-covers/${businessId}`);
      if (url) setCoverURL(url);
    } catch (e) {
      alert('No se pudo subir la portada. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setUploading(null);
    }
  }

  async function handleChangeAvatar() {
    setUploading('avatar');
    try {
      const url = await pickAndUpload(`business-avatars/${businessId}`);
      if (url) setAvatarURL(url);
    } catch (e) {
      alert('No se pudo subir la foto. Verifica tu conexión e intenta de nuevo.');
    } finally {
      setUploading(null);
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Por favor ingresa el nombre del negocio.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await updateDoc(doc(db, 'businesses', businessId), {
        name:            name.trim(),
        category,
        description:     description.trim(),
        coverPhotoURL:   coverURL,
        profilePhotoURL: avatarURL,
      });
      navigation.goBack();
    } catch (e) {
      setError('No se pudo guardar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
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
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Editar perfil</Text>
            <TouchableOpacity
              onPress={handleSave}
              activeOpacity={0.7}
              disabled={loading || uploading !== null}
            >
              {loading
                ? <ActivityIndicator size="small" color="#FF6B35" />
                : <Text style={[styles.saveText, (uploading !== null) && { opacity: 0.4 }]}>
                    Guardar
                  </Text>}
            </TouchableOpacity>
          </View>

          {/* ── Photo section ── */}
          {/* Cover */}
          <TouchableOpacity
            style={styles.coverContainer}
            onPress={handleChangeCover}
            activeOpacity={0.85}
            disabled={uploading === 'cover'}
          >
            {coverURL
              ? <Image source={{ uri: coverURL }} style={styles.coverImage} />
              : <View style={styles.coverPlaceholder} />}
            <View style={styles.coverScrim} />
            <View style={styles.coverEditBadge}>
              {uploading === 'cover'
                ? <ActivityIndicator size="small" color="#fff" />
                : <>
                    <Ionicons name="camera-outline" size={16} color="#fff" />
                    <Text style={styles.coverEditText}>Cambiar portada</Text>
                  </>}
            </View>
          </TouchableOpacity>

          {/* Avatar */}
          <View style={styles.avatarRow}>
            <TouchableOpacity
              onPress={handleChangeAvatar}
              activeOpacity={0.85}
              disabled={uploading === 'avatar'}
            >
              <View style={styles.avatarImageContainer}>
                {avatarURL
                  ? <Image source={{ uri: avatarURL }} style={styles.avatarImage} />
                  : <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarInitial}>{initial}</Text>
                    </View>}
              </View>
              <View style={styles.avatarBadge}>
                {uploading === 'avatar'
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Ionicons name="camera" size={11} color="#fff" />}
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Toca para cambiar la foto de perfil</Text>
          </View>

          {/* ── Form fields ── */}
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

          <Text style={styles.label}>
            Descripción <Text style={styles.optional}>(opcional)</Text>
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Cuéntale a los clientes qué hace especial a tu negocio…"
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:  { flex: 1, backgroundColor: '#fff' },
  container: { paddingBottom: 48 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cancelText:  { fontSize: 15, color: '#888',    fontWeight: '500' },
  screenTitle: { fontSize: 16, color: '#1A1A1A', fontWeight: '700' },
  saveText:    { fontSize: 15, color: '#FF6B35', fontWeight: '700' },

  // Cover
  coverContainer: { width: SCREEN_WIDTH, height: COVER_HEIGHT },
  coverImage:     { ...StyleSheet.absoluteFillObject, resizeMode: 'cover' },
  coverPlaceholder: { ...StyleSheet.absoluteFillObject, backgroundColor: '#2C2C2E' },
  coverScrim:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  coverEditBadge: {
    position: 'absolute',
    bottom: 12, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20,
  },
  coverEditText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Avatar
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 8,
  },
  avatarImageContainer: {
    width: AVATAR_SIZE, height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3, borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  avatarImage:      { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarPlaceholder:{ flex: 1, backgroundColor: '#FF6B35', justifyContent: 'center', alignItems: 'center' },
  avatarInitial:    { fontSize: 28, fontWeight: '700', color: '#fff' },
  avatarBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#FF6B35',
    borderWidth: 2, borderColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarHint: { flex: 1, fontSize: 13, color: '#888', lineHeight: 18 },

  // Form
  label: {
    fontSize: 13, fontWeight: '600', color: '#555',
    marginBottom: 8, marginTop: 20,
    paddingHorizontal: 20,
  },
  optional: { fontWeight: '400', color: '#AAA' },
  input: {
    height: 52,
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10,
    paddingHorizontal: 16, fontSize: 15, color: '#1A1A1A',
    backgroundColor: '#FAFAFA',
    marginHorizontal: 20,
  },
  textArea: { height: 90, paddingTop: 14 },
  categoryGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 10, marginHorizontal: 20,
  },
  categoryOption: {
    width: '47%',
    borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
  categoryOptionSelected: { borderColor: '#FF6B35', backgroundColor: '#FFF5F1' },
  categoryText:           { fontSize: 14, color: '#888', fontWeight: '500' },
  categoryTextSelected:   { color: '#FF6B35', fontWeight: '600' },
  error: { color: '#D94F4F', fontSize: 13, marginHorizontal: 20, marginTop: 12 },
});
