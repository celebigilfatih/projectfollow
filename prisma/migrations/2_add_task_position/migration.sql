-- Add position column to Task for Kanban ordering
ALTER TABLE "Task" ADD COLUMN "position" INTEGER NOT NULL DEFAULT 0;
