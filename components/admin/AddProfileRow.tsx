"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { upsertProfileAction } from "@/server/admin/actions";
import { TEAMS, type ProfileKind } from "@/lib/types";

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
            + Add {kind === "personal" ? "Personal" : "Shared"} member
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
