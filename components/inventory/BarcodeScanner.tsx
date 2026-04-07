import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCAN_WINDOW_SIZE = 250;

interface BarcodeScannerProps {
  onBarcodeScanned: (data: string, type: string) => void;
  onCancel: () => void;
}

export function BarcodeScanner({ onBarcodeScanned, onCancel }: BarcodeScannerProps) {
  const colors = useColors();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [scannedLabel, setScannedLabel] = useState(false);

  if (!permission) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.permissionContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="barcode" size={64} color={colors.textTertiary} />
        <Text style={[styles.permissionTitle, { color: colors.textPrimary }]}>Camera Permission Required</Text>
        <Text style={[styles.permissionDesc, { color: colors.textSecondary }]}>
          Allow camera access to scan barcodes and QR codes.
        </Text>
        <TouchableOpacity
          style={[styles.permissionBtn, { backgroundColor: colors.info }]}
          onPress={requestPermission}
        >
          <Text style={[styles.permissionBtnText, { color: colors.white }]}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelTextBtn} onPress={onCancel}>
          <Text style={[styles.cancelTextBtnText, { color: colors.textSecondary }]}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    if (scanned) return;
    setScanned(true);
    setScannedLabel(true);
    setTimeout(() => {
      onBarcodeScanned(result.data, result.type);
    }, 600);
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={flashEnabled}
        barcodeScannerSettings={{
          barcodeTypes: [
            'ean13',
            'ean8',
            'upc_a',
            'upc_e',
            'qr',
            'code128',
            'code39',
          ],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />

      {/* Dark overlay with transparent scan window cut-out via four rectangles */}
      <View style={styles.overlayTop} />
      <View style={styles.overlayMiddleRow}>
        <View style={styles.overlaySide} />
        <View style={styles.scanWindow} />
        <View style={styles.overlaySide} />
      </View>
      <View style={styles.overlayBottom} />

      {/* Corner brackets */}
      <View style={[styles.corner, styles.cornerTopLeft, { borderColor: colors.primary }]} />
      <View style={[styles.corner, styles.cornerTopRight, { borderColor: colors.primary }]} />
      <View style={[styles.corner, styles.cornerBottomLeft, { borderColor: colors.primary }]} />
      <View style={[styles.corner, styles.cornerBottomRight, { borderColor: colors.primary }]} />

      {/* Flash toggle */}
      <TouchableOpacity
        style={styles.flashBtn}
        onPress={() => setFlashEnabled(prev => !prev)}
      >
        <Ionicons
          name={flashEnabled ? 'flash' : 'flash-off'}
          size={24}
          color={colors.white}
        />
      </TouchableOpacity>

      {/* Instruction / scanned label */}
      <View style={styles.instructionWrapper}>
        {scannedLabel ? (
          <Text style={[styles.scannedText, { color: colors.success }]}>Scanned!</Text>
        ) : (
          <Text style={[styles.instructionText, { color: colors.white }]}>Point camera at a barcode</Text>
        )}
      </View>

      {/* Cancel */}
      <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
        <Text style={[styles.cancelBtnText, { color: colors.white }]}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const OVERLAY_SIDE = (SCREEN_WIDTH - SCAN_WINDOW_SIZE) / 2;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  permissionBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
  },
  permissionBtnText: {
    fontWeight: '700',
    fontSize: 16,
  },
  cancelTextBtn: {
    paddingVertical: 12,
  },
  cancelTextBtnText: {
    fontSize: 15,
  },
  // Overlay: top, middle sides, bottom
  overlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '30%',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  overlayMiddleRow: {
    position: 'absolute',
    top: '30%',
    left: 0,
    right: 0,
    height: SCAN_WINDOW_SIZE,
    flexDirection: 'row',
  },
  overlaySide: {
    width: OVERLAY_SIDE,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  scanWindow: {
    width: SCAN_WINDOW_SIZE,
    height: SCAN_WINDOW_SIZE,
    backgroundColor: 'transparent',
  },
  overlayBottom: {
    position: 'absolute',
    top: `30%`,
    marginTop: SCAN_WINDOW_SIZE,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  // Corner brackets
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderWidth: 3,
  },
  cornerTopLeft: {
    top: '30%',
    left: OVERLAY_SIDE,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 4,
  },
  cornerTopRight: {
    top: '30%',
    right: OVERLAY_SIDE,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 4,
  },
  cornerBottomLeft: {
    top: '30%',
    marginTop: SCAN_WINDOW_SIZE - 24,
    left: OVERLAY_SIDE,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 4,
  },
  cornerBottomRight: {
    top: '30%',
    marginTop: SCAN_WINDOW_SIZE - 24,
    right: OVERLAY_SIDE,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 4,
  },
  flashBtn: {
    position: 'absolute',
    top: 52,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionWrapper: {
    position: 'absolute',
    top: '30%',
    marginTop: SCAN_WINDOW_SIZE + 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  scannedText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  cancelBtn: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
