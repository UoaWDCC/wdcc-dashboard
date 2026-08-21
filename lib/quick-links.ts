import {
  Boxes,
  Calendar,
  Camera,
  Code2,
  CreditCard,
  FileText,
  Folder,
  Mail,
  Megaphone,
  MessageSquare,
  Palette,
  Server,
  Table2,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { Team } from "@/lib/types";

export type QuickLink = {
  label: string;
  href: string;
  icon: LucideIcon;
  // Optional one-liner shown under the label.
  hint?: string;
};

// Shown to everyone. Edit to change the Quick Links grid on the home page.
export const GLOBAL_QUICK_LINKS: QuickLink[] = [
  {
    label: "Drive",
    href: "https://drive.google.com/drive/folders/0AJq-PmFbZ0OLUk9PVA",
    icon: Folder,
  },
  { label: "Docs", href: "https://docs.wdcc.co.nz/", icon: FileText },
  { label: "Go", href: "https://go.wdcc.co.nz", icon: Boxes, hint: "Linktree" },
];

// Shown only to members whose profile.team matches the key.
export const TEAM_QUICK_LINKS: Record<Team, QuickLink[]> = {
  Admin: [],
  Projects: [],
  Tech: [
    {
      label: "GitHub",
      href: "https://github.com/UoaWDCC",
      icon: Code2,
      hint: "UoaWDCC org",
    },
    { label: "Fly.io", href: "/tech", icon: Server, hint: "App monitoring" },
    {
      label: "wdcc",
      href: "https://wdcc.co.nz",
      icon: Server,
      hint: "App monitoring",
    },
    {
      label: "Passport",
      href: "https://passport.wdcc.co.nz",
      icon: Server,
    },
  ],
  Marketing: [],
  Industry: [],
  Social: [],
};

export function teamQuickLinks(team: Team | null): QuickLink[] {
  return team ? TEAM_QUICK_LINKS[team] : [];
}
