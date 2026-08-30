import { ScrollView, View, Text } from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';

const SECTIONS: { title: string; body: string }[] = [
  {
    title: 'Overview',
    body: 'Coffee Explorer ("we", "our", or "the App") helps you discover nearby coffee shops and brunch spots, save favorites, and record check-ins. This policy explains what data the App collects and how it is used. By using the App, you agree to this policy.',
  },
  {
    title: 'Location Data',
    body: 'The App requests access to your precise location only while you are actively using the App (foreground use). Your location is used to find nearby coffee shops, calculate distances, and center the map. Your location is never stored on our servers and is never shared with other users.',
  },
  {
    title: 'Device Identifier',
    body: 'On first launch, the App generates a random anonymous device identifier stored locally on your device. It is used only to associate your saved wish-list items and check-ins with your device so the App can load your personal lists. It does not contain your name, email, or any personal identity.',
  },
  {
    title: 'Photos and Check-ins',
    body: 'Photos you attach to a check-in, along with the rating and comment you write, are stored in our cloud database so you can review them later. We do not use your photos for any other purpose.',
  },
  {
    title: 'Third-Party Services',
    body: 'The App relies on third-party map and search services (Amap and OpenStreetMap-based Photon) to provide shop information. Requests to these services are made from our server and are not linked to your identity. Our server infrastructure is hosted on Vercel, and our database is provided by Supabase.',
  },
  {
    title: 'Data Sharing',
    body: 'We do not sell, rent, or trade your data. We do not use your data for advertising or third-party tracking.',
  },
  {
    title: 'Data Deletion',
    body: 'You can remove individual items from your wish-list or check-in history inside the App at any time. To delete all data associated with your device, contact us at support@nookcoffeenearbyserver.top and we will erase it within 30 days.',
  },
  {
    title: 'Contact',
    body: 'If you have questions about this policy, contact us at support@nookcoffeenearbyserver.top.',
  },
];

export default function PrivacyScreen() {
  const router = useSafeRouter();

  return (
    <Screen>
      <View style={styles.header}>
        <Ionicons
          name="shield-checkmark-outline"
          size={22}
          color="#111111"
          style={styles.headerIcon}
          onPress={() => router.back()}
        />
        <Text style={styles.headerTitle}>Privacy Policy</Text>
      </View>
      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>Last updated: February 2026</Text>
        {SECTIONS.map((s) => (
          <View key={s.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{s.title}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}
        <View style={styles.footerSpace} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  headerIcon: {},
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111111',
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
  },
  updated: {
    marginTop: 16,
    fontSize: 12,
    color: '#9CA3AF',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 6,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 22,
    color: '#374151',
  },
  footerSpace: {
    height: 40,
  },
});
