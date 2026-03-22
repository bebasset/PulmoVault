import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, Search, Plus, ChevronRight } from 'lucide-react';
import { patientApi } from '../../services/api';

export default function PatientsPage() {
  const [searchQ, setSearchQ] = useState('');
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const { data, isLoading } = useQuery({
    queryKey: ['patients', page, searchQ],
    queryFn: () => searchQ.length >= 2
      ? patientApi.search(searchQ)
      : patientApi.list({ page, limit: LIMIT }),
    placeholderData: (prev) => prev,
  });

  const patients: {
    id: string; name: string; patientId: string; icd10Code: string;
    allergies: string; frequencyPerWeek: number; isActive: boolean;
  }[] = searchQ.length >= 2
    ? (data?.data?.data ?? [])
    : (data?.data?.data ?? []);

  const total = data?.data?.total ?? 0;
  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} total patients</p>
        </div>
        <Link to="/patients/new" className="btn-primary">
          <Plus size={16} />
          Add Patient
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          className="input pl-9"
          placeholder="Search by name or patient ID…"
          value={searchQ}
          onChange={(e) => { setSearchQ(e.target.value); setPage(1); }}
        />
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Patient</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Patient ID</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">ICD-10</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Allergies</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Freq/Week</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-gray-400">
                    <Users size={36} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">
                      {searchQ ? 'No patients match your search.' : 'No patients added yet.'}
                    </p>
                    {!searchQ && (
                      <Link to="/patients/new" className="btn-primary mt-4 inline-flex">
                        <Plus size={14} /> Add First Patient
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                patients.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{p.name}</td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">{p.patientId}</td>
                    <td className="px-6 py-4">
                      <span className="badge-blue">{p.icd10Code}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{p.allergies}</td>
                    <td className="px-6 py-4 text-gray-600">{p.frequencyPerWeek ?? '—'}</td>
                    <td className="px-6 py-4">
                      {p.isActive
                        ? <span className="badge-green">Active</span>
                        : <span className="badge-gray">Inactive</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link to={`/patients/${p.id}`} className="text-brand-600 hover:text-brand-700">
                        <ChevronRight size={18} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && !searchQ && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages} ({total} patients)
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="btn-secondary py-1.5 px-3 text-xs"
              >← Prev</button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="btn-secondary py-1.5 px-3 text-xs"
              >Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
