CREATE TABLE "user_team" (
	"user_id" text NOT NULL,
	"team" "task_team" NOT NULL,
	CONSTRAINT "user_team_user_id_team_pk" PRIMARY KEY("user_id","team")
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_team" ADD CONSTRAINT "user_team_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_team_team_idx" ON "user_team" USING btree ("team");