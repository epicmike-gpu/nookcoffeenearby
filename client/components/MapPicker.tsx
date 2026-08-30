import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

export type MapProvider = 'apple' | 'amap' | 'baidu' | 'google';

export type MapTarget = {
  name: string;
  latitude: number;
  longitude: number;
};

type MapPickerProps = {
  visible: boolean;
  target: MapTarget | null;
  onClose: () => void;
};

/**
 * 打开地图 App，优先原生 App，未安装时降级到网页版
 * 坐标系说明：高德 API 返回 GCJ-02 坐标
 * - 高德原生支持 GCJ-02
 * - 百度通过 coord_type=gcj02 参数转换
 * - Google Maps 直接传坐标（中国境内存在轻微偏移，属业界通用做法）
 */
export async function openInMapApp(target: MapTarget, provider: MapProvider): Promise<boolean> {
  const { name, latitude, longitude } = target;
  const encName = encodeURIComponent(name);
  let appUrl: string | null = null;
  let webUrl: string;

  switch (provider) {
    case 'apple':
      // Apple Maps 为 iOS 系统自带（maps:// scheme），必装必可唤起
      appUrl =
        Platform.OS === 'ios'
          ? `maps://?daddr=${latitude},${longitude}&q=${encName}`
          : null;
      webUrl = `https://maps.apple.com/?daddr=${latitude},${longitude}&q=${encName}`;
      break;
    case 'amap':
      appUrl =
        Platform.OS === 'ios'
          ? `iosamap://view?sourceApplication=coffeeshop&poiname=${encName}&lat=${latitude}&lon=${longitude}&dev=0`
          : `androidamap://view?sourceApplication=coffeeshop&poiname=${encName}&lat=${latitude}&lon=${longitude}&dev=0`;
      webUrl = `https://uri.amap.com/marker?position=${longitude},${latitude}&name=${encName}&src=coffeeshop&coordinate=gaode`;
      break;
    case 'baidu':
      appUrl = `baidumap://map/marker?location=${latitude},${longitude}&title=${encName}&content=${encName}&src=coffeeshop&coord_type=gcj02`;
      webUrl = `http://api.map.baidu.com/marker?location=${latitude},${longitude}&coord_type=gcj02&output=html&src=coffeeshop`;
      break;
    case 'google':
      appUrl = `comgooglemaps://?q=${latitude},${longitude}&center=${latitude},${longitude}`;
      webUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      break;
  }

  // 优先尝试打开原生 App
  try {
    if (appUrl) {
      const supported = await Linking.canOpenURL(appUrl);
      if (supported) {
        await Linking.openURL(appUrl);
        return true;
      }
    }
  } catch {
    // 原生 App 打开失败，降级到网页版
  }

  // 降级：打开网页版地图
  try {
    await Linking.openURL(webUrl);
    return true;
  } catch {
    return false;
  }
}

function MapOptionButton({
  label,
  description,
  color,
  onPress,
}: {
  label: string;
  description: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.optionBtn} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.optionIcon, { backgroundColor: color }]}>
        <Feather name="map-pin" size={18} color="#FFFFFF" />
      </View>
      <View style={styles.optionTextWrap}>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text style={styles.optionDesc}>{description}</Text>
      </View>
      <Feather name="chevron-right" size={18} color="#D1D5DB" />
    </TouchableOpacity>
  );
}

// 各地图选项的展示信息
const MAP_OPTIONS: Record<
  MapProvider,
  { label: string; description: string; color: string }
> = {
  apple: { label: 'Apple Maps', description: 'Built-in on iPhone', color: '#111111' },
  amap: { label: 'Amap', description: 'Recommended for China', color: '#0090FF' },
  baidu: { label: 'Baidu Maps', description: 'Open location in Baidu', color: '#3385FF' },
  google: { label: 'Google Maps', description: 'Best for overseas', color: '#34A853' },
};

// 始终展示全部选项：点击时优先唤起原生 App，未安装则自动降级到网页版
const ALL_PROVIDERS: MapProvider[] = ['apple', 'amap', 'baidu', 'google'];

export default function MapPicker({ visible, target, onClose }: MapPickerProps) {
  const handleSelect = async (provider: MapProvider) => {
    if (!target) return;
    const ok = await openInMapApp(target, provider);
    onClose();
    if (!ok) {
      Alert.alert('Error', 'Unable to open the map app. Please check if it is installed.');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.sheet} activeOpacity={1}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Open in Maps</Text>
            {target ? (
              <Text style={styles.sheetSubtitle} numberOfLines={1} ellipsizeMode="tail">
                {target.name}
              </Text>
            ) : null}
          </View>

          {ALL_PROVIDERS.map((provider) => (
            <MapOptionButton
              key={provider}
              label={MAP_OPTIONS[provider].label}
              description={MAP_OPTIONS[provider].description}
              color={MAP_OPTIONS[provider].color}
              onPress={() => handleSelect(provider)}
            />
          ))}

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 30,
  },
  sheetHeader: {
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111111',
  },
  sheetSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTextWrap: {
    flex: 1,
    marginLeft: 12,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111111',
  },
  optionDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 16,
  },
  cancelBtn: {
    marginTop: 6,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111111',
  },
});
