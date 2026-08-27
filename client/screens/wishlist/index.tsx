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
import { useUser } from '@/contexts/UserContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { API_BASE_URL } from '@/utils/api';
import { Feather } from '@expo/vector-icons';
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
        <Feather key={i} name="star" size={12} color={i < fullStars ? '#D4A574' : '#E0D5C8'} />
      ))}
      <Text style={styles.ratingText}>{rating > 0 ? rating.toFixed(1) : 'N/A'}</Text>
    </View>
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
      const res = await fetch(`${API_BASE_URL}/api/v1/wishlists/${user.id}`);
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
          await fetch(`${API_BASE_URL}/api/v1/wishlists/${id}`, { method: 'DELETE' });
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
          <ActivityIndicator size="large" color="#6F4E37" />
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
          renderItem={({ item }) => {
            const photos = item.shop_photos ? JSON.parse(item.shop_photos) : [];
            const imageUrl = photos[0]?.url || '';
            return (
              <TouchableOpacity
                style={styles.card}
                onPress={() => handleViewDetail(item)}
                activeOpacity={0.8}
              >
                <View style={styles.cardLeft}>
                  {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.cardImage} />
                  ) : (
                    <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                      <Feather name="coffee" size={24} color="#C4B8A8" />
                    </View>
                  )}
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardName} numberOfLines={1}>{item.shop_name}</Text>
                  <View style={styles.cardRow}>
                    <Feather name="map-pin" size={12} color="#8B7355" />
                    <Text style={styles.cardAddress} numberOfLines={1}>{item.shop_address}</Text>
                  </View>
                  <StarRating rating={item.shop_rating || 0} />
                </View>
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => handleRemove(item.id, item.shop_name)}
                >
                  <Feather name="x" size={18} color="#C4B8A8" />
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchWishlist} tintColor="#6F4E37" />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="heart" size={48} color="#C4B8A8" />
              <Text style={styles.emptyText}>No places saved yet</Text>
              <Text style={styles.emptySubtext}>Tap "Want to Go" on a coffee shop to save it</Text>
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
    color: '#3C2415',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8B7355',
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFDF9',
    borderRadius: 16,
    marginBottom: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#6F4E37',
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
    backgroundColor: '#F5EDE4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3C2415',
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
    color: '#8B7355',
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
    color: '#D4A574',
    marginLeft: 4,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5EDE4',
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
    color: '#8B7355',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 13,
    color: '#C4B8A8',
    textAlign: 'center',
  },
});
