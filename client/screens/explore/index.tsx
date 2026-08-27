import React, { useState, useCallback } from 'react';
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
      <Text style={styles.ratingText}>{rating > 0 ? rating.toFixed(1) : 'N/A'}</Text>
    </View>
  );
}

function ShopCard({ shop }: { shop: Shop }) {
  const router = useSafeRouter();
  const imageUrl = shop.photos?.[0]?.url || '';

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
    });
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.8}>
      <View style={styles.cardImageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Feather name="coffee" size={48} color="#C4B8A8" />
          </View>
        )}
        <View style={styles.distanceBadge}>
          <Feather name="navigation" size={10} color="#6F4E37" />
          <Text style={styles.distanceText}>{shop.distance}m</Text>
        </View>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardName} numberOfLines={1}>{shop.name}</Text>
        <View style={styles.cardRow}>
          <Feather name="map-pin" size={12} color="#8B7355" />
          <Text style={styles.cardAddress} numberOfLines={1}>{shop.address}</Text>
        </View>
        <View style={styles.cardBottom}>
          <StarRating rating={shop.rating} />
          {shop.phone ? (
            <View style={styles.phoneRow}>
              <Feather name="phone" size={12} color="#8B7355" />
              <Text style={styles.phoneText} numberOfLines={1}>{shop.phone}</Text>
            </View>
          ) : null}
        </View>
      </View>
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

  const fetchShops = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/shops/nearby?latitude=${lat}&longitude=${lng}&radius=3000&keywords=%E5%92%96%E5%95%A1`
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
      await fetchShops(coords.latitude, coords.longitude);
    } catch {
      setError('Failed to get location');
      setLoading(false);
    }
  }, [fetchShops]);

  const openSettings = () => {
    Linking.openSettings();
  };

  const useDefaultLocation = useCallback(async () => {
    // Default to Shanghai People's Square
    const coords = { latitude: 31.2304, longitude: 121.4737 };
    setLocation(coords);
    setError('');
    await fetchShops(coords.latitude, coords.longitude);
  }, [fetchShops]);

  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // Only request location on first mount, not on every focus
      if (!hasRequestedPermission && !location) {
        setHasRequestedPermission(true);
        requestLocation();
      }
    }, [hasRequestedPermission, location, requestLocation])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (location) {
      fetchShops(location.latitude, location.longitude);
    } else {
      setHasRequestedPermission(false);
      requestLocation();
    }
  }, [location, fetchShops, requestLocation]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6F4E37" />
          <Text style={styles.loadingText}>Finding nearby coffee shops...</Text>
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <View style={styles.center}>
          <Feather name="alert-circle" size={48} color="#C4B8A8" />
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorSubtext}>Enable location to find shops near you</Text>
          <View style={styles.errorBtnRow}>
            <TouchableOpacity style={styles.retryBtn} onPress={openSettings}>
              <Feather name="settings" size={16} color="#6F4E37" />
              <Text style={styles.retryText}>Open Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.defaultBtn} onPress={useDefaultLocation}>
              <Feather name="map-pin" size={16} color="#6F4E37" />
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
              {shops.length} coffee shops nearby
            </Text>
          </View>
          <TouchableOpacity
            style={styles.planBtn}
            onPress={() => router.push('/detail', { page: 'travel' } as any)}
          >
            <Feather name="map" size={18} color="#6F4E37" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={shops}
          keyExtractor={(item) => item.poi_id}
          renderItem={({ item }) => <ShopCard shop={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6F4E37" />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="coffee" size={48} color="#C4B8A8" />
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
    color: '#3C2415',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8B7355',
    marginTop: 2,
  },
  planBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5EDE4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#FFFDF9',
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
    shadowColor: '#6F4E37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardImageContainer: {
    position: 'relative',
    height: 160,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImagePlaceholder: {
    backgroundColor: '#F5EDE4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  distanceBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,253,240,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6F4E37',
  },
  cardContent: {
    padding: 14,
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3C2415',
    marginBottom: 6,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  cardAddress: {
    fontSize: 13,
    color: '#8B7355',
    flex: 1,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D4A574',
    marginLeft: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginLeft: 8,
  },
  phoneText: {
    fontSize: 12,
    color: '#8B7355',
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
    color: '#8B7355',
  },
  errorText: {
    marginTop: 16,
    fontSize: 15,
    color: '#8B7355',
    textAlign: 'center',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 13,
    color: '#C4B8A8',
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
    backgroundColor: '#6F4E37',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  defaultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5EDE4',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    color: '#FFFDF9',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 15,
    color: '#8B7355',
  },
});
