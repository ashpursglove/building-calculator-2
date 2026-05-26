import clsx from "clsx";
import { useState, type ReactNode } from "react";

export function Btn(props: {
  children: ReactNode;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className={clsx(
        "rounded px-3 py-1.5 text-sm transition",
        props.primary ?
          "bg-teal-500 font-semibold text-zinc-950 hover:bg-teal-400"
        : "border border-zinc-600 bg-zinc-900 text-zinc-100 hover:bg-zinc-800",
        props.disabled && "cursor-not-allowed opacity-50",
        props.className,
      )}
    >
      {props.children}
    </button>
  );
}

export function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-400">
        <span>{label}</span>
        {help ?
          <HelpIcon text={help} />
        : null}
      </span>
      {children}
    </label>
  );
}

export function HelpIcon({ text }: { text: string }) {
  return (
    <span
      role="img"
      aria-label={`Help: ${text}`}
      title={text}
      className="inline-flex h-4 w-4 cursor-help select-none items-center justify-center rounded-full border border-zinc-700 bg-zinc-800 text-[10px] font-bold text-zinc-300 hover:border-teal-500 hover:text-teal-200"
    >
      i
    </span>
  );
}

export function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
      <h2 className="mb-4 text-base font-semibold text-teal-200">{title}</h2>
      {children}
    </section>
  );
}

export function numInputCls() {
  return "w-full max-w-[12rem] rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-zinc-100 outline-none ring-teal-500/70 focus-visible:ring-2 placeholder:text-zinc-500";
}

function clampNum(n: number, min?: number, max?: number): number {
  let v = n;
  if (min !== undefined) v = Math.max(min, v);
  if (max !== undefined) v = Math.min(max, v);
  return v;
}

/**
 * Numeric input: when the stored value is 0, shows a ghost "0" until focused,
 * then the field is empty so you can type without deleting first.
 */
export function GhostNumberInput(props: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  step?: number | string;
  min?: number;
  max?: number;
  disabled?: boolean;
  /** When true (default), value 0 displays as empty with ghost placeholder. */
  ghostZero?: boolean;
  ghostPlaceholder?: string;
  placeholder?: string;
  integer?: boolean;
}) {
  const {
    value,
    onChange,
    className,
    step,
    min,
    max,
    disabled,
    ghostZero = true,
    ghostPlaceholder = "0",
    placeholder,
    integer = false,
  } = props;

  const [focused, setFocused] = useState(false);
  const [text, setText] = useState<string | null>(null);

  const showGhost = ghostZero && value === 0 && !focused;
  const inputValue =
    focused ? text ?? ""
    : ghostZero && value === 0 ? ""
    : String(value);
  const ph = showGhost ? ghostPlaceholder : placeholder;

  const commit = (raw: string) => {
    if (raw === "" || raw === "-") {
      onChange(min !== undefined && min > 0 ? min : 0);
      return;
    }
    let n = Number(raw);
    if (!Number.isFinite(n)) return;
    if (integer) n = Math.floor(n);
    onChange(clampNum(n, min, max));
  };

  return (
    <input
      type="number"
      step={step}
      min={min}
      max={max}
      disabled={disabled}
      placeholder={ph}
      className={clsx(numInputCls(), className)}
      value={inputValue}
      onFocus={() => {
        setFocused(true);
        setText(ghostZero && value === 0 ? "" : String(value));
      }}
      onBlur={() => {
        if (text !== null) commit(text);
        setFocused(false);
        setText(null);
      }}
      onChange={(ev) => {
        const raw = ev.target.value;
        setText(raw);
        if (raw === "" || raw === "-") {
          if (!ghostZero) onChange(min !== undefined && min > 0 ? min : 0);
          return;
        }
        let n = Number(raw);
        if (!Number.isFinite(n)) return;
        if (integer) n = Math.floor(n);
        onChange(clampNum(n, min, max));
      }}
    />
  );
}

/** Optional rate/override: null uses ghost placeholder until a number is entered. */
export function GhostOptionalNumberInput(props: {
  value: number | null;
  onChange: (value: number | null) => void;
  className?: string;
  step?: number | string;
  min?: number;
  disabled?: boolean;
  emptyPlaceholder?: string;
}) {
  const {
    value,
    onChange,
    className,
    step,
    min,
    disabled,
    emptyPlaceholder = "default",
  } = props;

  const [focused, setFocused] = useState(false);
  const [text, setText] = useState<string | null>(null);

  const inputValue =
    focused ? text ?? ""
    : value === null ? ""
    : String(value);

  return (
    <input
      type="number"
      step={step}
      min={min}
      disabled={disabled}
      placeholder={emptyPlaceholder}
      className={clsx(numInputCls(), className)}
      value={inputValue}
      onFocus={() => {
        setFocused(true);
        setText(value === null ? "" : String(value));
      }}
      onBlur={() => {
        const raw = text ?? "";
        if (raw === "") onChange(null);
        else {
          const n = Number(raw);
          if (Number.isFinite(n)) onChange(clampNum(n, min));
        }
        setFocused(false);
        setText(null);
      }}
      onChange={(ev) => {
        const raw = ev.target.value;
        setText(raw);
        if (raw === "") {
          onChange(null);
          return;
        }
        const n = Number(raw);
        if (Number.isFinite(n)) onChange(clampNum(n, min));
      }}
    />
  );
}

/** Shared data-table chrome (matches CapEx line-item tables). */
export const plannerTableMinWidth = "min-w-[760px]";

/** Fixed column widths — use the same class on matching `PlannerTh` and `PlannerTd`. */
export const plannerColOn = "w-12";
export const plannerColNumericSm = "w-[5.5rem]";
export const plannerColNumeric = "w-[7rem]";
export const plannerColNumericLg = "w-[8.5rem]";
export const plannerColActions = "w-16";
export const plannerColSelect = "w-[8rem]";
export const plannerColSelectWide = "w-[9rem]";

/** Narrower columns for wide CapEx / line-item tables (9+ columns). */
export const plannerColCapSelect = "w-[6.5rem]";
export const plannerColCapSelectWide = "w-[7rem]";
export const plannerColCapNumeric = "w-[6rem]";
export const plannerColCapNumericSm = "w-[4.25rem]";
export const plannerColCapNumericLg = "w-[7rem]";

export function plannerTableClass(minWidth = plannerTableMinWidth) {
  return clsx("w-full table-fixed border-collapse text-sm", minWidth);
}

/** Numeric input styled for fixed-width table columns (fills cell, centered text). */
export function plannerTableNumericInputCls(className?: string) {
  return clsx(
    "w-full max-w-none rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-center text-zinc-100 outline-none ring-teal-500/70 focus-visible:ring-2 placeholder:text-zinc-500",
    className,
  );
}

export function PlannerThead({ children }: { children: ReactNode }) {
  return (
    <thead className="text-xs uppercase tracking-wide text-zinc-400">
      {children}
    </thead>
  );
}

export function PlannerHeadRow({ children }: { children: ReactNode }) {
  return <tr className="border-b border-zinc-800">{children}</tr>;
}

export function PlannerTh(props: {
  children: ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}) {
  const align = props.align ?? "left";
  return (
    <th
      className={clsx(
        "px-1 py-2 font-medium",
        align === "center" ? "text-center"
        : align === "right" ? "text-right"
        : "text-left",
        props.className,
      )}
    >
      {props.children}
    </th>
  );
}

export function PlannerTd(props: {
  children: ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}) {
  const align = props.align ?? "left";
  return (
    <td
      className={clsx(
        "px-1 py-2 align-middle",
        align === "center" ? "text-center"
        : align === "right" ? "text-right"
        : "text-left",
        props.className,
      )}
    >
      {props.children}
    </td>
  );
}

/** Table column header with explicit unit, e.g. "Length" + "(m)" => "Length (m)". */
export function UnitTh(props: {
  label: string;
  unit: string;
  help?: string;
  align?: "left" | "center" | "right";
  size?: "sm" | "md";
  className?: string;
}) {
  const colClass =
    props.size === "sm" ? plannerColNumericSm : plannerColNumeric;
  return (
    <PlannerTh
      align={props.align ?? "center"}
      className={clsx(colClass, props.className)}
    >
      {props.label} ({props.unit})
      {props.help ?
        <> <HelpIcon text={props.help} /></>
      : null}
    </PlannerTh>
  );
}
