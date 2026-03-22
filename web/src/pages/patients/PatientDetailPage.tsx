import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, User, ClipboardList, Plus, CalendarCheck } from 'lucide-react';
import { patientApi } from '../../services/api';
import { format } from 'date-fns';

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => patientApi.get(id!),
    enabled: !!id,
  });

  const patient = data?.data;

  if (isLoading) return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="card space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-5 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    </div>
  );

  if (isError || !patient) return (
    <div className="p-6 text-center text-gray-500">Patient not found.</div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/patients" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{patient.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5 font-mono">{patient.patientId}</p>
        </div>
        <Link
          to={`/sessions/new?patientId=${patient.id}`}
          className="btn-primary"
        >
          <Plus size={16} />
          New Session
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient info card */}
        <div className="lg:col-span-1">
          <div className="card">
            <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gray-100">
              <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
                <User size={18} className="text-brand-600" />
              </div>
              <h2 className="font-semibold text-gray-900">Patient Info</h2>
            </div>

            <dl className="space-y-3 text-sm">
              {[
                { label: 'Full Name', value: patient.name },
                { label: 'Patient ID', value: patient.patientId, mono: true },
                { label: 'ICD-10 Code', value: patient.icd10Code },
                { label: 'Allergies', value: patient.allergies },
                { label: 'Frequency/Week', value: patient.frequencyPerWeek ?? 'Not set' },
                { label: 'Units/Week', value: patient.unitsPerWeek ?? 'Not set' },
                { label: 'Status', value: patient.isActive ? 'Active' : 'Inactive' },
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-gray-500 flex-shrink-0">{label}</dt>
                  <dd className={`text-gray-900 font-medium text-right ${mono ? 'font-mono text-xs' : ''}`}>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Sessions */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center">
                  <ClipboardList size={18} className="text-teal-600" />
                </div>
                <h2 className="font-semibold text-gray-900">Recent Sessions</h2>
              </div>
              <Link to={`/sessions?patientId=${patient.id}`} className="text-sm text-brand-600 hover:text-brand-700 font-medium">
                View all
              </Link>
            </div>

            {patient.sessions?.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <ClipboardList size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">No sessions recorded yet.</p>
                <Link to={`/sessions/new?patientId=${patient.id}`} className="btn-primary mt-4 inline-flex">
                  <Plus size={14} /> Record Session
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {patient.sessions?.map((s: {
                  id: string; datePerformed: string; timeIn: string; timeOut: string;
                  modality: string; o2SatPre: number; o2SatPost: number;
                  adverseReactions: boolean; caretakerBiometricVerified: boolean;
                  signedAt: string; therapistName: string;
                }) => (
                  <Link
                    key={s.id}
                    to={`/sessions/${s.id}`}
                    className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50/30 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-100 group-hover:bg-brand-100 flex items-center justify-center transition-colors flex-shrink-0">
                      <CalendarCheck size={18} className="text-gray-500 group-hover:text-brand-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm">
                        {format(new Date(s.datePerformed), 'MMMM d, yyyy')}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {s.timeIn} – {s.timeOut} · {s.therapistName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {s.modality === 'SCHOOL'
                        ? <span className="badge-blue">School</span>
                        : <span className="badge-gray">Home</span>}
                      {s.o2SatPost && (
                        <span className="text-xs font-medium text-gray-600">O₂ {s.o2SatPost}%</span>
                      )}
                      {s.signedAt
                        ? <span className="badge-green">Signed</span>
                        : <span className="badge-amber">Unsigned</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
