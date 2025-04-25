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

  constructor(
    dashboardService: DashboardService,
    gitLabController: GitLabController
  ) {
    this.dashboardService = dashboardService;
    this.gitLabController = gitLabController;
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
      const metrics = await this.dashboardService.getReleaseMetrics(comparison);
      res.json(metrics);
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

      const gitLabConfig = {
        gitlabUrl: process.env.GITLAB_URL || "",
        projectId: projectId as string,
        privateToken: process.env.GITLAB_PRIVATE_TOKEN || "",
      };

      const releases = await this.gitLabController.getReleases(gitLabConfig);
      res.json(releases);
    } catch (error) {
      console.error("Error getting releases:", error);
      res.status(500).json({
        error: "Failed to get releases",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}
