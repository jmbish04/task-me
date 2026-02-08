import * as React from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox.tsx";
import { useId } from "react";

function CheckboxLabel({
  className,
  label,
  id: idProp,
  ...props
}: React.ComponentProps<typeof Checkbox> & { label: string }) {
  const randomId = useId();
  const id = idProp || randomId;
  return (
    <div className="flex items-center">
      <Checkbox
        id={id}
        className={cn("input-checkbox", className)}
        {...props}
      />
      <label htmlFor={id} className="input-label ml-2">
        {label}
      </label>
    </div>
  );
}

export { CheckboxLabel };
