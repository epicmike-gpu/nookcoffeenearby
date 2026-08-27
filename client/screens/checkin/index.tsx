import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Image,
} from 'react-native';
import { Screen } from '@/components/Screen';
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
          <ActivityIndicator size="large" color="#6F4E37" />
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
          renderItem={({ item }) => {
            const photos = item.shop_photos ? JSON.parse(item.shop_photos) : [];
            const imageUrl = photos[0]?.url || '';
            return (
              <View style={styles.timelineItem}>
                <View style={styles.timelineDot}>
                  <Feather name="check-circle" size={16} color="#6F4E37" />
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.card}>
                    {imageUrl ? (
                      <Image source={{ uri: imageUrl }} style={styles.cardImage} />
                    ) : null}
                    <View style={styles.cardBody}>
                      <Text style={styles.cardName} numberOfLines={1}>{item.shop_name}</Text>
                      <View style={styles.cardRow}>
                        <Feather name="map-pin" size={12} color="#8B7355" />
                        <Text style={styles.cardAddress} numberOfLines={1}>{item.shop_address}</Text>
                      </View>
                      {item.note ? (
                        <Text style={styles.note}>"{item.note}"</Text>
                      ) : null}
                      <Text style={styles.date}>{formatDate(item.created_at)}</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={fetchCheckins} tintColor="#6F4E37" />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Feather name="check-circle" size={48} color="#C4B8A8" />
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
    backgroundColor: '#FFFDF9',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#6F4E37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardImage: {
    width: '100%',
    height: 140,
  },
  cardBody: {
    padding: 14,
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
    marginBottom: 6,
  },
  cardAddress: {
    fontSize: 12,
    color: '#8B7355',
    flex: 1,
  },
  note: {
    fontSize: 13,
    color: '#5C4033',
    fontStyle: 'italic',
    marginBottom: 6,
    lineHeight: 18,
  },
  date: {
    fontSize: 11,
    color: '#C4B8A8',
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
