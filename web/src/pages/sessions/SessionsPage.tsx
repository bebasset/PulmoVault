import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardList, Plus, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
import { sessionApi } from '../../services/api';
import { format } from 'date-fns';

export default function SessionsPage() {
  const [searchParams] = useSearchParams();
  const patientIdFilter = searchParams.get('patientId');
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['sessions', page, patientIdFilter],
    queryFn: () => sessionApi.list({ page, limit: LIMIT, ...(patientIdFilter ? { patientId: patientIdFilter } : {}) }),
    placeholderData: (prev) => prev,
  });

  const sessions: {
    id: string; patientName: string; datePerformed: string;
    timeIn: string; timeOut: string; modality: string;
    o2SatPost: number; adverseReactions: boolean; signedAt: string;
    therapistName: string; unitsOfService: number;
  }[] = data?.data?.data ?? [];

  const total = data?.data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Therapy Sessions</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total sessions</p>
        </div>
        <Link to="/sessions/new" className="btn-primary">
          <Plus size={16} />
          New Session
        </Link>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Patient</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Time</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Location</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">O₂ Post</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Therapist</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-gray-400">
                    <ClipboardList size={36} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No sessions recorded yet.</p>
                    <Link to="/sessions/new" className="btn-primary mt-4 inline-flex">
                      <Plus size={14} /> Record First Session
                    </Link>
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{s.patientName}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {format(new Date(s.datePerformed), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {s.timeIn} – {s.timeOut}
                    </td>
                    <td className="px-6 py-4">
                      {s.modality === 'SCHOOL'
                        ? <span className="badge-blue">School</span>
                        : <span className="badge-gray">Home</span>}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {s.o2SatPost ? `${s.o2SatPost}%` : '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{s.therapistName}</td>
                    <td className="px-6 py-4">
                      {s.signedAt ? (
                        <span className="badge-green flex items-center gap-1 w-fit">
                          <CheckCircle2 size={11} /> Signed
                        </span>
                      ) : s.adverseReactions ? (
                        <span className="badge-red">Adverse</span>
                      ) : (
                        <span className="badge-amber flex items-center gap-1 w-fit">
                          <Clock size={11} /> Unsigned
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/sessions/${s.id}`} className="text-brand-600 hover:text-brand-700">
                        <ChevronRight size={18} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary py-1.5 px-3 text-xs">← Prev</button>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary py-1.5 px-3 text-xs">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
