CREATE TABLE "tool_apis" (
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"id" bigint PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY (sequence name "tool_apis_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"mailbox_id" bigint NOT NULL,
	"base_url" text,
	"schema" text,
	"authentication_token" "bytea"
);
--> statement-breakpoint
ALTER TABLE "tools" ADD COLUMN "tool_api_id" bigint;--> statement-breakpoint
CREATE INDEX "tool_apis_mailbox_id_idx" ON "tool_apis" USING btree ("mailbox_id");--> statement-breakpoint
CREATE INDEX "tools_tool_api_id_idx" ON "tools" USING btree ("tool_api_id");