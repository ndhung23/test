import { View, Pressable, StyleSheet, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';

const TAB_ICONS = {
  Home: { name: 'home', size: 22 },
  ScreenTime: { name: 'timer', size: 22 },
  Tools: { name: 'apps', size: 22 },
  Stats: { name: 'bar-chart', size: 22 },
};

export default function FloatingTabBar({ state, descriptors, navigation }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          bottom: Math.max(insets.bottom, Platform.OS === 'ios' ? 24 : 16),
          backgroundColor: isDark ? '#26262B' : colors.card,
          borderColor: isDark ? '#36363E' : colors.cardBorder,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const config = TAB_ICONS[route.name] || { name: 'apps', size: 22 };

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            style={styles.tabButton}
            hitSlop={8}
          >
            {isFocused ? (
              <View
                style={[
                  styles.activeCircle,
                  {
                    backgroundColor: isDark ? '#18181B' : colors.circleBg,
                    borderColor: isDark ? 'rgba(255, 208, 0, 0.25)' : 'rgba(217, 119, 6, 0.3)',
                  },
                ]}
              >
                <Ionicons name={config.name} size={config.size} color={colors.primary} />
              </View>
            ) : (
              <View style={styles.inactiveSlot}>
                <Ionicons
                  name={config.name}
                  size={config.size}
                  color={isDark ? '#FFFFFF' : colors.sub}
                />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 66,
    borderRadius: 33,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 18,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  activeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#18181B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 208, 0, 0.25)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  inactiveSlot: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
