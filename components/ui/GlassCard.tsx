import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  gradientTop?: boolean;
  onClick?: () => void;
}

export function GlassCard({ children, className, hover = false, gradientTop = false, onClick }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "glass-card overflow-hidden p-5",
        gradientTop && "gradient-border-top",
        hover && "glass-card-hover cursor-pointer",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}
