import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary: "bg-orange-500 text-white shadow-[0_8px_20px_-8px_rgb(255_122_26/0.7)] hover:bg-orange-600",
        night: "bg-night-900 text-white hover:bg-night-800",
        electric: "bg-electric-500 text-white hover:bg-electric-400",
        outline: "border border-line bg-white text-night-900 hover:border-night-900/30 hover:bg-surface",
        ghost: "text-night-900 hover:bg-surface",
        danger: "bg-red-600 text-white hover:bg-red-700",
        link: "text-electric-500 underline-offset-4 hover:underline px-0",
      },
      size: { sm: "h-9 px-3", md: "h-11 px-5", lg: "h-13 px-7 text-base", icon: "size-10" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
});
Button.displayName = "Button";
