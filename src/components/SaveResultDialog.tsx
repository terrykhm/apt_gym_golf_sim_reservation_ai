import { useEffect, useRef } from "react";

export type SaveResultVariant = "success" | "partial" | "error";

export interface SaveResultDialogProps {
  /** When non-null, dialog opens with this content */
  state: {
    variant: SaveResultVariant;
    title: string;
    details: string;
  } | null;
  onDismiss: () => void;
}

export function SaveResultDialog({ state, onDismiss }: SaveResultDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (state) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [state]);

  const variant = state?.variant ?? "success";
  const accent =
    variant === "success"
      ? "text-emerald-400"
      : variant === "partial"
        ? "text-amber-400"
        : "text-red-400";
  const ring =
    variant === "success"
      ? "ring-emerald-500/40"
      : variant === "partial"
        ? "ring-amber-500/40"
        : "ring-red-500/40";

  return (
    <dialog
      ref={ref}
      className={`max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-0 text-slate-100 shadow-2xl ring-2 backdrop:bg-black/60 ${ring}`}
      onClose={onDismiss}
    >
      {state && (
        <div className="p-6">
          <h2 className={`text-lg font-semibold ${accent}`}>{state.title}</h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
            {state.details}
          </p>
          <form method="dialog" className="mt-6 flex justify-end">
            <button
              type="submit"
              className="min-h-11 min-w-[5.5rem] rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-900 hover:bg-white"
            >
              OK
            </button>
          </form>
        </div>
      )}
    </dialog>
  );
}
