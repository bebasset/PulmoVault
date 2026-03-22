import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, XCircle, Fingerprint } from 'lucide-react';
import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { sessionApi } from '../../services/api';
import { format } from 'date-fns';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-900 font-medium text-right">{value ?? '—'}</span>
    </div>
  );
}

function Check({ value, label }: { value: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {value
        ? <CheckCircle2 size={14} className="text-green-500 flex-shrink-0" />
        : <XCircle size={14} className="text-gray-300 flex-shrink-0" />}
      <span className={`text-xs ${value ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
    </div>
  );
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const sigRef = useRef<SignatureCanvas>(null);
  const [biometricVerified, setBiometricVerified] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['session', id],
    queryFn: () => sessionApi.get(id!),
    enabled: !!id,
    select: (res) => res.data,
  });

  const signMutation = useMutation({
    mutationFn: () => sessionApi.sign(id!, {
      signatureData: sigRef.current?.toDataURL('image/png') ?? '',
      biometricVerified,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session', id] });
      setShowSignModal(false);
    },
  });

  async function tryBiometric() {
    if (!window.PublicKeyCredential) return;
    try {
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
    } catch {}
  }

  const s = data;

  if (isLoading) return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-64" />
        <div className="card h-48" />
      </div>
    </div>
  );

  if (!s) return <div className="p-6 text-center text-gray-500">Session not found.</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/sessions" className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Session — {s.patientName}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {format(new Date(s.datePerformed), 'MMMM d, yyyy')} · {s.timeIn} – {s.timeOut}
          </p>
        </div>
        {!s.signedAt && (
          <button onClick={() => setShowSignModal(true)} className="btn-primary">
            <Fingerprint size={16} />
            Sign Session
          </button>
        )}
      </div>

      {s.signedAt && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-100 mb-5">
          <CheckCircle2 size={16} className="text-green-600" />
          <span className="text-sm text-green-700 font-medium">
            Signed on {format(new Date(s.signedAt), 'MMMM d, yyyy \'at\' h:mm a')}
            {s.caretakerBiometricVerified && ' · Biometric verified'}
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Session info */}
        <div className="card">
          <h3 className="text-xs font-semibold text-brand-700 uppercase tracking-wider mb-3">Session Details</h3>
          <InfoRow label="Patient" value={s.patientName} />
          <InfoRow label="Therapist" value={s.therapistName} />
          <InfoRow label="Location" value={s.modality === 'SCHOOL' ? 'School' : 'Home'} />
          <InfoRow label="Units of Service" value={s.unitsOfService} />
          <InfoRow label="Session Month" value={s.sessionMonth} />
          <InfoRow label="Page" value={s.pageNumber && s.totalPages ? `${s.pageNumber} of ${s.totalPages}` : null} />
        </div>

        {/* Vitals */}
        <div className="card">
          <h3 className="text-xs font-semibold text-brand-700 uppercase tracking-wider mb-3">Vital Signs</h3>
          <InfoRow label="O₂ Sat Pre" value={s.o2SatPre ? `${s.o2SatPre}%` : null} />
          <InfoRow label="O₂ Sat Post" value={s.o2SatPost ? `${s.o2SatPost}%` : null} />
          <InfoRow label="Resp Rate Pre" value={s.respRatePre} />
          <InfoRow label="Resp Rate Post" value={s.respRatePost} />
          <InfoRow label="Heart Rate Pre" value={s.heartRatePre} />
          <InfoRow label="Heart Rate Post" value={s.heartRatePost} />
          <InfoRow label="Room Air / O₂" value={s.roomAirOrO2Liters} />
        </div>

        {/* Modalities */}
        <div className="card">
          <h3 className="text-xs font-semibold text-brand-700 uppercase tracking-wider mb-3">Modalities</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Check value={s.nebulizationDone} label="Side-Arm Nebulization" />
            <Check value={s.chestPtDone} label="Chest Physical Therapy" />
            <Check value={s.coughAssist} label="Cough Assist" />
            <Check value={s.nasalLavage} label="Nasal Lavage" />
            <Check value={s.segmentalStretching} label="Segmental Stretching (AMBU)" />
            <Check value={s.allPositionsCompleted} label="All Positions Completed" />
            <Check value={s.flatSidePositions} label="Flat & Side-to-Side" />
            <Check value={s.tracheaCare} label="Trachea Care / Tube Change" />
            <Check value={s.tracheaSuctioning} label="Trachea Suctioning" />
            <Check value={s.onVentilator} label="On Ventilator" />
          </div>
          {s.g5FrequencyHz && <InfoRow label="G5 Frequency" value={`${s.g5FrequencyHz} Hz`} />}
          {s.suctionTechniques && <InfoRow label="Suction Techniques" value={s.suctionTechniques} />}
          {s.airwayClearanceMethods && (
            <div className="mt-3 pt-3 border-t border-gray-50">
              <p className="text-xs text-gray-500 mb-1">Airway Clearance Methods</p>
              <p className="text-sm text-gray-800">{s.airwayClearanceMethods}</p>
            </div>
          )}
        </div>

        {/* Secretions & Breath Sounds */}
        <div className="card">
          <h3 className="text-xs font-semibold text-brand-700 uppercase tracking-wider mb-3">Secretions & Breath Sounds</h3>
          <InfoRow label="Breath Sounds Pre" value={s.breathSoundsPre} />
          <InfoRow label="Breath Sounds Post" value={s.breathSoundsPost} />
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Check value={s.breathSoundsDecreased} label="Decreased Before" />
            <Check value={s.breathSoundsImproved} label="Improved After" />
            <Check value={s.nasalSecretions} label="Nasal Secretions Present" />
          </div>
          <div className="mt-3 pt-3 border-t border-gray-50 space-y-1">
            <InfoRow label="Viscosity" value={s.secretionViscosity} />
            <InfoRow label="Type" value={s.secretionType?.replace('_', ' ')} />
            <InfoRow label="Amount" value={s.secretionAmount} />
            <InfoRow label="Color" value={s.secretionColor} />
          </div>
        </div>

        {/* Outcomes */}
        <div className="card lg:col-span-2">
          <h3 className="text-xs font-semibold text-brand-700 uppercase tracking-wider mb-3">Outcomes & Safety</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <Check value={s.universalPrecautions} label="Universal Precautions" />
            <Check value={s.dignityZone} label="Dignity Zone" />
            <Check value={!s.adverseReactions} label="No Adverse Reactions" />
            <Check value={s.caretakerBiometricVerified} label="Biometric Verified" />
          </div>
          {s.adverseReactions && s.adverseReactionsNotes && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-100">
              <p className="text-xs font-semibold text-red-600 mb-1">Adverse Reaction Notes</p>
              <p className="text-sm text-red-800">{s.adverseReactionsNotes}</p>
            </div>
          )}
          {s.outcomeResults && (
            <div className="mt-3 pt-3 border-t border-gray-50">
              <p className="text-xs text-gray-500 mb-1">Outcome & Production Results</p>
              <p className="text-sm text-gray-800">{s.outcomeResults}</p>
            </div>
          )}
          {s.caretakerSignatureUrl && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Caretaker Signature</p>
              <img src={s.caretakerSignatureUrl} alt="Caretaker signature"
                className="border border-gray-200 rounded-lg max-h-32 bg-white" />
            </div>
          )}
        </div>
      </div>

      {/* Sign modal */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Caretaker Signature Required</h2>
              <p className="text-sm text-gray-500 mt-1">
                Sign below to confirm this therapy session. Biometric verification is optional.
              </p>
            </div>
            <div className="p-6 space-y-4">
              {biometricVerified ? (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-100">
                  <CheckCircle2 size={16} className="text-green-600" />
                  <span className="text-sm font-medium text-green-700">Biometric verified</span>
                </div>
              ) : (
                <button type="button" onClick={tryBiometric} className="btn-secondary w-full justify-center">
                  <Fingerprint size={16} className="text-brand-600" />
                  Verify with Fingerprint / Face ID
                </button>
              )}
              <div>
                <p className="text-xs font-medium text-gray-600 mb-2">Draw signature:</p>
                <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                  <SignatureCanvas
                    ref={sigRef}
                    penColor="#0960d6"
                    canvasProps={{ width: 500, height: 140, className: 'w-full' }}
                  />
                </div>
                <button type="button" onClick={() => sigRef.current?.clear()}
                  className="mt-1 text-xs text-gray-400 hover:text-red-500">Clear</button>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => signMutation.mutate()}
                disabled={signMutation.isPending}
                className="btn-primary flex-1 justify-center"
              >
                {signMutation.isPending ? 'Signing…' : 'Confirm & Sign'}
              </button>
              <button onClick={() => setShowSignModal(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
