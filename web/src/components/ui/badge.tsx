import type * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        slate: "bg-slate-100 text-slate-700",
        blue: "bg-blue-100 text-blue-700",
        amber: "bg-amber-100 text-amber-800",
        green: "bg-emerald-100 text-emerald-700",
        red: "bg-red-100 text-red-700",
      },
    },
    defaultVariants: { tone: "slate" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
