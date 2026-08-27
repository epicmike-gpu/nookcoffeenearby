import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useUser } from '@/contexts/UserContext';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { API_BASE_URL } from '@/utils/api';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

interface TravelShop {
  id: string;
  shop_name: string;
  shop_address: string;
  shop_phone: string;
  shop_rating: number;
  shop_latitude: number;
  shop_longitude: number;
  distance: number;
}

interface TravelPlan {
  shops: TravelShop[];
  total_distance: string;
  message: string;
}

export default function DetailScreen() {
  const { user } = useUser();
  const router = useSafeRouter();
  const params = useSafeSearchParams<{
    poi_id: string;
    name: string;
    address: string;
    phone: string;
    rating: string;
    latitude: string;
    longitude: string;
    distance: string;
    image: string;
    wishlist_id: string;
    travel_plan: string;
  }>();

  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [showCheckinForm, setShowCheckinForm] = useState(false);
  const [checkinNote, setCheckinNote] = useState('');
  const [checkinRating, setCheckinRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [travelPlan, setTravelPlan] = useState<TravelPlan | null>(null);
  const [travelLoading, setTravelLoading] = useState(false);

  const isTravelPlan = params.travel_plan === 'true';

  // Check if shop is already in wishlist
  useFocusEffect(
    useCallback(() => {
      if (!user || isTravelPlan) return;
      const checkWishlist = async () => {
        try {
          /**
           * 服务端文件：server/src/index.ts
           * 接口：GET /api/v1/wishlists/:userId
           * Path 参数：userId: string
           */
          const response = await fetch(`${API_BASE_URL}/wishlists/${user.id}`);
          if (!response.ok) return;
          const data = await response.json();
          const found = data.some((w: { shop_poi_id: string }) => w.shop_poi_id === params.poi_id);
          setIsWishlisted(found);
        } catch {
          // silent
        }
      };
      checkWishlist();
    }, [user, params.poi_id, isTravelPlan])
  );

  // Fetch travel plan
  useFocusEffect(
    useCallback(() => {
      if (!user || !isTravelPlan) return;
      const fetchPlan = async () => {
        setTravelLoading(true);
        try {
          /**
           * 服务端文件：server/src/index.ts
           * 接口：GET /api/v1/travel-plan
           * Query 参数：userId: string, latitude?: string, longitude?: string
           */
          const response = await fetch(`${API_BASE_URL}/travel-plan?userId=${user.id}`);
          if (!response.ok) throw new Error('Failed');
          const data = await response.json();
          setTravelPlan(data);
        } catch (error) {
          console.error('Failed to fetch travel plan:', error);
        } finally {
          setTravelLoading(false);
        }
      };
      fetchPlan();
    }, [user, isTravelPlan])
  );

  const handleToggleWishlist = async () => {
    if (!user) return;

    if (isWishlisted) {
      // Remove from wishlist
      try {
        /**
         * 服务端文件：server/src/index.ts
         * 接口：DELETE /api/v1/wishlists/:id
         * Path 参数：id: string
         */
        if (params.wishlist_id) {
          await fetch(`${API_BASE_URL}/wishlists/${params.wishlist_id}`, { method: 'DELETE' });
        } else {
          // Find and remove by poi_id
          const res = await fetch(`${API_BASE_URL}/wishlists/${user.id}`);
          const data = await res.json();
          const item = data.find((w: { shop_poi_id: string }) => w.shop_poi_id === params.poi_id);
          if (item) {
            await fetch(`${API_BASE_URL}/wishlists/${item.id}`, { method: 'DELETE' });
          }
        }
        setIsWishlisted(false);
        Alert.alert('已移除', '已从想去清单中移除');
      } catch {
        Alert.alert('错误', '操作失败，请重试');
      }
    } else {
      // Add to wishlist
      try {
        /**
         * 服务端文件：server/src/index.ts
         * 接口：POST /api/v1/wishlists
         * Body 参数：user_id: string, shop_name: string, shop_address: string, shop_phone: string, shop_rating: number, shop_latitude: number, shop_longitude: number, shop_poi_id: string, note?: string
         */
        const response = await fetch(`${API_BASE_URL}/wishlists`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            shop_name: params.name,
            shop_address: params.address,
            shop_phone: params.phone,
            shop_rating: parseFloat(params.rating) || 0,
            shop_latitude: parseFloat(params.latitude),
            shop_longitude: parseFloat(params.longitude),
            shop_poi_id: params.poi_id,
          }),
        });
        if (!response.ok) throw new Error('Failed');
        setIsWishlisted(true);
        Alert.alert('已添加', '已加入想去清单');
      } catch {
        Alert.alert('错误', '操作失败，请重试');
      }
    }
  };

  const handleCheckin = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      /**
       * 服务端文件：server/src/index.ts
       * 接口：POST /api/v1/checkins
       * Body 参数：user_id: string, shop_name: string, shop_address: string, shop_phone: string, shop_rating: number, shop_latitude: number, shop_longitude: number, shop_poi_id: string, note?: string, photo_url?: string
       */
      const response = await fetch(`${API_BASE_URL}/checkins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          shop_name: params.name,
          shop_address: params.address,
          shop_phone: params.phone,
          shop_rating: checkinRating || parseFloat(params.rating) || 0,
          shop_latitude: parseFloat(params.latitude),
          shop_longitude: parseFloat(params.longitude),
          shop_poi_id: params.poi_id,
          note: checkinNote || null,
        }),
      });
      if (!response.ok) throw new Error('Failed');
      setIsCheckedIn(true);
      setShowCheckinForm(false);
      setCheckinNote('');
      setCheckinRating(0);
      Alert.alert('打卡成功', '恭喜你完成了这家咖啡店的打卡！');
    } catch {
      Alert.alert('错误', '打卡失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // Travel Plan View
  if (isTravelPlan) {
    return (
      <Screen>
        <View style={styles.travelHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color="#2C1810" />
          </TouchableOpacity>
          <Text style={styles.travelTitle}>旅行规划</Text>
          <View style={{ width: 36 }} />
        </View>

        {travelLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#6F4E37" />
            <Text style={styles.loadingText}>正在规划路线...</Text>
          </View>
        ) : travelPlan && travelPlan.shops.length > 0 ? (
          <ScrollView contentContainerStyle={styles.travelContent}>
            <View style={styles.travelSummary}>
              <Feather name="map" size={20} color="#6F4E37" />
              <Text style={styles.travelMessage}>{travelPlan.message}</Text>
              <Text style={styles.travelDistance}>总路线约 {travelPlan.total_distance} km</Text>
            </View>

            {travelPlan.shops.map((shop, index) => (
              <View key={shop.id} style={styles.travelItem}>
                <View style={styles.travelIndex}>
                  <Text style={styles.travelIndexText}>{index + 1}</Text>
                </View>
                <View style={styles.travelItemContent}>
                  <Text style={styles.travelShopName}>{shop.shop_name}</Text>
                  <View style={styles.travelShopRow}>
                    <Feather name="map-pin" size={12} color="#8B7355" />
                    <Text style={styles.travelShopAddress}>{shop.shop_address}</Text>
                  </View>
                  {shop.shop_rating > 0 && (
                    <View style={styles.travelRatingRow}>
                      <Feather name="star" size={12} color="#D4A574" />
                      <Text style={styles.travelRating}>{shop.shop_rating.toFixed(1)}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyEmoji}>
              <Feather name="map" size={48} color="#C4B8A8" />
            </Text>
            <Text style={styles.emptyText}>{travelPlan?.message || '暂无规划'}</Text>
          </View>
        )}
      </Screen>
    );
  }

  // Shop Detail View
  const rating = parseFloat(params.rating) || 0;

  return (
    <Screen safeAreaEdges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.detailContent}>
        {/* Header Image */}
        <View style={styles.heroImage}>
          <View style={styles.heroPlaceholder}>
            <Feather name="coffee" size={72} color="#C4B8A8" />
          </View>
          <TouchableOpacity
            style={styles.backBtnOverlay}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={22} color="#2C1810" />
          </TouchableOpacity>
        </View>

        {/* Shop Info */}
        <View style={styles.infoSection}>
          <Text style={styles.shopName}>{params.name}</Text>

          {rating > 0 && (
            <View style={styles.ratingSection}>
              {[...Array(5)].map((_, i) => (
                <Feather
                  key={i}
                  name="star"
                  size={16}
                  color={i < Math.round(rating) ? '#D4A574' : '#E0D5C8'}
                />
              ))}
              <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
            </View>
          )}

          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Feather name="map-pin" size={16} color="#6F4E37" />
            </View>
            <Text style={styles.detailText}>{params.address}</Text>
          </View>

          {params.phone ? (
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Feather name="phone" size={16} color="#6F4E37" />
              </View>
              <Text style={styles.detailText}>{params.phone}</Text>
            </View>
          ) : null}

          {params.distance ? (
            <View style={styles.detailRow}>
              <View style={styles.detailIconContainer}>
                <Feather name="navigation" size={16} color="#6F4E37" />
              </View>
              <Text style={styles.detailText}>距你 {params.distance}km</Text>
            </View>
          ) : null}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.actionBtn, isWishlisted && styles.actionBtnActive]}
            onPress={handleToggleWishlist}
          >
            <Feather
              name={isWishlisted ? 'heart' : 'heart'}
              size={20}
              color={isWishlisted ? '#FFFFFF' : '#6F4E37'}
            />
            <Text style={[styles.actionBtnText, isWishlisted && styles.actionBtnTextActive]}>
              {isWishlisted ? '已想去' : '想去'}
            </Text>
          </TouchableOpacity>

          {!isCheckedIn && (
            <TouchableOpacity
              style={styles.checkinBtn}
              onPress={() => setShowCheckinForm(true)}
            >
              <Feather name="check-circle" size={20} color="#FFFFFF" />
              <Text style={styles.checkinBtnText}>打卡</Text>
            </TouchableOpacity>
          )}

          {isCheckedIn && (
            <View style={styles.checkedInBadge}>
              <Feather name="check" size={20} color="#5B8C5A" />
              <Text style={styles.checkedInText}>已打卡</Text>
            </View>
          )}
        </View>

        {/* Check-in Form */}
        {showCheckinForm && (
          <View style={styles.checkinForm}>
            <Text style={styles.formTitle}>打卡记录</Text>

            <Text style={styles.formLabel}>评分</Text>
            <View style={styles.ratingPicker}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setCheckinRating(star)}>
                  <Feather
                    name="star"
                    size={28}
                    color={star <= checkinRating ? '#D4A574' : '#E0D5C8'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.formLabel}>备注</Text>
            <TextInput
              style={styles.noteInput}
              value={checkinNote}
              onChangeText={setCheckinNote}
              placeholder="记录一下这杯咖啡的味道..."
              placeholderTextColor="#C4B8A8"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.formCancelBtn}
                onPress={() => setShowCheckinForm(false)}
              >
                <Text style={styles.formCancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.formSubmitBtn}
                onPress={handleCheckin}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.formSubmitText}>确认打卡</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  detailContent: { paddingBottom: 40 },
  heroImage: {
    height: 240,
    backgroundColor: '#F0E8DD',
    position: 'relative',
  },
  heroPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroEmoji: { fontSize: 72 },
  backBtnOverlay: {
    position: 'absolute',
    top: Platform.OS === 'web' ? 16 : 50,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  shopName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C1810',
    marginBottom: 8,
  },
  ratingSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 16,
  },
  ratingValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6F4E37',
    marginLeft: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  detailIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(111,78,55,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#4A3728',
    flex: 1,
    paddingTop: 6,
    lineHeight: 20,
  },
  actionSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(111,78,55,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(111,78,55,0.15)',
  },
  actionBtnActive: {
    backgroundColor: '#6F4E37',
    borderColor: '#6F4E37',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6F4E37',
  },
  actionBtnTextActive: {
    color: '#FFFFFF',
  },
  checkinBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#6F4E37',
    shadowColor: '#6F4E37',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  checkinBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  checkedInBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(91,140,90,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(91,140,90,0.2)',
  },
  checkedInText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5B8C5A',
  },
  checkinForm: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#6F4E37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C1810',
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4A3728',
    marginBottom: 8,
  },
  ratingPicker: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  noteInput: {
    backgroundColor: '#F0E8DD',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: '#2C1810',
    minHeight: 80,
    marginBottom: 16,
    lineHeight: 20,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
  },
  formCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F0E8DD',
    alignItems: 'center',
  },
  formCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8B7355',
  },
  formSubmitBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#6F4E37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSubmitText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Travel Plan styles
  travelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'web' ? 20 : 60,
    paddingBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0E8DD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  travelTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C1810',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 15,
    color: '#8B7355',
    marginTop: 12,
  },
  travelContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  travelSummary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#6F4E37',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  travelMessage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C1810',
    marginTop: 8,
  },
  travelDistance: {
    fontSize: 13,
    color: '#8B7355',
    marginTop: 4,
  },
  travelItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  travelIndex: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6F4E37',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  travelIndexText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  travelItemContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginLeft: 10,
    shadowColor: '#6F4E37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  travelShopName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C1810',
    marginBottom: 6,
  },
  travelShopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  travelShopAddress: {
    fontSize: 13,
    color: '#8B7355',
    flex: 1,
  },
  travelRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  travelRating: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6F4E37',
  },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 15, color: '#8B7355' },
});
