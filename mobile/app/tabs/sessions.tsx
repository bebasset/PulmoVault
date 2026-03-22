import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { sessionMobileApi, requireBiometric } from '../../src/services/auth';

type Session = {
  id: string; patientName: string; datePerformed: string;
  timeIn: string; timeOut: string; modality: string;
  o2SatPost: number; signedAt: string; adverseReactions: boolean; therapistName: string;
};

export default function SessionsScreen() {
  const router = useRouter();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['mobile-sessions'],
    queryFn: () => sessionMobileApi.list({ limit: 50 }),
    select: (res) => res.data.data as Session[],
  });

  const sessions = data ?? [];

  async function handleNewSession() {
    const ok = await requireBiometric('Authenticate to record a new session');
    if (!ok) {
      Alert.alert('Authentication Required', 'Please verify your identity to continue.');
      return;
    }
    router.push('/sessions/new');
  }

  return (
    <View style={styles.container}>
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color="#0960d6" />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={false}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Ionicons name="clipboard-outline" size={44} color="#d1d5db" />
              <Text style={styles.emptyText}>No sessions recorded yet.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={handleNewSession}>
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={styles.emptyBtnText}>Record First Session</Text>
              </TouchableOpacity>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.sessionCard}
              onPress={() => router.push(`/sessions/${item.id}`)}
            >
              <View style={styles.sessionTop}>
                <Text style={styles.patientName}>{item.patientName}</Text>
                <View style={[styles.badge, {
                  backgroundColor: item.signedAt ? '#f0fdf4' : item.adverseReactions ? '#fef2f2' : '#fffbeb',
                }]}>
                  <Text style={[styles.badgeText, {
                    color: item.signedAt ? '#16a34a' : item.adverseReactions ? '#ef4444' : '#d97706',
                  }]}>
                    {item.signedAt ? 'Signed' : item.adverseReactions ? 'Adverse' : 'Unsigned'}
                  </Text>
                </View>
              </View>
              <View style={styles.sessionMeta}>
                <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
                <Text style={styles.metaText}>{format(new Date(item.datePerformed), 'MMM d, yyyy')}</Text>
                <Text style={styles.metaDot}>·</Text>
                <Ionicons name="time-outline" size={12} color="#9ca3af" />
                <Text style={styles.metaText}>{item.timeIn} – {item.timeOut}</Text>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.metaText}>{item.modality === 'SCHOOL' ? 'School' : 'Home'}</Text>
              </View>
              {item.o2SatPost && (
                <Text style={styles.o2Text}>O₂ Saturation Post: {item.o2SatPost}%</Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity style={styles.fab} onPress={handleNewSession}>
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  list: { padding: 16, gap: 10, paddingBottom: 80 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 13, color: '#9ca3af' },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#0960d6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  sessionCard: {
    backgroundColor: '#fff', padding: 16, borderRadius: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  sessionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  patientName: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  sessionMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  metaText: { fontSize: 11, color: '#6b7280' },
  metaDot: { fontSize: 11, color: '#d1d5db' },
  o2Text: { fontSize: 12, color: '#0d9488', fontWeight: '600', marginTop: 6 },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#0960d6', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0960d6', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
});
