import { Response } from 'express';
import { prisma } from '../config/database';
import { encryptField, decryptField, hashField } from '../utils/encryption';
import { logAudit, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export async function listPatients(req: AuthRequest, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, parseInt(req.query.limit as string) || 20);
    const skip = (page - 1) * limit;

    const [patients, total] = await prisma.$transaction([
      prisma.patient.findMany({
        where: { isActive: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.patient.count({ where: { isActive: true } }),
    ]);

    const decrypted = patients.map((p) => ({
      ...p,
      name: decryptField(p.nameEncrypted),
      patientId: decryptField(p.patientIdEnc),
      nameEncrypted: undefined,
      patientIdEnc: undefined,
      patientIdHash: undefined,
    }));

    await logAudit(req.user!.id, 'LIST_PATIENTS', 'patients', null, req, true);
    res.json({ data: decrypted, total, page, limit });
  } catch (err) {
    logger.error('listPatients error', { err });
    res.status(500).json({ error: 'Internal server error.' });
  }
}

export async function getPatient(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const patient = await prisma.patient.findUnique({
      where: { id },
      include: {
        sessions: {
          orderBy: { datePerformed: 'desc' },
          take: 10,
          select: {
            id: true,
            datePerformed: true,
            timeIn: true,
            timeOut: true,
            modality: true,
            o2SatPre: true,
            o2SatPost: true,
            adverseReactions: true,
            caretakerBiometricVerified: true,
            therapist: { select: { id: true, nameEncrypted: true } },
          },
        },
      },
    });

    if (!patient) { res.status(404).json({ error: 'Patient not found.' }); return; }

    await logAudit(req.user!.id, 'VIEW_PATIENT', 'patients', id, req, true);

    res.json({
      ...patient,
      name: decryptField(patient.nameEncrypted),
      patientId: decryptField(patient.patientIdEnc),
      nameEncrypted: undefined,
      patientIdEnc: undefined,
      patientIdHash: undefined,
      sessions: patient.sessions.map((s) => ({
        ...s,
        therapistName: s.therapist ? decryptField(s.therapist.nameEncrypted) : null,
        therapist: undefined,
      })),
    });
  } catch (err) {
    logger.error('getPatient error', { err });
    res.status(500).json({ error: 'Internal server error.' });
  }
}

export async function createPatient(req: AuthRequest, res: Response): Promise<void> {
  const { name, patientId, allergies, icd10Code, frequencyPerWeek, unitsPerWeek } = req.body;

  if (!name || !patientId || !icd10Code) {
    res.status(400).json({ error: 'name, patientId, and icd10Code are required.' });
    return;
  }

  const patientIdHash = hashField(patientId);
  const existing = await prisma.patient.findUnique({ where: { patientIdHash } });
  if (existing) { res.status(409).json({ error: 'Patient ID already exists.' }); return; }

  try {
    const patient = await prisma.patient.create({
      data: {
        nameEncrypted: encryptField(name),
        patientIdEnc: encryptField(patientId),
        patientIdHash,
        allergies: allergies || 'NKA',
        icd10Code,
        frequencyPerWeek: frequencyPerWeek ? parseInt(frequencyPerWeek) : null,
        unitsPerWeek: unitsPerWeek ? parseInt(unitsPerWeek) : null,
      },
    });

    await logAudit(req.user!.id, 'CREATE_PATIENT', 'patients', patient.id, req, true);

    res.status(201).json({
      ...patient,
      name,
      patientId,
      nameEncrypted: undefined,
      patientIdEnc: undefined,
      patientIdHash: undefined,
    });
  } catch (err) {
    logger.error('createPatient error', { err });
    res.status(500).json({ error: 'Internal server error.' });
  }
}

export async function updatePatient(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, allergies, icd10Code, frequencyPerWeek, unitsPerWeek } = req.body;

  try {
    const existing = await prisma.patient.findUnique({ where: { id } });
    if (!existing) { res.status(404).json({ error: 'Patient not found.' }); return; }

    const updated = await prisma.patient.update({
      where: { id },
      data: {
        ...(name && { nameEncrypted: encryptField(name) }),
        ...(allergies !== undefined && { allergies }),
        ...(icd10Code && { icd10Code }),
        ...(frequencyPerWeek !== undefined && { frequencyPerWeek: parseInt(frequencyPerWeek) }),
        ...(unitsPerWeek !== undefined && { unitsPerWeek: parseInt(unitsPerWeek) }),
      },
    });

    await logAudit(req.user!.id, 'UPDATE_PATIENT', 'patients', id, req, true);

    res.json({
      ...updated,
      name: decryptField(updated.nameEncrypted),
      patientId: decryptField(updated.patientIdEnc),
      nameEncrypted: undefined,
      patientIdEnc: undefined,
      patientIdHash: undefined,
    });
  } catch (err) {
    logger.error('updatePatient error', { err });
    res.status(500).json({ error: 'Internal server error.' });
  }
}

export async function searchPatients(req: AuthRequest, res: Response): Promise<void> {
  const query = (req.query.q as string || '').trim();
  if (query.length < 2) { res.json({ data: [] }); return; }

  try {
    // Search by hashed patientId exact match or fetch all and filter decrypted names
    const patients = await prisma.patient.findMany({
      where: { isActive: true },
      take: 100,
    });

    const matched = patients
      .map((p) => ({ ...p, name: decryptField(p.nameEncrypted), patientId: decryptField(p.patientIdEnc) }))
      .filter(
        (p) =>
          p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.patientId.toLowerCase().includes(query.toLowerCase())
      )
      .map(({ nameEncrypted, patientIdEnc, patientIdHash, ...rest }) => rest)
      .slice(0, 20);

    res.json({ data: matched });
  } catch (err) {
    logger.error('searchPatients error', { err });
    res.status(500).json({ error: 'Internal server error.' });
  }
}
