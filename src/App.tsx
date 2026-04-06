import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DAYS_AHEAD, RESIDENTS, SLOT_END_HOUR, SLOT_START_HOUR } from "./constants";
import { PreferenceSummary } from "./components/PreferenceSummary";
import { SaveResultDialog } from "./components/SaveResultDialog";
import { ResidentSelector } from "./components/ResidentSelector";
import { SlotPriorityList } from "./components/SlotPriorityList";
import { WeekTimeline } from "./components/WeekTimeline";
import { preferencesToPayload } from "./lib/bookingAdapter";
import {
  buildHourlySlotsForDay,
  formatDayLabel,
  getNextNDaysFromTomorrow,
  parseSlotId,
} from "./lib/time";
import { fetchPreferences, putPreferences } from "./lib/api";
import {
  clearOrderedSlots,
  loadOrderedSlotsByDate,
  saveOrderedSlotsByDate,
} from "./lib/storage";
import type { OrderedSlotsByDate, ResidentId, TimeSlot, TimeSlotId } from "./types";

function buildSlotMaps(dates: string[]) {
  const slotsByDate = new Map<string, TimeSlot[]>();
  const slotById = new Map<TimeSlotId, TimeSlot>();
  for (const d of dates) {
    const slots = buildHourlySlotsForDay(d, SLOT_START_HOUR, SLOT_END_HOUR);
    slotsByDate.set(d, slots);
    for (const s of slots) {
      slotById.set(s.id, s);
    }
  }
  return { slotsByDate, slotById };
}

function emptyOrderedForDates(dates: string[]): OrderedSlotsByDate {
  const o: OrderedSlotsByDate = {};
  for (const d of dates) {
    o[d] = [];
  }
  return o;
}

function mergeLoaded(
  dates: string[],
  loaded: OrderedSlotsByDate | null
): OrderedSlotsByDate {
  const base = emptyOrderedForDates(dates);
  if (!loaded) return base;
  for (const d of dates) {
    const slots = loaded[d];
    if (Array.isArray(slots)) {
      base[d] = slots.filter((id) => {
        const { date } = parseSlotId(id);
        return date === d;
      });
    }
  }
  return base;
}

export default function App() {
  const defaultResident = RESIDENTS[0]?.id ?? "terry";
  const dates = useMemo(() => getNextNDaysFromTomorrow(DAYS_AHEAD), []);

  const [residentId, setResidentId] = useState<ResidentId>(defaultResident);
  const [orderedByDate, setOrderedByDate] = useState<OrderedSlotsByDate>(() =>
    mergeLoaded(dates, loadOrderedSlotsByDate(defaultResident))
  );
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const [saveDialog, setSaveDialog] = useState<{
    variant: "success" | "partial" | "error";
    title: string;
    details: string;
  } | null>(null);
  const userEditedRef = useRef(false);

  const { slotsByDate, slotById } = useMemo(
    () => buildSlotMaps(dates),
    [dates]
  );

  const selectedSet = useMemo(() => {
    const s = new Set<TimeSlotId>();
    for (const d of dates) {
      for (const id of orderedByDate[d] ?? []) {
        s.add(id);
      }
    }
    return s;
  }, [dates, orderedByDate]);

  const resident = RESIDENTS.find((r) => r.id === residentId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const remote = await fetchPreferences(residentId);
        if (cancelled || userEditedRef.current) return;
        if (remote) {
          setOrderedByDate(
            mergeLoaded(dates, remote.orderedSlotIdsByDate)
          );
        }
      } catch {
        /* keep initial local state */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate once on first paint
  }, []);

  useEffect(() => {
    saveOrderedSlotsByDate(residentId, orderedByDate);
  }, [residentId, orderedByDate]);

  const rowLabel = useCallback(
    (slotId: TimeSlotId) => slotById.get(slotId)?.label ?? slotId,
    [slotById]
  );

  const fullSlotLabel = useCallback(
    (slotId: TimeSlotId) => {
      const slot = slotById.get(slotId);
      if (!slot) return slotId;
      return `${formatDayLabel(slot.date)} · ${slot.label}`;
    },
    [slotById]
  );

  const handleResidentSelect = async (nextId: ResidentId) => {
    if (nextId === residentId) return;
    saveOrderedSlotsByDate(residentId, orderedByDate);
    try {
      await putPreferences(residentId, orderedByDate);
    } catch {
      /* still switch; local cache remains */
    }
    setResidentId(nextId);
    const local = loadOrderedSlotsByDate(nextId);
    try {
      const remote = await fetchPreferences(nextId);
      setOrderedByDate(
        mergeLoaded(dates, remote?.orderedSlotIdsByDate ?? local ?? null)
      );
    } catch {
      setOrderedByDate(mergeLoaded(dates, local ?? null));
    }
  };

  const toggleSlot = (slotId: TimeSlotId) => {
    userEditedRef.current = true;
    const { date } = parseSlotId(slotId);
    setOrderedByDate((prev) => {
      const day = [...(prev[date] ?? [])];
      const idx = day.indexOf(slotId);
      if (idx >= 0) {
        day.splice(idx, 1);
      } else {
        day.push(slotId);
      }
      return { ...prev, [date]: day };
    });
    setSaveHint(null);
  };

  const moveUp = (date: string, index: number) => {
    userEditedRef.current = true;
    if (index <= 0) return;
    setOrderedByDate((prev) => {
      const day = [...(prev[date] ?? [])];
      [day[index - 1], day[index]] = [day[index], day[index - 1]];
      return { ...prev, [date]: day };
    });
  };

  const moveDown = (date: string, index: number) => {
    userEditedRef.current = true;
    setOrderedByDate((prev) => {
      const day = [...(prev[date] ?? [])];
      if (index >= day.length - 1) return prev;
      [day[index], day[index + 1]] = [day[index + 1], day[index]];
      return { ...prev, [date]: day };
    });
  };

  const handleClear = async () => {
    const empty = emptyOrderedForDates(dates);
    setOrderedByDate(empty);
    clearOrderedSlots(residentId);
    try {
      await putPreferences(residentId, empty);
      setSaveHint("Cleared (server + this device).");
    } catch {
      setSaveHint("Cleared on this device (server unreachable).");
    }
  };

  const handleSave = async () => {
    const name = resident?.name ?? residentId;
    const payload = preferencesToPayload(
      residentId,
      name,
      orderedByDate,
      dates
    );
    saveOrderedSlotsByDate(residentId, orderedByDate);

    try {
      await putPreferences(residentId, orderedByDate);
      setSaveDialog({
        variant: "success",
        title: "Save successful",
        details:
          "Your preferences were saved to this device and the backend. The daily scheduler will use them when placing the gym call.",
      });
    } catch {
      setSaveDialog({
        variant: "error",
        title: "Server unreachable",
        details:
          "Preferences were saved only in this browser. Start the backend or check your network, then try Save again.",
      });
    }
    if (import.meta.env.DEV) {
      console.log("[BookingPreferencePayload]", payload);
    }
  };

  return (
    <div className="pb-safe min-h-dvh">
      <SaveResultDialog
        state={saveDialog}
        onDismiss={() => setSaveDialog(null)}
      />
      <header className="border-b border-slate-800 bg-slate-950/90 px-4 py-4 backdrop-blur md:px-8">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500/90">
            Apartment gym
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white md:text-3xl">
            Golf simulator booking
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Pick preferred 1-hour windows starting tomorrow (today is not
            bookable). Rank times within each day (#1 = best that day).
            Preferences sync to the API when you save and stay cached in your
            browser.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-6 md:px-8">
        <ResidentSelector
          residents={RESIDENTS}
          selectedId={residentId}
          onSelect={handleResidentSelect}
        />

        <WeekTimeline
          dates={dates}
          slotsByDate={slotsByDate}
          selectedSlotIds={selectedSet}
          onToggleSlot={toggleSlot}
        />

        <div className="grid gap-8 lg:grid-cols-2">
          <SlotPriorityList
            dates={dates}
            orderedByDate={orderedByDate}
            rowLabel={rowLabel}
            ariaLabelForSlot={fullSlotLabel}
            onMoveUp={moveUp}
            onMoveDown={moveDown}
          />
          <PreferenceSummary
            resident={resident}
            dates={dates}
            orderedByDate={orderedByDate}
            timeOnlyLabel={rowLabel}
          />
        </div>

        {saveHint && (
          <p
            className="text-center text-sm text-emerald-400/90"
            role="status"
          >
            {saveHint}
          </p>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-800 bg-slate-950/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur md:py-4">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={handleClear}
            className="min-h-12 rounded-xl border border-slate-600 px-5 text-sm font-semibold text-slate-200 hover:bg-slate-800"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="min-h-12 rounded-xl bg-accent px-5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-900/30 hover:bg-emerald-400"
          >
            Save preferences
          </button>
        </div>
      </div>
    </div>
  );
}
