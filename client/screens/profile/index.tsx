import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useUser } from '@/contexts/UserContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { API_BASE_URL } from '@/utils/api';
import { Feather } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { user, refreshUser } = useUser();
  const router = useSafeRouter();
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState('');
  const [stats, setStats] = useState({ wishlist_count: 0, checkin_count: 0 });

  const fetchStats = async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE_URL}/users/stats/${user.id}`);
      const data = await res.json();
      setStats(data);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    if (user) {
      setNickname(user.nickname);
      fetchStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSave = async () => {
    if (!user || !nickname.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: user.device_id, nickname: nickname.trim() }),
      });
      if (res.ok) {
        await refreshUser();
        setEditing(false);
        Alert.alert('Success', 'Profile updated');
      }
    } catch {
      Alert.alert('Error', 'Failed to update');
    }
  };

  if (!user) return null;

  return (
    <Screen>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Feather name="user" size={32} color="#FFFFFF" />
          </View>
          <Text style={styles.deviceId}>ID: {user.device_id.slice(0, 8)}...</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Profile</Text>
            <TouchableOpacity onPress={() => setEditing(!editing)}>
              <Feather name={editing ? 'x' : 'edit-2'} size={18} color="#111111" />
            </TouchableOpacity>
          </View>

          {editing ? (
            <View>
              <TextInput
                style={styles.input}
                value={nickname}
                onChangeText={setNickname}
                placeholder="Enter your nickname"
                placeholderTextColor="#D1D5DB"
              />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.nickname}>{user.nickname}</Text>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Feather name="heart" size={24} color="#D4B464" />
            <Text style={styles.statNum}>{stats.wishlist_count}</Text>
            <Text style={styles.statLabel}>Want to Go</Text>
          </View>
          <View style={styles.statCard}>
            <Feather name="check-circle" size={24} color="#111111" />
            <Text style={styles.statNum}>{stats.checkin_count}</Text>
            <Text style={styles.statLabel}>Check-ins</Text>
          </View>
        </View>

        {/* Travel Plan */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/detail', { page: 'travel' } as any)}
        >
          <View style={styles.menuIcon}>
            <Feather name="map" size={20} color="#111111" />
          </View>
          <Text style={styles.menuText}>Travel Plan</Text>
          <Feather name="chevron-right" size={20} color="#D1D5DB" />
        </TouchableOpacity>

        {/* About */}
        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>Coffee Explorer</Text>
          <Text style={styles.aboutText}>
            Discover amazing coffee shops around you. Save your favorites, check in when you visit, and plan your coffee adventures.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 40 },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#111111',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  deviceId: {
    fontSize: 12,
    color: '#D1D5DB',
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
  },
  nickname: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111111',
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#111111',
    marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: '#111111',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statNum: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111111',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#111111',
  },
  aboutCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#111111',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  aboutTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    marginBottom: 8,
  },
  aboutText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
  },
});
