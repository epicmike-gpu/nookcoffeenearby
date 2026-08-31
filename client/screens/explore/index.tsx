import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Image,
  Linking,
} from 'react-native';
import { Screen } from '@/components/Screen';
import MapPicker, { MapTarget } from '@/components/MapPicker';
import { useUser } from '@/contexts/UserContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { API_BASE_URL } from '@/utils/api';
import { formatDistance } from '@/utils';
import * as Location from 'expo-location';
import { Feather, Ionicons } from '@expo/vector-icons';
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
  photos: string[];
  cost?: number | null;
}

type SortBy = 'distance' | 'rating' | 'cost';

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  return (
    <View style={styles.starRow}>
      {[...Array(5)].map((_, i) => (
        <Ionicons
          key={i}
          name="star"
          size={12}
          color={i < fullStars ? '#D4B464' : i === fullStars && hasHalf ? '#D4B464' : '#E5E7EB'}
        />
      ))}
      <Text style={styles.ratingText}>{rating > 0 ? rating.toFixed(1) : 'N/A'}</Text>
    </View>
  );
}

function ShopCard({ shop }: { shop: Shop }) {
  const router = useSafeRouter();
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const imageUrl = shop.photos?.[0] || '';

  const mapTarget: MapTarget = {
    name: shop.name,
    latitude: shop.latitude,
    longitude: shop.longitude,
  };

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
      photos: JSON.stringify(shop.photos || []),
      cost: shop.cost != null ? shop.cost.toString() : '',
    });
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.8}>
      <View style={styles.cardThumbWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.cardThumb} />
        ) : (
          <View style={[styles.cardThumb, styles.cardThumbPlaceholder]}>
            <Feather name="coffee" size={28} color="#D1D5DB" />
          </View>
        )}
        <View style={styles.distanceBadge}>
          <Feather name="navigation" size={9} color="#111111" />
          <Text style={styles.distanceText}>{formatDistance(shop.distance)}</Text>
        </View>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardNameRow}>
          <Text style={styles.cardName} numberOfLines={1}>{shop.name}</Text>
          {shop.phone ? <Feather name="phone" size={14} color="#9CA3AF" /> : null}
        </View>
        <View style={styles.ratingRow}>
          <StarRating rating={shop.rating} />
          {shop.cost != null ? (
            <View style={styles.costBadge}>
              <Feather name="dollar-sign" size={10} color="#111111" />
              <Text style={styles.costText}>{shop.cost}/person</Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity style={styles.cardRow} onPress={() => setMapPickerVisible(true)} activeOpacity={0.6}>
          <Feather name="map-pin" size={12} color="#6B7280" />
          <Text style={styles.cardAddress} numberOfLines={1} ellipsizeMode="tail">{shop.address}</Text>
          <Feather name="navigation" size={11} color="#111111" />
        </TouchableOpacity>
      </View>
      <MapPicker
        visible={mapPickerVisible}
        target={mapTarget}
        onClose={() => setMapPickerVisible(false)}
      />
    </TouchableOpacity>
  );
}

export default function ExploreScreen() {
  const { user } = useUser();
  const router = useSafeRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState('');
  const [category, setCategory] = useState<'coffee' | 'brunch'>('coffee');
  const [sortBy, setSortBy] = useState<SortBy>('distance');

  /**
   * 服务端文件：server/src/index.ts
   * 接口：GET /api/v1/shops/nearby
   * Query 参数：latitude: number, longitude: number, radius?: number,
   *            category?: 'coffee' | 'brunch', sort?: 'distance' | 'rating' | 'cost'
   */
  const fetchShops = useCallback(async (lat: number, lng: number, cat: 'coffee' | 'brunch', sort: SortBy) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/shops/nearby?latitude=${lat}&longitude=${lng}&radius=3000&category=${cat}&sort=${sort}`
      );
      const data = await res.json();
      setShops(data);
    } catch (err) {
      setError('Failed to load shops');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const requestLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission denied');
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setLocation(coords);
    } catch {
      setError('Failed to get location');
      setLoading(false);
    }
  }, []);

  const openSettings = () => {
    Linking.openSettings();
  };

  const useDefaultLocation = useCallback(() => {
    // Default to Shanghai People's Square
    setError('');
    setLocation({ latitude: 31.2304, longitude: 121.4737 });
  }, []);

  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);

  // Fetch shops when location or category changes (including "Use Shanghai" button)
  useEffect(() => {
    if (location) {
      setLoading(true);
      fetchShops(location.latitude, location.longitude, category, sortBy);
    }
  }, [location, category, sortBy, fetchShops]);

  // Request location permission on first focus only
  useFocusEffect(
    useCallback(() => {
      if (!hasRequestedPermission && !location) {
        setHasRequestedPermission(true);
        requestLocation();
      }
    }, [hasRequestedPermission, location, requestLocation])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (location) {
      fetchShops(location.latitude, location.longitude, category, sortBy);
    } else {
      setHasRequestedPermission(false);
      requestLocation();
    }
  }, [location, category, sortBy, fetchShops, requestLocation]);

  const switchCategory = useCallback((cat: 'coffee' | 'brunch') => {
    setCategory(cat);
  }, []);

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#111111" />
          <Text style={styles.loadingText}>Finding nearby coffee shops...</Text>
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <View style={styles.center}>
          <Feather name="alert-circle" size={48} color="#D1D5DB" />
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorSubtext}>Enable location to find shops near you</Text>
          <View style={styles.errorBtnRow}>
            <TouchableOpacity style={styles.retryBtn} onPress={openSettings}>
              <Feather name="settings" size={16} color="#111111" />
              <Text style={styles.retryText}>Open Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.defaultBtn} onPress={useDefaultLocation}>
              <Feather name="map-pin" size={16} color="#111111" />
              <Text style={styles.retryText}>Use Shanghai</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Explore</Text>
            <Text style={styles.headerSubtitle}>
              {shops.length} {category === 'coffee' ? 'coffee shops' : 'brunch spots'} nearby
            </Text>
          </View>
          <TouchableOpacity
            style={styles.planBtn}
            onPress={() => router.push('/detail', { page: 'travel' } as any)}
          >
            <Feather name="map" size={18} color="#111111" />
          </TouchableOpacity>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, category === 'coffee' && styles.tabActive]}
            onPress={() => switchCategory('coffee')}
          >
            <Feather name="coffee" size={16} color={category === 'coffee' ? '#FAFAFA' : '#111111'} />
            <Text style={[styles.tabText, category === 'coffee' && styles.tabTextActive]}>Coffee</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, category === 'brunch' && styles.tabActive]}
            onPress={() => switchCategory('brunch')}
          >
            <Feather name="sun" size={16} color={category === 'brunch' ? '#FAFAFA' : '#111111'} />
            <Text style={[styles.tabText, category === 'brunch' && styles.tabTextActive]}>Brunch</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sortRow}>
          {([
            { key: 'distance', label: 'Nearest' },
            { key: 'rating', label: 'Top Rated' },
            { key: 'cost', label: 'Cheapest' },
          ] as { key: SortBy; label: string }[]).map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sortChip, sortBy === opt.key && styles.sortChipActive]}
              onPress={() => setSortBy(opt.key)}
            >
              <Text style={[styles.sortChipText, sortBy === opt.key && styles.sortChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={shops}
          keyExtractor={(item) => item.poi_id}
          renderItem={({ item }) => <ShopCard shop={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#111111" />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="coffee" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No coffee shops found nearby</Text>
            </View>
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111111',
  },
  tabRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  tabActive: {
    backgroundColor: '#111111',
    borderColor: '#111111',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111111',
  },
  tabTextActive: {
    color: '#FAFAFA',
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sortChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  sortChipActive: {
    backgroundColor: '#E5E7EB',
  },
  sortChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
  sortChipTextActive: {
    color: '#111111',
    fontWeight: '700',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  costText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111111',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  planBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardThumbWrap: {
    position: 'relative',
    width: 96,
    height: 96,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardThumb: {
    width: '100%',
    height: '100%',
  },
  cardThumbPlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  distanceBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,253,240,0.92)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  distanceText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#111111',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    flex: 1,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  cardAddress: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
    lineHeight: 18,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D4B464',
    marginLeft: 4,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#6B7280',
  },
  errorText: {
    marginTop: 16,
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 13,
    color: '#D1D5DB',
    textAlign: 'center',
  },
  errorBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#111111',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  defaultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
    color: '#6B7280',
  },
});
