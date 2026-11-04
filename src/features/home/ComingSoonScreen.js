import { View, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../theme';
import { useLanguage } from '../../i18n';

export default function ComingSoonScreen({ route }) {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const tool = route.params?.tool;
  const color = tool?.color ?? colors.primary;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: colors.bg }}>
      <View
        style={{
          width: 96, height: 96, borderRadius: 28, backgroundColor: color + '22',
          alignItems: 'center', justifyContent: 'center', marginBottom: 20,
        }}
      >
        <Ionicons name={tool?.icon ?? 'construct'} size={48} color={color} />
      </View>
      <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>
        {tool?.title ?? (t('comingSoon.title') || 'Tiện ích')}
      </Text>
      <Text style={{ color: colors.sub, marginTop: 8, textAlign: 'center' }}>
        {tool?.desc ? tool.desc + '.\n' : ''}{t('comingSoon.desc') || 'Tiện ích này chưa được làm. Sẽ có trong bản cập nhật sau.'}
      </Text>
    </View>
  );
}
