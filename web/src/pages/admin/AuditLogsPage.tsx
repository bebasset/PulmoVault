import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, CheckCircle2, XCircle } from 'lucide-react';
import { userApi } from '../../services/api';
import { format } from 'date-fns';

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const LIMIT = 50;

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => userApi.auditLogs({ page, limit: LIMIT }),
    select: (res) => res.data,
  });

  const logs: {
    id: string; action: string; resource: string; resourceId: string;
    ipAddress: string; success: boolean; details: string; createdAt: string;
    userName: string;
  }[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  const actionColor = (action: string) => {
    if (action.includes('FAIL') || action.includes('DELETE')) return 'badge-red';
    if (action.includes('LOGIN')) return 'badge-blue';
    if (action.includes('CREATE')) return 'badge-green';
    if (action.includes('UPDATE') || action.includes('SIGN')) return 'badge-amber';
    return 'badge-gray';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <ShieldCheck size={22} className="text-brand-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} events · All access to PHI is logged</p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Timestamp</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Resource</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">IP</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-3">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}
                  </td>
                  <td className="px-5 py-3 text-gray-800 font-medium">{log.userName}</td>
                  <td className="px-5 py-3">
                    <span className={actionColor(log.action)}>{log.action.replace(/_/g, ' ')}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {log.resource}{log.resourceId ? ` · ${log.resourceId.slice(0, 8)}…` : ''}
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs font-mono">{log.ipAddress}</td>
                  <td className="px-5 py-3">
                    {log.success
                      ? <CheckCircle2 size={16} className="text-green-500" />
                      : <XCircle size={16} className="text-red-500" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
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
