import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { Screen } from '@/components/Screen';
import { useUser } from '@/contexts/UserContext';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { API_BASE_URL } from '@/utils/api';

interface UserStats {
  wishlist_count: number;
  checkin_count: number;
}

export default function ProfileScreen() {
  const { user, updateUser } = useUser();
  const router = useSafeRouter();
  const [stats, setStats] = useState<UserStats>({ wishlist_count: 0, checkin_count: 0 });
  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState(user?.nickname || '');

  useFocusEffect(
    useCallback(() => {
      if (!user) return;
      /**
       * 服务端文件：server/src/index.ts
       * 接口：GET /api/v1/users/stats/:userId
       * Path 参数：userId: string
       */
      fetch(`${API_BASE_URL}/users/stats/${user.id}`)
        .then(res => res.json())
        .then(data => setStats(data))
        .catch(err => console.error('Failed to fetch stats:', err));
    }, [user])
  );

  const handleSaveNickname = async () => {
    if (!nickname.trim()) {
      Alert.alert('提示', '昵称不能为空');
      return;
    }
    await updateUser({ nickname: nickname.trim() });
    setEditing(false);
  };

  const handleTravelPlan = () => {
    if (stats.wishlist_count === 0) {
      Alert.alert('提示', '还没有想去的咖啡店，先去探索添加吧！');
      return;
    }
    router.push('/detail', { travel_plan: 'true' });
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user?.nickname || '咖')[0]}
              </Text>
            </View>
          </View>

          {editing ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.nicknameInput}
                value={nickname}
                onChangeText={setNickname}
                placeholder="输入昵称"
                placeholderTextColor="#C4B8A8"
                autoFocus
                onSubmitEditing={handleSaveNickname}
              />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveNickname}>
                <Feather name="check" size={18} color="#6F4E37" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditing(false); setNickname(user?.nickname || ''); }}>
                <Feather name="x" size={18} color="#8B7355" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditing(true)} style={styles.nameRow}>
              <Text style={styles.nickname}>{user?.nickname || '咖啡爱好者'}</Text>
              <Feather name="edit-2" size={14} color="#8B7355" />
            </TouchableOpacity>
          )}
          <Text style={styles.memberSince}>
            加入于 {user?.created_at ? new Date(user.created_at).toLocaleDateString('zh-CN') : ''}
          </Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsRow}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.navigate('/')}
          >
            <View style={styles.statIconContainer}>
              <Feather name="compass" size={22} color="#6F4E37" />
            </View>
            <Text style={styles.statNumber}>{stats.wishlist_count}</Text>
            <Text style={styles.statLabel}>想去</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => router.navigate('/')}
          >
            <View style={[styles.statIconContainer, { backgroundColor: 'rgba(91,140,90,0.1)' }]}>
              <Feather name="check-circle" size={22} color="#5B8C5A" />
            </View>
            <Text style={styles.statNumber}>{stats.checkin_count}</Text>
            <Text style={styles.statLabel}>已打卡</Text>
          </TouchableOpacity>
        </View>

        {/* Travel Plan Button */}
        <TouchableOpacity style={styles.travelBtn} onPress={handleTravelPlan}>
          <View style={styles.travelBtnContent}>
            <Feather name="map" size={20} color="#FFFFFF" />
            <View style={styles.travelBtnText}>
              <Text style={styles.travelBtnTitle}>旅行规划</Text>
              <Text style={styles.travelBtnSubtitle}>根据你想去的咖啡店规划路线</Text>
            </View>
            <Feather name="chevron-right" size={18} color="rgba(255,255,255,0.7)" />
          </View>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.actionsTitle}>快捷操作</Text>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => router.navigate('/')}
          >
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(111,78,55,0.08)' }]}>
              <Feather name="search" size={18} color="#6F4E37" />
            </View>
            <Text style={styles.actionText}>探索附近</Text>
            <Feather name="chevron-right" size={16} color="#C4B8A8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => router.navigate('/')}
          >
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(212,165,116,0.12)' }]}>
              <Feather name="heart" size={18} color="#D4A574" />
            </View>
            <Text style={styles.actionText}>想去清单</Text>
            <Feather name="chevron-right" size={16} color="#C4B8A8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => router.navigate('/')}
          >
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(91,140,90,0.08)' }]}>
              <Feather name="map-pin" size={18} color="#5B8C5A" />
            </View>
            <Text style={styles.actionText}>打卡记录</Text>
            <Feather name="chevron-right" size={16} color="#C4B8A8" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 100,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 30 : 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  avatarContainer: { marginBottom: 16 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0E8DD',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#6F4E37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#6F4E37' },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nicknameInput: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C1810',
    borderBottomWidth: 2,
    borderBottomColor: '#D4A574',
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 120,
    textAlign: 'center',
  },
  saveBtn: { padding: 6 },
  cancelBtn: { padding: 6 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nickname: { fontSize: 22, fontWeight: '700', color: '#2C1810' },
  memberSince: { fontSize: 13, color: '#8B7355', marginTop: 6 },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#6F4E37',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(111,78,55,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statNumber: { fontSize: 28, fontWeight: '700', color: '#2C1810' },
  statLabel: { fontSize: 13, color: '#8B7355', marginTop: 2 },
  travelBtn: {
    marginHorizontal: 20,
    marginBottom: 24,
    backgroundColor: '#6F4E37',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#6F4E37',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  travelBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  travelBtnText: { flex: 1 },
  travelBtnTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  travelBtnSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  actionsContainer: {
    paddingHorizontal: 20,
  },
  actionsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2C1810',
    marginBottom: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    gap: 12,
    shadowColor: '#6F4E37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#2C1810' },
});
