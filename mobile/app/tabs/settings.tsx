import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, Switch, ScrollView,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { logout, clearToken } from '../../src/services/auth';
import { useAuthStore } from '../../src/hooks/useAuthStore';

export default function SettingsScreen() {
  const router = useRouter();
  const { clearAuth, role } = useAuthStore();
  const [biometricEnabled, setBiometricEnabled] = useState(true);

  async function handleLogout() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out? You will need to sign in again to access patient data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            await clearToken();
            clearAuth();
            router.replace('/auth/login');
          },
        },
      ]
    );
  }

  async function testBiometric() {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      Alert.alert('Not Available', 'This device does not have biometric hardware.');
      return;
    }
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) {
      Alert.alert('Not Enrolled', 'No biometric credentials enrolled. Go to device Settings to add fingerprint or Face ID.');
      return;
    }
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Test biometric authentication',
    });
    Alert.alert(result.success ? 'Success ✓' : 'Failed', result.success ? 'Biometric verified.' : 'Authentication failed.');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={28} color="#0960d6" />
        </View>
        <View>
          <Text style={styles.roleText}>{role === 'ADMIN' ? 'Administrator' : 'Respiratory Therapist'}</Text>
          <Text style={styles.orgText}>Independent Pulmonary Therapy Services</Text>
        </View>
      </View>

      {/* Security */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="finger-print" size={18} color="#0960d6" />
            </View>
            <View>
              <Text style={styles.settingLabel}>Biometric Lock</Text>
              <Text style={styles.settingDesc}>Require fingerprint/Face ID on open</Text>
            </View>
          </View>
          <Switch
            value={biometricEnabled}
            onValueChange={setBiometricEnabled}
            trackColor={{ false: '#e5e7eb', true: '#bfdbfe' }}
            thumbColor={biometricEnabled ? '#0960d6' : '#9ca3af'}
          />
        </View>

        <TouchableOpacity style={styles.settingRow} onPress={testBiometric}>
          <View style={styles.settingLeft}>
            <View style={[styles.settingIcon, { backgroundColor: '#d1fae5' }]}>
              <Ionicons name="shield-checkmark" size={18} color="#059669" />
            </View>
            <View>
              <Text style={styles.settingLabel}>Test Biometric</Text>
              <Text style={styles.settingDesc}>Verify fingerprint / Face ID works</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#d1d5db" />
        </TouchableOpacity>
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        {[
          { label: 'Version', value: '1.0.0' },
          { label: 'Security Standard', value: 'OWASP WSTG + HIPAA' },
          { label: 'Encryption', value: 'AES-256-CBC' },
          { label: 'Auth', value: 'JWT + WebAuthn (FIDO2)' },
          { label: 'Biometric', value: 'expo-local-authentication' },
        ].map(({ label, value }) => (
          <View key={label} style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
          </View>
        ))}
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={18} color="#dc2626" />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', padding: 16, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center',
  },
  roleText: { fontSize: 15, fontWeight: '700', color: '#111827' },
  orgText: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  section: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  sectionTitle: {
    fontSize: 11, fontWeight: '700', color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4,
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderTopWidth: 1, borderTopColor: '#f9fafb',
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  settingLabel: { fontSize: 14, fontWeight: '600', color: '#111827' },
  settingDesc: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#f9fafb',
  },
  infoLabel: { fontSize: 13, color: '#6b7280' },
  infoValue: { fontSize: 12, color: '#111827', fontWeight: '600', textAlign: 'right' },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#fff', borderRadius: 14, paddingVertical: 14,
    borderWidth: 1.5, borderColor: '#fecaca',
  },
  signOutText: { fontSize: 15, fontWeight: '700', color: '#dc2626' },
});
