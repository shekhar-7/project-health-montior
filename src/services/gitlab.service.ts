import axios from "axios";
import { GitLabConfig } from "../config/external-services.config";
import { z } from "zod";

// Validation schemas
export const TagComparisonSchema = z.object({
  olderTag: z.string(),
  newerTag: z.string(),
});

export type TagComparison = z.infer<typeof TagComparisonSchema>;

interface GitLabTag {
  name: string;
  commit: {
    id: string;
  };
}

interface GitLabCommit {
  id: string;
  short_id: string;
  created_at: string;
  title: string;
  message: string;
}

export class GitLabService {
  private config: GitLabConfig;

  constructor(config: GitLabConfig) {
    this.config = config;
  }

  private async getTagData(tagName: string): Promise<GitLabTag> {
    try {
      const encodedProjectId = encodeURIComponent(this.config.projectId);
      const encodedTagName = encodeURIComponent(tagName);
      const baseUrl = this.config.gitlabUrl.split("/api")[0];
      const url = `${baseUrl}/api/v4/projects/${encodedProjectId}/repository/tags/${encodedTagName}`;

      const response = await axios.get<GitLabTag>(url, {
        headers: {
          "PRIVATE-TOKEN": this.config.privateToken,
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
          `Failed to retrieve tag data for ${tagName}: ${
            axiosError.response?.data?.message || axiosError.message
          }`
        );
      }
      throw error;
    }
  }

  private async getCommitsBetweenTags(
    olderCommitHash: string,
    newerCommitHash: string
  ): Promise<GitLabCommit[]> {
    try {
      const encodedProjectId = encodeURIComponent(this.config.projectId);
      const baseUrl = this.config.gitlabUrl.split("/api")[0];
      const url = `${baseUrl}/api/v4/projects/${encodedProjectId}/repository/commits`;

      const response = await axios.get<GitLabCommit[]>(url, {
        headers: {
          "PRIVATE-TOKEN": this.config.privateToken,
        },
        params: {
          ref_name: newerCommitHash,
          since: olderCommitHash,
          per_page: 100,
        },
      });

      return response.data.filter((commit) => commit.id !== olderCommitHash);
    } catch (error) {
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: { message?: string } };
          message: string;
        };
        throw new Error(
          `Failed to retrieve commits: ${
            axiosError.response?.data?.message || axiosError.message
          }`
        );
      }
      throw error;
    }
  }

  public async compareTags(comparison: TagComparison) {
    try {
      // Validate inputs
      TagComparisonSchema.parse(comparison);

      const olderTagData = await this.getTagData(comparison.olderTag);
      const newerTagData = await this.getTagData(comparison.newerTag);

      if (!olderTagData?.commit?.id || !newerTagData?.commit?.id) {
        throw new Error(
          "Failed to retrieve tag information or invalid tag data structure"
        );
      }

      const commits = await this.getCommitsBetweenTags(
        olderTagData.commit.id,
        newerTagData.commit.id
      );

      return {
        olderTag: comparison.olderTag,
        newerTag: comparison.newerTag,
        totalCommits: commits.length,
        commits: commits.map((commit) => ({
          id: commit.short_id,
          createdAt: commit.created_at,
          title: commit.title,
          description:
            commit.message !== commit.title
              ? commit.message.replace(commit.title, "").trim()
              : undefined,
        })),
      };
    } catch (error) {
      console.error("Error in compareTags:", error);
      throw error;
    }
  }
}
