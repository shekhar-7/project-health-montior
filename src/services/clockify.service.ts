import axios from "axios";
import { ClockifyConfig } from "../config/external-services.config";
import { z } from "zod";

// Validation schemas
const TaskDurationSchema = z.object({
  duration: z.string(),
});

export type TaskDuration = z.infer<typeof TaskDurationSchema>;

export class ClockifyService {
  private config: ClockifyConfig;

  constructor(config: ClockifyConfig) {
    this.config = config;
  }

  private async makeRequest<T>(endpoint: string): Promise<T> {
    try {
      const url = `${this.config.apiUrl}${endpoint}`;
      const response = await axios.get<T>(url, {
        headers: {
          "X-Api-Key": this.config.apiKey,
          "Content-Type": "application/json",
        },
      });

      return response.data;
    } catch (error) {
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: { message?: string } };
          message: string;
        };
        throw new Error(
          `Clockify API request failed: ${
            axiosError.response?.data?.message || axiosError.message
          }`
        );
      }
      throw error;
    }
  }

  public async getTaskActualDuration(
    taskId: string,
    projectId: string
  ): Promise<number> {
    try {
      const endpoint = `/workspaces/${this.config.workspaceId}/projects/${projectId}/tasks/${taskId}`;
      const response = await this.makeRequest<TaskDuration>(endpoint);
      const duration = TaskDurationSchema.parse(response).duration;

      if (!duration || duration === "PT0S") {
        return 0.0;
      }

      const matches = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:\d+S)?/);
      if (!matches) {
        return 0.0;
      }

      const hours = parseInt(matches[1] || "0");
      const minutes = parseInt(matches[2] || "0");
      return parseFloat(`${hours}.${minutes}`);
    } catch (error) {
      console.error(`Error getting task duration for task ${taskId}:`, error);
      return 0.0;
    }
  }

  public getDurationStatus(
    estimate: number | undefined,
    actualDuration: number
  ): string {
    if (!estimate || estimate === 0) return "Estimate Not Set";
    if (!actualDuration || actualDuration === 0) return "Task Not Started";
    return actualDuration > estimate ? "Overdue" : "On Time";
  }
}
