import type { Resident, ResidentId } from "../types";

interface ResidentSelectorProps {
  residents: Resident[];
  selectedId: ResidentId;
  onSelect: (id: ResidentId) => void;
}

export function ResidentSelector({
  residents,
  selectedId,
  onSelect,
}: ResidentSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-400">Resident</p>
      <div className="flex flex-wrap gap-2">
        {residents.map((r) => {
          const active = r.id === selectedId;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelect(r.id)}
              className={[
                "min-h-11 min-w-[4.5rem] rounded-full px-4 py-2 text-sm font-semibold transition",
                active
                  ? "bg-accent text-slate-950 ring-2 ring-accent ring-offset-2 ring-offset-slate-950"
                  : "bg-surface-muted text-slate-300 hover:bg-slate-700",
              ].join(" ")}
            >
              {r.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
