import express, { RequestHandler } from 'express';
import { ApiTransaction } from '../models/api-transaction.model';
import { protect } from '../middleware/auth.middleware';
import { FrontendError } from '../models/frontend-error.model';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Monitoring
 *   description: API monitoring and transaction tracking
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ApiTransaction:
 *       type: object
 *       properties:
 *         method:
 *           type: string
 *           description: HTTP method of the request
 *           example: GET
 *         path:
 *           type: string
 *           description: Request path
 *           example: /api/users
 *         requestBody:
 *           type: object
 *           description: Request body data
 *         requestHeaders:
 *           type: object
 *           description: Request headers
 *         responseStatus:
 *           type: number
 *           description: HTTP response status code
 *           example: 200
 *         responseBody:
 *           type: object
 *           description: Response body data
 *         duration:
 *           type: number
 *           description: Request duration in milliseconds
 *           example: 123
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: When the request occurred
 *         ipAddress:
 *           type: string
 *           description: Client IP address
 *           example: "192.168.1.1"
 *         userAgent:
 *           type: string
 *           description: Client user agent string
 */

/**
 * @swagger
 * /api/monitoring/transactions:
 *   get:
 *     summary: Get API transaction logs
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of records per page
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *           enum: [GET, POST, PUT, DELETE, PATCH]
 *         description: Filter by HTTP method
 *       - in: query
 *         name: status
 *         schema:
 *           type: integer
 *         description: Filter by response status code
 *     responses:
 *       200:
 *         description: List of API transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     transactions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ApiTransaction'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           description: Total number of records
 *                         page:
 *                           type: integer
 *                           description: Current page number
 *                         pages:
 *                           type: integer
 *                           description: Total number of pages
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized to view monitoring data
 */
router.get('/transactions', protect as unknown as RequestHandler, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const skip = (page - 1) * limit;

      // Build query
      const query: any = {};
      if (req.query.method) {
        query.method = req.query.method;
      }
      if (req.query.status) {
        query.responseStatus = parseInt(req.query.status as string);
      }

      const transactions = await ApiTransaction.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit);

      const total = await ApiTransaction.countDocuments(query);

      res.json({
        status: "success",
        data: {
          transactions,
          pagination: {
            total,
            page,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      res.status(500).json({
        status: "error",
        message: "Error fetching transactions",
      });
    }
  }
);

/**
 * @swagger
 * /api/monitoring/transactions/stats:
 *   get:
 *     summary: Get API transaction statistics
 *     description: Retrieve detailed statistics about API transactions including success rates, error rates, and duration metrics
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved transaction statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalRequests:
 *                       type: integer
 *                       description: Total number of API requests
 *                       example: 100
 *                     averageDuration:
 *                       type: number
 *                       description: Average duration of all requests in milliseconds
 *                       example: 150.45
 *                     statusCodes:
 *                       type: object
 *                       description: Count of responses by status code
 *                       example:
 *                         "200": 80
 *                         "404": 15
 *                         "500": 5
 *                     methodCounts:
 *                       type: object
 *                       description: Count of requests by HTTP method
 *                       example:
 *                         "GET": 60
 *                         "POST": 30
 *                         "PUT": 10
 *                     pathStats:
 *                       type: array
 *                       description: Statistics broken down by API path
 *                       items:
 *                         type: object
 *                         properties:
 *                           path:
 *                             type: string
 *                             description: The API path
 *                             example: "/api/users"
 *                           totalRequests:
 *                             type: integer
 *                             description: Total requests for this path
 *                             example: 50
 *                           successfulRequests:
 *                             type: integer
 *                             description: Number of successful requests (2xx)
 *                             example: 45
 *                           clientErrors:
 *                             type: integer
 *                             description: Number of client errors (4xx)
 *                             example: 3
 *                           serverErrors:
 *                             type: integer
 *                             description: Number of server errors (5xx)
 *                             example: 2
 *                           successRate:
 *                             type: number
 *                             description: Percentage of successful requests
 *                             example: 90.00
 *                           clientErrorRate:
 *                             type: number
 *                             description: Percentage of client errors
 *                             example: 6.00
 *                           serverErrorRate:
 *                             type: number
 *                             description: Percentage of server errors
 *                             example: 4.00
 *                           totalErrorRate:
 *                             type: number
 *                             description: Total percentage of errors
 *                             example: 10.00
 *                           avgDuration:
 *                             type: number
 *                             description: Average duration for this path in milliseconds
 *                             example: 120.50
 *                           errorBreakdown:
 *                             type: object
 *                             properties:
 *                               clientErrors:
 *                                 type: object
 *                                 properties:
 *                                   count:
 *                                     type: integer
 *                                     description: Number of client errors
 *                                     example: 3
 *                                   percentage:
 *                                     type: number
 *                                     description: Percentage of client errors
 *                                     example: 6.00
 *                               serverErrors:
 *                                 type: object
 *                                 properties:
 *                                   count:
 *                                     type: integer
 *                                     description: Number of server errors
 *                                     example: 2
 *                                   percentage:
 *                                     type: number
 *                                     description: Percentage of server errors
 *                                     example: 4.00
 *       401:
 *         description: Unauthorized - Authentication token is missing or invalid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: fail
 *                 message:
 *                   type: string
 *                   example: Not authenticated
 *       500:
 *         description: Internal server error while fetching statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Error fetching transaction statistics
 */
router.get('/transactions/stats', protect as unknown as RequestHandler, async (req, res) => {
  try {
    const [
      totalRequests,
      averageDuration,
      statusCodes,
      methodCounts,
      pathStats
    ] = await Promise.all([
      ApiTransaction.countDocuments(),
      ApiTransaction.aggregate([
        { $group: { _id: '$mainRoute', avg: { $avg: '$duration' } } }
      ]),
      ApiTransaction.aggregate([
        { $group: { _id: '$responseStatus', count: { $sum: 1 } } }
      ]),
      ApiTransaction.aggregate([
        { $group: { _id: '$method', count: { $sum: 1 } } }
      ]),
      ApiTransaction.aggregate([
        {
          $group: {
            _id: '$mainRoute',
            totalRequests: { $sum: 1 },
            successfulRequests: {
              $sum: {
                $cond: [
                  { $and: [
                    { $gte: ['$responseStatus', 200] },
                    { $lt: ['$responseStatus', 300] }
                  ]},
                  1,
                  0
                ]
              }
            },
            clientErrors: {
              $sum: {
                $cond: [
                  { $and: [
                    { $gte: ['$responseStatus', 400] },
                    { $lt: ['$responseStatus', 500] }
                  ]},
                  1,
                  0
                ]
              }
            },
            serverErrors: {
              $sum: {
                $cond: [
                  { $gte: ['$responseStatus', 500] },
                  1,
                  0
                ]
              }
            },
            avgDuration: { $avg: '$duration' },
            // Group status codes for detailed error tracking
            statusCodes: {
              $push: {
                status: '$responseStatus',
                count: 1
              }
            }
          }
        },
        {
          $project: {
            path: '$_id',
            originalPaths: '$paths',
            totalRequests: 1,
            successfulRequests: 1,
            clientErrors: 1,
            serverErrors: 1,
            successRate: {
              $multiply: [
                { $divide: ['$successfulRequests', '$totalRequests'] },
                100
              ]
            },
            clientErrorRate: {
              $multiply: [
                { $divide: ['$clientErrors', '$totalRequests'] },
                100
              ]
            },
            serverErrorRate: {
              $multiply: [
                { $divide: ['$serverErrors', '$totalRequests'] },
                100
              ]
            },
            avgDuration: 1,
            statusCodes: 1
          }
        },
        {
          $sort: { totalRequests: -1 }
        }
      ])
    ]);

      res.json({
        status: "success",
        data: {
          totalRequests,
          averageDuration: averageDuration[0]?.avg || 0,
          statusCodes: Object.fromEntries(
            statusCodes.map((item) => [item._id, item.count])
          ),
          methodCounts: Object.fromEntries(
            methodCounts.map((item) => [item._id, item.count])
          ),
          pathStats: pathStats.map((stat) => ({
            path: stat.path,
            totalRequests: stat.totalRequests,
            successfulRequests: stat.successfulRequests,
            clientErrors: stat.clientErrors,
            serverErrors: stat.serverErrors,
            successRate: Math.round(stat.successRate * 100) / 100,
            clientErrorRate: Math.round(stat.clientErrorRate * 100) / 100,
            serverErrorRate: Math.round(stat.serverErrorRate * 100) / 100,
            totalErrorRate:
              Math.round((stat.clientErrorRate + stat.serverErrorRate) * 100) /
              100,
            avgDuration: Math.round(stat.avgDuration * 100) / 100,
            errorBreakdown: {
              clientErrors: {
                count: stat.clientErrors,
                percentage: Math.round(stat.clientErrorRate * 100) / 100,
              },
              serverErrors: {
                count: stat.serverErrors,
                percentage: Math.round(stat.serverErrorRate * 100) / 100,
              },
            },
          })),
        },
      });
    } catch (error) {
      console.error("Error fetching transaction statistics:", error);
      res.status(500).json({
        status: "error",
        message: "Error fetching transaction statistics",
      });
    }
  }
);

/**
 * @swagger
 * /api/monitoring/transactions:
 *   post:
 *     summary: Create a new API transaction log
 *     tags: [Monitoring]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApiTransaction'
 *     responses:
 *       201:
 *         description: Transaction created successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Server error
 */
router.post("/transactions", async (req, res) => {
  try {
    const {
      method,
      path,
      mainRoute,
      requestBody,
      requestHeaders,
      responseStatus,
      responseBody,
      duration,
      timestamp,
      ipAddress,
      userAgent,
    } = req.body;

    const transaction = await ApiTransaction.create({
      method,
      mainRoute,
      path,
      requestBody,
      requestHeaders,
      responseStatus,
      responseBody,
      duration,
      timestamp: timestamp || new Date(),
      ipAddress,
      userAgent,
    });

    res.status(201).json({
      status: "success",
      data: {
        transaction,
      },
    });
  } catch (error: any) {
    console.error("Transaction creation error:", error);
    res.status(500).json({
      status: "error",
      message: "Error creating transaction log",
      error: error.message,
      details: error.errors,
    });
  }
});

/**
 * @swagger
 * /api/monitoring/frontend-errors:
 *   post:
 *     summary: Log a frontend error
 *     tags: [Monitoring]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - errorName
 *               - message
 *               - path
 *             properties:
 *               errorName:
 *                 type: string
 *                 description: Name or type of the error
 *                 example: "ReferenceError"
 *               message:
 *                 type: string
 *                 description: Error message
 *                 example: "Cannot read property 'data' of undefined"
 *               stack:
 *                 type: string
 *                 description: Error stack trace
 *                 example: "ReferenceError: data is not defined\n    at Component..."
 *               componentName:
 *                 type: string
 *                 description: Name of the React/Vue component where error occurred
 *                 example: "UserDashboard"
 *               path:
 *                 type: string
 *                 description: URL path where the error occurred
 *                 example: "/dashboard/users"
 *               browserInfo:
 *                 type: object
 *                 description: Browser and system information
 *                 properties:
 *                   userAgent:
 *                     type: string
 *                     description: Browser user agent string
 *                   viewport:
 *                     type: object
 *                     properties:
 *                       width:
 *                         type: number
 *                         example: 1920
 *                       height:
 *                         type: number
 *                         example: 1080
 *               userId:
 *                 type: string
 *                 description: ID of the user if authenticated
 *                 example: "user123"
 *               sessionId:
 *                 type: string
 *                 description: Current session ID
 *                 example: "sess_abc123"
 *               metadata:
 *                 type: object
 *                 description: Additional contextual information
 *                 example: {
 *                   "feature": "userSearch",
 *                   "action": "filterUsers"
 *                 }
 *     responses:
 *       201:
 *         description: Frontend error logged successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     error:
 *                       type: object
 *                       properties:
 *                         errorName:
 *                           type: string
 *                         message:
 *                           type: string
 *                         timestamp:
 *                           type: string
 *                           format: date-time
 *       500:
 *         description: Server error while logging frontend error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Error logging frontend error
 * 
 */
router.post('/frontend-errors', async (req, res) => {
  try {
    const error = await FrontendError.create({
      ...req.body,
      browserInfo: {
        ...req.body.browserInfo,
        userAgent: req.body.browserInfo?.userAgent || req.get('user-agent')
      }
    });

    res.status(201).json({
      status: 'success',
      data: { error }
    });
  } catch (error: any) {
    console.error('Frontend error logging failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error logging frontend error'
    });
  }
});


/**
 * @swagger
 * /api/monitoring/frontend-errors/stats:
 *   get:
 *     summary: Get frontend error statistics
 *     description: Retrieve detailed statistics about frontend errors including error types, components, and trends
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved frontend error statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalErrors:
 *                       type: integer
 *                       description: Total number of frontend errors
 *                       example: 100
 *                     errorsByType:
 *                       type: array
 *                       description: Error statistics grouped by error type
 *                       items:
 *                         type: object
 *                         properties:
 *                           errorName:
 *                             type: string
 *                             description: Name of the error type
 *                             example: "ReferenceError"
 *                           count:
 *                             type: integer
 *                             description: Number of occurrences
 *                             example: 25
 *                           recentOccurrences:
 *                             type: array
 *                             description: Most recent occurrences of this error type
 *                             items:
 *                               type: object
 *                               properties:
 *                                 message:
 *                                   type: string
 *                                   description: Error message
 *                                   example: "x is not defined"
 *                                 timestamp:
 *                                   type: string
 *                                   format: date-time
 *                                 path:
 *                                   type: string
 *                                   description: URL path where error occurred
 *                                   example: "/dashboard"
 *                           uniquePathsCount:
 *                             type: integer
 *                             description: Number of unique paths where this error occurred
 *                             example: 3
 *                           uniqueComponentsCount:
 *                             type: integer
 *                             description: Number of unique components where this error occurred
 *                             example: 2
 *                     errorsByComponent:
 *                       type: array
 *                       description: Error statistics grouped by component
 *                       items:
 *                         type: object
 *                         properties:
 *                           componentName:
 *                             type: string
 *                             description: Name of the component
 *                             example: "UserDashboard"
 *                           count:
 *                             type: integer
 *                             description: Number of errors in this component
 *                             example: 15
 *                           errors:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 errorName:
 *                                   type: string
 *                                   example: "TypeError"
 *                                 message:
 *                                   type: string
 *                                   example: "Cannot read property 'length' of undefined"
 *       500:
 *         description: Server error while fetching frontend error statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 message:
 *                   type: string
 *                   example: Error fetching frontend error statistics
 */

router.get('/frontend-errors/stats', protect as unknown as RequestHandler, async (req, res) => {
  try {
    console.log("Fetching frontend error statistics");
    const [
      totalErrors,
      errorsByType,
      errorsByComponent,
      errorsByPath,
      errorsTrend
    ] = await Promise.all([
      FrontendError.countDocuments(),
      FrontendError.aggregate([
        {
          $group: {
            _id: '$errorName',
            count: { $sum: 1 },
            recentOccurrences: { 
              $push: {
                message: '$message',
                timestamp: '$timestamp',
                path: '$path'
              }
            },
            uniquePaths: { $addToSet: '$path' },
            uniqueComponents: { $addToSet: '$componentName' }
          }
        },
        {
          $project: {
            errorName: '$_id',
            count: 1,
            recentOccurrences: { $slice: ['$recentOccurrences', -5] },
            uniquePathsCount: { $size: '$uniquePaths' },
            uniqueComponentsCount: { $size: '$uniqueComponents' }
          }
        },
        { $sort: { count: -1 } }
      ]),
      FrontendError.aggregate([
        {
          $group: {
            _id: '$componentName',
            count: { $sum: 1 },
            errors: {
              $push: {
                errorName: '$errorName',
                message: '$message'
              }
            }
          }
        },
        { $sort: { count: -1 } }
      ]),
      FrontendError.aggregate([
        {
          $group: {
            _id: '$path',
            count: { $sum: 1 },
            uniqueErrors: { $addToSet: '$errorName' }
          }
        },
        {
          $project: {
            path: '$_id',
            count: 1,
            uniqueErrorsCount: { $size: '$uniqueErrors' }
          }
        },
        { $sort: { count: -1 } }
      ]),
      FrontendError.aggregate([
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$timestamp'
              }
            },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: 30 }
      ])
    ]);
    
    res.status(200).json({
      status: 'success',
      data: {
        totalErrors,
        errorsByType: errorsByType.map(error => ({
          errorName: error.errorName,
          count: error.count,
          recentOccurrences: error.recentOccurrences,
          uniquePathsCount: error.uniquePathsCount,
          uniqueComponentsCount: error.uniqueComponentsCount
        })),
        errorsByComponent: errorsByComponent.map(comp => ({
          componentName: comp._id || 'Unknown',
          count: comp.count,
          topErrors: comp.errors.slice(0, 5)
        })),
        errorsByPath: errorsByPath.map(path => ({
          path: path.path,
          count: path.count,
          uniqueErrorsCount: path.uniqueErrorsCount
        })),
        errorsTrend: errorsTrend.map(trend => ({
          date: trend._id,
          count: trend.count
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching frontend error statistics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching frontend error statistics'
    });
  }
});

export default router;