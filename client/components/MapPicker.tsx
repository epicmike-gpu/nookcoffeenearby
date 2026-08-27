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

export type MapProvider = 'amap' | 'baidu' | 'google';

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
        <Feather name="map-pin" size={18} color="#FFFDF9" />
      </View>
      <View style={styles.optionTextWrap}>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text style={styles.optionDesc}>{description}</Text>
      </View>
      <Feather name="chevron-right" size={18} color="#C4B8A8" />
    </TouchableOpacity>
  );
}

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

          <MapOptionButton
            label="Amap 高德地图"
            description="Recommended for China"
            color="#0090FF"
            onPress={() => handleSelect('amap')}
          />
          <MapOptionButton
            label="Baidu Maps 百度地图"
            description="Open location in Baidu Maps"
            color="#3385FF"
            onPress={() => handleSelect('baidu')}
          />
          <MapOptionButton
            label="Google Maps"
            description="Best for overseas"
            color="#34A853"
            onPress={() => handleSelect('google')}
          />

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
    backgroundColor: 'rgba(60,36,21,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFDF9',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 34,
  },
  sheetHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3C2415',
  },
  sheetSubtitle: {
    fontSize: 13,
    color: '#8B7355',
    marginTop: 4,
    maxWidth: '80%',
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAF6F1',
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
    color: '#3C2415',
  },
  optionDesc: {
    fontSize: 12,
    color: '#8B7355',
    marginTop: 2,
  },
  cancelBtn: {
    alignItems: 'center',
    padding: 12,
    marginTop: 4,
  },
  cancelText: {
    fontSize: 15,
    color: '#8B7355',
    fontWeight: '500',
  },
});
