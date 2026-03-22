import { Response } from 'express';
import { prisma } from '../config/database';
import { decryptField } from '../utils/encryption';
import { logAudit, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export async function listSessions(req: AuthRequest, res: Response): Promise<void> {
  const { patientId, month } = req.query;
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, parseInt(req.query.limit as string) || 20);

  try {
    const where: Record<string, unknown> = {};
    if (patientId) where.patientId = patientId;
    if (month) where.sessionMonth = month;
    if (req.user!.role === 'THERAPIST') where.therapistId = req.user!.id;

    const [sessions, total] = await prisma.$transaction([
      prisma.therapySession.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { datePerformed: 'desc' },
        include: {
          patient: { select: { nameEncrypted: true, patientIdEnc: true, icd10Code: true } },
          therapist: { select: { nameEncrypted: true } },
        },
      }),
      prisma.therapySession.count({ where }),
    ]);

    const mapped = sessions.map((s) => ({
      ...s,
      patientName: decryptField(s.patient.nameEncrypted),
      patientIdDisplay: decryptField(s.patient.patientIdEnc),
      therapistName: decryptField(s.therapist.nameEncrypted),
      patient: undefined,
      therapist: undefined,
    }));

    res.json({ data: mapped, total, page, limit });
  } catch (err) {
    logger.error('listSessions error', { err });
    res.status(500).json({ error: 'Internal server error.' });
  }
}

export async function getSession(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const session = await prisma.therapySession.findUnique({
      where: { id },
      include: {
        patient: true,
        therapist: { select: { id: true, nameEncrypted: true } },
      },
    });

    if (!session) { res.status(404).json({ error: 'Session not found.' }); return; }

    if (req.user!.role === 'THERAPIST' && session.therapistId !== req.user!.id) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    await logAudit(req.user!.id, 'VIEW_SESSION', 'sessions', id, req, true);

    res.json({
      ...session,
      patientName: decryptField(session.patient.nameEncrypted),
      patientIdDisplay: decryptField(session.patient.patientIdEnc),
      therapistName: decryptField(session.therapist.nameEncrypted),
      patient: undefined,
      therapist: undefined,
    });
  } catch (err) {
    logger.error('getSession error', { err });
    res.status(500).json({ error: 'Internal server error.' });
  }
}

export async function createSession(req: AuthRequest, res: Response): Promise<void> {
  const data = req.body;

  if (!data.patientId || !data.datePerformed || !data.timeIn || !data.timeOut) {
    res.status(400).json({ error: 'patientId, datePerformed, timeIn, timeOut are required.' });
    return;
  }

  try {
    const patient = await prisma.patient.findUnique({ where: { id: data.patientId } });
    if (!patient) { res.status(404).json({ error: 'Patient not found.' }); return; }

    const session = await prisma.therapySession.create({
      data: {
        patientId: data.patientId,
        therapistId: req.user!.id,
        pageNumber: data.pageNumber,
        totalPages: data.totalPages,
        sessionMonth: data.sessionMonth,
        datePerformed: new Date(data.datePerformed),
        timeIn: data.timeIn,
        timeOut: data.timeOut,
        unitsOfService: data.unitsOfService,
        modality: data.modality,
        nebulizationDone: data.nebulizationDone ?? false,
        chestPtDone: data.chestPtDone ?? false,
        coughAssist: data.coughAssist ?? false,
        nasalLavage: data.nasalLavage ?? false,
        segmentalStretching: data.segmentalStretching ?? false,
        allPositionsCompleted: data.allPositionsCompleted ?? false,
        flatSidePositions: data.flatSidePositions ?? false,
        suctionTechniques: data.suctionTechniques,
        g5FrequencyHz: data.g5FrequencyHz,
        airwayClearanceMethods: data.airwayClearanceMethods,
        o2SatPre: data.o2SatPre,
        o2SatPost: data.o2SatPost,
        respRatePre: data.respRatePre,
        respRatePost: data.respRatePost,
        heartRatePre: data.heartRatePre,
        heartRatePost: data.heartRatePost,
        breathSoundsPre: data.breathSoundsPre,
        breathSoundsPost: data.breathSoundsPost,
        breathSoundsDecreased: data.breathSoundsDecreased ?? false,
        breathSoundsImproved: data.breathSoundsImproved ?? false,
        outcomeResults: data.outcomeResults,
        onVentilator: data.onVentilator ?? false,
        tracheaCare: data.tracheaCare ?? false,
        tracheaSuctioning: data.tracheaSuctioning ?? false,
        secretionViscosity: data.secretionViscosity,
        nasalSecretions: data.nasalSecretions ?? false,
        secretionType: data.secretionType,
        secretionAmount: data.secretionAmount,
        secretionColor: data.secretionColor,
        hydrationMethod: data.hydrationMethod,
        adverseReactions: data.adverseReactions ?? false,
        adverseReactionsNotes: data.adverseReactionsNotes,
        universalPrecautions: data.universalPrecautions ?? true,
        roomAirOrO2Liters: data.roomAirOrO2Liters,
        dignityZone: data.dignityZone ?? true,
      },
    });

    await logAudit(req.user!.id, 'CREATE_SESSION', 'sessions', session.id, req, true);
    res.status(201).json(session);
  } catch (err) {
    logger.error('createSession error', { err });
    res.status(500).json({ error: 'Internal server error.' });
  }
}

export async function signSession(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { signatureData, biometricVerified } = req.body;

  try {
    const session = await prisma.therapySession.findUnique({ where: { id } });
    if (!session) { res.status(404).json({ error: 'Session not found.' }); return; }
    if (session.signedAt) { res.status(409).json({ error: 'Session already signed.' }); return; }

    const updated = await prisma.therapySession.update({
      where: { id },
      data: {
        caretakerSignatureUrl: signatureData,
        caretakerBiometricVerified: biometricVerified ?? false,
        signedAt: new Date(),
      },
    });

    await logAudit(req.user!.id, 'SIGN_SESSION', 'sessions', id, req, true,
      `Biometric: ${biometricVerified}`);

    res.json(updated);
  } catch (err) {
    logger.error('signSession error', { err });
    res.status(500).json({ error: 'Internal server error.' });
  }
}

export async function updateSession(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const data = req.body;

  try {
    const session = await prisma.therapySession.findUnique({ where: { id } });
    if (!session) { res.status(404).json({ error: 'Session not found.' }); return; }

    if (req.user!.role === 'THERAPIST' && session.therapistId !== req.user!.id) {
      res.status(403).json({ error: 'Access denied.' });
      return;
    }

    if (session.signedAt) {
      res.status(409).json({ error: 'Cannot edit a signed session.' });
      return;
    }

    const { patientId, therapistId, createdAt, ...updateFields } = data;
    const updated = await prisma.therapySession.update({ where: { id }, data: updateFields });

    await logAudit(req.user!.id, 'UPDATE_SESSION', 'sessions', id, req, true);
    res.json(updated);
  } catch (err) {
    logger.error('updateSession error', { err });
    res.status(500).json({ error: 'Internal server error.' });
  }
}
