import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';

const port = process.env.PORT || 3001;

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Project Health Monitor API',
      version: '1.0.0',
      description: 'API Documentation for Project Health Monitor',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: '/',
        description: 'Current Server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
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
    path.join(__dirname, '../routes/*.ts'),
    path.join(__dirname, '../models/*.ts')
  ],
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions); 