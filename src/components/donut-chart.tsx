import React from "react";

export default function DonutChart({ items, size = 128, thickness = 12, centerLabel }: { items: { label: string; value: number; className: string }[]; size?: number; thickness?: number; centerLabel?: string }) {
  const total = Math.max(0, items.reduce((a, b) => a + (b.value || 0), 0));
  const r = size / 2 - thickness / 2;
  const c = 2 * Math.PI * r;
  const dashes = items.map((it) => (total ? Math.max(0, it.value || 0) / total : 0) * c);
  const offsets = dashes.map((_, i) => dashes.slice(0, i).reduce((a, b) => a + b, 0));
  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}> 
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-neutral-200" strokeWidth={thickness} />
        {items.map((it, idx) => (
          <circle
            key={idx}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={thickness}
            strokeDasharray={`${dashes[idx]} ${c}`}
            strokeDashoffset={offsets[idx]}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className={it.className}
          />
        ))}
        {centerLabel ? (
          <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" className="text-sm fill-zinc-700">
            {centerLabel}
          </text>
        ) : null}
      </svg>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {items.map((it, idx) => {
          const pct = total ? Math.round(((it.value || 0) / total) * 100) : 0;
          return (
            <div key={idx} className="flex items-center gap-2">
              <span className={`inline-block h-3 w-3 rounded-full ${it.className}`.replace("text-", "bg-")}></span>
              <span className="truncate">{it.label}</span>
              <span className="ml-auto text-xs text-zinc-500">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
