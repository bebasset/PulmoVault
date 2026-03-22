import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { encryptField, decryptField, hashField } from '../utils/encryption';
import { logAudit, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

export async function listUsers(req: AuthRequest, res: Response): Promise<void> {
  const users = await prisma.user.findMany({
    select: { id: true, nameEncrypted: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
  });
  res.json(users.map((u) => ({ ...u, name: decryptField(u.nameEncrypted), nameEncrypted: undefined })));
}

export async function createTherapist(req: AuthRequest, res: Response): Promise<void> {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    res.status(400).json({ error: 'email, password, and name are required.' });
    return;
  }

  if (password.length < 12) {
    res.status(400).json({ error: 'Password must be at least 12 characters.' });
    return;
  }

  const emailHash = hashField(email);
  const existing = await prisma.user.findUnique({ where: { emailHash } });
  if (existing) { res.status(409).json({ error: 'Email already in use.' }); return; }

  try {
    const passwordHash = await bcrypt.hash(password, Number(env.BCRYPT_ROUNDS));
    const user = await prisma.user.create({
      data: {
        nameEncrypted: encryptField(name),
        emailEncrypted: encryptField(email),
        emailHash,
        passwordHash,
        role: 'THERAPIST',
      },
    });

    await logAudit(req.user!.id, 'CREATE_USER', 'users', user.id, req, true);
    res.status(201).json({ id: user.id, name, role: user.role });
  } catch (err) {
    logger.error('createTherapist error', { err });
    res.status(500).json({ error: 'Internal server error.' });
  }
}

export async function toggleUserActive(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) { res.status(404).json({ error: 'User not found.' }); return; }

  const updated = await prisma.user.update({ where: { id }, data: { isActive: !user.isActive } });
  await logAudit(req.user!.id, updated.isActive ? 'ACTIVATE_USER' : 'DEACTIVATE_USER', 'users', id, req, true);
  res.json({ id, isActive: updated.isActive });
}

export async function changePassword(req: AuthRequest, res: Response): Promise<void> {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword || newPassword.length < 12) {
    res.status(400).json({ error: 'Current password and new password (min 12 chars) required.' });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user) { res.status(404).json({ error: 'User not found.' }); return; }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) { res.status(401).json({ error: 'Current password is incorrect.' }); return; }

  const passwordHash = await bcrypt.hash(newPassword, Number(env.BCRYPT_ROUNDS));
  await prisma.user.update({ where: { id: req.user!.id }, data: { passwordHash } });
  await logAudit(req.user!.id, 'CHANGE_PASSWORD', 'users', req.user!.id, req, true);
  res.json({ message: 'Password updated.' });
}

export async function getAuditLogs(req: AuthRequest, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, parseInt(req.query.limit as string) || 50);

  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { nameEncrypted: true, role: true } } },
    }),
    prisma.auditLog.count(),
  ]);

  res.json({
    data: logs.map((l) => ({
      ...l,
      userName: l.user ? decryptField(l.user.nameEncrypted) : 'System',
      user: undefined,
    })),
    total,
    page,
    limit,
  });
}
