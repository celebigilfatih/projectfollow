"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function startOfGrid(d: Date) { const s = startOfMonth(d); const day = s.getDay(); return new Date(s.getFullYear(), s.getMonth(), s.getDate() - day); }
function endOfGrid(d: Date) { const e = endOfMonth(d); const day = e.getDay(); return new Date(e.getFullYear(), e.getMonth(), e.getDate() + (6 - day)); }
function fmtMonthYear(d: Date) { return d.toLocaleString(undefined, { month: "long", year: "numeric" }); }
function dayISO(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10); }

const COLORS = [
  { bg: "bg-amber-100", border: "border-amber-200", text: "text-amber-700" },
  { bg: "bg-blue-100", border: "border-blue-200", text: "text-blue-700" },
  { bg: "bg-purple-100", border: "border-purple-200", text: "text-purple-700" },
  { bg: "bg-green-100", border: "border-green-200", text: "text-green-700" },
  { bg: "bg-red-100", border: "border-red-200", text: "text-red-700" },
];
function colorFor(id: string) { const h = Array.from(id).reduce((a,c)=>a+c.charCodeAt(0),0); return COLORS[h % COLORS.length]; }

export default function CalendarMonthBoard({ initialEvents, tasks }: { initialEvents: any[]; tasks: Array<{ id: string; title: string; projectId?: string }> }) {
  const [events, setEvents] = useState(initialEvents);
  const [visible, setVisible] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [taskId, setTaskId] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const gridDays = useMemo(() => {
    const s = startOfGrid(visible);
    const e = endOfGrid(visible);
    const days: Date[] = [];
    for (let d = new Date(s); d <= e; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) days.push(new Date(d));
    return days;
  }, [visible]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    for (const ev of events) {
      const s = new Date(ev.start);
      const day = dayISO(s);
      (map[day] ||= []).push(ev);
    }
    return map;
  }, [events]);

  async function createEvent() {
    if (!taskId || !dateStr) return;
    const [sh, sm] = (startTime || "00:00").split(":").map((x) => Number(x));
    const [eh, em] = (endTime || startTime || "00:00").split(":").map((x) => Number(x));
    const start = new Date(dateStr); start.setHours(sh, sm, 0, 0);
    const end = new Date(dateStr); end.setHours(eh, em, 0, 0);
    const res = await fetch(`/api/calendar`, { method: "POST", body: JSON.stringify({ taskId, start, end }) });
    if (res.ok) {
      const created = await res.json();
      setEvents((prev) => [...prev, created]);
      setOpen(false); setTaskId(""); setDateStr(""); setStartTime(""); setEndTime("");
    }
  }

  function goToday() { setVisible(new Date()); }
  function prev() { const d = new Date(visible.getFullYear(), visible.getMonth() - 1, 1); setVisible(d); }
  function next() { const d = new Date(visible.getFullYear(), visible.getMonth() + 1, 1); setVisible(d); }

  const month = visible.getMonth();
  const todayISO = dayISO(new Date());
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]; // locale-insensitive for compactness

  return (
    <TooltipProvider>
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday}>Today</Button>
          <Button variant="outline" size="sm" onClick={prev}><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={next}><ChevronRight className="h-4 w-4" /></Button>
          <div className="ml-2 text-xl font-semibold">{fmtMonthYear(visible)}</div>
        </div>
        <div className="flex items-center gap-2">
          <select className="rounded border px-2 py-1 text-sm"><option>Month</option></select>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New event</Button>
        </div>
      </div>
      <div className="rounded-lg border border-[var(--border)] bg-white">
        <div className="grid grid-cols-7 gap-px border-b border-[var(--border)] bg-[var(--border)]">
          {weekDays.map((wd) => (
            <div key={wd} className="bg-white px-3 py-2 text-xs text-zinc-500">{wd}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-px bg-[var(--border)]">
          {gridDays.map((d) => {
            const inMonth = d.getMonth() === month;
            const key = dayISO(d);
            const es = eventsByDay[key] || [];
            const isToday = key === todayISO;
            return (
              <div key={key} className={`bg-white min-h-28 px-2 py-2 ${inMonth ? "" : "opacity-60"}`}>
                <div className="flex items-center justify-between">
                  <div className={`text-xs ${isToday ? "font-semibold" : ""}`}>{d.getDate()}</div>
                </div>
                <div className="mt-1 space-y-1">
                  {es.map((ev: any) => {
                    const c = colorFor(ev.id);
                    const st = new Date(ev.start);
                    const time = `${String(st.getHours()).padStart(2, "0")}:${String(st.getMinutes()).padStart(2, "0")}`;
                    const et = ev.end ? new Date(ev.end) : st;
                    const endTime = `${String(et.getHours()).padStart(2, "0")}:${String(et.getMinutes()).padStart(2, "0")}`;
                    return (
                      <Tooltip key={ev.id}>
                        <TooltipTrigger asChild>
                          <div
                            onClick={() => { if (ev.task?.id) window.location.href = `/tasks/${ev.task.id}`; }}
                            className={`truncate rounded border px-2 py-1 text-xs cursor-pointer ${c.bg} ${c.border} ${c.text}`}
                          >
                            {time} {ev.task?.title ?? ev.title ?? "Etkinlik"}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="space-y-1">
                            <div className="text-xs font-medium">{ev.task?.title ?? ev.title ?? "Etkinlik"}</div>
                            <div className="text-[11px] text-zinc-600">Saat: {time} - {endTime}</div>
                            {ev.task?.id ? (
                              <div className="text-[11px]"><a href={`/tasks/${ev.task.id}`} className="underline">Görev detayı</a></div>
                            ) : null}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni etkinlik</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Görev</label>
              <Select value={taskId} onChange={(e) => setTaskId(e.target.value)} className="w-full text-sm">
                <option value="">Seçiniz</option>
                {tasks.map((t) => (<option key={t.id} value={t.id}>{t.title}</option>))}
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Tarih</label>
              <Input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Başlangıç</label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Bitiş</label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
            <div className="md:col-span-2 flex items-center justify-end">
              <Button onClick={createEvent}>Oluştur</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </TooltipProvider>
  );
}
