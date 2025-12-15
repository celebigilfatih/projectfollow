-- Add optional reminder columns to CalendarEvent to match Prisma schema
ALTER TABLE "CalendarEvent" ADD COLUMN IF NOT EXISTS "reminderMinutesBefore" INTEGER;
ALTER TABLE "CalendarEvent" ADD COLUMN IF NOT EXISTS "reminderChannel" TEXT;
