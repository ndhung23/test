import { useState, useMemo, useRef } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Pressable,
  Dimensions,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const BUTTON_SIZE = 54;
const PADDING = 12;

export default function AiFloatingBotButton({ onPress }) {
  const touchStartTime = useRef(0);
  const [pan] = useState(
    () =>
      new Animated.ValueXY({
        x: SCREEN_WIDTH - BUTTON_SIZE - PADDING,
        y: SCREEN_HEIGHT - 230,
      })
  );

  const panResponder = useMemo(() => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: () => {
        touchStartTime.current = Date.now();
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();

        const duration = Date.now() - touchStartTime.current;
        const dist = Math.hypot(gestureState.dx, gestureState.dy);
        // Nếu chạm nhanh (< 350ms) hoặc khoảng cách kéo nhỏ (< 14px) -> mở chat
        const isTap = dist < 10 || (duration < 350 && dist < 18);
        if (isTap) {
          onPress && onPress();
          return;
        }

        // Tự động snap nhẹ về cạnh trái hoặc cạnh phải gần nhất
        let targetX = pan.x._value;
        let targetY = pan.y._value;

        if (targetX < SCREEN_WIDTH / 2) {
          targetX = PADDING;
        } else {
          targetX = SCREEN_WIDTH - BUTTON_SIZE - PADDING;
        }

        const minY = 60;
        const maxY = SCREEN_HEIGHT - BUTTON_SIZE - 90;
        if (targetY < minY) targetY = minY;
        if (targetY > maxY) targetY = maxY;

        Animated.spring(pan, {
          toValue: { x: targetX, y: targetY },
          useNativeDriver: false,
          friction: 6,
          tension: 40,
        }).start();
      },
    });
  }, [onPress, pan]);

  return (
    <Animated.View
      style={[styles.floatingContainer, pan.getLayout()]}
      {...panResponder.panHandlers}
    >
      <Pressable
        onPress={onPress}
        style={styles.buttonCircle}
        android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true }}
      >
        <View style={styles.glowRing} />
        <View style={styles.innerContent}>
          <Ionicons name="sparkles" size={24} color="#FFFFFF" />
          <View style={styles.badgeDot} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    zIndex: 9999,
  },
  buttonCircle: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#6366F1', // Indigo modern AI color
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#818CF8',
  },
  glowRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
  },
  innerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981', // Green indicator
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});
