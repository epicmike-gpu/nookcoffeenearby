import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { API_BASE_URL } from '@/utils/api';
import { formatDistance } from '@/utils';
import MapPicker, { MapTarget } from '@/components/MapPicker';

const HISTORY_STORAGE_KEY = '@discover_search_history';
const MAX_HISTORY_ITEMS = 10;

// Module-level cache: fetch user location at most once per app session
let cachedUserLocation: { latitude: number; longitude: number } | null = null;

async function getUserLocation(): Promise<{ latitude: number; longitude: number } | null> {
  if (cachedUserLocation) return cachedUserLocation;
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    cachedUserLocation = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    return cachedUserLocation;
  } catch {
    return null;
  }
}

interface Shop {
  poi_id: string;
  name: string;
  address: string;
  phone: string;
  rating: number;
  latitude: number;
  longitude: number;
  distance: string | number;
  type: string;
  photos: { title: string; url: string }[];
  cost?: number | null;
}

function DiscoverCard({ shop }: { shop: Shop }) {
  const router = useSafeRouter();
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const imageUrl = shop.photos?.[0]?.url || '';

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
      distance: String(shop.distance),
      photos: JSON.stringify(shop.photos || []),
      cost: shop.cost != null ? shop.cost.toString() : '',
      source: 'discover',
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
        {shop.type ? (
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{shop.type}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardNameRow}>
          <Text style={styles.cardName} numberOfLines={1}>{shop.name}</Text>
          {shop.distance !== '' && shop.distance != null ? (
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>{formatDistance(shop.distance)}</Text>
            </View>
          ) : null}
        </View>
        <TouchableOpacity style={styles.cardRow} onPress={() => setMapPickerVisible(true)} activeOpacity={0.6}>
          <Feather name="map-pin" size={12} color="#6B7280" />
          <Text style={styles.cardAddress} numberOfLines={2}>{shop.address || 'No address'}</Text>
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

export default function DiscoverScreen() {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<string[]>([]);

  // Load persisted search history on mount
  useEffect(() => {
    const load = async () => {
      try {
        const raw = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setHistory(parsed.filter((h) => typeof h === 'string'));
        }
      } catch {
        // Keep empty history on read failure
      }
    };
    load();
  }, []);

  const runSearch = useCallback(async (q: string) => {
    if (!q) return;
    setLoading(true);
    setError('');
    try {
      // Fetch user location once (may be null if permission denied) so results
      // can be sorted by distance and show a distance badge
      const loc = await getUserLocation();
      const locQuery = loc ? `&latitude=${loc.latitude}&longitude=${loc.longitude}` : '';
      /**
       * 服务端文件：server/src/index.ts
       * 接口：GET /api/v1/shops/search
       * Query 参数：keyword: string（店铺名，如 "Fuglen Tokyo"）
       *             latitude?: number, longitude?: number（用户当前位置，用于距离排序，可省略）
       */
      const res = await fetch(
        `${API_BASE_URL}/shops/search?keyword=${encodeURIComponent(q)}${locQuery}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error('Search failed');
      setResults(Array.isArray(data) ? data : []);
      setSearched(true);
    } catch {
      setError('Failed to search. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const persistHistory = useCallback(async (q: string) => {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
      const prev: string[] = raw ? JSON.parse(raw) : [];
      const next = [q, ...prev.filter((h) => h !== q)].slice(0, MAX_HISTORY_ITEMS);
      await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
      setHistory(next);
    } catch {
      // History persistence is best-effort
    }
  }, []);

  const handleSearch = useCallback(() => {
    const q = keyword.trim();
    if (!q) return;
    persistHistory(q);
    runSearch(q);
  }, [keyword, persistHistory, runSearch]);

  const handleHistoryPress = useCallback((q: string) => {
    setKeyword(q);
    runSearch(q);
  }, [runSearch]);

  const removeHistoryItem = useCallback(async (q: string) => {
    try {
      const next = history.filter((h) => h !== q);
      await AsyncStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(next));
      setHistory(next);
    } catch {
      // Ignore removal failure
    }
  }, [history]);

  const clearHistory = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
      setHistory([]);
    } catch {
      // Ignore clear failure
    }
  }, []);

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Discover</Text>
          <Text style={styles.headerSubtitle}>
            Search coffee shops & brunch spots worldwide
          </Text>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <Feather name="search" size={16} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="e.g. Fuglen Tokyo, Blue Bottle Kyoto"
              placeholderTextColor="#9CA3AF"
              value={keyword}
              onChangeText={setKeyword}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
              autoCorrect={false}
            />
            {keyword.length > 0 ? (
              <TouchableOpacity
                onPress={() => {
                  // Reset to initial state: show history again, drop stale results
                  setKeyword('');
                  setResults([]);
                  setSearched(false);
                  setError('');
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x-circle" size={16} color="#D1D5DB" />
              </TouchableOpacity>
            ) : null}
          </View>
          <TouchableOpacity
            style={[styles.searchBtn, loading && styles.searchBtnDisabled]}
            onPress={handleSearch}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FAFAFA" />
            ) : (
              <Text style={styles.searchBtnText}>Go</Text>
            )}
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Search History (shown before any search) */}
        {!searched && history.length > 0 ? (
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Recent Searches</Text>
              <TouchableOpacity onPress={clearHistory} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.historyClear}>Clear</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.historyChips}>
              {history.map((item) => (
                <View key={item} style={styles.historyChip}>
                  <TouchableOpacity
                    style={styles.historyChipBtn}
                    onPress={() => handleHistoryPress(item)}
                    activeOpacity={0.7}
                  >
                    <Feather name="clock" size={12} color="#9CA3AF" />
                    <Text style={styles.historyChipText} numberOfLines={1}>{item}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.historyChipRemove}
                    onPress={() => removeHistoryItem(item)}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                  >
                    <Feather name="x" size={12} color="#D1D5DB" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <FlatList
          data={results}
          keyExtractor={(item) => item.poi_id}
          renderItem={({ item }) => <DiscoverCard shop={item} />}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            loading ? null : searched ? (
              <View style={styles.emptyState}>
                <Feather name="search" size={40} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No shops found</Text>
                <Text style={styles.emptySubtitle}>
                  Try a different name or add a city, e.g. “Fuglen Tokyo”
                </Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Feather name="globe" size={40} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>Search worldwide</Text>
                <Text style={styles.emptySubtitle}>
                  Find that special cafe you saw on your trip — from Tokyo to Paris,
                  add it to your Want to Go list
                </Text>
              </View>
            )
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111111',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111111',
    paddingVertical: 0,
  },
  searchBtn: {
    backgroundColor: '#111111',
    borderRadius: 12,
    width: 52,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnDisabled: {
    opacity: 0.6,
  },
  searchBtnText: {
    color: '#FAFAFA',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  historySection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  historyClear: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  historyChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  historyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 7,
  },
  historyChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: 180,
  },
  historyChipText: {
    fontSize: 13,
    color: '#111111',
  },
  historyChipRemove: {
    paddingLeft: 6,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 12,
    gap: 12,
    marginBottom: 12,
  },
  cardThumbWrap: {
    position: 'relative',
  },
  cardThumb: {
    width: 96,
    height: 96,
    borderRadius: 12,
  },
  cardThumbPlaceholder: {
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    backgroundColor: 'rgba(17, 17, 17, 0.85)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeText: {
    color: '#FAFAFA',
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  cardNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#111111',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardAddress: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 19,
  },
  distanceBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
  },
});
