import type { OrderedSlotsByDate, TimeSlotId } from "../types";
import { formatDayLabel } from "../lib/time";

interface SlotPriorityListProps {
  /** Timeline order (e.g. next 7 days) */
  dates: string[];
  orderedByDate: OrderedSlotsByDate;
  /** Row text inside a day section (time range is enough; day is in the heading) */
  rowLabel: (slotId: TimeSlotId) => string;
  /** Accessible / verbose label for buttons */
  ariaLabelForSlot: (slotId: TimeSlotId) => string;
  onMoveUp: (date: string, index: number) => void;
  onMoveDown: (date: string, index: number) => void;
}

export function SlotPriorityList({
  dates,
  orderedByDate,
  rowLabel,
  ariaLabelForSlot,
  onMoveUp,
  onMoveDown,
}: SlotPriorityListProps) {
  const hasAny = dates.some((d) => (orderedByDate[d]?.length ?? 0) > 0);

  if (!hasAny) {
    return (
      <div className="rounded-xl border border-dashed border-slate-600 bg-slate-900/40 p-4 text-center text-sm text-slate-500">
        Select time slots above. For each day, rank them here (#1 = best time
        that day).
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">Preference order</h2>
        <p className="text-xs text-slate-500">#1 = highest priority per day</p>
      </div>
      <div className="space-y-6">
        {dates.map((date) => {
          const ordered = orderedByDate[date] ?? [];
          if (ordered.length === 0) return null;

          return (
            <section key={date}>
              <h3 className="mb-2 border-b border-slate-700/80 pb-1 text-sm font-semibold text-slate-300">
                {formatDayLabel(date)}
              </h3>
              <ol className="space-y-2">
                {ordered.map((id, index) => (
                  <li
                    key={id}
                    className="flex items-stretch gap-2 rounded-xl border border-slate-700/80 bg-slate-900/60 p-2"
                  >
                    <span className="flex w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-sm font-bold text-accent">
                      #{index + 1}
                    </span>
                    <div className="min-w-0 flex-1 py-1">
                      <p className="truncate text-sm font-medium text-slate-100">
                        {rowLabel(id)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1">
                      <button
                        type="button"
                        aria-label={`Move ${ariaLabelForSlot(id)} up`}
                        disabled={index === 0}
                        onClick={() => onMoveUp(date, index)}
                        className="min-h-10 min-w-10 rounded-lg border border-slate-600 bg-slate-800 text-slate-200 disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${ariaLabelForSlot(id)} down`}
                        disabled={index === ordered.length - 1}
                        onClick={() => onMoveDown(date, index)}
                        className="min-h-10 min-w-10 rounded-lg border border-slate-600 bg-slate-800 text-slate-200 disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}
