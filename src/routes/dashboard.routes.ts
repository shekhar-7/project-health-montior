import { Router } from "express";
import { DashboardController } from "../controllers/dashboard.controller";
import { DashboardService } from "../services/dashboard.service";
import { GitLabController } from "../controllers/gitlab.controller";
import {
  gitLabConfig,
  flowluConfig,
  clockifyConfig,
} from "../config/external-services.config";

const router = Router();
const dashboardService = new DashboardService(
  gitLabConfig,
  flowluConfig,
  clockifyConfig
);
const gitLabController = new GitLabController();
const dashboardController = new DashboardController(
  dashboardService,
  gitLabController
);

/**
 * @swagger
 * /api/dashboard/metrics:
 *   get:
 *     summary: Get dashboard metrics
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: olderTag
 *         schema:
 *           type: string
 *         required: true
 *         description: Older tag for comparison
 *       - in: query
 *         name: newerTag
 *         schema:
 *           type: string
 *         required: true
 *         description: Newer tag for comparison
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         required: false
 *         description: Optional project ID to filter metrics
 *     responses:
 *       200:
 *         description: Dashboard metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalCommits:
 *                   type: number
 *                 totalFeatures:
 *                   type: number
 *                 totalBugs:
 *                   type: number
 *                 totalDevelopmentTime:
 *                   type: number
 *                 totalQaTime:
 *                   type: number
 *       500:
 *         description: Server error
 */
router.get("/metrics", (req, res) => dashboardController.getMetrics(req, res));

/**
 * @swagger
 * /api/dashboard/release-metrics:
 *   get:
 *     summary: Get release metrics
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: olderTag
 *         schema:
 *           type: string
 *         required: true
 *         description: Older tag for comparison
 *       - in: query
 *         name: newerTag
 *         schema:
 *           type: string
 *         required: true
 *         description: Newer tag for comparison
 *       - in: query
 *         name: projectId
 *         schema:
 *           type: string
 *         required: false
 *         description: Optional project ID to filter metrics
 *     responses:
 *       200:
 *         description: Release metrics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 commits:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       message:
 *                         type: string
 *                       author:
 *                         type: string
 *                       date:
 *                         type: string
 *       500:
 *         description: Server error
 */
router.get("/release-metrics", (req, res) =>
  dashboardController.getReleaseMetrics(req, res)
);

/**
 * @swagger
 * /api/dashboard/task-metrics:
 *   get:
 *     summary: Get task metrics for a specific project
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the project to get metrics for
 *     responses:
 *       200:
 *         description: Task metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 projectId:
 *                   type: integer
 *                   description: ID of the project
 *                 projectName:
 *                   type: string
 *                   description: Name of the project
 *                 totalTasks:
 *                   type: integer
 *                   description: Total number of tasks
 *                 inProgress:
 *                   type: integer
 *                   description: Number of tasks in progress
 *                 completed:
 *                   type: integer
 *                   description: Number of completed tasks
 *                 overdue:
 *                   type: integer
 *                   description: Number of overdue tasks
 *                 averageCompletionTime:
 *                   type: number
 *                   description: Average time to complete tasks
 *       400:
 *         description: Project ID is required
 *       500:
 *         description: Server error
 */
router.get(
  "/task-metrics",
  dashboardController.getTaskMetrics.bind(dashboardController)
);

/**
 * @swagger
 * /api/dashboard/bug-metrics:
 *   get:
 *     summary: Get bug metrics for a specific project
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the project to get bug metrics for
 *     responses:
 *       200:
 *         description: Bug metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 projectId:
 *                   type: integer
 *                   description: ID of the project
 *                 projectName:
 *                   type: string
 *                   description: Name of the project
 *                 totalBugs:
 *                   type: integer
 *                   description: Total number of bugs
 *                 criticalBugs:
 *                   type: integer
 *                   description: Number of critical bugs
 *                 resolvedBugs:
 *                   type: integer
 *                   description: Number of resolved bugs
 *                 averageResolutionTime:
 *                   type: number
 *                   description: Average time to resolve bugs
 *       400:
 *         description: Project ID is required
 *       500:
 *         description: Server error
 */
router.get(
  "/bug-metrics",
  dashboardController.getBugMetrics.bind(dashboardController)
);

/**
 * @swagger
 * /api/dashboard/projects/search:
 *   get:
 *     summary: Search for projects by name
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *         required: true
 *         description: Search term to filter projects by name
 *     responses:
 *       200:
 *         description: List of matching projects
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: Project ID
 *                   name:
 *                     type: string
 *                     description: Project name
 *       500:
 *         description: Server error
 */
router.get("/projects/search", (req, res) =>
  dashboardController.searchProjects(req, res)
);

/**
 * @swagger
 * /api/dashboard/project-releases:
 *   get:
 *     summary: Get releases for a specific project
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the project to get releases for
 *     responses:
 *       200:
 *         description: Project releases retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 releases:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         description: Unique identifier for the release
 *                       name:
 *                         type: string
 *                         description: Name of the release
 *                       date:
 *                         type: string
 *                         description: Release date in YYYY-MM-DD format
 *                       gitBranch:
 *                         type: string
 *                         description: Git branch name for the release
 *                       developmentHours:
 *                         type: number
 *                         description: Number of development hours spent
 *                       bugs:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               description: Unique identifier for the bug
 *                             name:
 *                               type: string
 *                               description: Name of the bug
 *                             createdAt:
 *                               type: string
 *                               description: Bug creation date in YYYY-MM-DD format
 *       400:
 *         description: Project ID is required
 *       500:
 *         description: Server error
 */
router.get(
  "/project-releases",
  dashboardController.getProjectReleases.bind(dashboardController)
);

/**
 * @swagger
 * /api/dashboard/releases:
 *   get:
 *     summary: Get all releases for a specific GitLab project
 *     tags: [Dashboard]
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: GitLab project ID
 *     responses:
 *       200:
 *         description: Releases retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: number
 *                     description: Release ID
 *                   name:
 *                     type: string
 *                     description: Release name
 *                   tag_name:
 *                     type: string
 *                     description: Git tag name
 *                   created_at:
 *                     type: string
 *                     description: Creation date
 *       400:
 *         description: Project ID is required
 *       500:
 *         description: Server error
 */
router.get(
  "/releases",
  dashboardController.getReleases.bind(dashboardController)
);

// Get metrics
router.get("/metrics", (req, res) => dashboardController.getMetrics(req, res));

// Get dashboard metrics
router.get("/dashboard", (req, res) =>
  dashboardController.getDashboardMetrics(req, res)
);

// Get release metrics
router.get("/release", (req, res) =>
  dashboardController.getReleaseMetrics(req, res)
);

export default router;
