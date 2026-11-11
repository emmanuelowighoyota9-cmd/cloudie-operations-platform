import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode, SVGProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Tiny, dependency-free sparkline.
 *
 * A single polyline with a soft area fill, both driven by `currentColor` so the
 * parent controls the tint. Empty or single-point data render as a flat baseline
 * instead of collapsing.
 */
export function Sparkline({
  data,
  className,
  width = 76,
  height = 28,
  padding = 3,
}: {
  data: readonly number[];
  className?: string;
  width?: number;
  height?: number;
  padding?: number;
}) {
  const values =
    data.length >= 2 ? data : data.length === 1 ? [data[0], data[0]] : [0, 0];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const x = (i: number) =>
    padding + (i * (width - padding * 2)) / (values.length - 1);
  const y = (v: number) =>
    height - padding - ((v - min) / span) * (height - padding * 2);
  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const lastX = x(values.length - 1);
  const lastY = y(values[values.length - 1]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-full w-full", className)}
      preserveAspectRatio="none"
      aria-hidden
      focusable="false"
    >
      <polygon
        points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
        fill="currentColor"
        fillOpacity={0.12}
      />
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lastX} cy={lastY} r={1.9} fill="currentColor" />
    </svg>
  );
}

/**
 * Mini sparkline grid for KPI cards.
 *
 * Three short series buckets so a stat card can show trend shape without
 * reaching for a charting library. Tint is inherited from `color` so the card
 * stays in control of the palette.
 */
export function SparklineGrid({
  data,
  className,
  color,
}: {
  data: readonly number[];
  className?: string;
  color?: string;
}) {
  const reduced = useReducedMotion();
  const series = d3BucketSeries(data);
  const rows = series.map((bucket, i) => {
    const bucketData: readonly number[] = bucket;
    return (
      <Sparkline
        key={i}
        data={bucketData}
        width={44}
        height={18}
        padding={3}
        className={cn(
          "h-full w-full",
          reduced ? "opacity-60" : "opacity-90",
          i === series.length - 1 && "color-[var(--cloudie-chart-1)]",
        )}
      />
    );
  });
  if (reduced) {
    return (
      <div className={className} style={{ color }}>
        {rows}
      </div>
    );
  }
  return (
    <div className={cn("flex items-end gap-1.5", className)} style={{ color }}>
      {rows}
    </div>
  );
}

function d3BucketSeries(data: readonly number[]): readonly number[][] {
  if (data.length < 2) {
    const single: readonly number[] = data;
    return [single];
  }
  const sorted = [...data].sort((a, b) => a - b);
  const count = sorted.length;
  const bucketCount = Math.min(3, count);
  const buckets: number[][] = Array.from({ length: bucketCount }, () => []);
  for (let i = 0; i < count; i += 1) {
    buckets[i % bucketCount].push(sorted[i]);
  }
  const out: readonly number[][] = buckets.filter((b) => b.length > 0) as readonly number[][];
  return out;
}

/**
 * Shared motion primitives.
 *
 * Every route animates through these so timing, easing, and distance stay
 * consistent across ~100 screens. All of them degrade to an instant,
 * non-animated render when the user prefers reduced motion, and every
 * transition animates only `transform`/`opacity` so nothing triggers layout.
 */

export const EASE_OUT_QUINT = [0.22, 1, 0.36, 1] as const;

/** Shared page-level motion: content rises and settles. */
export const pageVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.34, ease: EASE_OUT_QUINT },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.16, ease: "easeIn" },
  },
};

/** Container that staggers its `Reveal` children. */
export const staggerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.055, delayChildren: 0.04 },
  },
};

export const revealVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: EASE_OUT_QUINT },
  },
};

/**
 * Wrap a page's content so it fades up on mount and on route change.
 * Keyed by pathname in `main.tsx`, which is what replays the animation.
 */
export function PageTransition({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={pageVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}

/**
 * A single block that rises into view. Use inside `StaggerGroup` for lists and
 * grids; standalone for single cards.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={revealVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggers its `Reveal`/`StaggerItem` children on mount.
 *
 * Only animates children already in view on mount, so it is safe for long
 * pages — nothing below the fold waits on an animation the user never sees.
 */
export function StaggerGroup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={staggerVariants}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

/** Child of `StaggerGroup`; inherits the parent's stagger timing. */
export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div className={className} variants={revealVariants}>
      {children}
    </motion.div>
  );
}

/** Gentle attention pulse for live/urgent rows. Decorative only. */
export function PulseBadge({ children, className }: { children: ReactNode; className?: string }) {
  const reduced = useReducedMotion();
  if (reduced) return <span className={className}>{children}</span>;

  return (
    <motion.span
      className={className}
      animate={{ opacity: [1, 0.55, 1] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.span>
  );
}
