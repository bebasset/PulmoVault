import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { encryptField, hashField } from '../utils/encryption';
import { logAudit, AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const LOCK_THRESHOLD = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

function generateTokens(userId: string, role: string, email: string) {
  const accessToken = jwt.sign(
    { sub: userId, role, email },
    env.JWT_SECRET as jwt.Secret,
    { expiresIn: '15m', issuer: 'pulmovault', audience: 'pulmovault-client' }
  );
  const refreshToken = jwt.sign(
    { sub: userId },
    env.JWT_REFRESH_SECRET as jwt.Secret,
    { expiresIn: '7d', issuer: 'pulmovault' }
  );
  return { accessToken, refreshToken };
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const emailHash = hashField(email);

  try {
    const user = await prisma.user.findUnique({ where: { emailHash } });

    // Always compute bcrypt to prevent timing attacks (OWASP WSTG-ATHN-02)
    const dummyHash = '$2b$12$invalidhashfortimingnormalization00000000000000000000000';
    const hashToCheck = user?.passwordHash ?? dummyHash;
    const passwordValid = await bcrypt.compare(password, hashToCheck);

    if (!user || !passwordValid || !user.isActive) {
      await logAudit(user?.id ?? null, 'LOGIN_FAILED', 'auth', null, req, false, 'Invalid credentials or inactive account');
      if (user) {
        const attempts = user.failedLoginAttempts + 1;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: attempts,
            lockedUntil: attempts >= LOCK_THRESHOLD
              ? new Date(Date.now() + LOCK_DURATION_MS)
              : undefined,
          },
        });
      }
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      res.status(423).json({ error: 'Account temporarily locked. Try again later.' });
      return;
    }

    const { accessToken, refreshToken } = generateTokens(user.id, user.role, email);
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        refreshTokenHash: refreshHash,
        lastLoginAt: new Date(),
        lastLoginIp: req.ip,
      },
    });

    await logAudit(user.id, 'LOGIN_SUCCESS', 'auth', null, req, true);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth/refresh',
    });

    res.json({ accessToken, role: user.role });
  } catch (err) {
    logger.error('Login error', { err });
    res.status(500).json({ error: 'Internal server error.' });
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.refreshToken;
  if (!token) { res.status(401).json({ error: 'No refresh token.' }); return; }

  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET) as { sub: string };
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await prisma.user.findFirst({
      where: { id: payload.sub, refreshTokenHash: tokenHash, isActive: true },
    });

    if (!user) { res.status(401).json({ error: 'Invalid refresh token.' }); return; }

    const emailDecrypted = user.emailEncrypted;
    const { accessToken, refreshToken: newRefresh } = generateTokens(user.id, user.role, emailDecrypted);
    const newHash = crypto.createHash('sha256').update(newRefresh).digest('hex');

    await prisma.user.update({ where: { id: user.id }, data: { refreshTokenHash: newHash } });

    res.cookie('refreshToken', newRefresh, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth/refresh',
    });

    res.json({ accessToken });
  } catch {
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    res.status(401).json({ error: 'Invalid or expired refresh token.' });
  }
}

export async function logout(req: AuthRequest, res: Response): Promise<void> {
  if (req.user) {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { refreshTokenHash: null },
    });
    await logAudit(req.user.id, 'LOGOUT', 'auth', null, req, true);
  }
  res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
  res.json({ message: 'Logged out.' });
}

export async function me(req: AuthRequest, res: Response): Promise<void> {
  if (!req.user) { res.status(401).json({ error: 'Not authenticated.' }); return; }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) { res.status(404).json({ error: 'User not found.' }); return; }

  res.json({
    id: user.id,
    role: user.role,
    hasBiometric: !!user.biometricCredentialId,
    lastLoginAt: user.lastLoginAt,
  });
}

export async function registerAdmin(req: Request, res: Response): Promise<void> {
  const { email, password, name, adminSecret } = req.body;

  if (adminSecret !== process.env.ADMIN_BOOTSTRAP_SECRET) {
    res.status(403).json({ error: 'Forbidden.' });
    return;
  }

  const emailHash = hashField(email);
  const existing = await prisma.user.findUnique({ where: { emailHash } });
  if (existing) { res.status(409).json({ error: 'User already exists.' }); return; }

  const passwordHash = await bcrypt.hash(password, Number(env.BCRYPT_ROUNDS));

  await prisma.user.create({
    data: {
      nameEncrypted: encryptField(name),
      emailEncrypted: encryptField(email),
      emailHash,
      passwordHash,
      role: 'ADMIN',
    },
  });

  res.status(201).json({ message: 'Admin created.' });
}
