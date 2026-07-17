ALTER TABLE ConsultRecord ADD COLUMN isHighRisk BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE ConsultRecord ADD COLUMN costConfirmationPrompt TEXT;
ALTER TABLE ConsultRecord ADD COLUMN costUserRestated TEXT;
ALTER TABLE ConsultRecord ADD COLUMN costConfirmedAt DATETIME;
ALTER TABLE ConsultRecord ADD COLUMN closedLoopResult TEXT;
