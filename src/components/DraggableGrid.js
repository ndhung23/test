// src/components/DraggableGrid.js
// Thành phần lưới 3 cột hỗ trợ Kéo - Thả (Drag & Drop) mượt mà cho các tính năng của ToolKit

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  Animated,
  PanResponder,
  StyleSheet,
  Platform,
  UIManager,
  Vibration,
  Pressable,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../theme';
import { useLanguage } from '../context/LanguageContext';

// Kích hoạt LayoutAnimation trên Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  try {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  } catch {}
}

const COLUMNS = 3;
const GAP = 10;

export default function DraggableGrid({
  items = [],
  onReorder,
  onToolPress,
  isLockedFn,
  isReordering,
  setIsReordering,
  onDragStart,
  onDragEnd,
}) {
  const { colors, isDark } = useTheme();
  const { t, isVietnamese } = useLanguage();

  const [gridWidth, setGridWidth] = useState(0);
  const [activeDragId, setActiveDragId] = useState(null);
  const activeDragIdRef = useRef(null);

  // Vị trí di chuyển của item đang được kéo
  const pan = useRef(new Animated.ValueXY()).current;
  const startSlotRef = useRef(0);
  const currentSlotRef = useRef(0);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Tính toán kích thước mỗi ô
  const itemWidth = gridWidth > 0 ? (gridWidth - (COLUMNS - 1) * GAP) / COLUMNS : 100;
  const itemHeight = 104; // Chiều cao chuẩn của card tính năng

  // Helper tính slot index dựa trên tọa độ kéo
  const calculateTargetIndex = (originIndex, dx, dy) => {
    if (!itemWidth || itemsRef.current.length === 0) return originIndex;
    const originCol = originIndex % COLUMNS;
    const originRow = Math.floor(originIndex / COLUMNS);

    const currentX = originCol * (itemWidth + GAP) + itemWidth / 2 + dx;
    const currentY = originRow * (itemHeight + GAP) + itemHeight / 2 + dy;

    const targetCol = Math.max(0, Math.min(COLUMNS - 1, Math.round((currentX - itemWidth / 2) / (itemWidth + GAP))));
    const maxRow = Math.floor((itemsRef.current.length - 1) / COLUMNS);
    const targetRow = Math.max(0, Math.min(maxRow, Math.round((currentY - itemHeight / 2) / (itemHeight + GAP))));

    const targetIndex = targetRow * COLUMNS + targetCol;
    return Math.max(0, Math.min(itemsRef.current.length - 1, targetIndex));
  };

  // Tạo PanResponder cho mỗi ô
  const createPanResponder = (toolItem, itemIndex) => {
    let longPressTimer = null;
    let isDragging = false;

    return PanResponder.create({
      onStartShouldSetPanResponder: () => false,

      // Cho phép bắt đầu nếu đang ở chế độ sắp xếp hoặc sau khi nhấn giữ
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (activeDragIdRef.current && activeDragIdRef.current === toolItem.id) {
          return true;
        }
        if (isReordering && (Math.abs(gestureState.dx) > 4 || Math.abs(gestureState.dy) > 4)) {
          return true;
        }
        return false;
      },

      onPanResponderGrant: () => {
        // Bắt đầu kéo
        activeDragIdRef.current = toolItem.id;
        setActiveDragId(toolItem.id);
        startSlotRef.current = itemsRef.current.findIndex((it) => it.id === toolItem.id);
        currentSlotRef.current = startSlotRef.current;
        pan.setValue({ x: 0, y: 0 });

        if (typeof onDragStart === 'function') {
          onDragStart();
        }
        try {
          Vibration.vibrate(30);
        } catch {}
      },

      onPanResponderMove: (evt, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });

        // Tính vị trí mục tiêu
        const targetIdx = calculateTargetIndex(startSlotRef.current, gestureState.dx, gestureState.dy);

        if (targetIdx !== currentSlotRef.current && targetIdx >= 0 && targetIdx < itemsRef.current.length) {
          // Hoán đổi vị trí trong danh sách
          const updated = [...itemsRef.current];
          const [dragged] = updated.splice(currentSlotRef.current, 1);
          updated.splice(targetIdx, 0, dragged);

          currentSlotRef.current = targetIdx;
          if (typeof onReorder === 'function') {
            onReorder(updated, false); // Cập nhật state tạm thời
          }
        }
      },

      onPanResponderRelease: () => {
        finishDrag();
      },
      onPanResponderTerminate: () => {
        finishDrag();
      },
    });

    function finishDrag() {
      activeDragIdRef.current = null;
      setActiveDragId(null);

      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        friction: 6,
        tension: 40,
        useNativeDriver: false,
      }).start(() => {
        pan.setValue({ x: 0, y: 0 });
      });

      if (typeof onDragEnd === 'function') {
        onDragEnd();
      }

      // Lưu thứ tự cuối cùng vào bộ nhớ máy
      if (typeof onReorder === 'function') {
        onReorder(itemsRef.current, true);
      }
    }
  };

  // Di chuyển bằng nút mũi tên ◀ ▶
  const moveToolByStep = (fromIndex, delta) => {
    const toIndex = fromIndex + delta;
    if (toIndex < 0 || toIndex >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    if (typeof onReorder === 'function') {
      onReorder(next, true);
    }
  };

  return (
    <View
      style={styles.gridContainer}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - gridWidth) > 1) {
          setGridWidth(w);
        }
      }}
    >
      {items.map((toolItem, index) => {
        const isLocked = isLockedFn ? isLockedFn(toolItem) : false;
        const isBeingDragged = activeDragId === toolItem.id;

        // PanResponder riêng cho từng card
        const panResponder = createPanResponder(toolItem, index);

        // Animated style cho card đang kéo
        const cardAnimatedStyle = isBeingDragged
          ? {
              transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale: 1.08 }],
              zIndex: 9999,
              elevation: 12,
              shadowColor: '#FFD000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.45,
              shadowRadius: 14,
            }
          : {
              zIndex: 1,
            };

        return (
          <View
            key={toolItem.id}
            style={[
              styles.itemSlot,
              {
                width: itemWidth || '31.3%',
                height: isReordering ? itemHeight + 36 : itemHeight,
                marginRight: (index + 1) % COLUMNS === 0 ? 0 : GAP,
                marginBottom: GAP + 4,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.cardAnimatedWrapper,
                cardAnimatedStyle,
                { width: '100%', height: itemHeight },
              ]}
              {...panResponder.panHandlers}
            >
              <Pressable
                onPress={() => {
                  if (activeDragId) return;
                  if (isReordering) return;
                  if (onToolPress) onToolPress(toolItem);
                }}
                onLongPress={() => {
                  if (!isReordering) {
                    setIsReordering(true);
                  }
                  try {
                    Vibration.vibrate(35);
                  } catch {}
                }}
                delayLongPress={220}
                style={({ pressed }) => [
                  styles.cardBody,
                  {
                    backgroundColor: colors.card,
                    borderColor: isBeingDragged
                      ? '#FFD000'
                      : isLocked
                      ? 'rgba(255, 208, 0, 0.4)'
                      : isReordering
                      ? colors.primary + '99'
                      : colors.cardBorder,
                    borderWidth: isBeingDragged ? 2 : 1,
                    opacity: pressed && !isReordering ? 0.8 : 1,
                  },
                ]}
              >
                {/* Huy hiệu VIP khóa ở góc */}
                {isLocked && (
                  <View style={styles.lockBadge}>
                    <Ionicons name="lock-closed" size={10} color="#FFD000" />
                  </View>
                )}

                {/* Huy hiệu "Đang kéo" khi đang giữ */}
                {isBeingDragged && (
                  <View style={styles.draggingBadge}>
                    <Ionicons name="hand-right" size={10} color="#121214" />
                    <Text style={styles.draggingBadgeText}>
                      {isVietnamese ? 'Di chuyển' : 'Moving'}
                    </Text>
                  </View>
                )}

                {/* Icon công cụ */}
                <View
                  style={[
                    styles.iconCircle,
                    {
                      backgroundColor: isLocked ? 'rgba(255, 208, 0, 0.12)' : toolItem.color + '1F',
                    },
                    toolItem.imageIcon && { backgroundColor: 'transparent' },
                  ]}
                >
                  {toolItem.imageIcon ? (
                    <Image
                      source={toolItem.imageIcon}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons
                      name={toolItem.icon}
                      size={22}
                      color={isLocked ? '#FFD000' : toolItem.color}
                    />
                  )}
                </View>

                {/* Tên công cụ (đa ngôn ngữ) */}
                <Text
                  style={[
                    styles.toolName,
                    {
                      color: colors.text,
                      fontWeight: isBeingDragged ? '800' : '600',
                    },
                  ]}
                  numberOfLines={2}
                >
                  {t(`tools.${toolItem.id}.shortTitle`, {}, toolItem.shortTitle || toolItem.title)}
                </Text>
              </Pressable>
            </Animated.View>

            {/* Bộ điều hướng mũi tên ◀ 1 ▶ bổ trợ khi bật chế độ sắp xếp */}
            {isReordering && (
              <View
                style={[
                  styles.reorderControls,
                  { backgroundColor: colors.bg, borderColor: colors.cardBorder },
                ]}
              >
                <Pressable
                  onPress={() => moveToolByStep(index, -1)}
                  disabled={index === 0}
                  hitSlop={6}
                  style={[styles.stepBtn, index === 0 && { opacity: 0.25 }]}
                >
                  <Ionicons name="chevron-back" size={15} color={colors.primary} />
                </Pressable>
                <Text style={[styles.stepIndexText, { color: colors.primary }]}>{index + 1}</Text>
                <Pressable
                  onPress={() => moveToolByStep(index, 1)}
                  disabled={index === items.length - 1}
                  hitSlop={6}
                  style={[styles.stepBtn, index === items.length - 1 && { opacity: 0.25 }]}
                >
                  <Ionicons name="chevron-forward" size={15} color={colors.primary} />
                </Pressable>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    width: '100%',
    marginBottom: 16,
  },
  itemSlot: {
    position: 'relative',
  },
  cardAnimatedWrapper: {
    borderRadius: 18,
  },
  cardBody: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  lockBadge: {
    position: 'absolute',
    top: 7,
    right: 7,
    backgroundColor: 'rgba(255, 208, 0, 0.18)',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draggingBadge: {
    position: 'absolute',
    top: -8,
    backgroundColor: '#FFD000',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  draggingBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: '#121214',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  toolName: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 4,
  },
  reorderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
  },
  stepBtn: {
    padding: 2,
  },
  stepIndexText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
