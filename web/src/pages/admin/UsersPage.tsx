import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Users, Plus, ToggleLeft, ToggleRight, Shield } from 'lucide-react';
import { userApi } from '../../services/api';
import { format } from 'date-fns';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [formError, setFormError] = useState('');

  const { data } = useQuery({ queryKey: ['users'], queryFn: () => userApi.list() });
  const users: { id: string; name: string; role: string; isActive: boolean; lastLoginAt: string; createdAt: string }[] =
    data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () => userApi.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setShowAdd(false);
      setForm({ name: '', email: '', password: '' });
      setFormError('');
    },
    onError: (err: { response?: { data?: { error?: string } } }) => {
      setFormError(err.response?.data?.error ?? 'Failed to create therapist.');
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => userApi.toggle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Therapist Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} accounts</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus size={16} /> Add Therapist
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Name</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Last Login</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-xs">
                      {u.name[0]?.toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900">{u.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {u.role === 'ADMIN'
                    ? <span className="badge bg-purple-50 text-purple-700 flex items-center gap-1 w-fit"><Shield size={10} /> Admin</span>
                    : <span className="badge-blue">Therapist</span>}
                </td>
                <td className="px-6 py-4 text-gray-500 text-xs">
                  {u.lastLoginAt ? format(new Date(u.lastLoginAt), 'MMM d, yyyy h:mm a') : 'Never'}
                </td>
                <td className="px-6 py-4">
                  {u.isActive
                    ? <span className="badge-green">Active</span>
                    : <span className="badge-gray">Inactive</span>}
                </td>
                <td className="px-6 py-4 text-right">
                  {u.role !== 'ADMIN' && (
                    <button
                      onClick={() => toggleMutation.mutate(u.id)}
                      className="text-gray-400 hover:text-brand-600 transition-colors"
                      title={u.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {u.isActive ? <ToggleRight size={22} className="text-green-500" /> : <ToggleLeft size={22} />}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add therapist modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Add New Therapist</h2>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-lg bg-red-50 text-sm text-red-700">{formError}</div>
              )}
              {[
                { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Jane Doe' },
                { label: 'Email', key: 'email', type: 'email', placeholder: 'jane@example.com' },
                { label: 'Password (min 12 chars)', key: 'password', type: 'password', placeholder: '••••••••••••' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
                  <input
                    type={type}
                    className="input"
                    placeholder={placeholder}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="btn-primary flex-1 justify-center"
              >
                {createMutation.isPending ? 'Creating…' : 'Create Therapist'}
              </button>
              <button onClick={() => { setShowAdd(false); setFormError(''); }} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
