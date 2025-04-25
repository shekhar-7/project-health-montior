import express, { RequestHandler } from 'express';
import { ApiTransaction } from '../models/api-transaction.model';
import { protect } from '../middleware/auth.middleware';

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
router.get('/transactions', protect as RequestHandler, async (req, res) => {
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
      status: 'success',
      data: {
        transactions,
        pagination: {
          total,
          page,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Error fetching transactions'
    });
  }
});

/**
 * @swagger
 * /api/monitoring/transactions/stats:
 *   get:
 *     summary: Get API transaction statistics
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: API transaction statistics
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
 *                     averageDuration:
 *                       type: number
 *                     statusCodes:
 *                       type: object
 *                     methodCounts:
 *                       type: object
 */
router.get('/transactions/stats', protect as RequestHandler, async (req, res) => {
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
      status: 'success',
      data: {
        totalRequests,
        averageDuration: averageDuration[0]?.avg || 0,
        statusCodes: Object.fromEntries(
          statusCodes.map(item => [item._id, item.count])
        ),
        methodCounts: Object.fromEntries(
          methodCounts.map(item => [item._id, item.count])
        ),
        pathStats: pathStats.map(stat => ({
          path: stat.path,
          totalRequests: stat.totalRequests,
          successfulRequests: stat.successfulRequests,
          clientErrors: stat.clientErrors,
          serverErrors: stat.serverErrors,
          successRate: Math.round(stat.successRate * 100) / 100,
          clientErrorRate: Math.round(stat.clientErrorRate * 100) / 100,
          serverErrorRate: Math.round(stat.serverErrorRate * 100) / 100,
          totalErrorRate: Math.round((stat.clientErrorRate + stat.serverErrorRate) * 100) / 100,
          avgDuration: Math.round(stat.avgDuration * 100) / 100,
          errorBreakdown: {
            clientErrors: {
              count: stat.clientErrors,
              percentage: Math.round(stat.clientErrorRate * 100) / 100
            },
            serverErrors: {
              count: stat.serverErrors,
              percentage: Math.round(stat.serverErrorRate * 100) / 100
            }
          }
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching transaction statistics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching transaction statistics'
    });
  }
});

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
router.post('/transactions', async (req, res) => {
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
      userAgent
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
      userAgent
    });

    res.status(201).json({
      status: 'success',
      data: {
        transaction
      }
    });
  } catch (error: any) {
    console.error('Transaction creation error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating transaction log',
      error: error.message,
      details: error.errors
    });
  }
});

export default router; 