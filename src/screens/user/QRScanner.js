import { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function QRScanner({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  // Prevent firing multiple navigations on a single QR code
  const isNavigating = useRef(false);

  function handleBarCodeScanned({ data }) {
    if (isNavigating.current) return;
    isNavigating.current = true;

    // The QR encodes a raw businessId string
    // Navigate to BusinessPage — it handles invalid IDs gracefully
    navigation.navigate('BusinessPage', { businessId: data, autoFollow: true });
  }

  // ── Permission states ─────────────────────────────────────────────────────

  if (!permission) {
    // Permissions still loading
    return <View style={styles.fill} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Atrás</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Text style={styles.permissionTitle}>Permiso de cámara necesario</Text>
          <Text style={styles.permissionSubtitle}>
            Necesitamos acceso a tu cámara para escanear el código QR del negocio.
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
            activeOpacity={0.8}
          >
            <Text style={styles.permissionButtonText}>Permitir cámara</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Scanner ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.fill}>
      <CameraView
        style={styles.fill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleBarCodeScanned}
      />

      {/* Overlay UI on top of camera */}
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        {/* Top bar */}
        <View style={styles.overlayTop}>
          <Text style={styles.overlayTitle}>Escanear QR</Text>
        </View>

        {/* Viewfinder cutout cue */}
        <View style={styles.viewfinderRow}>
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>

        {/* Bottom hint */}
        <View style={styles.overlayBottom}>
          <Text style={styles.hint}>
            Apunta la cámara al código QR del negocio
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const CORNER = 24;   // corner line length
const BORDER = 3;    // corner line thickness

const styles = StyleSheet.create({
  fill: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: '#fff' },
  navBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backText: {
    fontSize: 15,
    color: '#FF6B35',
    fontWeight: '500',
  },

  // Permission screen
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 10,
  },
  permissionSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  permissionButton: {
    width: '100%',
    height: 52,
    backgroundColor: '#FF6B35',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 10,
  },
  cancelText: {
    color: '#888',
    fontSize: 14,
  },

  // Camera overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  overlayTop: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  overlayTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Viewfinder
  viewfinderRow: {
    alignItems: 'center',
  },
  viewfinder: {
    width: 230,
    height: 230,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: '#FF6B35',
  },
  cornerTL: {
    top: 0, left: 0,
    borderTopWidth: BORDER,
    borderLeftWidth: BORDER,
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth: BORDER,
    borderRightWidth: BORDER,
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: BORDER,
    borderLeftWidth: BORDER,
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: BORDER,
    borderRightWidth: BORDER,
  },

  // Bottom hint
  overlayBottom: {
    paddingBottom: 48,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingTop: 24,
  },
  hint: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.85,
  },
});
