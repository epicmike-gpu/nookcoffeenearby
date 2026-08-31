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
  Alert,
} from 'react-native';
import { Screen } from '@/components/Screen';
import MapPicker, { MapTarget } from '@/components/MapPicker';
import { useUser } from '@/contexts/UserContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { API_BASE_URL } from '@/utils/api';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

interface WishlistItem {
  id: string;
  shop_name: string;
  shop_address: string;
  shop_phone: string;
  shop_rating: number;
  shop_latitude: number;
  shop_longitude: number;
  shop_poi_id: string;
  shop_photos: string;
  note: string;
  created_at: string;
}

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  return (
    <View style={styles.starRow}>
      {[...Array(5)].map((_, i) => (
        <Ionicons key={i} name="star" size={12} color={i < fullStars ? '#D4B464' : '#E5E7EB'} />
      ))}
      <Text style={styles.ratingText}>{rating > 0 ? rating.toFixed(1) : 'N/A'}</Text>
    </View>
  );
}

function WishlistCard({
  item,
  onPressCard,
  onRemove,
}: {
  item: WishlistItem;
  onPressCard: (item: WishlistItem) => void;
  onRemove: (id: string, name: string) => void;
}) {
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const photos = item.shop_photos ? JSON.parse(item.shop_photos) : [];
  const imageUrl = photos[0] || '';

  const mapTarget: MapTarget = {
    name: item.shop_name,
    latitude: item.shop_latitude,
    longitude: item.shop_longitude,
  };

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPressCard(item)} activeOpacity={0.8}>
      <View style={styles.cardLeft}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Feather name="coffee" size={24} color="#D1D5DB" />
          </View>
        )}
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardName} numberOfLines={1}>{item.shop_name}</Text>
        <TouchableOpacity style={styles.cardRow} onPress={() => setMapPickerVisible(true)} activeOpacity={0.6}>
          <Feather name="map-pin" size={12} color="#6B7280" />
          <Text style={styles.cardAddress} numberOfLines={1} ellipsizeMode="tail">{item.shop_address}</Text>
          <Feather name="navigation" size={11} color="#111111" />
        </TouchableOpacity>
        <StarRating rating={item.shop_rating || 0} />
      </View>
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() => onRemove(item.id, item.shop_name)}
      >
        <Feather name="x" size={18} color="#D1D5DB" />
      </TouchableOpacity>
      <MapPicker
        visible={mapPickerVisible}
        target={mapTarget}
        onClose={() => setMapPickerVisible(false)}
      />
    </TouchableOpacity>
  );
}

export default function WishlistScreen() {
  const { user } = useUser();
  const router = useSafeRouter();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWishlist = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE_URL}/wishlists/${user.id}`);
      const data = await res.json();
      setItems(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchWishlist();
    }, [fetchWishlist])
  );

  const handleRemove = (id: string, name: string) => {
    Alert.alert('Remove', `Remove "${name}" from wishlist?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await fetch(`${API_BASE_URL}/wishlists/${id}`, { method: 'DELETE' });
          fetchWishlist();
        },
      },
    ]);
  };

  const handleViewDetail = (item: WishlistItem) => {
    const photos = item.shop_photos ? JSON.parse(item.shop_photos) : [];
    router.push('/detail', {
      poi_id: item.shop_poi_id,
      name: item.shop_name,
      address: item.shop_address,
      phone: item.shop_phone,
      rating: (item.shop_rating || 0).toString(),
      latitude: item.shop_latitude.toString(),
      longitude: item.shop_longitude.toString(),
      distance: '',
      photos: JSON.stringify(photos),
    });
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#111111" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Want to Go</Text>
          <Text style={styles.headerSubtitle}>{items.length} places saved</Text>
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WishlistCard item={item} onPressCard={handleViewDetail} onRemove={handleRemove} />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchWishlist} tintColor="#111111" />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="heart" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No places saved yet</Text>
              <Text style={styles.emptySubtext}>Tap &ldquo;Want to Go&rdquo; on a coffee shop to save it</Text>
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111111',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardLeft: {
    marginRight: 12,
  },
  cardImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  cardImagePlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 4,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  cardAddress: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D4B464',
    marginLeft: 4,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 13,
    color: '#D1D5DB',
    textAlign: 'center',
  },
});
