import axios from "axios";
import { z } from "zod";

interface GitLabTag {
  name: string;
  commit: {
    id: string;
    committed_date: string;
  };
}

interface GitLabCommit {
  id: string;
  short_id: string;
  created_at: string;
  title: string;
  message: string;
}

interface GitLabCompareResponse {
  commits: GitLabCommit[];
  commits_count: number;
  diffs: any[];
  compare_timeout: boolean;
  compare_same_ref: boolean;
}

// Validation schemas
const GitLabConfigSchema = z.object({
  gitlabUrl: z.string().url(),
  projectId: z.string(),
  privateToken: z.string(),
});

const TagComparisonSchema = z.object({
  olderTag: z.string(),
  newerTag: z.string(),
});

export type GitLabConfig = z.infer<typeof GitLabConfigSchema>;
export type TagComparison = z.infer<typeof TagComparisonSchema>;

export class GitLabController {
  private async getTagData(config: GitLabConfig, tagName: string) {
    try {
      const encodedProjectId = encodeURIComponent(config.projectId);
      const encodedTagName = encodeURIComponent(tagName);
      const baseUrl = config.gitlabUrl.split("/api")[0] + "/api/v4";
      const url = `${baseUrl}/projects/${encodedProjectId}/repository/tags/${encodedTagName}`;

      // console.log("hitting gitlab url", url);
      const response = await axios.get<GitLabTag>(url, {
        headers: {
          "PRIVATE-TOKEN": config.privateToken,
          Accept: "application/json",
        },
      });

      // console.log("data", response.data);
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
    config: GitLabConfig,
    olderCommitHash: string,
    newerCommitHash: string
  ) {
    try {
      const encodedProjectId = encodeURIComponent(config.projectId);
      const baseUrl = config.gitlabUrl.split("/api")[0] + "/api/v4";
      const url = `${baseUrl}/projects/${encodedProjectId}/repository/compare`;

      console.log(
        "Comparing commits between",
        olderCommitHash,
        "and",
        newerCommitHash
      );
      const response = await axios.get<GitLabCompareResponse>(url, {
        headers: {
          "PRIVATE-TOKEN": config.privateToken,
          Accept: "application/json",
        },
        params: {
          from: olderCommitHash,
          to: newerCommitHash,
        },
      });

      if (response.data.compare_same_ref) {
        throw new Error("Cannot compare the same reference");
      }

      if (response.data.compare_timeout) {
        throw new Error("Comparison timed out");
      }

      return response.data.commits;
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

  public async compareTags(config: GitLabConfig, comparison: TagComparison) {
    try {
      console.log("in compareTags call", config, comparison);
      // Validate inputs
      GitLabConfigSchema.parse(config);
      TagComparisonSchema.parse(comparison);

      const olderTagData = await this.getTagData(config, comparison.olderTag);
      const newerTagData = await this.getTagData(config, comparison.newerTag);

      if (!olderTagData?.commit?.id || !newerTagData?.commit?.id) {
        throw new Error(
          "Failed to retrieve tag information or invalid tag data structure"
        );
      }

      const commits = await this.getCommitsBetweenTags(
        config,
        olderTagData.commit.id,
        newerTagData.commit.id
      );

      return {
        olderTag: comparison.olderTag,
        newerTag: comparison.newerTag,
        totalCommits: commits.length,
        commits: commits.map((commit: GitLabCommit) => ({
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
      console.log("error in compare tags", error);
      throw error;
    }
  }

  public async getReleases(config: GitLabConfig): Promise<
    Array<{
      id: number;
      name: string;
      tag_name: string;
      created_at: string;
    }>
  > {
    try {
      const encodedProjectId = encodeURIComponent(config.projectId);
      const baseUrl = config.gitlabUrl.split("/api")[0] + "/api/v4";
      const url = `${baseUrl}/projects/${encodedProjectId}/repository/tags`;

      const response = await axios.get(url, {
        headers: {
          "PRIVATE-TOKEN": config.privateToken,
        },
      });

      return (
        (
          response.data as Array<{
            name: string;
            commit: {
              id: string;
              created_at: string;
            };
          }>
        ).map((tag, index) => ({
          id: index + 1,
          name: tag.name,
          tag_name: tag.name,
          created_at: tag.commit.created_at,
        })) || []
      );
    } catch (error) {
      console.error("Error getting GitLab tags:", error);
      throw error;
    }
  }

  public async getTagBranchInfo(
    config: GitLabConfig,
    tagName: string
  ): Promise<{
    branch: string;
    commitId: string;
  }> {
    try {
      const encodedProjectId = encodeURIComponent(config.projectId);
      const encodedTagName = encodeURIComponent(tagName);
      const baseUrl = config.gitlabUrl.split("/api")[0] + "/api/v4";
      const url = `${baseUrl}/projects/${encodedProjectId}/repository/tags/${encodedTagName}`;

      const response = await axios.get<{
        commit: { id: string };
      }>(url, {
        headers: {
          "PRIVATE-TOKEN": config.privateToken,
        },
      });

      // Get the commit ID from the tag
      const commitId = response.data.commit?.id;

      if (!commitId) {
        return { branch: "unknown", commitId: "unknown" };
      }

      // Get the branch information for this commit
      const branchesUrl = `${baseUrl}/projects/${encodedProjectId}/repository/commits/${commitId}/refs?type=branch`;
      const branchesResponse = await axios.get(branchesUrl, {
        headers: {
          "PRIVATE-TOKEN": config.privateToken,
        },
      });

      // Get the first branch that contains this commit
      const branch = branchesResponse.data?.[0]?.name || "unknown";

      return { branch, commitId };
    } catch (error) {
      console.error("Error getting tag branch info:", error);
      return { branch: "unknown", commitId: "unknown" };
    }
  }
}
