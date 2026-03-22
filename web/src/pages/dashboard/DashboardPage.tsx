import { useQuery } from '@tanstack/react-query';
import { Users, ClipboardList, CalendarCheck, AlertTriangle, TrendingUp, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { patientApi, sessionApi } from '../../services/api';
import { format } from 'date-fns';

function StatCard({ label, value, icon: Icon, color, sub }:
  { label: string; value: string | number; icon: React.ElementType; color: string; sub?: string }) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: patientsRes } = useQuery({
    queryKey: ['patients-count'],
    queryFn: () => patientApi.list({ limit: 1 }),
  });

  const { data: sessionsRes } = useQuery({
    queryKey: ['sessions-recent'],
    queryFn: () => sessionApi.list({ limit: 10, page: 1 }),
  });

  const totalPatients = patientsRes?.data?.total ?? 0;
  const sessions = sessionsRes?.data?.data ?? [];
  const totalSessions = sessionsRes?.data?.total ?? 0;
  const adverseCount = sessions.filter((s: { adverseReactions: boolean }) => s.adverseReactions).length;
  const signedCount = sessions.filter((s: { signedAt: string }) => s.signedAt).length;

  const today = format(new Date(), 'EEEE, MMMM d, yyyy');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">{today}</p>
        </div>
        <Link to="/sessions/new" className="btn-primary">
          <Plus size={16} />
          New Session
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Patients"
          value={totalPatients}
          icon={Users}
          color="bg-brand-600"
        />
        <StatCard
          label="Total Sessions"
          value={totalSessions}
          icon={ClipboardList}
          color="bg-teal-600"
        />
        <StatCard
          label="Signed Sessions"
          value={signedCount}
          icon={CalendarCheck}
          color="bg-green-600"
          sub="Recent 10"
        />
        <StatCard
          label="Adverse Reactions"
          value={adverseCount}
          icon={AlertTriangle}
          color={adverseCount > 0 ? 'bg-amber-500' : 'bg-gray-400'}
          sub="Recent 10"
        />
      </div>

      {/* Recent sessions */}
      <div className="card">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-brand-600" />
            <h2 className="text-base font-semibold text-gray-900">Recent Sessions</h2>
          </div>
          <Link to="/sessions" className="text-sm text-brand-600 hover:text-brand-700 font-medium">
            View all →
          </Link>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ClipboardList size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No sessions recorded yet.</p>
            <Link to="/sessions/new" className="btn-primary mt-4 inline-flex">
              <Plus size={14} /> Record First Session
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Patient</th>
                  <th className="text-left py-2 pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="text-left py-2 pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Location</th>
                  <th className="text-left py-2 pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">O₂ Sat Post</th>
                  <th className="text-left py-2 pb-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sessions.map((s: {
                  id: string;
                  patientName: string;
                  datePerformed: string;
                  modality: string;
                  o2SatPost: number;
                  adverseReactions: boolean;
                  signedAt: string;
                }) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-3">
                      <Link to={`/sessions/${s.id}`} className="font-medium text-gray-900 hover:text-brand-600">
                        {s.patientName}
                      </Link>
                    </td>
                    <td className="py-3 text-gray-500">
                      {format(new Date(s.datePerformed), 'MMM d, yyyy')}
                    </td>
                    <td className="py-3">
                      {s.modality === 'SCHOOL'
                        ? <span className="badge-blue">School</span>
                        : <span className="badge-gray">Home</span>}
                    </td>
                    <td className="py-3 font-medium">
                      {s.o2SatPost ? `${s.o2SatPost}%` : '—'}
                    </td>
                    <td className="py-3">
                      {s.signedAt ? (
                        <span className="badge-green">Signed</span>
                      ) : s.adverseReactions ? (
                        <span className="badge-red">Adverse</span>
                      ) : (
                        <span className="badge-amber">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
