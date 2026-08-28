import { EnvelopeIcon } from "@/components/auth/auth-form-icon";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import type { InputHTMLAttributes } from "react";

type AuthEmailInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function AuthEmailInput({ className, ...props }: AuthEmailInputProps) {
  return (
    <div className="relative">
      <EnvelopeIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <Input
        type="email"
        className={cn("h-11 pl-10", className)}
        {...props}
      />
    </div>
  );
}
