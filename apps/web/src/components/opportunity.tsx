import { Box, Briefcase, Clapperboard, FileText, Mail, Shirt, Store, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  store: Store,
  printables: FileText,
  video: Clapperboard,
  shirt: Shirt,
  briefcase: Briefcase,
  newsletter: Mail,
  box: Box,
};

export function OpportunityIcon({ icon, accent, size = 44 }: { icon: string; accent: string; size?: number }) {
  const Icon = ICONS[icon] ?? Box;
  return (
    <span className="inline-flex shrink-0 items-center justify-center rounded-xl text-white" style={{ width: size, height: size, background: accent }} aria-hidden="true">
      <Icon size={size * 0.5} strokeWidth={2} />
    </span>
  );
}
