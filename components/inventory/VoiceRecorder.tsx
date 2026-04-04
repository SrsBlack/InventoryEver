import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Button } from '../ui/Button';

interface VoiceRecorderProps {
  onRecordingComplete: (audioUri: string) => void;
  onCancel: () => void;
  isProcessing: boolean;
}

type RecordingState = 'idle' | 'recording' | 'processing' | 'done';

function formatTime(seconds: number): string {
  const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
  const ss = (seconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

export function VoiceRecorder({ onRecordingComplete, onCancel, isProcessing }: VoiceRecorderProps) {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pulse animation
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;
  const pulseAnimation = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isProcessing) {
      setRecordingState('processing');
    }
  }, [isProcessing]);

  useEffect(() => {
    if (recordingState === 'recording') {
      pulseAnimation.current = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseScale, {
              toValue: 1.3,
              duration: 700,
              useNativeDriver: true,
            }),
            Animated.timing(pulseScale, {
              toValue: 1.0,
              duration: 700,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(pulseOpacity, {
              toValue: 0,
              duration: 700,
              useNativeDriver: true,
            }),
            Animated.timing(pulseOpacity, {
              toValue: 0.6,
              duration: 700,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      pulseAnimation.current.start();

      timerRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);
    } else {
      pulseAnimation.current?.stop();
      pulseScale.setValue(1);
      pulseOpacity.setValue(0.6);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recordingState, pulseOpacity, pulseScale]);

  const handlePress = async () => {
    if (recordingState === 'idle') {
      await startRecording();
    } else if (recordingState === 'recording') {
      await stopRecording();
    }
  };

  const startRecording = async () => {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) return;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recordingRef.current = recording;
    setElapsed(0);
    setRecordingState('recording');
  };

  const stopRecording = async () => {
    if (!recordingRef.current) return;

    setRecordingState('processing');
    await recordingRef.current.stopAndUnloadAsync();
    const uri = recordingRef.current.getURI();
    recordingRef.current = null;

    if (uri) {
      setRecordingState('done');
      onRecordingComplete(uri);
    } else {
      setRecordingState('idle');
    }
  };

  const isRecording = recordingState === 'recording';
  const isInProgress = recordingState === 'processing' || isProcessing;

  const statusText = {
    idle: 'Tap to record',
    recording: 'Recording... Tap to stop',
    processing: 'Processing...',
    done: 'Done!',
  }[recordingState];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Voice Input</Text>
      <Text style={styles.subtitle}>Describe your item and AI will fill in the details</Text>

      <View style={styles.recorderArea}>
        {/* Pulse ring */}
        {isRecording && (
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [{ scale: pulseScale }],
                opacity: pulseOpacity,
              },
            ]}
          />
        )}

        {/* Mic button */}
        <TouchableOpacity
          onPress={handlePress}
          disabled={isInProgress}
          activeOpacity={0.85}
        >
          {isInProgress ? (
            <View style={[styles.micButton, styles.micButtonProcessing]}>
              <ActivityIndicator color={Colors.white} size="large" />
            </View>
          ) : (
            <LinearGradient
              colors={isRecording ? Colors.gradientSecondary : Colors.gradientPrimary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.micButton}
            >
              <Ionicons
                name={isRecording ? 'stop' : 'mic'}
                size={36}
                color={Colors.white}
              />
            </LinearGradient>
          )}
        </TouchableOpacity>

        {/* Timer */}
        <Text style={styles.timer}>{formatTime(elapsed)}</Text>

        {/* Status */}
        <Text style={[styles.status, isRecording && styles.statusRecording]}>
          {statusText}
        </Text>
      </View>

      <Button
        title="Cancel"
        onPress={onCancel}
        variant="ghost"
        disabled={isInProgress}
        style={styles.cancelBtn}
        fullWidth
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginBottom: 48,
  },
  recorderArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: Colors.secondary,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  micButtonProcessing: {
    backgroundColor: Colors.gray400,
  },
  timer: {
    marginTop: 28,
    fontSize: 36,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    color: Colors.textPrimary,
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  status: {
    marginTop: 12,
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  statusRecording: {
    color: Colors.secondary,
    fontWeight: '700',
  },
  cancelBtn: {
    marginBottom: 8,
  },
});
