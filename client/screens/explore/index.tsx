import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Platform,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useUser } from '@/contexts/UserContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { API_BASE_URL } from '@/utils/api';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

interface Shop {
  poi_id: string;
  name: string;
  address: string;
  phone: string;
  rating: number;
  latitude: number;
  longitude: number;
  distance: string;
  type: string;
  photos: { title: string; url: string }[];
}

// Coffee shop images from Unsplash
const shopImages: Record<string, string> = {
  'demo_0': 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
  'demo_1': 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=300&fit=crop',
  'demo_2': 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=300&fit=crop',
  'demo_3': 'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?w=400&h=300&fit=crop',
  'demo_4': 'https://images.unsplash.com/photo-1507133750040-4a8f57021571?w=400&h=300&fit=crop',
  'demo_5': 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop',
  'demo_6': 'https://images.unsplash.com/photo-1559496417-e7f25cb247f3?w=400&h=300&fit=crop',
  'demo_7': 'https://images.unsplash.com/photo-1453614512568-c4024d13c247?w=400&h=300&fit=crop',
};

function getDefaultImage(poiId: string): string {
  return shopImages[poiId] || `https://images.unsplash.com/photo-${1501339847302 + parseInt(poiId.replace(/\D/g, '') || '0', 10)}-ac426a4a7cbb?w=400&h=300&fit=crop`;
}

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  return (
    <View style={styles.starRow}>
      {[...Array(5)].map((_, i) => (
        <Feather
          key={i}
          name="star"
          size={12}
          color={i < fullStars ? '#D4A574' : i === fullStars && hasHalf ? '#D4A574' : '#E0D5C8'}
        />
      ))}
      <Text style={styles.ratingText}>{rating > 0 ? rating.toFixed(1) : '暂无'}</Text>
    </View>
  );
}

function ShopCard({ shop }: { shop: Shop }) {
  const router = useSafeRouter();

  const handlePress = () => {
    router.push('/detail', {
      poi_id: shop.poi_id,
      name: shop.name,
      address: shop.address,
      phone: shop.phone,
      rating: shop.rating.toString(),
      latitude: shop.latitude.toString(),
      longitude: shop.longitude.toString(),
      distance: shop.distance,
      image: getDefaultImage(shop.poi_id),
    });
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.8}>
      <View style={styles.cardImageContainer}>
        <View style={styles.cardImage}>
          <Feather name="coffee" size={48} color="#C4B8A8" />
        </View>
        <View style={styles.distanceBadge}>
          <Feather name="navigation" size={10} color="#6F4E37" />
          <Text style={styles.distanceText}>{shop.distance}km</Text>
        </View>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardName} numberOfLines={1}>{shop.name}</Text>
        <View style={styles.cardRow}>
          <Feather name="map-pin" size={12} color="#8B7355" />
          <Text style={styles.cardAddress} numberOfLines={1}>{shop.address}</Text>
        </View>
        <StarRating rating={shop.rating} />
      </View>
    </TouchableOpacity>
  );
}

export default function ExploreScreen() {
  const { user } = useUser();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const getLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('请授权位置权限以获取附近咖啡店');
        // Fallback to default location (Shanghai)
        const fallback = { latitude: 31.2304, longitude: 121.4737 };
        setLocation(fallback);
        return fallback;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const result = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setLocation(result);
      setLocationError(null);
      return result;
    } catch {
      setLocationError('无法获取位置，使用默认位置');
      const fallback = { latitude: 31.2304, longitude: 121.4737 };
      setLocation(fallback);
      return fallback;
    }
  };

  const fetchShops = useCallback(async (lat: number, lng: number) => {
    try {
      /**
       * 服务端文件：server/src/index.ts
       * 接口：GET /api/v1/shops/nearby
       * Query 参数：latitude: string, longitude: string, radius?: string, keywords?: string
       */
      const response = await fetch(
        `${API_BASE_URL}/shops/nearby?latitude=${lat}&longitude=${lng}&radius=3000&keywords=咖啡`
      );
      if (!response.ok) throw new Error('Failed to fetch shops');
      const data = await response.json();
      setShops(data);
    } catch (error) {
      console.error('Failed to fetch shops:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        let loc = location;
        if (!loc) {
          loc = await getLocation();
        }
        if (loc) {
          fetchShops(loc.latitude, loc.longitude);
        }
      };
      init();
    }, [location])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await getLocation();
    if (location) {
      await fetchShops(location.latitude, location.longitude);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View>
          <Text style={styles.greeting}>下午好</Text>
          <Text style={styles.subtitle}>发现身边的好咖啡</Text>
        </View>
        <TouchableOpacity style={styles.locationBtn} onPress={getLocation}>
          <Feather name="crosshair" size={18} color="#6F4E37" />
          <Text style={styles.locationBtnText}>定位</Text>
        </TouchableOpacity>
      </View>
      {locationError && (
        <View style={styles.errorBanner}>
          <Feather name="alert-circle" size={14} color="#B8764E" />
          <Text style={styles.errorText}>{locationError}</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <Screen safeAreaEdges={['left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6F4E37" />
          <Text style={styles.loadingText}>正在寻找附近的好咖啡...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen safeAreaEdges={['left', 'right']}>
      <FlatList
        data={shops}
        keyExtractor={(item) => item.poi_id}
        renderItem={({ item }) => <ShopCard shop={item} />}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6F4E37"
            colors={['#6F4E37']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="coffee" size={48} color="#C4B8A8" />
            <Text style={styles.emptyText}>附近暂无咖啡店</Text>
            <Text style={styles.emptySubtext}>试试扩大搜索范围</Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF6F1',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#8B7355',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 60,
    paddingBottom: 16,
    backgroundColor: '#FAF6F1',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C1810',
  },
  subtitle: {
    fontSize: 15,
    color: '#8B7355',
    marginTop: 4,
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(111,78,55,0.08)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  locationBtnText: {
    fontSize: 13,
    color: '#6F4E37',
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212,165,116,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 12,
    gap: 6,
  },
  errorText: {
    fontSize: 13,
    color: '#B8764E',
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#6F4E37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardImageContainer: {
    position: 'relative',
  },
  cardImage: {
    height: 140,
    backgroundColor: '#F0E8DD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImageEmoji: {
    fontSize: 48,
  },
  distanceBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6F4E37',
  },
  cardContent: {
    padding: 16,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2C1810',
    marginBottom: 6,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  cardAddress: {
    fontSize: 13,
    color: '#8B7355',
    flex: 1,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    color: '#8B7355',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2C1810',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8B7355',
    marginTop: 4,
  },
});
