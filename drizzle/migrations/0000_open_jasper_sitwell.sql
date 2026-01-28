CREATE TYPE "public"."integration_scope_enum" AS ENUM('organization', 'form');--> statement-breakpoint
CREATE TYPE "public"."integration_type_enum" AS ENUM('webhook', 'slack', 'telegram', 'email-smtp', 'email-api', 'discord');--> statement-breakpoint
CREATE TABLE "user" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"passwordHash" text NOT NULL,
	"name" text,
	"organizationId" integer,
	"role" varchar(255) DEFAULT 'member' NOT NULL,
	"isSuperAdmin" boolean DEFAULT false NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"maxSubmissionsPerMonth" integer,
	"defaultRateLimitEnabled" boolean DEFAULT true NOT NULL,
	"defaultRateLimitMaxRequests" integer DEFAULT 10,
	"defaultRateLimitWindowSeconds" integer DEFAULT 60,
	"defaultRateLimitMaxRequestsPerHour" integer DEFAULT 50,
	"defaultMinTimeBetweenSubmissionsEnabled" boolean DEFAULT true NOT NULL,
	"defaultMinTimeBetweenSubmissionsSeconds" integer DEFAULT 10,
	"defaultMaxRequestSizeBytes" integer DEFAULT 100000,
	"defaultRefererFallbackEnabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organization_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "form" (
	"id" serial PRIMARY KEY NOT NULL,
	"organizationId" integer,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"submitHash" text NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"useOrgIntegrations" boolean DEFAULT true NOT NULL,
	"captchaEnabled" boolean DEFAULT false NOT NULL,
	"csrfEnabled" boolean DEFAULT false NOT NULL,
	"useOrgSecuritySettings" boolean DEFAULT true NOT NULL,
	"rateLimitEnabled" boolean DEFAULT true NOT NULL,
	"rateLimitMaxRequests" integer DEFAULT 10,
	"rateLimitWindowSeconds" integer DEFAULT 60,
	"rateLimitMaxRequestsPerHour" integer DEFAULT 50,
	"minTimeBetweenSubmissionsEnabled" boolean DEFAULT true NOT NULL,
	"minTimeBetweenSubmissionsSeconds" integer DEFAULT 10,
	"maxRequestSizeBytes" integer DEFAULT 100000,
	"refererFallbackEnabled" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "form_slug_unique" UNIQUE("slug"),
	CONSTRAINT "form_submitHash_unique" UNIQUE("submitHash")
);
--> statement-breakpoint
CREATE TABLE "submission" (
	"id" serial PRIMARY KEY NOT NULL,
	"formId" integer NOT NULL,
	"data" jsonb NOT NULL,
	"originDomain" text,
	"ipAddress" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration" (
	"id" serial PRIMARY KEY NOT NULL,
	"organizationId" integer NOT NULL,
	"formId" integer,
	"scope" "integration_scope_enum" DEFAULT 'organization' NOT NULL,
	"type" "integration_type_enum" DEFAULT 'webhook' NOT NULL,
	"name" text NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whitelisted_domain" (
	"id" serial PRIMARY KEY NOT NULL,
	"organizationId" integer NOT NULL,
	"domain" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
