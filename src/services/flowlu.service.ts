import axios from "axios";
import { FlowluConfig } from "../config/external-services.config";
import { z } from "zod";

// Rate limiting configuration
const RATE_LIMIT_DELAY = 1000; // 1 second delay between requests
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds delay between retries

// Validation schemas
const FlowluProjectSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  prefix_name: z.string(),
  workflow_id: z.number(),
  manager_id: z.number(),
  is_admin_menu_showing: z.number(),
  extra_fields: z.string(),
  created_date: z.string(),
  updated_date: z.string(),
  archived_date: z.string(),
  deleted_at: z.string().nullable(),
});

const FlowluTaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  priority: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  due_date: z.string().optional(),
  assigned_to: z.string().optional(),
  workflow_stage_id: z.number(),
  cf_8: z.string().optional(),
  cf_9: z.string().optional(),
  estimate: z.number().optional(),
  type_id: z.number(),
});

export type FlowluProject = z.infer<typeof FlowluProjectSchema>;
export type FlowluTask = z.infer<typeof FlowluTaskSchema>;

interface FlowluError {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
  message: string;
}

export class FlowluService {
  private lastRequestTime = 0;
  private config: FlowluConfig;

  constructor(config: FlowluConfig) {
    this.config = config;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async makeRequest<T>(endpoint: string, retryCount = 0): Promise<T> {
    try {
      // Rate limiting
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
        await this.sleep(RATE_LIMIT_DELAY - timeSinceLastRequest);
      }

      const url = `${this.config.apiUrl}${endpoint}${
        endpoint.includes("?") ? "&" : "?"
      }api_key=${this.config.apiKey}`;

      const response = await axios.get<T>(url, {
        headers: {
          "Content-Type": "application/json",
        },
      });
      // console.log("response 12132", response.data);

      this.lastRequestTime = Date.now();
      return response.data;
    } catch (error) {
      const flowluError = error as FlowluError;
      if (flowluError.response?.status === 429 && retryCount < MAX_RETRIES) {
        console.log(
          `Rate limit hit, retrying in ${RETRY_DELAY}ms (attempt ${
            retryCount + 1
          }/${MAX_RETRIES})`
        );
        await this.sleep(RETRY_DELAY);
        return this.makeRequest<T>(endpoint, retryCount + 1);
      }
      throw new Error(
        `Flowlu API request failed: ${
          flowluError.response?.data?.message || flowluError.message
        }`
      );
    }
  }

  public async searchProjects(
    searchTerm: string
  ): Promise<Array<{ id: number; name: string }>> {
    try {
      const response = await this.makeRequest<{
        response: {
          items: Array<{
            id: number;
            name: string;
            description: string;
            prefix_name: string;
            workflow_id: number;
            manager_id: number;
            is_admin_menu_showing: number;
            extra_fields: string;
            created_date: string;
            updated_date: string;
            archived_date: string;
            deleted_at: string | null;
          }>;
        };
      }>("/agile/projects/list");
      console.log("search projects reponse", response);
      if (!response?.response?.items) {
        return [];
      }

      return response.response.items.filter((project) =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      console.error("Error searching projects:", error);
      throw error;
    }
  }

  public async getAllProjects(): Promise<FlowluProject[]> {
    try {
      // console.log("making getAllProjects");
      const response = await this.makeRequest<{
        response: {
          items: Array<{
            id: number;
            name: string;
            description: string;
            prefix_name: string;
            workflow_id: number;
            manager_id: number;
            is_admin_menu_showing: number;
            extra_fields: string;
            created_date: string;
            updated_date: string;
            archived_date: string;
            deleted_at: string | null;
          }>;
        };
      }>("/agile/projects/list");
      // console.log("response projects/list", response);

      if (!response?.response?.items) {
        return [];
      }

      return response.response.items;
    } catch (error) {
      console.error("Error getting projects:", error);
      throw error;
    }
  }

  public async getProjectTasks(
    projectId: number,
    projectName: string,
    users: Array<{ id: string; name: string }>
  ): Promise<FlowluTask[]> {
    try {
      // console.log("making getProjectTasks for project", projectId);

      // Get tasks for both in-progress and completed stages
      const [inProgressResponse, completedResponse] = await Promise.all([
        this.makeRequest<{
          response: {
            items: Array<{
              id: string;
              name: string;
              status: string;
              priority: string;
              created_at: string;
              updated_at: string;
              due_date?: string;
              assigned_to?: string;
              cf_8?: string;
              cf_9?: string;
              estimate?: string;
              type_id?: string;
              workflow_stage_id: string;
            }>;
          };
        }>(
          `/agile/issues/list?filter[project_id]=${projectId}&filter[workflow_stage_id]=9`
        ),
        this.makeRequest<{
          response: {
            items: Array<{
              id: string;
              name: string;
              status: string;
              priority: string;
              created_at: string;
              updated_at: string;
              due_date?: string;
              assigned_to?: string;
              cf_8?: string;
              cf_9?: string;
              estimate?: string;
              type_id?: string;
              workflow_stage_id: string;
            }>;
          };
        }>(
          `/agile/issues/list?filter[project_id]=${projectId}&filter[workflow_stage_id]=10`
        ),
      ]);

      // console.log("In Progress Response:", inProgressResponse);
      // console.log("Completed Response:", completedResponse);

      // Combine and process tasks
      const allTasks = [
        ...(inProgressResponse?.response?.items || []),
        ...(completedResponse?.response?.items || []),
      ];

      if (allTasks.length === 0) {
        console.log("No tasks found for project", projectId);
        return [];
      }

      // Map tasks to our FlowluTask interface
      return allTasks.map((item) => ({
        id: item.id,
        name: item.name,
        status: item.status,
        priority: item.priority,
        created_at: item.created_at,
        updated_at: item.updated_at,
        due_date: item.due_date,
        assigned_to: item.assigned_to,
        workflow_stage_id: Number(item.workflow_stage_id),
        cf_8: item.cf_8,
        cf_9: item.cf_9,
        estimate: item.estimate ? Number(item.estimate) : undefined,
        type_id: Number(item.type_id || 1), // Default to 1 if not provided
      }));
    } catch (error) {
      console.error("Error getting project tasks:", error);
      throw error;
    }
  }

  public async getAllUsers(): Promise<Array<{ id: string; name: string }>> {
    try {
      const response = await this.makeRequest<{
        items: Array<{ id: string; name: string }>;
      }>("/users/list");
      return response.items;
    } catch (error) {
      console.error("Error getting users:", error);
      throw error;
    }
  }
}
