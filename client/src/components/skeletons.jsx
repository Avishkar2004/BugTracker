import { Skeleton } from "./ui.jsx";

/*
 * Loading placeholders shaped like the screens they stand in for.
 *
 * The `min-h-*` values here are duplicated on the real components so the swap
 * from skeleton to data never moves anything: reserve the space, then fill it.
 */

export const STAT_CARD_H = "min-h-[7.25rem]";
export const CHART_BODY_H = "min-h-[13.5rem]";

function PageHeaderSkeleton({ action = true }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56 rounded-md" />
        <Skeleton className="h-4 w-72 rounded" index={1} />
      </div>
      {action && <Skeleton className="h-9 w-32 rounded-md" index={2} />}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-5" aria-busy="true" aria-label="Loading dashboard">
      <PageHeaderSkeleton />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={`card flex flex-col justify-between p-4 ${STAT_CARD_H}`}>
            <Skeleton className="h-3 w-20 rounded" index={i} />
            <Skeleton className="mt-3 h-8 w-14 rounded-md" index={i} />
            <Skeleton className="mt-3 h-1 w-full rounded-full" index={i} />
            <Skeleton className="mt-2 h-3 w-24 rounded" index={i} />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <Skeleton className="h-3 w-40 rounded" />
          <div className={`mt-4 ${CHART_BODY_H}`}>
            <Skeleton className="h-32 w-full rounded-md" index={1} />
          </div>
        </section>
        <section className="card p-5">
          <Skeleton className="h-3 w-24 rounded" />
          <div className={`mt-4 flex items-center gap-6 ${CHART_BODY_H}`}>
            <Skeleton className="size-40 shrink-0 rounded-full" index={2} />
          </div>
        </section>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, card) => (
          <section key={card} className="card p-5">
            <Skeleton className="h-3 w-28 rounded" index={card} />
            <ul className="mt-4 space-y-3">
              {Array.from({ length: 5 }, (_, row) => (
                <li key={row} className="flex items-center gap-3">
                  <Skeleton className="size-7 shrink-0 rounded-full" index={row} />
                  <Skeleton className="h-3 flex-1 rounded" index={row} />
                  <Skeleton className="h-4 w-8 rounded" index={row} />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

/** Table body placeholder — drops straight into the real <tbody>. */
export function BugRowsSkeleton({ rows = 8 }) {
  return (
    <tbody aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <tr key={i} className="border-t border-line">
          <td className="px-3 py-3.5">
            <Skeleton className="size-4 rounded-xs" index={i} />
          </td>
          <td className="px-3 py-3.5">
            <Skeleton className="h-4 w-2/3 max-w-sm rounded" index={i} />
            <Skeleton className="mt-2 h-3 w-24 rounded" index={i} />
          </td>
          <td className="px-3 py-3.5">
            <Skeleton className="h-5 w-24 rounded-full" index={i} />
          </td>
          <td className="px-3 py-3.5">
            <Skeleton className="h-5 w-20 rounded-full" index={i} />
          </td>
          <td className="px-3 py-3.5">
            <div className="flex items-center gap-2">
              <Skeleton className="size-6 shrink-0 rounded-full" index={i} />
              <Skeleton className="h-3 w-20 rounded" index={i} />
            </div>
          </td>
          <td className="px-3 py-3.5">
            <Skeleton className="h-3 w-16 rounded" index={i} />
          </td>
        </tr>
      ))}
    </tbody>
  );
}

/** Mobile equivalent of the table rows. */
export function BugCardsSkeleton({ rows = 5 }) {
  return (
    <ul className="divide-y divide-line" aria-busy="true">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="space-y-2.5 p-4">
          <Skeleton className="h-3 w-16 rounded" index={i} />
          <Skeleton className="h-4 w-4/5 rounded" index={i} />
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-5 w-24 rounded-full" index={i} />
            <Skeleton className="h-5 w-20 rounded-full" index={i} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function BugDetailSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-4" aria-busy="true" aria-label="Loading bug">
      <Skeleton className="h-4 w-32 rounded" />

      <header className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-6 w-80 max-w-full rounded-md" index={1} />
            <Skeleton className="h-3 w-64 max-w-full rounded" index={2} />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-5 w-24 rounded-full" index={1} />
            <Skeleton className="h-5 w-20 rounded-full" index={2} />
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1fr_19rem]">
        <div className="space-y-4">
          {[4, 2, 3].map((lines, card) => (
            <section key={card} className="card space-y-3 p-5">
              <Skeleton className="h-3 w-28 rounded" index={card} />
              {Array.from({ length: lines }, (_, line) => (
                <Skeleton
                  key={line}
                  className={`h-3 rounded ${line === lines - 1 ? "w-2/3" : "w-full"}`}
                  index={line}
                />
              ))}
            </section>
          ))}
        </div>
        <aside className="space-y-4">
          <section className="card space-y-4 p-5">
            <Skeleton className="h-3 w-20 rounded" />
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="space-y-1.5">
                <Skeleton className="h-2.5 w-16 rounded" index={i} />
                <Skeleton className="h-9 w-full rounded-md" index={i} />
              </div>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}

export function TeamSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-4" aria-busy="true" aria-label="Loading team">
      <PageHeaderSkeleton action={false} />
      <ul className="card divide-y divide-line">
        {Array.from({ length: 5 }, (_, i) => (
          <li key={i} className="flex items-center gap-3 p-4">
            <Skeleton className="size-10 shrink-0 rounded-full" index={i} />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-40 rounded" index={i} />
              <Skeleton className="h-3 w-56 max-w-full rounded" index={i} />
            </div>
            <Skeleton className="h-9 w-36 shrink-0 rounded-md" index={i} />
          </li>
        ))}
      </ul>
    </div>
  );
}
