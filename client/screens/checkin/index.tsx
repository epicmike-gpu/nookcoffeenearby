import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
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
  shop_phone: string;
  shop_rating: number;
  shop_latitude: number;
  shop_longitude: number;
  shop_poi_id: string;
  note: string | null;
  photo_url: string | null;
  created_at: string;
}

function CheckinCard({ item }: { item: CheckinItem }) {
  const date = new Date(item.created_at);
  const dateStr = date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
  const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.card}>
      <View style={styles.timeline}>
        <View style={styles.dot} />
        <View style={styles.line} />
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName} numberOfLines={1}>{item.shop_name}</Text>
          <View style={styles.dateBadge}>
            <Text style={styles.dateBadgeText}>{dateStr}</Text>
            <Text style={styles.timeText}>{timeStr}</Text>
          </View>
        </View>
        <View style={styles.cardRow}>
          <Feather name="map-pin" size={12} color="#8B7355" />
          <Text style={styles.cardAddress} numberOfLines={1}>{item.shop_address}</Text>
        </View>
        {item.shop_rating > 0 && (
          <View style={styles.ratingRow}>
            {[...Array(5)].map((_, i) => (
              <Feather
                key={i}
                name="star"
                size={14}
                color={i < Math.round(item.shop_rating) ? '#D4A574' : '#E0D5C8'}
              />
            ))}
          </View>
        )}
        {item.note ? (
          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>{item.note}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function CheckinScreen() {
  const { user } = useUser();
  const [checkins, setCheckins] = useState<CheckinItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCheckins = useCallback(async () => {
    if (!user) return;
    try {
      /**
       * 服务端文件：server/src/index.ts
       * 接口：GET /api/v1/checkins/:userId
       * Path 参数：userId: string
       */
      const response = await fetch(`${API_BASE_URL}/checkins/${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch checkins');
      const data = await response.json();
      setCheckins(data);
    } catch (error) {
      console.error('Failed to fetch checkins:', error);
    } finally {
      setLoading(false);
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
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>打卡记录</Text>
        <Text style={styles.subtitle}>已打卡 {checkins.length} 家咖啡店</Text>
      </View>
      <FlatList
        data={checkins}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <CheckinCard item={item} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="map-pin" size={48} color="#C4B8A8" />
            <Text style={styles.emptyText}>还没有打卡记录</Text>
            <Text style={styles.emptySubtext}>去咖啡店打卡，记录你的咖啡之旅</Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 15, color: '#8B7355' },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 60,
    paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: '700', color: '#2C1810' },
  subtitle: { fontSize: 14, color: '#8B7355', marginTop: 4 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  card: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  timeline: {
    width: 24,
    alignItems: 'center',
    paddingTop: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6F4E37',
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: '#E0D5C8',
    marginTop: 4,
  },
  cardContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginLeft: 8,
    marginBottom: 12,
    shadowColor: '#6F4E37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardName: { fontSize: 16, fontWeight: '700', color: '#2C1810', flex: 1 },
  dateBadge: { alignItems: 'flex-end' },
  dateBadgeText: { fontSize: 12, fontWeight: '600', color: '#6F4E37' },
  timeText: { fontSize: 11, color: '#8B7355' },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  cardAddress: { fontSize: 13, color: '#8B7355', flex: 1 },
  ratingRow: { flexDirection: 'row', gap: 2, marginBottom: 6 },
  noteContainer: {
    backgroundColor: '#F0E8DD',
    borderRadius: 12,
    padding: 10,
    marginTop: 4,
  },
  noteText: { fontSize: 13, color: '#6F4E37', lineHeight: 18 },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 17, fontWeight: '600', color: '#2C1810' },
  emptySubtext: { fontSize: 14, color: '#8B7355', marginTop: 4 },
});
