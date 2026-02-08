import * as React from "react";
import { Textarea } from "@/components/ui/textarea.tsx";
import { useId } from "react";

function TextAreaLabel({
  label,
  id: idProp,
  ...props
}: React.ComponentProps<typeof Textarea> & { label: string }) {
  const randomId = useId();
  const id = idProp || randomId;
  return (
    <div>
      <label htmlFor={id} className="input-label">
        {label}
      </label>
      <Textarea id={id} {...props} />
    </div>
  );
}

export { TextAreaLabel };
