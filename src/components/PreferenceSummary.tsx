import type { OrderedSlotsByDate, Resident, TimeSlotId } from "../types";
import { formatDayLabel } from "../lib/time";

interface PreferenceSummaryProps {
  resident: Resident | undefined;
  dates: string[];
  orderedByDate: OrderedSlotsByDate;
  /** Shown under the day heading (e.g. time range only) */
  timeOnlyLabel: (slotId: TimeSlotId) => string;
}

export function PreferenceSummary({
  resident,
  dates,
  orderedByDate,
  timeOnlyLabel,
}: PreferenceSummaryProps) {
  const totalSlots = dates.reduce(
    (n, d) => n + (orderedByDate[d]?.length ?? 0),
    0
  );

  const daysWithSlots = dates.filter((d) => (orderedByDate[d]?.length ?? 0) > 0);

  return (
    <section className="rounded-xl border border-slate-700/80 bg-gradient-to-br from-slate-900 to-slate-950 p-4">
      <h2 className="text-lg font-semibold text-white">Summary</h2>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Resident</dt>
          <dd className="font-medium text-slate-100">
            {resident?.name ?? "—"}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-500">Slots selected</dt>
          <dd className="font-medium text-slate-100">{totalSlots}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Top pick per day</dt>
          <dd className="mt-1">
            {daysWithSlots.length === 0 ? (
              <p className="text-slate-500">
                None yet — pick slots on the timeline.
              </p>
            ) : (
              <ul className="space-y-2 text-slate-200">
                {daysWithSlots.map((d) => {
                  const first = orderedByDate[d]?.[0];
                  if (!first) return null;
                  return (
                    <li key={d} className="flex flex-col gap-0.5 border-l-2 border-emerald-600/50 pl-2">
                      <span className="text-xs text-slate-500">
                        {formatDayLabel(d)}
                      </span>
                      <span>{timeOnlyLabel(first)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}
