import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, Alert,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { patientMobileApi, sessionMobileApi, requireBiometric } from '../../src/services/auth';

function StatCard({ label, value, icon, color }: {
  label: string; value: string | number; icon: string; color: string;
}) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as never} size={20} color={color} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data: pData, refetch: refetchP } = useQuery({
    queryKey: ['mobile-patients-count'],
    queryFn: () => patientMobileApi.list({ limit: 1 }),
  });

  const { data: sData, refetch: refetchS } = useQuery({
    queryKey: ['mobile-sessions-recent'],
    queryFn: () => sessionMobileApi.list({ limit: 8 }),
  });

  const totalPatients = pData?.data?.total ?? 0;
  const sessions = sData?.data?.data ?? [];
  const totalSessions = sData?.data?.total ?? 0;

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([refetchP(), refetchS()]);
    setRefreshing(false);
  }

  async function handleNewSession() {
    const ok = await requireBiometric('Authenticate to record therapy session');
    if (!ok) {
      Alert.alert('Authentication Required', 'Biometric verification failed. Please try again.');
      return;
    }
    router.push('/sessions/new');
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0960d6" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Dashboard</Text>
          <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d')}</Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={handleNewSession}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.newBtnText}>New Session</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <StatCard label="Total Patients" value={totalPatients} icon="people" color="#0960d6" />
        <StatCard label="Total Sessions" value={totalSessions} icon="clipboard" color="#0d9488" />
        <StatCard
          label="Signed"
          value={sessions.filter((s: { signedAt: string }) => s.signedAt).length}
          icon="checkmark-circle" color="#16a34a"
        />
        <StatCard
          label="Adverse"
          value={sessions.filter((s: { adverseReactions: boolean }) => s.adverseReactions).length}
          icon="warning" color="#f59e0b"
        />
      </View>

      {/* Recent sessions */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Sessions</Text>
          <TouchableOpacity onPress={() => router.push('/tabs/sessions')}>
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        </View>

        {sessions.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="clipboard-outline" size={40} color="#d1d5db" />
            <Text style={styles.emptyText}>No sessions yet</Text>
          </View>
        ) : (
          sessions.map((s: {
            id: string; patientName: string; datePerformed: string;
            modality: string; o2SatPost: number; signedAt: string; adverseReactions: boolean;
          }) => (
            <TouchableOpacity
              key={s.id}
              style={styles.sessionRow}
              onPress={() => router.push(`/sessions/${s.id}`)}
            >
              <View style={styles.sessionLeft}>
                <View style={[styles.sessionDot, {
                  backgroundColor: s.signedAt ? '#16a34a' : s.adverseReactions ? '#ef4444' : '#f59e0b'
                }]} />
                <View>
                  <Text style={styles.sessionPatient}>{s.patientName}</Text>
                  <Text style={styles.sessionDate}>
                    {format(new Date(s.datePerformed), 'MMM d, yyyy')} ·{' '}
                    {s.modality === 'SCHOOL' ? 'School' : 'Home'}
                  </Text>
                </View>
              </View>
              <View style={styles.sessionRight}>
                {s.o2SatPost ? (
                  <Text style={styles.o2Stat}>O₂ {s.o2SatPost}%</Text>
                ) : null}
                <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: '800', color: '#111827' },
  date: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#0960d6', paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 10,
  },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', padding: 14, borderRadius: 14,
    borderLeftWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  statIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 22, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  seeAll: { fontSize: 13, color: '#0960d6', fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyText: { fontSize: 13, color: '#9ca3af' },
  sessionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  sessionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  sessionDot: { width: 8, height: 8, borderRadius: 4 },
  sessionPatient: { fontSize: 14, fontWeight: '600', color: '#111827' },
  sessionDate: { fontSize: 11, color: '#6b7280', marginTop: 1 },
  sessionRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  o2Stat: { fontSize: 12, fontWeight: '600', color: '#0d9488' },
});
