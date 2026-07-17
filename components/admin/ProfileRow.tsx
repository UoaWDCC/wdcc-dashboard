"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  upsertProfileAction,
  removeProfileAction,
} from "@/server/admin/actions";
import { TEAMS, type Team, type ProfileKind } from "@/lib/types";

type Props = {
  email: string;
  name: string;
  team: Team | null;
  kind: ProfileKind;
  note: string | null;
};

export function ProfileRow({ email, name, team, kind, note }: Props) {
  const [mode, setMode] = useState<"view" | "edit">("view");

  if (mode === "view") {
    return (
      <tr className="border-b last:border-0">
        <td className="py-2 pr-4 font-mono">{email}</td>
        <td className="py-2 pr-4">{name}</td>
        <td className="py-2 pr-4">{team ?? "—"}</td>
        <td className="py-2 pr-4 text-muted-foreground">{note ?? "—"}</td>
        <td className="py-2 text-right whitespace-nowrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMode("edit")}
            type="button"
          >
            Edit
          </Button>
          <form action={removeProfileAction} className="inline">
            <input type="hidden" name="email" value={email} />
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
            >
              Remove
            </Button>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b last:border-0 bg-muted/30">
      <td className="py-2 pr-4 font-mono align-middle">{email}</td>
      <td colSpan={4} className="py-2">
        <form
          action={async (fd) => {
            fd.set("email", email);
            fd.set("kind", kind);
            await upsertProfileAction(fd);
            setMode("view");
          }}
          className="grid grid-cols-[1fr_160px_1fr_auto] gap-2 items-center"
        >
          <Input name="name" defaultValue={name} required />
          <select
            name="team"
            defaultValue={team ?? ""}
            className="border rounded-md h-9 px-2 text-sm bg-transparent"
          >
            <option value="">—</option>
            {TEAMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <Input name="note" defaultValue={note ?? ""} placeholder="Note" />
          <div className="flex gap-1 justify-end">
            <Button type="submit" size="sm">
              Save
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMode("view")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </td>
    </tr>
  );
}

export function AddProfileRow({ kind }: { kind: ProfileKind }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <tr>
        <td colSpan={5} className="pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
            type="button"
          >
            + Add {kind}
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="bg-muted/30">
      <td colSpan={5} className="py-2">
        <form
          action={async (fd) => {
            fd.set("kind", kind);
            await upsertProfileAction(fd);
            setOpen(false);
          }}
          className="grid grid-cols-[1fr_1fr_160px_1fr_auto] gap-2 items-center"
        >
          <Input
            name="email"
            type="email"
            placeholder="name@example.com"
            required
            style={{ textTransform: "lowercase" }}
            onChange={(e) => {
              e.currentTarget.value = e.currentTarget.value.toLowerCase();
            }}
          />
          <Input name="name" placeholder="Full name" required />
          <select
            name="team"
            defaultValue=""
            className="border rounded-md h-9 px-2 text-sm bg-transparent"
          >
            <option value="">—</option>
            {TEAMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <Input name="note" placeholder="Note (optional)" />
          <div className="flex gap-1 justify-end">
            <Button type="submit" size="sm">
              Add
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </td>
    </tr>
  );
}
