import React, { useRef, useState } from 'react';
import {
  View,
  Image,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Text,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '../../hooks/useColors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface GalleryImage {
  id: string;
  image_url: string;
  is_primary?: boolean;
}

interface ImageGalleryProps {
  images: GalleryImage[];
  height?: number;
  showDots?: boolean;
  onAddImage?: () => void;
  placeholderIcon?: string;
}

export function ImageGallery({
  images,
  height = 280,
  showDots = true,
  onAddImage,
  placeholderIcon = 'cube',
}: ImageGalleryProps) {
  const colors = useColors();
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const listRef = useRef<FlatList>(null);
  const viewerRef = useRef<FlatList>(null);

  // Build the data array for the main carousel
  type ListItem = { type: 'image'; data: GalleryImage } | { type: 'add' };
  const listData: ListItem[] = [
    ...images.map((img): ListItem => ({ type: 'image', data: img })),
    ...(onAddImage ? [{ type: 'add' as const }] : []),
  ];

  const showDotIndicators = showDots && images.length > 1;

  const handleImageTap = (index: number) => {
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const handleScroll = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(idx);
  };

  const handleViewerScroll = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setViewerIndex(idx);
  };

  const renderItem = ({ item, index }: { item: ListItem; index: number }) => {
    if (item.type === 'add') {
      return (
        <TouchableOpacity
          style={[styles.slide, { width: SCREEN_WIDTH, height }]}
          onPress={onAddImage}
          activeOpacity={0.8}
        >
          <View
            style={[
              styles.addCard,
              { height, borderColor: colors.primary, backgroundColor: colors.gray50 },
            ]}
          >
            <Ionicons name="add" size={40} color={colors.primary} />
            <Text style={[styles.addLabel, { color: colors.primary }]}>Add Photo</Text>
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => handleImageTap(index)}
        style={{ width: SCREEN_WIDTH, height }}
      >
        <Image
          source={{ uri: item.data.image_url }}
          style={{ width: SCREEN_WIDTH, height }}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  };

  const renderViewerItem = ({ item, index }: { item: GalleryImage; index: number }) => (
    <View style={styles.viewerSlide}>
      <Image
        source={{ uri: item.image_url }}
        style={styles.viewerImage}
        resizeMode="contain"
      />
    </View>
  );

  // Empty state
  if (images.length === 0 && !onAddImage) {
    return (
      <LinearGradient colors={colors.gradientDark} style={[styles.placeholder, { height }]}>
        <Ionicons name={placeholderIcon as any} size={80} color={colors.white} />
      </LinearGradient>
    );
  }

  if (images.length === 0 && onAddImage) {
    return (
      <TouchableOpacity
        style={[
          styles.addCard,
          { height, width: SCREEN_WIDTH, borderColor: colors.primary, backgroundColor: colors.gray50 },
        ]}
        onPress={onAddImage}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={40} color={colors.primary} />
        <Text style={[styles.addLabel, { color: colors.primary }]}>Add Photo</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ height }}>
      <FlatList
        ref={listRef}
        data={listData}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToInterval={SCREEN_WIDTH}
        decelerationRate="fast"
        renderItem={renderItem}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      {showDotIndicators && (
        <View style={styles.dotsRow}>
          {images.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex
                  ? [styles.dotActive, { backgroundColor: colors.primary }]
                  : [styles.dotInactive, { backgroundColor: colors.gray300 }],
              ]}
            />
          ))}
        </View>
      )}

      {/* Full-screen viewer modal */}
      <Modal
        visible={viewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerVisible(false)}
      >
        <View style={styles.viewerContainer}>
          <FlatList
            ref={viewerRef}
            data={images}
            keyExtractor={(_, i) => String(i)}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleViewerScroll}
            scrollEventThrottle={16}
            renderItem={renderViewerItem}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            initialScrollIndex={viewerIndex}
          />

          {/* Counter */}
          <View style={styles.viewerCounter}>
            <Text style={[styles.viewerCounterText, { color: colors.white }]}>
              {viewerIndex + 1} / {images.length}
            </Text>
          </View>

          {/* Close button */}
          <TouchableOpacity
            style={styles.viewerClose}
            onPress={() => setViewerVisible(false)}
          >
            <Ionicons name="close" size={28} color={colors.white} />
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  slide: {
    overflow: 'hidden',
  },
  addCard: {
    width: SCREEN_WIDTH,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  dotsRow: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    borderRadius: 5,
    marginHorizontal: 3,
  },
  dotActive: {
    width: 10,
    height: 10,
  },
  dotInactive: {
    width: 8,
    height: 8,
  },
  // Viewer
  viewerContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  viewerSlide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  viewerCounter: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  viewerCounterText: {
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  viewerClose: {
    position: 'absolute',
    top: 48,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
