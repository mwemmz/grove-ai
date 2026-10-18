CREATE TABLE "chat_messages" (
	"id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"sender" text NOT NULL,
	"text" text NOT NULL,
	"timestamp" text NOT NULL,
	"cited_notes" jsonb,
	"senior_tips" jsonb,
	"year_connections" jsonb,
	"applied_profile_attributes" jsonb,
	CONSTRAINT "chat_messages_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"year" integer NOT NULL,
	"semester" integer NOT NULL,
	"color" text NOT NULL,
	"description" text NOT NULL,
	CONSTRAINT "courses_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "flashcards" (
	"id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"note_id" text NOT NULL,
	"course_code" text NOT NULL,
	"year" integer NOT NULL,
	"front" text NOT NULL,
	"back" text NOT NULL,
	"interval_days" integer NOT NULL,
	"repetition" integer NOT NULL,
	"ease_factor" real NOT NULL,
	"due_date" text NOT NULL,
	"last_reviewed" text,
	"status" text NOT NULL,
	CONSTRAINT "flashcards_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "learning_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"student_name" text NOT NULL,
	"degree_name" text NOT NULL,
	"current_year" integer NOT NULL,
	"university" text NOT NULL,
	"explanation_style" text NOT NULL,
	"answer_length" text NOT NULL,
	"socratic_pacing" boolean NOT NULL,
	"code_language_preference" text NOT NULL,
	"strengths" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"weak_topics" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"memory_logs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"total_questions_asked" integer NOT NULL,
	"study_streaks_days" integer NOT NULL,
	"preferred_study_time" text NOT NULL,
	"student_tier" text,
	"work_ethic_archetype" text,
	"cleared_courses" jsonb
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" text NOT NULL,
	"year" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"summary" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"key_takeaways" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	"mastery_score" integer,
	CONSTRAINT "notes_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "portfolio_projects" (
	"id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"year" integer NOT NULL,
	"course_code" text NOT NULL,
	"description" text NOT NULL,
	"technologies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"outcomes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"github_url" text,
	"live_url" text,
	CONSTRAINT "portfolio_projects_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "portfolio_skills" (
	"id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"level" text NOT NULL,
	"first_acquired_year" integer NOT NULL,
	"evidence_notes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "portfolio_skills_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "senior_comments" (
	"id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"course_code" text NOT NULL,
	"topic" text NOT NULL,
	"author_name" text NOT NULL,
	"author_grade" text NOT NULL,
	"semester_cleared" text NOT NULL,
	"category" text NOT NULL,
	"comment_text" text NOT NULL,
	"upvotes" integer NOT NULL,
	"has_upvoted" boolean DEFAULT false NOT NULL,
	"verified_clearance" boolean NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "senior_comments_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "study_blueprints" (
	"id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"student_name" text NOT NULL,
	"student_tier" text NOT NULL,
	"archetype" text NOT NULL,
	"course_code" text NOT NULL,
	"course_name" text NOT NULL,
	"overall_gpa" text NOT NULL,
	"weekly_hours" integer NOT NULL,
	"pacing_strategy" text NOT NULL,
	"exam_prep_days_before" integer NOT NULL,
	"flashcard_review_cadence" text NOT NULL,
	"summary_quote" text NOT NULL,
	"recommended_habits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"syllabus_milestones" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"adopted_by_count" integer NOT NULL,
	"is_adopted" boolean DEFAULT false NOT NULL,
	CONSTRAINT "study_blueprints_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "tutor_requests" (
	"id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"requester_name" text NOT NULL,
	"requester_year" integer NOT NULL,
	"tutor_id" text NOT NULL,
	"tutor_name" text NOT NULL,
	"course_code" text NOT NULL,
	"topic" text NOT NULL,
	"message" text NOT NULL,
	"preferred_time" text NOT NULL,
	"urgency" text NOT NULL,
	"status" text NOT NULL,
	"created_at" text NOT NULL,
	CONSTRAINT "tutor_requests_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "tutors" (
	"id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"current_year" integer NOT NULL,
	"degree_name" text NOT NULL,
	"cleared_courses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"bio" text NOT NULL,
	"explanation_style" text NOT NULL,
	"rating" real NOT NULL,
	"sessions_delivered" integer NOT NULL,
	"hourly_rate" text NOT NULL,
	"available" boolean NOT NULL,
	"preferred_contact" text NOT NULL,
	CONSTRAINT "tutors_user_id_id_pk" PRIMARY KEY("user_id","id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text,
	"name" text,
	"seeded" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "flashcards" ADD CONSTRAINT "flashcards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_profiles" ADD CONSTRAINT "learning_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_projects" ADD CONSTRAINT "portfolio_projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_skills" ADD CONSTRAINT "portfolio_skills_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "senior_comments" ADD CONSTRAINT "senior_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "study_blueprints" ADD CONSTRAINT "study_blueprints_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutor_requests" ADD CONSTRAINT "tutor_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutors" ADD CONSTRAINT "tutors_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;