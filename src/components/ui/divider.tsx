import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils.ts";

export const Divider = ({
  className,
  simple,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  simple?: boolean;
  children?: ReactNode;
}) =>
  simple ? (
    <div
      className={cn("w-full border-t border-border", className)}
      {...props}
    />
  ) : (
    <div className={cn("flex items-center", className)} {...props}>
      <div className="w-full border-t border-border"></div>
      <div className="relative flex justify-center">
        <span className="px-2 text-border">{children ? children : "✧"}</span>
      </div>
      <div className="w-full border-t border-border"></div>
    </div>
  );
