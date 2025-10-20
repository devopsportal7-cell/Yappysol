
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary action - High emphasis
        primary: "bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 text-white shadow-lg hover:shadow-xl hover:scale-105 focus-visible:ring-orange-500/50 active:scale-95",
        
        // Secondary action - Medium emphasis
        secondary: "bg-transparent border-2 border-orange-500/30 text-gray-900 dark:text-white hover:bg-orange-500/10 hover:border-orange-500/50 hover:scale-105 focus-visible:ring-orange-500/50 active:scale-95",
        
        // Tertiary action - Low emphasis
        tertiary: "bg-transparent border-2 border-orange-500/30 text-orange-500 hover:bg-orange-500/10 hover:border-orange-500/50 hover:scale-105 focus-visible:ring-orange-500/50 active:scale-95",
        
        // Destructive action
        destructive: "bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500/50",
        
        // Ghost action
        ghost: "hover:bg-orange-500/10 hover:text-orange-400 focus-visible:ring-orange-500/50",
        
        // Link action
        link: "text-orange-500 underline-offset-4 hover:underline focus-visible:ring-orange-500/50",
      },
      size: {
        sm: "h-9 px-4 py-2 text-sm",
        md: "h-11 px-6 py-3 text-base",
        lg: "h-14 px-8 py-4 text-lg font-semibold",
        xl: "h-16 px-10 py-5 text-xl font-bold",
        icon: "h-10 w-10",
      },
      loading: {
        true: "cursor-wait",
        false: "",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      loading: false,
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    loading = false,
    leftIcon,
    rightIcon,
    children,
    disabled,
    asChild = false, 
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, loading, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {!loading && leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
        {children}
        {!loading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
