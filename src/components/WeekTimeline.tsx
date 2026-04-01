import { DAYS_AHEAD } from "../constants";
import type { TimeSlot, TimeSlotId } from "../types";
import { formatDayLabel, tomorrowIsoDate } from "../lib/time";

interface WeekTimelineProps {
  /** ISO dates, length 7 */
  dates: string[];
  slotsByDate: Map<string, TimeSlot[]>;
  selectedSlotIds: Set<TimeSlotId>;
  onToggleSlot: (slotId: TimeSlotId) => void;
}

export function WeekTimeline({
  dates,
  slotsByDate,
  selectedSlotIds,
  onToggleSlot,
}: WeekTimelineProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">
          Next {DAYS_AHEAD} days · from tomorrow
        </h2>
        <p className="text-xs text-slate-500">Tap slots to select (1 hr)</p>
      </div>

      {/* Mobile: horizontal scroll; md+: grid */}
      <div className="-mx-1 overflow-x-auto pb-2 md:mx-0 md:overflow-visible md:pb-0">
        <div className="flex min-w-min gap-3 px-1 md:grid md:min-w-0 md:grid-cols-7 md:gap-2">
          {dates.map((iso) => {
            const slots = slotsByDate.get(iso) ?? [];
            const label = formatDayLabel(iso);
            const isTomorrow = iso === tomorrowIsoDate();

            return (
              <section
                key={iso}
                className="w-[min(88vw,20rem)] shrink-0 snap-center rounded-xl border border-slate-700/80 bg-surface-muted/50 p-3 shadow-inner md:w-auto md:min-w-0 md:snap-none"
              >
                <header className="mb-2 border-b border-slate-600/60 pb-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {label}
                  </p>
                  {isTomorrow && (
                    <span className="mt-1 inline-block rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-400">
                      Tomorrow
                    </span>
                  )}
                </header>
                <ul className="flex max-h-[min(50vh,22rem)] flex-col gap-1.5 overflow-y-auto pr-0.5">
                  {slots.map((slot) => {
                    const selected = selectedSlotIds.has(slot.id);
                    return (
                      <li key={slot.id}>
                        <button
                          type="button"
                          onClick={() => onToggleSlot(slot.id)}
                          className={[
                            "flex w-full min-h-11 items-center justify-center rounded-lg px-2 py-2 text-center text-sm font-medium transition",
                            selected
                              ? "bg-accent text-slate-950 shadow-md shadow-emerald-900/40"
                              : "bg-slate-800/80 text-slate-200 hover:bg-slate-700",
                          ].join(" ")}
                        >
                          {slot.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
