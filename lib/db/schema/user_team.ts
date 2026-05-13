import { pgTable, text, primaryKey, index } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { taskTeam } from "./tasks";

export const userTeam = pgTable(
  "user_team",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    team: taskTeam("team").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.team] }),
    index("user_team_team_idx").on(t.team),
  ]
);
