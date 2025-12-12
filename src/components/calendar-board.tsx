"use client";
import { useState } from "react";
import { DndContext, DragEndEvent, useDroppable, useDraggable } from "@dnd-kit/core";

function dayKey(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
}

export default function CalendarBoard({ initialEvents }: { initialEvents: any[] }) {
  const [events, setEvents] = useState(initialEvents);
  const today = new Date();
  const days = [...Array(7)].map((_, i) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + i));

  async function onDragEnd(e: DragEndEvent) {
    const id = e.active.id as string;
    const toDay = e.over?.id as string | undefined;
    if (!toDay) return;
    const updated = events.map((ev) => (ev.id === id ? { ...ev, start: new Date(toDay), end: new Date(toDay) } : ev));
    setEvents(updated);
    await fetch(`/api/calendar?id=${id}`, { method: "PATCH", body: JSON.stringify({ start: new Date(toDay), end: new Date(toDay) }) });
  }

  return (
    <DndContext onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
        {days.map((d) => (
          <DayColumn key={dayKey(d)} id={dayKey(d)} label={d.toLocaleDateString()}>
            {events.filter((ev) => dayKey(new Date(ev.start)) === dayKey(d)).map((ev) => (
              <EventCard key={ev.id} id={ev.id} title={ev.task?.title ?? "Görev"} />
            ))}
          </DayColumn>
        ))}
      </div>
    </DndContext>
  );
}

function DayColumn({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`min-h-48 rounded border bg-white p-2 ${isOver ? "ring-2 ring-black" : ""}`}>
      <div className="mb-2 text-sm font-medium">{label}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function EventCard({ id, title }: { id: string; title: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style: React.CSSProperties = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {};
  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes} className={`cursor-move rounded border p-2 text-sm ${isDragging ? "opacity-50" : ""}`}>
      {title}
    </div>
  );
}
