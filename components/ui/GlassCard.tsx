interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export const GlassCard = ({ children, className = "" }: GlassCardProps) => {
  return (
    <div className={`backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl shadow-xl p-6 ${className}`}>
      {children}
    </div>
  );
};