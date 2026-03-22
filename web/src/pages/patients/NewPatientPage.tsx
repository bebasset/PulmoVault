import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, UserPlus } from 'lucide-react';
import { patientApi } from '../../services/api';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  patientId: z.string().min(1, 'Patient ID is required'),
  icd10Code: z.string().min(2, 'ICD-10 code is required'),
  allergies: z.string().default('NKA'),
  frequencyPerWeek: z.string().optional(),
  unitsPerWeek: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function NewPatientPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { allergies: 'NKA' },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => patientApi.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      navigate(`/patients/${res.data.id}`);
    },
  });

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/patients" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Patient</h1>
          <p className="text-sm text-gray-500 mt-0.5">All data is encrypted at rest</p>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-gray-100">
          <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
            <UserPlus size={18} className="text-brand-600" />
          </div>
          <h2 className="font-semibold text-gray-900">Patient Information</h2>
        </div>

        {mutation.isError && (
          <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
            {(mutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error
              ?? 'Failed to create patient.'}
          </div>
        )}

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Full Name *" error={errors.name?.message}>
              <input {...register('name')} className="input" placeholder="John Doe" />
            </Field>
            <Field label="Patient ID *" error={errors.patientId?.message}>
              <input {...register('patientId')} className="input" placeholder="PT-2024-001" />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="ICD-10 Code *" error={errors.icd10Code?.message}>
              <input {...register('icd10Code')} className="input" placeholder="J18.2" />
            </Field>
            <Field label="Allergies" error={errors.allergies?.message}>
              <input {...register('allergies')} className="input" placeholder="NKA" />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Frequency (times/week)">
              <input {...register('frequencyPerWeek')} type="number" className="input" placeholder="3" min="1" max="7" />
            </Field>
            <Field label="Units per Week">
              <input {...register('unitsPerWeek')} type="number" className="input" placeholder="3" min="1" />
            </Field>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={mutation.isPending} className="btn-primary">
              {mutation.isPending ? 'Saving…' : 'Create Patient'}
            </button>
            <Link to="/patients" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
