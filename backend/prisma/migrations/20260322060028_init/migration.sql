-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'THERAPIST');

-- CreateEnum
CREATE TYPE "Modality" AS ENUM ('SCHOOL', 'HOME');

-- CreateEnum
CREATE TYPE "SecretionViscosity" AS ENUM ('THICK', 'THIN', 'LOOSE');

-- CreateEnum
CREATE TYPE "SecretionType" AS ENUM ('PRODUCTIVE', 'NON_PRODUCTIVE', 'SWALLOW');

-- CreateEnum
CREATE TYPE "SecretionAmount" AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'EXCESSIVE');

-- CreateEnum
CREATE TYPE "HydrationMethod" AS ENUM ('CARETAKER_GTUBE', 'THERAPIST');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name_encrypted" TEXT NOT NULL,
    "email_encrypted" TEXT NOT NULL,
    "email_hash" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'THERAPIST',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "biometric_credential_id" TEXT,
    "biometric_public_key" TEXT,
    "refresh_token_hash" TEXT,
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "last_login_ip" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "patient_id_enc" TEXT NOT NULL,
    "patient_id_hash" TEXT NOT NULL,
    "name_encrypted" TEXT NOT NULL,
    "allergies" TEXT NOT NULL DEFAULT 'NKA',
    "icd10_code" TEXT NOT NULL,
    "frequency_per_week" INTEGER,
    "units_per_week" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "therapy_sessions" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "therapist_id" TEXT NOT NULL,
    "page_number" INTEGER,
    "total_pages" INTEGER,
    "session_month" TEXT,
    "date_performed" TIMESTAMP(3) NOT NULL,
    "time_in" TEXT NOT NULL,
    "time_out" TEXT NOT NULL,
    "units_of_service" INTEGER,
    "modality" "Modality",
    "nebulization_done" BOOLEAN NOT NULL DEFAULT false,
    "chest_pt_done" BOOLEAN NOT NULL DEFAULT false,
    "cough_assist" BOOLEAN NOT NULL DEFAULT false,
    "nasal_lavage" BOOLEAN NOT NULL DEFAULT false,
    "segmental_stretching" BOOLEAN NOT NULL DEFAULT false,
    "all_positions_completed" BOOLEAN NOT NULL DEFAULT false,
    "flat_side_positions" BOOLEAN NOT NULL DEFAULT false,
    "suction_techniques" TEXT,
    "g5_frequency_hz" INTEGER,
    "airway_clearance_methods" TEXT,
    "o2_sat_pre" DOUBLE PRECISION,
    "o2_sat_post" DOUBLE PRECISION,
    "resp_rate_pre" INTEGER,
    "resp_rate_post" INTEGER,
    "heart_rate_pre" INTEGER,
    "heart_rate_post" INTEGER,
    "breath_sounds_pre" TEXT,
    "breath_sounds_post" TEXT,
    "breath_sounds_decreased" BOOLEAN NOT NULL DEFAULT false,
    "breath_sounds_improved" BOOLEAN NOT NULL DEFAULT false,
    "outcome_results" TEXT,
    "on_ventilator" BOOLEAN NOT NULL DEFAULT false,
    "trachea_care" BOOLEAN NOT NULL DEFAULT false,
    "trachea_suctioning" BOOLEAN NOT NULL DEFAULT false,
    "secretion_viscosity" "SecretionViscosity",
    "nasal_secretions" BOOLEAN NOT NULL DEFAULT false,
    "secretion_type" "SecretionType",
    "secretion_amount" "SecretionAmount",
    "secretion_color" TEXT,
    "hydration_method" "HydrationMethod",
    "adverse_reactions" BOOLEAN NOT NULL DEFAULT false,
    "adverse_reactions_notes" TEXT,
    "universal_precautions" BOOLEAN NOT NULL DEFAULT true,
    "room_air_or_o2_liters" TEXT,
    "dignity_zone" BOOLEAN NOT NULL DEFAULT true,
    "caretaker_signature_url" TEXT,
    "caretaker_biometric_verified" BOOLEAN NOT NULL DEFAULT false,
    "caretaker_biometric_data" TEXT,
    "signed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "therapy_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webauthn_credentials" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "credential_id" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,
    "device_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webauthn_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_encrypted_key" ON "users"("email_encrypted");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_hash_key" ON "users"("email_hash");

-- CreateIndex
CREATE UNIQUE INDEX "patients_patient_id_hash_key" ON "patients"("patient_id_hash");

-- CreateIndex
CREATE UNIQUE INDEX "webauthn_credentials_credential_id_key" ON "webauthn_credentials"("credential_id");

-- AddForeignKey
ALTER TABLE "therapy_sessions" ADD CONSTRAINT "therapy_sessions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "therapy_sessions" ADD CONSTRAINT "therapy_sessions_therapist_id_fkey" FOREIGN KEY ("therapist_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
