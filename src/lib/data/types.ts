import { z } from "zod";

// GitHub User Schema (matches GraphQL Author type)
export const GithubUserSchema = z.object({
  login: z.string(),
  avatarUrl: z.string().nullable().optional(),
});

// GitHub Raw Data Schemas
export const RawCommitSchema = z.object({
  oid: z.string(),
  message: z.string(),
  messageHeadline: z.string().optional(),
  committedDate: z.string(),
  author: z.object({
    name: z.string(),
    email: z.string(),
    date: z.string(),
    user: GithubUserSchema.nullable().optional(),
  }),
  additions: z.number().default(0),
  deletions: z.number().default(0),
  changedFiles: z.number().default(0),
});

export const RawPRFileSchema = z.object({
  path: z.string(),
  additions: z.number().default(0),
  deletions: z.number().default(0),
  changeType: z.string().optional(),
});

export const RawPRReviewSchema = z.object({
  id: z.string(),
  state: z.string(),
  body: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  author: GithubUserSchema.nullable().optional(),
  url: z.string().optional(),
});

export const RawCommentSchema = z.object({
  id: z.string(),
  body: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  author: GithubUserSchema.nullable().optional(),
  url: z.string().optional(),
});

export const RawLabelSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  description: z.string().nullable().optional(),
});

export const RawPullRequestSchema = z.object({
  id: z.string(),
  number: z.number(),
  title: z.string(),
  body: z.string().nullable().optional(),
  state: z.string(),
  merged: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  closedAt: z.string().nullable().optional(),
  mergedAt: z.string().nullable().optional(),
  headRefOid: z.string(),
  baseRefOid: z.string(),
  additions: z.number().default(0),
  deletions: z.number().default(0),
  changedFiles: z.number().default(0),
  author: GithubUserSchema.nullable().optional(),
  labels: z
    .object({
      nodes: z.array(RawLabelSchema),
    })
    .optional(),
  commits: z
    .object({
      totalCount: z.number(),
      nodes: z.array(
        z.object({
          commit: RawCommitSchema,
        })
      ),
    })
    .optional(),
  reviews: z
    .object({
      nodes: z.array(RawPRReviewSchema),
    })
    .optional(),
  comments: z
    .object({
      nodes: z.array(RawCommentSchema),
    })
    .optional(),
  files: z
    .object({
      nodes: z.array(RawPRFileSchema),
    })
    .optional(),
});

export const RawIssueSchema = z.object({
  id: z.string(),
  number: z.number(),
  title: z.string(),
  body: z.string().nullable().optional(),
  state: z.string(),
  locked: z.boolean().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  closedAt: z.string().nullable().optional(),
  author: GithubUserSchema.nullable().optional(),
  labels: z
    .object({
      nodes: z.array(RawLabelSchema),
    })
    .optional(),
  comments: z
    .object({
      totalCount: z.number(),
      nodes: z.array(RawCommentSchema),
    })
    .optional(),
});

// Pipeline configuration schemas
export const ScoringConfigSchema = z.object({
  pullRequest: z.object({
    base: z.number().default(7),
    merged: z.number().default(3),
    perReview: z.number().default(3),
    perApproval: z.number().default(2),
    perComment: z.number().default(0.5),
    descriptionMultiplier: z.number().default(0.006),
    complexityMultiplier: z.number().default(0.5),
    optimalSizeBonus: z.number().default(5),
    maxPerDay: z.number().default(20),
  }),
  issue: z.object({
    base: z.number().default(5),
    perComment: z.number().default(0.5),
    withLabelsMultiplier: z.record(z.string(), z.number()).default({
      bug: 1.5,
      enhancement: 1.2,
      documentation: 1.0,
    }),
    closedBonus: z.number().default(3),
    resolutionSpeedMultiplier: z.number().default(0.8),
  }),
  review: z.object({
    base: z.number().default(2),
    approved: z.number().default(1),
    changesRequested: z.number().default(1.5),
    commented: z.number().default(0.5),
    detailedFeedbackMultiplier: z.number().default(0.006),
    thoroughnessMultiplier: z.number().default(1.2),
    maxPerDay: z.number().default(15),
  }),
  comment: z.object({
    base: z.number().default(0.5),
    substantiveMultiplier: z.number().default(0.006),
    diminishingReturns: z.number().default(0.8),
    maxPerThread: z.number().default(5),
  }),
  codeChange: z.object({
    perLineAddition: z.number().default(0.01),
    perLineDeletion: z.number().default(0.005),
    perFile: z.number().default(0.1),
    maxLines: z.number().default(1000),
    testCoverageBonus: z.number().default(1.5),
  }),
});

export const TagTypeSchema = z.enum(["AREA", "ROLE", "TECH"]);

export const TagConfigSchema = z.object({
  name: z.string(),
  category: TagTypeSchema,
  patterns: z.array(z.string()),
  weight: z.number().default(1.0),
  description: z.string().optional(),
});

export const RepositoryConfigSchema = z.object({
  repoId: z
    .string()
    .regex(
      /^[^\/]+\/[^\/]+$/,
      "Repository ID must be in the format 'owner/name'"
    ),
  defaultBranch: z.string().default("main"),
});

export const PipelineConfigSchema = z.object({
  repositories: z.array(RepositoryConfigSchema),
  scoring: ScoringConfigSchema,
  tags: z.object({
    area: z.array(TagConfigSchema),
    role: z.array(TagConfigSchema),
    tech: z.array(TagConfigSchema),
  }),
  // List of bot usernames to be ignored during processing
  botUsers: z.array(z.string()).optional(),
  aiSummary: z
    .object({
      enabled: z.boolean().default(false),
      model: z.enum(["openai", "ollama"]).default("openai"),
      apiKey: z.string().optional(),
      endpoint: z.string().optional(),
    })
    .optional(),
});

// Type exports
export type PipelineConfig = z.infer<typeof PipelineConfigSchema>;
export type ScoringConfig = z.infer<typeof ScoringConfigSchema>;
export type TagConfig = z.infer<typeof TagConfigSchema>;
export type RepositoryConfig = z.infer<typeof RepositoryConfigSchema>;
export type ScoringRules = ScoringConfig;
export type GithubUser = z.infer<typeof GithubUserSchema>;

export interface DateRange {
  startDate: string;
  endDate: string;
}
