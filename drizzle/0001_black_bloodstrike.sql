CREATE TABLE "go_link" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"link" text NOT NULL,
	"hover_hint" text,
	"icon_url" text,
	"is_permanent" boolean DEFAULT false NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"team" text,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "go_redirect" (
	"key" text PRIMARY KEY NOT NULL,
	"destination_url" text NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"updated_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "go_link" ADD CONSTRAINT "go_link_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "go_link" ADD CONSTRAINT "go_link_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "go_redirect" ADD CONSTRAINT "go_redirect_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "go_redirect" ADD CONSTRAINT "go_redirect_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;