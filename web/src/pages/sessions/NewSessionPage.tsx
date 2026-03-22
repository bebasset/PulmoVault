import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ClipboardList, Search } from 'lucide-react';
import { useState, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { sessionApi, patientApi } from '../../services/api';

type FormValues = Record<string, unknown>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card mb-4">
      <h3 className="text-sm font-semibold text-brand-700 uppercase tracking-wider mb-4 pb-3 border-b border-gray-100">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function CheckRow({ label, name, register }: { label: string; name: string; register: ReturnType<typeof useForm>['register'] }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <input
        type="checkbox"
        {...register(name)}
        className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
      />
      <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
    </label>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-start">
      <label className="text-sm text-gray-600 sm:text-right pt-2">{label}</label>
      <div className="sm:col-span-2">{children}</div>
    </div>
  );
}

export default function NewSessionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedPatientId = searchParams.get('patientId');
  const queryClient = useQueryClient();

  const [patientSearch, setPatientSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<{ id: string; name: string; icd10Code: string } | null>(null);
  const [biometricVerified, setBiometricVerified] = useState(false);
  const sigRef = useRef<SignatureCanvas>(null);

  const { register, handleSubmit, control, watch } = useForm<FormValues>({
    defaultValues: {
      modality: 'HOME',
      universalPrecautions: true,
      dignityZone: true,
    },
  });

  // Pre-load patient if patientId passed in URL
  const { data: preloadedPatient } = useQuery({
    queryKey: ['patient-preload', preselectedPatientId],
    queryFn: () => patientApi.get(preselectedPatientId!),
    enabled: !!preselectedPatientId && !selectedPatient,
    select: (res) => res.data,
  });

  if (preloadedPatient && !selectedPatient) {
    setSelectedPatient({ id: preloadedPatient.id, name: preloadedPatient.name, icd10Code: preloadedPatient.icd10Code });
  }

  const { data: searchResults } = useQuery({
    queryKey: ['patient-search', patientSearch],
    queryFn: () => patientApi.search(patientSearch),
    enabled: patientSearch.length >= 2,
    select: (res) => res.data.data,
  });

  const mutation = useMutation({
    mutationFn: (data: FormValues) => {
      const sigData = sigRef.current?.isEmpty() ? null : sigRef.current?.toDataURL('image/png');
      return sessionApi.create({
        ...data,
        patientId: selectedPatient!.id,
        caretakerSignatureUrl: sigData,
        caretakerBiometricVerified: biometricVerified,
        signedAt: sigData ? new Date().toISOString() : undefined,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      navigate(`/sessions/${res.data.id}`);
    },
  });

  async function tryBiometric() {
    if (!window.PublicKeyCredential) return;
    try {
      // WebAuthn user verification prompt (browser native biometric)
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          timeout: 60000,
          userVerification: 'required',
          rpId: window.location.hostname,
          allowCredentials: [],
        },
      });
      if (credential) setBiometricVerified(true);
    } catch {
      // Biometric cancelled or failed — signature alone is acceptable
    }
  }

  const adverseReactions = watch('adverseReactions');

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/sessions" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Therapy Session</h1>
          <p className="text-sm text-gray-500 mt-0.5">Home Visits — Respiratory Therapy</p>
        </div>
      </div>

      {mutation.isError && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
          {(mutation.error as { response?: { data?: { error?: string } } })?.response?.data?.error
            ?? 'Failed to save session.'}
        </div>
      )}

      <form onSubmit={handleSubmit((data) => {
        if (!selectedPatient) return;
        mutation.mutate(data);
      })}>

        {/* Patient selection */}
        <Section title="Patient">
          {selectedPatient ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-brand-50 border border-brand-100">
              <div>
                <p className="font-medium text-gray-900">{selectedPatient.name}</p>
                <p className="text-xs text-gray-500">{selectedPatient.icd10Code}</p>
              </div>
              {!preselectedPatientId && (
                <button type="button" onClick={() => setSelectedPatient(null)}
                  className="text-xs text-red-500 hover:text-red-700">Change</button>
              )}
            </div>
          ) : (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className="input pl-8"
                placeholder="Search patient by name or ID…"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
              />
              {searchResults && searchResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  {searchResults.map((p: { id: string; name: string; icd10Code: string }) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0"
                      onClick={() => { setSelectedPatient(p); setPatientSearch(''); }}
                    >
                      <p className="font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.icd10Code}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </Section>

        {/* Session header */}
        <Section title="Session Header">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Page</label>
              <input {...register('pageNumber')} type="number" className="input" placeholder="1" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Total Pages</label>
              <input {...register('totalPages')} type="number" className="input" placeholder="1" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Month</label>
              <input {...register('sessionMonth')} className="input" placeholder="January 2025" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Units Required</label>
              <input {...register('unitsOfService')} type="number" className="input" placeholder="1" />
            </div>
          </div>
        </Section>

        {/* Date & Time */}
        <Section title="Date & Time of Service">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
              <input {...register('datePerformed', { required: true })} type="date" className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Time In *</label>
              <input {...register('timeIn', { required: true })} type="time" className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Time Out *</label>
              <input {...register('timeOut', { required: true })} type="time" className="input" />
            </div>
          </div>
          <FieldRow label="Location">
            <Controller
              name="modality"
              control={control}
              render={({ field }) => (
                <div className="flex gap-3">
                  {['HOME', 'SCHOOL'].map((m) => (
                    <label key={m} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" {...field} value={m} checked={field.value === m}
                        className="text-brand-600" />
                      <span className="text-sm text-gray-700">{m === 'HOME' ? 'Home (H)' : 'School (S)'}</span>
                    </label>
                  ))}
                </div>
              )}
            />
          </FieldRow>
        </Section>

        {/* Vitals */}
        <Section title="Vital Signs — Pre & Post">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'O₂ Sat Pre (%)', name: 'o2SatPre' },
              { label: 'O₂ Sat Post (%)', name: 'o2SatPost' },
              { label: 'Resp Rate Pre', name: 'respRatePre' },
              { label: 'Resp Rate Post', name: 'respRatePost' },
              { label: 'Heart Rate Pre', name: 'heartRatePre' },
              { label: 'Heart Rate Post', name: 'heartRatePost' },
            ].map(({ label, name }) => (
              <div key={name}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input {...register(name)} type="number" step="0.1" className="input" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Breath Sounds Pre</label>
              <input {...register('breathSoundsPre')} className="input" placeholder="e.g., Diminished bilateral bases" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Breath Sounds Post</label>
              <input {...register('breathSoundsPost')} className="input" placeholder="e.g., Improved bilateral" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-1">
            <CheckRow label="Decreased Breath Sounds Before Session" name="breathSoundsDecreased" register={register} />
            <CheckRow label="Improved Breath Sounds After Session" name="breathSoundsImproved" register={register} />
          </div>
        </Section>

        {/* Modalities */}
        <Section title="Modalities Performed">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <CheckRow label="Side-Arm Nebulization (circuit prepared/cleaned)" name="nebulizationDone" register={register} />
            <CheckRow label="Chest Physical Therapy (CPT)" name="chestPtDone" register={register} />
            <CheckRow label="Cough Assist" name="coughAssist" register={register} />
            <CheckRow label="Nasal Lavage — Normal Saline & Evacuation" name="nasalLavage" register={register} />
            <CheckRow label="Segmental Stretching (AMBU) — Lung Volume" name="segmentalStretching" register={register} />
            <CheckRow label="All Positions Completed" name="allPositionsCompleted" register={register} />
            <CheckRow label="Flat & Side-to-Side Positions" name="flatSidePositions" register={register} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">G5 Unit Frequency (Hz)</label>
              <select {...register('g5FrequencyHz')} className="input">
                <option value="">Not used</option>
                {[15, 25, 35, 40, 50, 60].map((hz) => (
                  <option key={hz} value={hz}>{hz} Hz</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Suction Techniques Applied</label>
              <input {...register('suctionTechniques')} className="input" placeholder="e.g., Nasopharyngeal suction" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Airway Clearance Methods</label>
            <textarea {...register('airwayClearanceMethods')} className="input" rows={2}
              placeholder="Methods used to improve airway clearance and obtain goals" />
          </div>
        </Section>

        {/* Respiratory Equipment */}
        <Section title="Respiratory Equipment & Procedures">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <CheckRow label="On Ventilator" name="onVentilator" register={register} />
            <CheckRow label="Trachea Care / Tube Change" name="tracheaCare" register={register} />
            <CheckRow label="Trachea Suctioning Completed" name="tracheaSuctioning" register={register} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Room Air or O₂ (L/min)</label>
            <input {...register('roomAirOrO2Liters')} className="input" placeholder="e.g., Room Air / 2L O₂" />
          </div>
          <FieldRow label="Hydration Administered By">
            <select {...register('hydrationMethod')} className="input">
              <option value="">Not administered</option>
              <option value="CARETAKER_GTUBE">Caretaker — G-Tube</option>
              <option value="THERAPIST">Via Therapist</option>
            </select>
          </FieldRow>
        </Section>

        {/* Secretions */}
        <Section title="Secretion Assessment">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Viscosity</label>
              <select {...register('secretionViscosity')} className="input">
                <option value="">Select…</option>
                <option value="THICK">Thick</option>
                <option value="THIN">Thin</option>
                <option value="LOOSE">Loose</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select {...register('secretionType')} className="input">
                <option value="">Select…</option>
                <option value="PRODUCTIVE">Productive</option>
                <option value="NON_PRODUCTIVE">Non-Productive</option>
                <option value="SWALLOW">Swallow</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount</label>
              <select {...register('secretionAmount')} className="input">
                <option value="">Select…</option>
                <option value="SMALL">Small</option>
                <option value="MEDIUM">Medium</option>
                <option value="LARGE">Large</option>
                <option value="EXCESSIVE">Excessive</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
              <select {...register('secretionColor')} className="input">
                <option value="">Select…</option>
                {['Clear', 'White', 'Yellow', 'Green', 'Red'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <CheckRow label="Nasal Secretions Present" name="nasalSecretions" register={register} />
        </Section>

        {/* Outcomes */}
        <Section title="Outcomes & Safety">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Outcome & Production Results</label>
            <textarea {...register('outcomeResults')} className="input" rows={3}
              placeholder="Describe therapy outcomes and patient response" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <CheckRow label="Universal Precautions Followed" name="universalPrecautions" register={register} />
            <CheckRow label="Area Zoned for Dignity and Respect" name="dignityZone" register={register} />
          </div>

          <div>
            <CheckRow label="Adverse Reactions During Therapy" name="adverseReactions" register={register} />
          </div>
          {Boolean(adverseReactions) && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Adverse Reaction Notes</label>
              <textarea {...register('adverseReactionsNotes')} className="input border-red-200 focus:ring-red-400" rows={2}
                placeholder="Describe adverse reaction details" />
            </div>
          )}
        </Section>

        {/* Caretaker Signature */}
        <Section title="Caretaker / Parent Signature & Confirmation">
          <p className="text-sm text-gray-600 mb-3">
            This section confirms the caretaker's review and approval of the therapy session.
            Biometric authentication is available for enhanced security.
          </p>

          {biometricVerified ? (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-100 mb-3">
              <span className="text-green-600 text-lg">✓</span>
              <span className="text-sm font-medium text-green-700">Biometric verification confirmed</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={tryBiometric}
              className="btn-secondary mb-4 text-sm"
            >
              <span className="text-lg">👆</span>
              Verify with Fingerprint / Face ID
            </button>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">
              Caretaker Signature (draw below)
            </label>
            <div className="border-2 border-gray-200 rounded-xl overflow-hidden bg-white">
              <SignatureCanvas
                ref={sigRef}
                penColor="#0960d6"
                canvasProps={{ width: 600, height: 160, className: 'w-full' }}
              />
            </div>
            <button
              type="button"
              onClick={() => sigRef.current?.clear()}
              className="mt-2 text-xs text-gray-500 hover:text-red-500 transition-colors"
            >
              Clear signature
            </button>
          </div>
        </Section>

        {/* Submit */}
        <div className="flex gap-3 pb-6">
          <button
            type="submit"
            disabled={mutation.isPending || !selectedPatient}
            className="btn-primary"
          >
            <ClipboardList size={16} />
            {mutation.isPending ? 'Saving Session…' : 'Save Session'}
          </button>
          <Link to="/sessions" className="btn-secondary">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
