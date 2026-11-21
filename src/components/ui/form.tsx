import * as React from "react";
import { cn } from "@/lib/utils";

const field = "w-full rounded-xl border border-line bg-white px-3.5 text-sm text-ink placeholder:text-muted/70 transition focus:border-electric-500 focus:outline-none focus:ring-4 focus:ring-electric-500/15 disabled:bg-surface aria-[invalid=true]:border-red-500";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(field, "h-11", className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(field, "min-h-28 py-3", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn(field, "h-11 pr-8", className)} {...props} />
));
Select.displayName = "Select";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-sm font-medium text-night-900", className)} {...props} />;
}

export function Field({ label, htmlFor, error, hint, children, className }: { label: string; htmlFor?: string; error?: string | null; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-red-600" role="alert">{error}</p>}
    </div>
  );
}

export function Checkbox({ label, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5 text-sm text-ink", className)}>
      <input type="checkbox" className="mt-0.5 size-4 rounded border-line accent-orange-500" {...props} />
      <span>{label}</span>
    </label>
  );
}
