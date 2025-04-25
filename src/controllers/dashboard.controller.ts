import { Request, Response } from "express";
import {
  DashboardService,
  DashboardMetrics,
} from "../services/dashboard.service";
import { TagComparison } from "../services/gitlab.service";
import {
  gitLabConfig,
  flowluConfig,
  clockifyConfig,
} from "../config/external-services.config";
import { z } from "zod";
import { GitLabController } from "../controllers/gitlab.controller";
import { FlowluService } from "../services/flowlu.service";
import { ClockifyService } from "../services/clockify.service";

// Validation schemas
const MetricsQuerySchema = z.object({
  olderTag: z.string(),
  newerTag: z.string(),
  projectId: z.string().transform((val) => (val ? Number(val) : undefined)),
});

const ProjectSearchSchema = z.object({
  searchTerm: z.string().min(1),
});

export class DashboardController {
  private dashboardService: DashboardService;
  private gitLabController: GitLabController;
  private flowluService: FlowluService;
  private clockifyService: ClockifyService;

  constructor(
    dashboardService: DashboardService,
    gitLabController: GitLabController,
    flowluService: FlowluService,
    clockifyService: ClockifyService
  ) {
    this.dashboardService = dashboardService;
    this.gitLabController = gitLabController;
    this.flowluService = flowluService;
    this.clockifyService = clockifyService;
  }

  public async searchProjects(req: Request, res: Response) {
    try {
      const { searchTerm } = ProjectSearchSchema.parse(req.query);
      const projects = await this.dashboardService.searchProjects(searchTerm);
      res.json(projects);
    } catch (error) {
      console.error("Error searching projects:", error);
      res.status(500).json({
        error: "Failed to search projects",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  public async getMetrics(req: Request, res: Response) {
    try {
      const { olderTag, newerTag, projectId } = MetricsQuerySchema.parse(
        req.query
      );

      const metrics: {
        totalCommits: number;
        totalFeatures: number;
        totalBugs: number;
        totalDevelopmentTime: number;
        totalQaTime: number;
        totalReleases: number;
        commits: Array<{
          id: string;
          createdAt: string;
          title: string;
          description?: string;
        }>;
      } = await this.dashboardService.calculateMetrics(
        olderTag,
        newerTag,
        projectId
      );

      res.json(metrics);
    } catch (error) {
      console.error("Error in getMetrics:", error);
      res.status(500).json({
        error: "Failed to calculate metrics",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  public async getDashboardMetrics(req: Request, res: Response) {
    try {
      const metrics = await this.dashboardService.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error getting dashboard metrics:", error);
      res.status(500).json({
        error: "Failed to get dashboard metrics",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  public async getReleaseMetrics(req: Request, res: Response) {
    try {
      const comparison = MetricsQuerySchema.parse(req.query);

      // Get GitLab configuration
      const gitLabConfig = {
        gitlabUrl: process.env.GITLAB_URL || "",
        projectId: process.env.GITLAB_PROJECT_ID || "",
        privateToken: process.env.GITLAB_PRIVATE_TOKEN || "",
      };

      // Get releases
      const releases = await this.gitLabController.getReleases(gitLabConfig);

      // Get Flowlu users
      const users = await this.flowluService.getAllUsers();

      // Get Flowlu projects
      const projects = await this.flowluService.getAllProjects();

      // Filter projects if projectId is provided
      const targetProjects = comparison.projectId
        ? projects.filter((p) => p.id === comparison.projectId)
        : projects;

      if (targetProjects.length === 0) {
        throw new Error(`Project with ID ${comparison.projectId} not found`);
      }

      // Get all tasks for the project
      const allTasks = await this.flowluService.getProjectTasks(
        targetProjects[0].id,
        targetProjects[0].name,
        users
      );

      // Process each release
      const releaseMetrics = await Promise.all(
        releases.map(async (release) => {
          // Get branch information for this tag
          const branchInfo = await this.gitLabController.getTagBranchInfo(
            gitLabConfig,
            release.tag_name
          );

          // Find tasks that were completed between this release and the previous one
          // This is a simplified approach - in a real app, you might want to use
          // commit messages or issue references to associate tasks with releases
          const releaseTasks = allTasks.filter((task) => {
            const taskDate = new Date(task.created_at);
            const releaseDate = new Date(release.created_at);
            return taskDate <= releaseDate;
          });

          // Count bugs
          const bugTasks = releaseTasks.filter((task) => task.type_id === 2);

          // Calculate development time
          let developmentTime = 0;
          for (const task of releaseTasks) {
            if (task.cf_8 && task.cf_9) {
              const duration = await this.clockifyService.getTaskActualDuration(
                task.cf_8,
                task.cf_9
              );
              developmentTime += duration;
            }
          }

          return {
            releaseName: release.name || release.tag_name,
            releaseDate: release.created_at,
            branch: branchInfo.branch,
            developmentTime,
            bugCount: bugTasks.length,
            totalTasks: releaseTasks.length,
          };
        })
      );

      // Get metrics between the specified tags
      const metrics = await this.dashboardService.calculateMetrics(
        comparison.olderTag,
        comparison.newerTag,
        comparison.projectId
      );

      return res.json({
        releases: releaseMetrics,
        comparison: {
          commits: metrics.commits,
          totalCommits: metrics.totalCommits,
          totalFeatures: metrics.totalFeatures,
          totalBugs: metrics.totalBugs,
          totalDevelopmentTime: metrics.totalDevelopmentTime,
          totalQaTime: metrics.totalQaTime,
        },
      });
    } catch (error) {
      console.error("Error getting release metrics:", error);
      res.status(500).json({
        error: "Failed to get release metrics",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  public async getTaskMetrics(req: Request, res: Response) {
    try {
      const projectId = req.query.projectId;

      if (!projectId) {
        return res.status(400).json({
          error: "Project ID is required",
          details: "Please provide a project ID in the query parameters",
        });
      }

      const metrics = await this.dashboardService.getTaskMetrics(
        Number(projectId)
      );
      res.json(metrics);
    } catch (error) {
      console.error("Error getting task metrics:", error);
      res.status(500).json({
        error: "Failed to get task metrics",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  public async getBugMetrics(req: Request, res: Response) {
    try {
      const projectId = req.query.projectId;

      if (!projectId) {
        return res.status(400).json({
          error: "Project ID is required",
          details: "Please provide a project ID in the query parameters",
        });
      }

      const metrics = await this.dashboardService.getBugMetrics(
        Number(projectId)
      );
      res.json(metrics);
    } catch (error) {
      console.error("Error getting bug metrics:", error);
      res.status(500).json({
        error: "Failed to get bug metrics",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  public async getProjectReleases(req: Request, res: Response) {
    try {
      const projectId = req.query.projectId;

      if (!projectId) {
        return res.status(400).json({
          error: "Project ID is required",
          details: "Please provide a project ID in the query parameters",
        });
      }

      const releases = await this.dashboardService.getProjectReleases(
        Number(projectId)
      );
      res.json(releases);
    } catch (error) {
      console.error("Error getting project releases:", error);
      res.status(500).json({
        error: "Failed to get project releases",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  public async getReleases(req: Request, res: Response) {
    try {
      const projectId = req.query.projectId;

      if (!projectId) {
        return res.status(400).json({
          error: "Project ID is required",
          details: "Please provide a GitLab project ID in the query parameters",
        });
      }

      // Get GitLab releases with additional metrics
      const releases = await this.dashboardService.getProjectReleases(
        Number(projectId)
      );

      res.json(releases);
    } catch (error) {
      console.error("Error getting releases:", error);
      res.status(500).json({
        error: "Failed to get releases",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  public async getGitLabProjects(req: Request, res: Response) {
    try {
      const gitLabConfig = {
        gitlabUrl: process.env.GITLAB_URL || "",
        projectId: process.env.GITLAB_PROJECT_ID || "",
        privateToken: process.env.GITLAB_PRIVATE_TOKEN || "",
      };

      // Get all projects
      const projects = await this.gitLabController.getAllProjects(gitLabConfig);

      // Get release counts for each project
      const projectsWithReleases = await Promise.all(
        projects.map(async (project) => {
          const projectConfig = {
            ...gitLabConfig,
            projectId: project.id.toString(),
          };
          const releases = await this.gitLabController.getReleases(
            projectConfig
          );
          return {
            ...project,
            releaseCount: releases.length,
          };
        })
      );

      // Group projects by namespace
      const groupedProjects = projectsWithReleases.reduce(
        (acc, project) => {
          const namespaceName = project.namespace?.name || "Unknown";

          if (!acc[namespaceName]) {
            acc[namespaceName] = {
              namespace: {
                name: namespaceName,
                id: project.namespace?.id || 0,
                path: project.namespace?.path || "",
                kind: project.namespace?.kind || "unknown",
              },
              projects: [],
              totalReleaseCount: 0,
            };
          }

          acc[namespaceName].projects.push({
            id: project.id,
            name: project.name,
            description: project.description,
            releaseCount: project.releaseCount,
          });

          acc[namespaceName].totalReleaseCount += project.releaseCount;

          return acc;
        },
        {} as Record<
          string,
          {
            namespace: {
              name: string;
              id: number;
              path: string;
              kind: string;
            };
            projects: Array<{
              id: number;
              name: string;
              description: string;
              releaseCount: number;
            }>;
            totalReleaseCount: number;
          }
        >
      );

      // Convert to array format
      const result = Object.values(groupedProjects);

      res.json(result);
    } catch (error) {
      console.error("Error getting GitLab projects:", error);
      res.status(500).json({
        error: "Failed to get GitLab projects",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
