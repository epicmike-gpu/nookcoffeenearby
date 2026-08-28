import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Image,
  Alert,
  Dimensions,
  Linking,
} from 'react-native';
import { Screen } from '@/components/Screen';
import MapPicker, { MapTarget } from '@/components/MapPicker';
import { useUser } from '@/contexts/UserContext';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { useFocusEffect } from 'expo-router';
import { API_BASE_URL } from '@/utils/api';
import { formatDistance } from '@/utils';
import { Feather, Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DetailScreen() {
  const router = useSafeRouter();
  const params = useSafeSearchParams<{
    poi_id: string;
    name: string;
    address: string;
    phone: string;
    rating: string;
    cost: string;
    latitude: string;
    longitude: string;
    distance: string;
    photos: string;
    page?: string;
    source?: string;
  }>();
  const { user } = useUser();

  const [checkinRating, setCheckinRating] = useState(5);
  const [checkinNote, setCheckinNote] = useState('');
  const [showCheckinForm, setShowCheckinForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);

  const photos: { title: string; url: string }[] = params.photos ? JSON.parse(params.photos) : [];
  const rating = parseFloat(params.rating || '0');
  const cost = params.cost ? parseInt(params.cost, 10) : null;
  // Global search results (Discover tab) only support Want to Go — no check-in
  const isDiscover = params.source === 'discover';

  const mapTarget: MapTarget = {
    name: params.name,
    latitude: parseFloat(params.latitude || '0'),
    longitude: parseFloat(params.longitude || '0'),
  };

  const handleCall = () => {
    if (!params.phone) return;
    Linking.openURL(`tel:${params.phone}`).catch(() => {
      Alert.alert('Error', 'Unable to make a call');
    });
  };

  // Check wishlist status every time the page gains focus,
  // so the button re-enables after the item is removed from the wishlist tab
  useFocusEffect(
    useCallback(() => {
      const checkWishlist = async () => {
        if (!user || !params.poi_id) return;
        try {
          /**
           * 服务端文件：server/src/index.ts
           * 接口：GET /api/v1/wishlists/check
           * Query 参数：userId: string, poiId: string
           */
          const res = await fetch(
            `${API_BASE_URL}/wishlists/check?userId=${user.id}&poiId=${encodeURIComponent(params.poi_id)}`
          );
          if (res.ok) {
            const data = await res.json();
            setInWishlist(!!data.inWishlist);
          }
        } catch {
          // Silently ignore — keep previous state
        }
      };
      checkWishlist();
    }, [user, params.poi_id])
  );

  /**
   * 服务端文件：server/src/index.ts
   * 接口：POST /api/v1/wishlists
   * Body 参数：user_id: string, shop_name: string, shop_address: string,
   *            shop_phone: string, shop_rating: number, shop_latitude: number,
   *            shop_longitude: number, shop_poi_id: string, shop_photos: object[]
   * 409：已在想去列表中
   */
  const handleWishlist = async () => {
    if (!user) return;
    if (inWishlist) {
      Alert.alert('Already Saved', 'This spot is already in your wishlist.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/wishlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          shop_name: params.name,
          shop_address: params.address,
          shop_phone: params.phone,
          shop_rating: rating,
          shop_latitude: parseFloat(params.latitude),
          shop_longitude: parseFloat(params.longitude),
          shop_poi_id: params.poi_id,
          shop_photos: photos,
        }),
      });
      if (res.status === 409) {
        setInWishlist(true);
        Alert.alert('Already Saved', 'This spot is already in your wishlist.');
      } else if (res.ok) {
        setInWishlist(true);
        Alert.alert('Success', 'Added to your wishlist!');
      } else {
        Alert.alert('Error', 'Failed to add to wishlist');
      }
    } catch {
      Alert.alert('Error', 'Network error');
    }
  };

  const handleCheckin = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/checkins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          shop_name: params.name,
          shop_address: params.address,
          shop_phone: params.phone,
          shop_rating: checkinRating,
          shop_latitude: parseFloat(params.latitude),
          shop_longitude: parseFloat(params.longitude),
          shop_poi_id: params.poi_id,
          shop_photos: photos,
          note: checkinNote,
        }),
      });
      if (res.ok) {
        Alert.alert('Checked In!', `You've checked in at ${params.name}`);
        setShowCheckinForm(false);
        setCheckinNote('');
        setCheckinRating(5);
      } else {
        Alert.alert('Error', 'Failed to check in');
      }
    } catch {
      Alert.alert('Error', 'Network error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Back Button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color="#111111" />
        </TouchableOpacity>

        {/* Image Gallery */}
        {photos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
            {photos.map((photo, index) => (
              <Image
                key={index}
                source={{ uri: photo.url }}
                style={styles.galleryImage}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.noImage}>
            <Feather name="coffee" size={64} color="#D1D5DB" />
          </View>
        )}

        {/* Shop Info */}
        <View style={styles.infoCard}>
          <Text style={styles.shopName}>{params.name}</Text>

          {rating > 0 || cost != null ? (
            <View style={styles.ratingRow}>
              <View style={styles.stars}>
                {[...Array(5)].map((_, i) => (
                  <Ionicons
                    key={i}
                    name="star"
                    size={16}
                    color={i < Math.floor(rating) ? '#D4B464' : '#E5E7EB'}
                  />
                ))}
              </View>
              <Text style={styles.ratingNum}>{rating > 0 ? rating.toFixed(1) : 'N/A'}</Text>
              {cost != null ? (
                <View style={styles.costBadge}>
                  <Feather name="dollar-sign" size={11} color="#111111" />
                  <Text style={styles.costText}>{cost}/person</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          <TouchableOpacity style={styles.infoRow} onPress={() => setMapPickerVisible(true)} activeOpacity={0.6}>
            <Feather name="map-pin" size={16} color="#6B7280" />
            <Text style={styles.infoText}>{params.address}</Text>
            <Feather name="navigation" size={14} color="#111111" />
          </TouchableOpacity>

          {params.phone ? (
            <TouchableOpacity style={styles.infoRow} onPress={handleCall} activeOpacity={0.6}>
              <Feather name="phone" size={16} color="#6B7280" />
              <Text style={styles.infoText}>{params.phone}</Text>
              <Feather name="phone-call" size={14} color="#111111" />
            </TouchableOpacity>
          ) : null}

          {params.distance ? (
            <View style={styles.infoRow}>
              <Feather name="navigation" size={16} color="#6B7280" />
              <Text style={styles.infoText}>{params.distance ? `${formatDistance(params.distance)} away` : ''}</Text>
            </View>
          ) : null}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.wishlistBtn, inWishlist && styles.wishlistBtnSaved]}
            onPress={handleWishlist}
            activeOpacity={inWishlist ? 1 : 0.7}
          >
            <Ionicons
              name={inWishlist ? 'heart' : 'heart-outline'}
              size={20}
              color={inWishlist ? '#9CA3AF' : '#111111'}
            />
            <Text style={[styles.wishlistText, inWishlist && styles.wishlistTextSaved]}>
              {inWishlist ? 'Saved' : 'Want to Go'}
            </Text>
          </TouchableOpacity>

          {!isDiscover ? (
            <TouchableOpacity
              style={styles.checkinBtn}
              onPress={() => setShowCheckinForm(!showCheckinForm)}
            >
              <Feather name="check-circle" size={20} color="#FFFFFF" />
              <Text style={styles.checkinText}>Check In</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Check-in Form */}
        {showCheckinForm && !isDiscover && (
          <View style={styles.checkinForm}>
            <Text style={styles.formTitle}>Rate Your Experience</Text>

            <View style={styles.ratingSelector}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setCheckinRating(star)}>
                  <Ionicons
                    name="star"
                    size={28}
                    color={star <= checkinRating ? '#D4B464' : '#E5E7EB'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.noteInput}
              placeholder="Leave a review..."
              placeholderTextColor="#D1D5DB"
              value={checkinNote}
              onChangeText={setCheckinNote}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
              onPress={handleCheckin}
              disabled={submitting}
            >
              <Text style={styles.submitText}>
                {submitting ? 'Submitting...' : 'Submit Check-in'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <MapPicker
        visible={mapPickerVisible}
        target={mapTarget}
        onClose={() => setMapPickerVisible(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,253,240,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gallery: {
    maxHeight: 220,
  },
  galleryImage: {
    width: SCREEN_WIDTH - 32,
    height: 200,
    marginHorizontal: 4,
    borderRadius: 12,
  },
  noImage: {
    height: 200,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  costBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  costText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111111',
  },
  shopName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingNum: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D4B464',
    marginLeft: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  wishlistBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 14,
  },
  wishlistBtnSaved: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  wishlistText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111111',
  },
  wishlistTextSaved: {
    color: '#9CA3AF',
  },
  checkinBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#111111',
    paddingVertical: 14,
    borderRadius: 14,
  },
  checkinText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  checkinForm: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 14,
  },
  ratingSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  noteInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#111111',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  submitBtn: {
    backgroundColor: '#111111',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
