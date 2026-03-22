import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { validateRequest } from '../middleware/validate';
import { authenticate, requireRole } from '../middleware/auth';
import { authLimiter } from '../middleware/security';
import * as authCtrl from '../controllers/auth.controller';
import * as patientCtrl from '../controllers/patients.controller';
import * as sessionCtrl from '../controllers/sessions.controller';
import * as userCtrl from '../controllers/users.controller';

const router = Router();

// ── Auth ─────────────────────────────────────────────────────────────────────
router.post('/auth/login',
  authLimiter,
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 1 }),
  validateRequest,
  authCtrl.login
);
router.post('/auth/refresh', authCtrl.refresh);
router.post('/auth/logout', authenticate, authCtrl.logout);
router.get('/auth/me', authenticate, authCtrl.me);
router.post('/auth/bootstrap', authCtrl.registerAdmin);

// ── Patients ─────────────────────────────────────────────────────────────────
router.get('/patients/search', authenticate, patientCtrl.searchPatients);

router.get('/patients',
  authenticate,
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  validateRequest,
  patientCtrl.listPatients
);

router.get('/patients/:id',
  authenticate,
  param('id').isUUID(),
  validateRequest,
  patientCtrl.getPatient
);

router.post('/patients',
  authenticate,
  body('name').trim().isLength({ min: 2, max: 200 }),
  body('patientId').trim().isLength({ min: 1, max: 50 }),
  body('icd10Code').trim().isLength({ min: 2, max: 20 }),
  validateRequest,
  patientCtrl.createPatient
);

router.put('/patients/:id',
  authenticate,
  param('id').isUUID(),
  validateRequest,
  patientCtrl.updatePatient
);

// ── Sessions ─────────────────────────────────────────────────────────────────
router.get('/sessions',
  authenticate,
  validateRequest,
  sessionCtrl.listSessions
);

router.get('/sessions/:id',
  authenticate,
  param('id').isUUID(),
  validateRequest,
  sessionCtrl.getSession
);

router.post('/sessions',
  authenticate,
  body('patientId').isUUID(),
  body('datePerformed').isISO8601(),
  body('timeIn').matches(/^\d{2}:\d{2}$/),
  body('timeOut').matches(/^\d{2}:\d{2}$/),
  validateRequest,
  sessionCtrl.createSession
);

router.put('/sessions/:id',
  authenticate,
  param('id').isUUID(),
  validateRequest,
  sessionCtrl.updateSession
);

router.post('/sessions/:id/sign',
  authenticate,
  param('id').isUUID(),
  body('signatureData').notEmpty(),
  validateRequest,
  sessionCtrl.signSession
);

// ── Users (Admin only) ────────────────────────────────────────────────────────
router.get('/users', authenticate, requireRole('ADMIN'), userCtrl.listUsers);

router.post('/users',
  authenticate,
  requireRole('ADMIN'),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 12 }),
  body('name').trim().isLength({ min: 2 }),
  validateRequest,
  userCtrl.createTherapist
);

router.patch('/users/:id/toggle',
  authenticate,
  requireRole('ADMIN'),
  param('id').isUUID(),
  validateRequest,
  userCtrl.toggleUserActive
);

router.post('/users/change-password',
  authenticate,
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 12 }),
  validateRequest,
  userCtrl.changePassword
);

router.get('/audit-logs', authenticate, requireRole('ADMIN'), userCtrl.getAuditLogs);

// ── Health ────────────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => res.json({ status: 'ok', service: 'PulmoVault API' }));

export default router;
