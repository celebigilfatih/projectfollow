import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authConfig } from "@/lib/auth";
import CalendarBoard from "@/components/calendar-board";
import { redirect } from "next/navigation";

export default async function CalendarPage() {
  const session = await getServerSession(authConfig as any);
  if (!session) return redirect("/login");
  const events = await prisma.calendarEvent.findMany({ include: { task: true }, orderBy: { start: "asc" } });
  const tasks = await prisma.task.findMany({ select: { id: true, title: true, projectId: true }, orderBy: { createdAt: "desc" } });
  return (
    <div className="px-2 sm:px-4 lg:px-6 py-2 sm:py-4">
      <h1 className="mb-4 text-2xl font-semibold">Takvim</h1>
      <CalendarBoard initialEvents={events} tasks={tasks} />
    </div>
  );
}
