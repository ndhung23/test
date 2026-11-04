import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Pressable,
  useWindowDimensions,
  View,
  Text,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const BUTTON_SIZE = 56;
const PADDING = 14;

export default function AiFloatingBotButton({ onPress }) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const currentOffset = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  // Pulse animation cho vòng sáng của AI Bot
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim]);

  const panResponder = useMemo(() => {
    return PanResponder.create({
      // Chỉ kích hoạt PanResponder khi di chuyển ngón tay > 6px để tap thông thường không bị chặn
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6;
      },
      onMoveShouldSetPanResponderCapture: (_, gesture) => {
        return Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6;
      },
      onPanResponderGrant: () => {
        setIsDragging(true);
        pan.setOffset({
          x: currentOffset.current.x,
          y: currentOffset.current.y,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gesture) => {
        pan.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        setIsDragging(false);
        pan.flattenOffset();

        // Khoảng cách kéo
        const dist = Math.hypot(gesture.dx, gesture.dy);
        if (dist < 6) {
          onPress && onPress();
          return;
        }

        // Tính toán vị trí snap về 2 mép màn hình
        // Vị trí mặc định là: right: 18, bottom: 110
        // Khi kéo sang trái, pan.x là số âm
        const maxLeftX = -(windowWidth - BUTTON_SIZE - PADDING * 2);
        const currentX = pan.x._value;

        // Nếu kéo quá nửa màn hình về phía trái -> Snap sát mép trái
        let targetX = 0;
        if (currentX < maxLeftX / 2) {
          targetX = maxLeftX;
        } else {
          targetX = 0; // Snap về mép phải gốc
        }

        // Giới hạn trục Y không văng ra khỏi màn hình
        const minUpY = -(windowHeight - BUTTON_SIZE - 170); // Không đè status bar
        const maxDownY = 60; // Không lọt dưới đáy
        let targetY = pan.y._value;
        if (targetY < minUpY) targetY = minUpY;
        if (targetY > maxDownY) targetY = maxDownY;

        currentOffset.current = { x: targetX, y: targetY };

        Animated.spring(pan, {
          toValue: { x: targetX, y: targetY },
          useNativeDriver: false,
          friction: 6,
          tension: 40,
        }).start();
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
      },
    });
  }, [windowWidth, windowHeight, onPress, pan]);

  return (
    <Animated.View
      pointerEvents="auto"
      style={[
        styles.floatingContainer,
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Pressable
        onPress={() => {
          if (!isDragging && onPress) {
            onPress();
          }
        }}
        style={({ pressed }) => [
          styles.buttonCircle,
          pressed && styles.buttonPressed,
        ]}
        android_ripple={{ color: 'rgba(255,255,255,0.3)', borderless: true }}
      >
        {/* Vòng hào quang pulsing */}
        <Animated.View
          style={[
            styles.glowRing,
            {
              transform: [{ scale: pulseAnim }],
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.15],
                outputRange: [0.6, 0.2],
              }),
            },
          ]}
        />

        {/* Nội dung icon AI */}
        <View style={styles.innerContent}>
          <Ionicons name="sparkles" size={24} color="#FFFFFF" />
          <View style={styles.badgeLabel}>
            <Text style={styles.badgeText}>AI</Text>
          </View>
        </View>

        {/* Đốm xanh online */}
        <View style={styles.onlineDot} />
      </Pressable>

      {/* Tag nhãn "Hỏi đáp" bên dưới để người dùng nhận diện ngay lập tức */}
      <View style={styles.textPill}>
        <Text style={styles.textPillLabel}>Hỏi đáp</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  floatingContainer: {
    position: 'absolute',
    right: 18,
    bottom: 110,
    alignItems: 'center',
    zIndex: 999999,
    elevation: 999999,
  },
  buttonCircle: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#6366F1', // Indigo modern AI color
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 12,
    borderWidth: 2.5,
    borderColor: '#A5B4FC',
  },
  buttonPressed: {
    transform: [{ scale: 0.93 }],
    opacity: 0.9,
  },
  glowRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: '#818CF8',
  },
  innerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeLabel: {
    position: 'absolute',
    top: -9,
    right: -12,
    backgroundColor: '#FFD700',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '900',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  textPill: {
    marginTop: 4,
    backgroundColor: 'rgba(20, 20, 24, 0.88)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(165, 180, 252, 0.5)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  textPillLabel: {
    color: '#E0E7FF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
