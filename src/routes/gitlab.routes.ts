import { Router } from "express";
import {
  GitLabController,
  GitLabConfig,
  TagComparison,
} from "../controllers/gitlab.controller";
import { z } from "zod";

const router = Router();
const gitLabController = new GitLabController();

// Request body validation schema
const CompareTagsRequestSchema = z.object({
  gitlabConfig: z.object({
    gitlabUrl: z.string().url(),
    projectId: z.string(),
    privateToken: z.string(),
  }),
  comparison: z.object({
    olderTag: z.string(),
    newerTag: z.string(),
  }),
});

router.post("/compare-tags", async (req, res) => {
  try {
    // Validate request body
    const { gitlabConfig, comparison } = CompareTagsRequestSchema.parse(
      req.body
    );

    // Compare tags
    const result = await gitLabController.compareTags(gitlabConfig, comparison);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.log("error in compareTags", error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: "Invalid request data",
        details: error.errors,
      });
    } else {
      res.status(500).json({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
      });
    }
  }
});

export default router;
