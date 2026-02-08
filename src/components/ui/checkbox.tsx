import * as React from "react";

import { cn } from "@/lib/utils";

function Checkbox({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type="checkbox"
      className={cn("input-checkbox", className)}
      {...props}
    />
  );
}

export { Checkbox };
