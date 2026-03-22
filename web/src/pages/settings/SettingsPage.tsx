import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Lock, Fingerprint, CheckCircle2, AlertCircle } from 'lucide-react';
import { userApi } from '../../services/api';

export default function SettingsPage() {
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [biometricStatus, setBiometricStatus] = useState<string | null>(null);

  const pwMutation = useMutation({
    mutationFn: () => userApi.changePassword({
      currentPassword: passwords.currentPassword,
      newPassword: passwords.newPassword,
    }),
    onSuccess: () => {
      setPwMsg({ type: 'success', text: 'Password updated successfully.' });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      setPwMsg({ type: 'error', text: err.response?.data?.error ?? 'Failed to update password.' });
    },
  });

  function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPwMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (passwords.newPassword.length < 12) {
      setPwMsg({ type: 'error', text: 'New password must be at least 12 characters.' });
      return;
    }
    setPwMsg(null);
    pwMutation.mutate();
  }

  async function registerBiometric() {
    if (!window.PublicKeyCredential) {
      setBiometricStatus('WebAuthn is not supported on this device/browser.');
      return;
    }
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        setBiometricStatus('No platform biometric authenticator found (fingerprint/face sensor required).');
        return;
      }
      setBiometricStatus('Biometric authenticator detected. Registration flow requires server-side credential setup. Contact your administrator.');
    } catch {
      setBiometricStatus('Could not check biometric availability.');
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* Change password */}
      <div className="card mb-5">
        <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gray-100">
          <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
            <Lock size={18} className="text-brand-600" />
          </div>
          <h2 className="font-semibold text-gray-900">Change Password</h2>
        </div>

        {pwMsg && (
          <div className={`flex items-start gap-2 p-3 rounded-lg mb-4 text-sm border ${
            pwMsg.type === 'success'
              ? 'bg-green-50 border-green-100 text-green-700'
              : 'bg-red-50 border-red-100 text-red-700'
          }`}>
            {pwMsg.type === 'success'
              ? <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0" />
              : <AlertCircle size={15} className="mt-0.5 flex-shrink-0" />}
            {pwMsg.text}
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4">
          {[
            { label: 'Current Password', key: 'currentPassword' },
            { label: 'New Password (min 12 characters)', key: 'newPassword' },
            { label: 'Confirm New Password', key: 'confirmPassword' },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
              <input
                type="password"
                className="input"
                value={passwords[key as keyof typeof passwords]}
                onChange={(e) => setPasswords(p => ({ ...p, [key]: e.target.value }))}
                autoComplete={key === 'currentPassword' ? 'current-password' : 'new-password'}
              />
            </div>
          ))}
          <button type="submit" disabled={pwMutation.isPending} className="btn-primary">
            {pwMutation.isPending ? 'Updating…' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Biometric */}
      <div className="card">
        <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gray-100">
          <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
            <Fingerprint size={18} className="text-teal-600" />
          </div>
          <h2 className="font-semibold text-gray-900">Biometric Authentication</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Register your device fingerprint or face ID to enable faster, more secure sign-in
          and caretaker confirmation signing.
        </p>
        {biometricStatus && (
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-700 mb-4">
            {biometricStatus}
          </div>
        )}
        <button onClick={registerBiometric} className="btn-secondary">
          <Fingerprint size={16} className="text-teal-600" />
          Register Biometric Device
        </button>

        <div className="mt-5 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            Biometric data never leaves your device. WebAuthn (FIDO2) standard ensures credentials
            are stored securely in your device's secure enclave and cannot be extracted.
          </p>
        </div>
      </div>
    </div>
  );
}
