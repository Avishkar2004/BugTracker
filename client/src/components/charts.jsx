import { useEffect, useRef, useState } from "react";

/**
 * Small dependency-free SVG charts, sized to fill their container.
 *
 * Every colour arrives as a `var(--token)` string from lib/constants.js, so the
 * charts re-tint on a theme flip without React re-rendering.
 */

/*
 * Flips to true one painted frame after mount. Charts render at their zero state
 * first and then transition to the real value, which is what makes bars grow and
 * arcs sweep instead of snapping in. Two frames are needed: the first commits the
 * zero state, the second starts the transition.
 */
function useEnter(key) {
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    setEntered(false);
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [key]);
  return entered;
}

/** Thin share-of-total bar. Used on the dashboard stat cards. */
export function Meter({ value, max, color = "var(--brand)", label }) {
  const entered = useEnter(`${value}/${max}`);
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <span
      className="block h-1 w-full overflow-hidden rounded-full bg-sunken"
      role="img"
      aria-label={label}
    >
      <span
        className="block h-full rounded-full"
        style={{
          width: `${entered ? pct : 0}%`,
          backgroundColor: color,
          transition: "width var(--dur-slow) var(--ease-smooth)",
        }}
      />
    </span>
  );
}

export function BarBreakdown({ data, colors }) {
  const entered = useEnter(data.map((d) => d.count).join(","));
  const max = Math.max(1, ...data.map((d) => d.count));

  return (
    <ul className="space-y-2.5">
      {data.map((row, i) => (
        <li key={row.key} className="grid grid-cols-[6.5rem_1fr_2.25rem] items-center gap-3">
          <span className="flex min-w-0 items-center gap-1.5">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: colors[row.key] }}
              aria-hidden="true"
            />
            <span className="truncate text-xs text-fg-muted">{row.key}</span>
          </span>
          <span className="h-2 overflow-hidden rounded-full bg-sunken">
            <span
              className="block h-full rounded-full"
              style={{
                width: `${entered ? (row.count / max) * 100 : 0}%`,
                backgroundColor: colors[row.key],
                transition: "width var(--dur-slow) var(--ease-smooth)",
                transitionDelay: `${i * 50}ms`,
              }}
            />
          </span>
          <span className="tabular text-right text-sm font-semibold text-fg">{row.count}</span>
        </li>
      ))}
    </ul>
  );
}

export function Donut({ data, colors, size = 160, thickness = 18 }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const entered = useEnter(`${total}:${data.map((d) => d.count).join(",")}`);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const segments = data
    .filter((d) => d.count > 0)
    .map((d) => {
      const length = total > 0 ? (d.count / total) * circumference : 0;
      const segment = { ...d, length, offset };
      offset += length;
      return segment;
    });

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0"
        role="img"
        aria-label={`Priority breakdown of ${total} bugs`}
      >
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--sunken)"
            strokeWidth={thickness}
          />
          {segments.map((seg, i) => (
            <circle
              key={seg.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={colors[seg.key]}
              strokeWidth={thickness}
              strokeLinecap="butt"
              /* Sweeps from 0 to its real arc length, anchored at its own start. */
              strokeDasharray={`${entered ? seg.length : 0} ${circumference}`}
              strokeDashoffset={-seg.offset}
              style={{
                transition: "stroke-dasharray var(--dur-slow) var(--ease-smooth)",
                transitionDelay: `${i * 60}ms`,
              }}
            />
          ))}
        </g>
        <text
          x="50%"
          y="48%"
          textAnchor="middle"
          fill="var(--fg)"
          style={{ fontSize: 28, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
        >
          {total}
        </text>
        <text
          x="50%"
          y="63%"
          textAnchor="middle"
          fill="var(--fg-subtle)"
          style={{ fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}
        >
          bugs
        </text>
      </svg>

      <ul className="w-full space-y-1.5 text-sm">
        {data.map((row, i) => (
          <li
            key={row.key}
            className="fade flex items-center gap-2"
            style={{ "--i": i + 1 }}
          >
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: colors[row.key] }}
              aria-hidden="true"
            />
            <span className="min-w-0 truncate text-fg-muted">{row.key}</span>
            <span className="tabular ml-auto font-semibold text-fg">{row.count}</span>
            <span className="tabular w-9 text-right text-xs text-fg-subtle">
              {total > 0 ? `${Math.round((row.count / total) * 100)}%` : "0%"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TrendChart({ data, height = 130 }) {
  const pathRef = useRef(null);
  const [dash, setDash] = useState(0);
  const width = 640;

  const max = Math.max(1, ...data.map((d) => d.opened));
  const stepX = width / Math.max(1, data.length - 1);
  const points = data.map((d, i) => [
    i * stepX,
    height - (d.opened / max) * (height - 16) - 8,
  ]);
  const line = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;

  // The stroke-dash reveal needs the real path length; measure it after layout.
  useEffect(() => {
    if (!data.length || !pathRef.current) return;
    setDash(pathRef.current.getTotalLength());
  }, [line, data.length]);

  if (!data.length) return null;

  const last = points[points.length - 1];
  const peak = Math.max(...data.map((d) => d.opened));

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-32 w-full overflow-visible"
        role="img"
        aria-label={`Bugs opened per day, peaking at ${peak}`}
      >
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.26" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Quarter gridlines give the line something to sit against. */}
        {[0.25, 0.5, 0.75].map((fraction) => (
          <line
            key={fraction}
            x1="0"
            x2={width}
            y1={height * fraction}
            y2={height * fraction}
            stroke="var(--line)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        <path
          d={area}
          fill="url(#trendFill)"
          className="fade"
          style={{ "--i": 2 }}
        />
        <path
          ref={pathRef}
          d={line}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          className={dash ? "draw" : undefined}
          style={{ "--dash": dash, opacity: dash ? 1 : 0 }}
        />
      </svg>

      {/* Rendered outside the stretched viewBox so the marker stays a circle. */}
      <div className="pointer-events-none relative -mt-32 h-32" aria-hidden="true">
        <span
          className="pop absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand ring-2 ring-raised"
          style={{
            left: "100%",
            top: `${(last[1] / height) * 100}%`,
            "--i": 4,
          }}
        />
      </div>

      <div className="mt-2 flex justify-between text-xs text-fg-subtle">
        <span>{data[0].date}</span>
        <span>{data[data.length - 1].date}</span>
      </div>
    </div>
  );
}
