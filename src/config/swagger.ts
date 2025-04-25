import swaggerJsdoc from "swagger-jsdoc";
import path from "path";

const port = process.env.PORT || 3001;

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Project Health Monitor API",
      version: "1.0.0",
      description: "API Documentation for Project Health Monitor",
      contact: {
        name: "API Support",
        email: "support@example.com",
      },
    },
    servers: [
      {
        url: "/",
        description: "Current Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        GitLabConfig: {
          type: "object",
          properties: {
            gitlabUrl: {
              type: "string",
              format: "url",
              example: "https://gitlab.com",
            },
            projectId: {
              type: "string",
              example: "group/project",
            },
            privateToken: {
              type: "string",
              example: "your-private-token",
            },
          },
          required: ["gitlabUrl", "projectId", "privateToken"],
        },
        TagComparison: {
          type: "object",
          properties: {
            olderTag: {
              type: "string",
              example: "v1.0.0",
            },
            newerTag: {
              type: "string",
              example: "v1.1.0",
            },
          },
          required: ["olderTag", "newerTag"],
        },
        CompareTagsResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
            },
            data: {
              type: "object",
              properties: {
                olderTag: {
                  type: "string",
                },
                newerTag: {
                  type: "string",
                },
                totalCommits: {
                  type: "integer",
                },
                commits: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: {
                        type: "string",
                      },
                      createdAt: {
                        type: "string",
                        format: "date-time",
                      },
                      title: {
                        type: "string",
                      },
                      description: {
                        type: "string",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    paths: {
      "/api/gitlab/compare-tags": {
        post: {
          tags: ["GitLab"],
          summary: "Compare commits between two GitLab tags",
          description:
            "Retrieves and compares commits between two specified GitLab tags",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    gitlabConfig: {
                      $ref: "#/components/schemas/GitLabConfig",
                    },
                    comparison: {
                      $ref: "#/components/schemas/TagComparison",
                    },
                  },
                  required: ["gitlabConfig", "comparison"],
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Successful comparison",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/CompareTagsResponse",
                  },
                },
              },
            },
            "400": {
              description: "Invalid request data",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: {
                        type: "boolean",
                        example: false,
                      },
                      error: {
                        type: "string",
                        example: "Invalid request data",
                      },
                      details: {
                        type: "array",
                        items: {
                          type: "object",
                        },
                      },
                    },
                  },
                },
              },
            },
            "500": {
              description: "Server error",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: {
                        type: "boolean",
                        example: false,
                      },
                      error: {
                        type: "string",
                        example: "An unexpected error occurred",
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    path.join(__dirname, "../routes/*.ts"),
    path.join(__dirname, "../models/*.ts"),
  ],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
