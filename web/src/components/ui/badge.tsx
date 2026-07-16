import type * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
  {
    variants: {
      tone: {
        slate: "bg-slate-50 text-slate-600 ring-slate-200",
        blue: "bg-blue-50 text-blue-700 ring-blue-200",
        amber: "bg-amber-50 text-amber-700 ring-amber-200",
        green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        red: "bg-rose-50 text-rose-700 ring-rose-200",
        brand: "bg-brand-50 text-brand-700 ring-brand-200",
      },
    },
    defaultVariants: { tone: "slate" },
  },
);

const DOT: Record<string, string> = {
  slate: "bg-slate-400",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  green: "bg-emerald-500",
  red: "bg-rose-500",
  brand: "bg-brand-500",
};

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, tone, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", DOT[tone ?? "slate"])} />}
      {children}
    </span>
  );
}
