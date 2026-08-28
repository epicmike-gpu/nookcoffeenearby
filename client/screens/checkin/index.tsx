import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Screen } from '@/components/Screen';
import MapPicker, { MapTarget } from '@/components/MapPicker';
import { useUser } from '@/contexts/UserContext';
import { API_BASE_URL } from '@/utils/api';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

interface CheckinItem {
  id: string;
  shop_name: string;
  shop_address: string;
  shop_rating: number;
  shop_latitude: number;
  shop_longitude: number;
  shop_poi_id: string;
  shop_photos: string;
  note: string;
  photo_url: string;
  created_at: string;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function CheckinCard({ item }: { item: CheckinItem }) {
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const photos = item.shop_photos ? JSON.parse(item.shop_photos) : [];
  const imageUrl = photos[0]?.url || '';

  const mapTarget: MapTarget = {
    name: item.shop_name,
    latitude: item.shop_latitude,
    longitude: item.shop_longitude,
  };

  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineDot}>
        <Feather name="check-circle" size={16} color="#F97316" />
      </View>
      <View style={styles.timelineContent}>
        <View style={styles.card}>
          <View style={styles.cardThumbWrap}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.cardThumb} />
            ) : (
              <View style={[styles.cardThumb, styles.cardThumbPlaceholder]}>
                <Feather name="coffee" size={24} color="#FDBA74" />
              </View>
            )}
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardName} numberOfLines={1}>{item.shop_name}</Text>
            <TouchableOpacity style={styles.cardRow} onPress={() => setMapPickerVisible(true)} activeOpacity={0.6}>
              <Feather name="map-pin" size={12} color="#C2410C" />
              <Text style={styles.cardAddress} numberOfLines={1} ellipsizeMode="tail">{item.shop_address}</Text>
              <Feather name="navigation" size={11} color="#F97316" />
            </TouchableOpacity>
            {item.note ? (
              <Text style={styles.note} numberOfLines={2}>&ldquo;{item.note}&rdquo;</Text>
            ) : null}
            <Text style={styles.date}>{formatDate(item.created_at)}</Text>
          </View>
        </View>
      </View>
      <MapPicker
        visible={mapPickerVisible}
        target={mapTarget}
        onClose={() => setMapPickerVisible(false)}
      />
    </View>
  );
}

export default function CheckinScreen() {
  const { user } = useUser();
  const [items, setItems] = useState<CheckinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCheckins = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE_URL}/checkins/${user.id}`);
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
      fetchCheckins();
    }, [fetchCheckins])
  );

  if (loading) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#F97316" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Check-ins</Text>
          <Text style={styles.headerSubtitle}>{items.length} places visited</Text>
        </View>

        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CheckinCard item={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchCheckins} tintColor="#F97316" />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="check-circle" size={48} color="#FDBA74" />
              <Text style={styles.emptyText}>No check-ins yet</Text>
              <Text style={styles.emptySubtext}>Visit a coffee shop and check in to record it</Text>
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
    color: '#7C2D12',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#C2410C',
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timelineDot: {
    width: 32,
    alignItems: 'center',
    paddingTop: 20,
  },
  timelineContent: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardThumbWrap: {
    width: 84,
    height: 84,
    borderRadius: 10,
    overflow: 'hidden',
  },
  cardThumb: {
    width: '100%',
    height: '100%',
  },
  cardThumbPlaceholder: {
    backgroundColor: '#FFEDD5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#7C2D12',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  cardAddress: {
    fontSize: 12,
    color: '#C2410C',
    flex: 1,
    lineHeight: 16,
  },
  note: {
    fontSize: 13,
    color: '#9A3412',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  date: {
    fontSize: 11,
    color: '#FDBA74',
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
    color: '#C2410C',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 13,
    color: '#FDBA74',
    textAlign: 'center',
  },
});
