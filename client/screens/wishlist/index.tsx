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
  note: string | null;
  created_at: string;
}

function WishlistCard({ item, onRemove }: { item: WishlistItem; onRemove: (id: string) => void }) {
  const router = useSafeRouter();

  const handlePress = () => {
    router.push('/detail', {
      poi_id: item.shop_poi_id || '',
      name: item.shop_name,
      address: item.shop_address,
      phone: item.shop_phone || '',
      rating: (item.shop_rating || 0).toString(),
      latitude: item.shop_latitude.toString(),
      longitude: item.shop_longitude.toString(),
      distance: '',
      image: '',
      wishlist_id: item.id,
    });
  };

  const handleRemove = () => {
    Alert.alert('取消想去', `确定要将「${item.shop_name}」从想去列表中移除吗？`, [
      { text: '取消', style: 'cancel' },
      { text: '移除', style: 'destructive', onPress: () => onRemove(item.id) },
    ]);
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.8}>
      <View style={styles.cardLeft}>
        <View style={styles.iconContainer}>
          <Feather name="heart" size={20} color="#6F4E37" />
        </View>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardName} numberOfLines={1}>{item.shop_name}</Text>
        <View style={styles.cardRow}>
          <Feather name="map-pin" size={12} color="#8B7355" />
          <Text style={styles.cardAddress} numberOfLines={1}>{item.shop_address}</Text>
        </View>
        {item.note ? (
          <View style={styles.noteRow}>
            <Feather name="edit-3" size={11} color="#B8764E" />
            <Text style={styles.noteText} numberOfLines={1}>{item.note}</Text>
          </View>
        ) : null}
        <Text style={styles.dateText}>
          {new Date(item.created_at).toLocaleDateString('zh-CN')}
        </Text>
      </View>
      <TouchableOpacity style={styles.removeBtn} onPress={handleRemove} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Feather name="x" size={18} color="#C4B8A8" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function WishlistScreen() {
  const { user } = useUser();
  const [wishlists, setWishlists] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWishlists = useCallback(async () => {
    if (!user) return;
    try {
      /**
       * 服务端文件：server/src/index.ts
       * 接口：GET /api/v1/wishlists/:userId
       * Path 参数：userId: string
       */
      const response = await fetch(`${API_BASE_URL}/wishlists/${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch wishlists');
      const data = await response.json();
      setWishlists(data);
    } catch (error) {
      console.error('Failed to fetch wishlists:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchWishlists();
    }, [fetchWishlists])
  );

  const handleRemove = async (id: string) => {
    try {
      /**
       * 服务端文件：server/src/index.ts
       * 接口：DELETE /api/v1/wishlists/:id
       * Path 参数：id: string
       */
      const response = await fetch(`${API_BASE_URL}/wishlists/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to remove');
      setWishlists(prev => prev.filter(w => w.id !== id));
    } catch (error) {
      console.error('Failed to remove wishlist:', error);
    }
  };

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
        <Text style={styles.title}>想去清单</Text>
        <Text style={styles.subtitle}>{wishlists.length} 家咖啡店等待探索</Text>
      </View>
      <FlatList
        data={wishlists}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <WishlistCard item={item} onRemove={handleRemove} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="heart" size={48} color="#C4B8A8" />
            <Text style={styles.emptyText}>还没有想去的咖啡店</Text>
            <Text style={styles.emptySubtext}>去探索页面发现身边的好咖啡吧</Text>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#6F4E37',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    alignItems: 'center',
  },
  cardLeft: { marginRight: 14 },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(111,78,55,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#2C1810', marginBottom: 4 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  cardAddress: { fontSize: 13, color: '#8B7355', flex: 1 },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  noteText: { fontSize: 12, color: '#B8764E', flex: 1 },
  dateText: { fontSize: 11, color: '#C4B8A8' },
  removeBtn: { padding: 6 },
  emptyContainer: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 17, fontWeight: '600', color: '#2C1810' },
  emptySubtext: { fontSize: 14, color: '#8B7355', marginTop: 4 },
});
