import * as React from "react"
import { cn } from "../../../lib/utils"

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string
    value: string | number
    suffix?: string
    icon?: string | React.ReactNode
    showProgress?: boolean
    progressPercent?: number
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
    ({ title, value, suffix, icon, showProgress, progressPercent = 0, className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "flex flex-col gap-2 rounded-xl border bg-card p-6 text-card-foreground shadow-sm transition-all hover:shadow-md",
                    showProgress && "min-w-[280px]",
                    className
                )}
                {...props}
            >
                <div className="flex items-start gap-4">
                    {icon && (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-xl text-primary">
                            {typeof icon === 'string' ? <span dangerouslySetInnerHTML={{ __html: icon }} /> : icon}
                        </div>
                    )}
                    <div className="flex flex-1 flex-col">
                        <span className="text-sm font-medium text-muted-foreground">{title}</span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold tracking-tight">{value}</span>
                            {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
                        </div>
                    </div>
                </div>
                {showProgress && (
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                            className="h-full bg-primary transition-all duration-500 ease-in-out"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                )}
            </div>
        )
    }
)
StatCard.displayName = "StatCard"

export { StatCard }
