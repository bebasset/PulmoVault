import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { patientMobileApi } from '../../src/services/auth';

type Patient = {
  id: string; name: string; patientId: string;
  icd10Code: string; allergies: string; isActive: boolean;
};

export default function PatientsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['mobile-patients', search],
    queryFn: () => search.length >= 2
      ? patientMobileApi.search(search)
      : patientMobileApi.list({ limit: 50 }),
    select: (res) => search.length >= 2 ? res.data.data : res.data.data,
  });

  const patients: Patient[] = data ?? [];

  return (
    <View style={styles.container}>
      {/* Search */}
      <View style={styles.searchWrapper}>
        <Ionicons name="search" size={16} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.search}
          placeholder="Search patients…"
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#0960d6" />
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={44} color="#d1d5db" />
              <Text style={styles.emptyText}>
                {search ? 'No patients match your search.' : 'No patients added yet.'}
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.patientCard}
              onPress={() => router.push(`/patients/${item.id}`)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name[0]?.toUpperCase()}</Text>
              </View>
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>{item.name}</Text>
                <Text style={styles.patientMeta}>
                  {item.patientId} · {item.icd10Code}
                </Text>
                <Text style={styles.patientAllergy}>Allergies: {item.allergies}</Text>
              </View>
              <View style={styles.patientRight}>
                <View style={[styles.statusDot, { backgroundColor: item.isActive ? '#16a34a' : '#9ca3af' }]} />
                <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/patients/new')}>
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  searchWrapper: {
    flexDirection: 'row', alignItems: 'center',
    margin: 16, backgroundColor: '#fff', borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e5e7eb', paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  search: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#111827' },
  list: { padding: 16, paddingTop: 0, gap: 10, paddingBottom: 80 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center' },
  patientCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', padding: 14, borderRadius: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#dbeafe', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#1d4ed8' },
  patientInfo: { flex: 1 },
  patientName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  patientMeta: { fontSize: 11, color: '#6b7280', marginTop: 2, fontFamily: 'monospace' },
  patientAllergy: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  patientRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  fab: {
    position: 'absolute', bottom: 24, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#0960d6', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0960d6', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
});
