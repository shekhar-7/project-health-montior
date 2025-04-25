import { z } from "zod";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Validation schemas
const GitLabConfigSchema = z.object({
  gitlabUrl: z.string().url(),
  projectId: z.string(),
  privateToken: z.string(),
});

const FlowluConfigSchema = z.object({
  apiKey: z.string(),
  apiUrl: z.string().url(),
});

const ClockifyConfigSchema = z.object({
  apiKey: z.string(),
  workspaceId: z.string(),
  apiUrl: z.string().url(),
});

// Types
export type GitLabConfig = z.infer<typeof GitLabConfigSchema>;
export type FlowluConfig = z.infer<typeof FlowluConfigSchema>;
export type ClockifyConfig = z.infer<typeof ClockifyConfigSchema>;

// Configuration
export const gitLabConfig: GitLabConfig = {
  gitlabUrl: process.env.GITLAB_URL || "",
  projectId: process.env.GITLAB_PROJECT_ID || "",
  privateToken: process.env.GITLAB_PRIVATE_TOKEN || "",
};

export const flowluConfig: FlowluConfig = {
  apiKey: process.env.FLOWLU_API_KEY || "",
  apiUrl: process.env.FLOWLU_API_URL || "",
};

export const clockifyConfig: ClockifyConfig = {
  apiKey: process.env.CLOCKIFY_API_KEY || "",
  workspaceId: process.env.CLOCKIFY_WORKSPACE_ID || "",
  apiUrl: process.env.CLOCKIFY_API_URL || "",
};

// Validate configurations
export function validateConfigs() {
  try {
    console.log("gitlab", gitLabConfig);
    GitLabConfigSchema.parse(gitLabConfig);
    FlowluConfigSchema.parse(flowluConfig);
    ClockifyConfigSchema.parse(clockifyConfig);
    return true;
  } catch (error) {
    console.error("Configuration validation failed:", error);
    return false;
  }
}
