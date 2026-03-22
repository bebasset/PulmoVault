# PulmoVault

**Secure Respiratory Therapy Data Platform for Independent Pulmonary Therapy Services**

A HIPAA-conscious, OWASP WSTG-aligned full-stack application for managing patient records, therapy session logging, and caretaker signature collection — replacing physical paper documents.

---

## Architecture

```
PulmoVault/
├── backend/          Node.js + Express + TypeScript + PostgreSQL (Prisma)
├── web/              React + TypeScript + Tailwind CSS (Vite)
├── mobile/           React Native + Expo (iOS + Android)
└── docker-compose.yml
```

## Security Measures (OWASP WSTG)

| Control | Implementation |
|---------|----------------|
| PHI Encryption at Rest | AES-256-CBC field-level encryption on all PII/PHI fields |
| Authentication | bcrypt (rounds=12), JWT access + refresh tokens, account lockout |
| Session Management | Short-lived JWT (15m), HttpOnly Secure cookies for refresh token |
| Biometric Auth | WebAuthn/FIDO2 (web), expo-local-authentication (mobile) |
| Authorization | Role-based (ADMIN/THERAPIST), resource-level ownership checks |
| Audit Logging | Every PHI access/modification logged with user, IP, timestamp |
| Rate Limiting | General (100/15min), Auth (10/15min) |
| Input Validation | express-validator + zod schemas, null-byte sanitization |
| HTTP Security Headers | Helmet.js: CSP, HSTS, X-Frame-Options, noSniff, XSS filter |
| SQL Injection Prevention | Prisma parameterized queries (no raw SQL) |
| Caretaker Signature | Canvas signature + optional biometric verification |
| Sensitive Data Exposure | Encrypted fields never decrypted in logs or error responses |
| CORS | Strict allowlist, credentials restricted |
| Parameter Pollution | Prevented via middleware |

## Quick Start

### 1. Clone and set up environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env — set strong JWT secrets, encryption keys, DB password
```

### 2. Generate secure keys

```bash
# JWT secrets (64 chars each)
openssl rand -hex 32

# Encryption key (32 chars)
openssl rand -base64 24 | tr -d '=' | cut -c1-32

# Encryption IV (16 chars)
openssl rand -base64 12 | tr -d '=' | cut -c1-16
```

### 3. Start with Docker Compose

```bash
docker compose up -d
cd backend && npx prisma migrate deploy
```

### 4. Bootstrap first admin account

```bash
curl -X POST http://localhost:3001/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@iptservices.com","password":"YourSecurePass123!","name":"Administrator","adminSecret":"YOUR_ADMIN_BOOTSTRAP_SECRET"}'
```

### 5. Development (without Docker)

```bash
# Backend
cd backend && npm install && npx prisma migrate dev && npm run dev

# Web
cd web && npm install && npm run dev

# Mobile
cd mobile && npm install && npx expo start
```

---

## Data Model (from spreadsheet)

**Patients**: name (encrypted), patient ID (encrypted+hashed), ICD-10 code, allergies, frequency

**Therapy Sessions** (complete spreadsheet mapping):
- Header: page, month, date, time in/out, units, location (school/home)
- Vitals: O₂ sat pre/post, resp rate pre/post, heart rate pre/post
- Modalities: nebulization, chest PT, cough assist, nasal lavage, AMBU stretching, G5 frequency
- Breath sounds: pre/post auscultation, assessment checkboxes
- Secretions: viscosity, type, amount, color, nasal secretions
- Equipment: ventilator, trachea care/suctioning, suction techniques, hydration method
- Safety: adverse reactions, universal precautions, dignity zone, O₂ liters
- Signature: caretaker signature canvas + biometric verification flag

---

## Mobile (Expo)

- **iOS**: Face ID / Touch ID via `expo-local-authentication`
- **Android**: Fingerprint / Face recognition via biometric APIs
- **Token storage**: `expo-secure-store` (hardware-backed keychain)
- Biometric gate required before accessing any session record or creating new session

## Web (WebAuthn)

- **Chrome/Safari/Firefox**: `navigator.credentials.get()` triggers native platform authenticator
- Supports Windows Hello, macOS Touch ID, Android biometric, FIDO2 hardware keys
- Falls back gracefully when biometric not available

---

## Compliance Notes

- **HIPAA**: All PHI fields encrypted at rest and in transit (TLS 1.2+)
- **Audit Trail**: Immutable audit log for all PHI access (HIPAA § 164.312(b))
- **Access Control**: Role-based with minimum necessary access
- **Automatic Logoff**: JWT expiry (15 minutes), mobile biometric re-auth on app resume
- **Encryption**: AES-256 for data at rest, TLS 1.2+ for data in transit
- **Backup**: PostgreSQL database — configure encrypted backups separately

> ⚠️ Before production deployment: engage a qualified security assessor for HIPAA Security Rule compliance review. This application provides strong technical controls but organizational policies (BAAs, workforce training, physical safeguards) are also required.
