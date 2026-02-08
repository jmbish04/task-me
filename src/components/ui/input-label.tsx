import * as React from "react";
import { Input } from "@/components/ui/input.tsx";
import { useId } from "react";

function InputLabel({
  label,
  id: idProp,
  ref,
  ...props
}: React.ComponentPropsWithRef<typeof Input> & { label: string }) {
  const randomId = useId();
  const id = idProp || randomId;
  return (
    <div>
      <label htmlFor={id} className="input-label">
        {label}
      </label>
      <Input id={id} ref={ref} {...props} />
    </div>
  );
}

export { InputLabel };
