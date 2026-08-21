import {
  Boxes,
  Code2,
  FileText,
  Folder,
  Server,
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

// Shown to everyone. Edit to change the Quick Links list on the home page.
export const GLOBAL_QUICK_LINKS: QuickLink[] = [
  {
    label: "Drive",
    href: "https://drive.google.com/drive/folders/0AJq-PmFbZ0OLUk9PVA",
    icon: Folder,
    hint: "Shared WDCC Executive Drive",
  },
  {
    label: "Docs",
    href: "https://docs.wdcc.co.nz/",
    icon: FileText,
    hint: "docs.wdcc.co.nz",
  },
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
      label: "Main Website",
      href: "https://wdcc.co.nz",
      icon: Server,
      hint: "wdcc.co.nz",
    },
    {
      label: "Passport",
      href: "https://passport.wdcc.co.nz",
      icon: Server,
      hint: "passport.wdcc.co.nz",
    },
  ],
  Marketing: [],
  Industry: [],
  Social: [],
};

export function teamQuickLinks(team: Team | null): QuickLink[] {
  return team ? TEAM_QUICK_LINKS[team] : [];
}
