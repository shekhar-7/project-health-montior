import { GitLabController } from "../controllers/gitlab.controller";
import { FlowluService, FlowluTask } from "./flowlu.service";
import { ClockifyService } from "./clockify.service";
import {
  GitLabConfig,
  FlowluConfig,
  ClockifyConfig,
} from "../config/external-services.config";
import { z } from "zod";

// Validation schemas
const TagComparisonSchema = z.object({
  olderTag: z.string(),
  newerTag: z.string(),
  projectId: z.number().optional(),
});

export type TagComparison = z.infer<typeof TagComparisonSchema>;

export interface DashboardMetrics {
  releaseMetrics: {
    currentRelease: string;
    previousRelease: string;
    totalFeatures: number;
    totalBugs: number;
    developmentTime: number;
    qaTime: number;
  };
  taskMetrics: {
    totalTasks: number;
    inProgress: number;
    completed: number;
    overdue: number;
    averageCompletionTime: number;
  };
  bugMetrics: {
    totalBugs: number;
    criticalBugs: number;
    resolvedBugs: number;
    averageResolutionTime: number;
  };
}

export interface Bug {
  id: string;
  name: string;
  createdAt: string;
}

export interface Release {
  id: string;
  name: string;
  date: string;
  gitBranch: string;
  developmentHours: number;
  bugs: Bug[];
}

export interface ProjectReleases {
  releases: Release[];
}

export class DashboardService {
  private gitLabController: GitLabController;
  private flowluService: FlowluService;
  private clockifyService: ClockifyService;

  constructor(
    gitLabConfig: GitLabConfig,
    flowluConfig: FlowluConfig,
    clockifyConfig: ClockifyConfig
  ) {
    this.gitLabController = new GitLabController();
    this.flowluService = new FlowluService(flowluConfig);
    this.clockifyService = new ClockifyService(clockifyConfig);
  }

  public async searchProjects(searchTerm: string) {
    try {
      return await this.flowluService.searchProjects(searchTerm);
    } catch (error) {
      console.error("Error searching projects:", error);
      throw error;
    }
  }

  public async calculateMetrics(
    olderTag: string,
    newerTag: string,
    projectId?: number
  ) {
    try {
      // Get GitLab configuration
      const gitLabConfig = {
        gitlabUrl: process.env.GITLAB_URL || "",
        projectId: process.env.GITLAB_PROJECT_ID || "",
        privateToken: process.env.GITLAB_PRIVATE_TOKEN || "",
      };

      // Get GitLab commits between tags
      const gitLabCommits = await this.gitLabController.compareTags(
        gitLabConfig,
        { olderTag, newerTag }
      );

      // Get total releases
      const releases = await this.gitLabController.getReleases(gitLabConfig);
      const totalReleases = releases.length;

      // Get Flowlu users
      const users = await this.flowluService.getAllUsers();

      // Initialize metrics
      let totalFeatures = 0;
      let totalBugs = 0;
      let totalDevelopmentTime = 0;
      let totalQaTime = 0;

      // Get Flowlu projects
      const projects = await this.flowluService.getAllProjects();

      // Filter projects if projectId is provided
      const targetProjects = projectId
        ? projects.filter((p) => p.id === projectId)
        : projects;

      if (targetProjects.length === 0) {
        throw new Error(`Project with ID ${projectId} not found`);
      }

      // Calculate metrics for each project
      for (const project of targetProjects) {
        const tasks = await this.flowluService.getProjectTasks(
          project.id,
          project.name,
          users
        );

        for (const task of tasks) {
          if (task.cf_8 && task.cf_9) {
            const duration = await this.clockifyService.getTaskActualDuration(
              task.cf_8,
              task.cf_9
            );

            if (task.type_id === 2) {
              // Bug
              totalBugs++;
              totalQaTime += duration;
            } else {
              totalFeatures++;
              totalDevelopmentTime += duration;
            }
          }
        }
      }

      return {
        totalCommits: gitLabCommits.totalCommits,
        totalFeatures,
        totalBugs,
        totalDevelopmentTime,
        totalQaTime,
        totalReleases,
        commits: gitLabCommits.commits,
      };
    } catch (error) {
      console.error("Error calculating metrics:", error);
      throw error;
    }
  }

  public async getDashboardMetrics(): Promise<DashboardMetrics> {
    try {
      const [flowluMetrics, gitlabMetrics] = await Promise.all([
        this.flowluService.getProjectTasks(1, "Default Project", []),
        this.gitLabController.getReleases({
          gitlabUrl: process.env.GITLAB_URL || "",
          projectId: process.env.GITLAB_PROJECT_ID || "",
          privateToken: process.env.GITLAB_PRIVATE_TOKEN || "",
        }),
      ]);

      // Calculate task metrics
      const taskMetrics = {
        totalTasks: flowluMetrics.length,
        inProgress: flowluMetrics.filter((task) => task.workflow_stage_id === 9)
          .length,
        completed: flowluMetrics.filter((task) => task.workflow_stage_id === 10)
          .length,
        overdue: 0, // This will be calculated below
        averageCompletionTime: 0, // This will be calculated below
      };

      // Calculate bug metrics
      const bugTasks = flowluMetrics.filter((task) => task.type_id === 2);
      const bugMetrics = {
        totalBugs: bugTasks.length,
        criticalBugs: bugTasks.filter(
          (task) => task.estimate && task.estimate > 8
        ).length,
        resolvedBugs: bugTasks.filter((task) => task.workflow_stage_id === 10)
          .length,
        averageResolutionTime: 0, // This will be calculated below
      };

      // Get the latest two releases for release metrics
      const sortedReleases = gitlabMetrics.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const [currentRelease, previousRelease] = sortedReleases;

      const releaseMetrics = {
        currentRelease: currentRelease?.tag_name || "No current release",
        previousRelease: previousRelease?.tag_name || "No previous release",
        totalFeatures: flowluMetrics.filter((task) => task.type_id !== 2)
          .length,
        totalBugs: bugMetrics.totalBugs,
        developmentTime: 0, // This will be calculated below
        qaTime: 0, // This will be calculated below
      };

      // Calculate time metrics
      let totalDevelopmentTime = 0;
      let totalQaTime = 0;
      let totalCompletionTime = 0;
      let totalResolutionTime = 0;

      for (const task of flowluMetrics) {
        if (task.cf_8 && task.cf_9) {
          const duration = await this.clockifyService.getTaskActualDuration(
            task.cf_8,
            task.cf_9
          );

          if (task.type_id === 2) {
            // Bug
            totalQaTime += duration;
            if (task.workflow_stage_id === 10) {
              totalResolutionTime += duration;
            }
          } else {
            // Feature
            totalDevelopmentTime += duration;
            if (task.workflow_stage_id === 10) {
              totalCompletionTime += duration;
            }
          }

          // Check for overdue tasks
          const status = this.clockifyService.getDurationStatus(
            task.estimate,
            duration
          );
          if (status === "Overdue") {
            taskMetrics.overdue++;
          }
        }
      }

      // Update averages
      taskMetrics.averageCompletionTime =
        taskMetrics.completed > 0
          ? totalCompletionTime / taskMetrics.completed
          : 0;
      bugMetrics.averageResolutionTime =
        bugMetrics.resolvedBugs > 0
          ? totalResolutionTime / bugMetrics.resolvedBugs
          : 0;
      releaseMetrics.developmentTime = totalDevelopmentTime;
      releaseMetrics.qaTime = totalQaTime;

      return {
        releaseMetrics,
        taskMetrics,
        bugMetrics,
      };
    } catch (error) {
      console.error("Error getting dashboard metrics:", error);
      throw error;
    }
  }

  public async getReleaseMetrics(comparison: TagComparison) {
    try {
      const metrics = await this.calculateMetrics(
        comparison.olderTag,
        comparison.newerTag,
        comparison.projectId
      );

      return {
        commits: metrics.commits,
      };
    } catch (error) {
      console.error("Error getting release metrics:", error);
      throw error;
    }
  }

  public async getTaskMetrics(projectId: number) {
    const users = await this.flowluService.getAllUsers();
    const projects = await this.flowluService.getAllProjects();

    // Find the specific project
    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found`);
    }

    let totalTasks = 0;
    let inProgress = 0;
    let completed = 0;
    let overdue = 0;
    let totalCompletionTime = 0;

    // Get tasks for the specific project
    const tasks = await this.flowluService.getProjectTasks(
      project.id,
      project.name,
      users
    );

    totalTasks = tasks.length;

    for (const task of tasks) {
      if (task.workflow_stage_id === 9) {
        // In Progress
        inProgress++;
      } else if (task.workflow_stage_id === 10) {
        // Completed
        completed++;
      }

      if (task.cf_8 && task.cf_9) {
        const duration = await this.clockifyService.getTaskActualDuration(
          task.cf_8,
          task.cf_9
        );
        const status = this.clockifyService.getDurationStatus(
          task.estimate,
          duration
        );

        if (status === "Overdue") {
          overdue++;
        }

        if (task.workflow_stage_id === 10) {
          // Only count completion time for completed tasks
          totalCompletionTime += duration;
        }
      }
    }

    return {
      projectId: project.id,
      projectName: project.name,
      totalTasks,
      inProgress,
      completed,
      overdue,
      averageCompletionTime:
        completed > 0 ? totalCompletionTime / completed : 0,
    };
  }

  public async getBugMetrics(projectId: number) {
    const users = await this.flowluService.getAllUsers();
    const projects = await this.flowluService.getAllProjects();

    // Find the specific project
    const project = projects.find((p) => p.id === projectId);
    if (!project) {
      throw new Error(`Project with ID ${projectId} not found`);
    }

    let totalBugs = 0;
    let criticalBugs = 0;
    let resolvedBugs = 0;
    let totalResolutionTime = 0;

    // Get tasks for the specific project
    const tasks = await this.flowluService.getProjectTasks(
      project.id,
      project.name,
      users
    );

    for (const task of tasks) {
      if (task.type_id === 2) {
        // Bug
        totalBugs++;

        if (task.workflow_stage_id === 10) {
          // Completed
          resolvedBugs++;

          if (task.cf_8 && task.cf_9) {
            const duration = await this.clockifyService.getTaskActualDuration(
              task.cf_8,
              task.cf_9
            );
            totalResolutionTime += duration;
          }
        }

        // Assuming critical bugs are marked with a specific estimate or other criteria
        if (task.estimate && task.estimate > 8) {
          // Example criteria
          criticalBugs++;
        }
      }
    }

    return {
      projectId: project.id,
      projectName: project.name,
      totalBugs,
      criticalBugs,
      resolvedBugs,
      averageResolutionTime:
        resolvedBugs > 0 ? totalResolutionTime / resolvedBugs : 0,
    };
  }

  public async getProjectReleases(projectId: number): Promise<
    Array<{
      releaseName: string;
      releaseDate: string;
      branch: string;
      developmentHours: number;
      bugs: Array<{
        id: string;
        title: string;
        status: string;
        created_at: string;
      }>;
    }>
  > {
    try {
      // Get GitLab releases
      const gitlabReleases = await this.gitLabController.getReleases({
        gitlabUrl: process.env.GITLAB_URL || "",
        projectId: process.env.GITLAB_PROJECT_ID || "",
        privateToken: process.env.GITLAB_PRIVATE_TOKEN || "",
      });

      // Get Flowlu tasks
      const users = await this.flowluService.getAllUsers();
      const flowluTasks = await this.flowluService.getProjectTasks(
        projectId,
        "GitLab Project", // Project name
        users // Pass the users array
      );

      // Filter bug tasks
      const bugTasks = flowluTasks.filter((task) => task.type_id === 2);

      // Format release data
      const releases = await Promise.all(
        gitlabReleases.map(async (release) => {
          // Get branch information for this tag
          const branchInfo = await this.gitLabController.getTagBranchInfo(
            {
              gitlabUrl: process.env.GITLAB_URL || "",
              projectId: process.env.GITLAB_PROJECT_ID || "",
              privateToken: process.env.GITLAB_PRIVATE_TOKEN || "",
            },
            release.tag_name
          );

          // Calculate development hours for this release
          // This is a simplified calculation - in a real app, you might want to use
          // time tracking data from Clockify or another service
          const developmentHours = Math.floor(Math.random() * 100); // Placeholder

          // Find bugs associated with this release
          // In a real app, you might want to use commit messages or issue references
          // to associate bugs with releases
          const releaseBugs = bugTasks.slice(0, Math.floor(Math.random() * 5)); // Placeholder

          return {
            releaseName: release.name || release.tag_name,
            releaseDate: release.created_at,
            branch: branchInfo.branch,
            developmentHours,
            bugs: releaseBugs.map((bug) => ({
              id: bug.id || "",
              title: bug.name || "Unnamed Bug",
              status: bug.status || "Unknown",
              created_at: bug.created_at || new Date().toISOString(),
            })),
          };
        })
      );

      return releases;
    } catch (error) {
      console.error("Error getting project releases:", error);
      throw error;
    }
  }
}
