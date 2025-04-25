import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import os from 'os';
import path from 'path';

import userRoutes from './routes/user.routes';
import monitoringRoutes from './routes/monitoring.routes';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Get the local IP for the swagger server URL
const getLocalIpAddress = () => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (!iface.internal && iface.family === 'IPv4') {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

const localIp = getLocalIpAddress();
const port = process.env.PORT || 3001;

// CORS configuration
app.use(cors({
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Disable helmet for Swagger
app.use((req, res, next) => {
  if (req.path.startsWith('/api-docs')) {
    next();
  } else {
    helmet()(req, res, next);
  }
});

// Custom middleware for Swagger routes
app.use('/api-docs', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

// Swagger setup
const swaggerUiOptions = {
  swaggerOptions: {
    url: '/api-docs/swagger.json',
    persistAuthorization: true,
  },
  customCss: '.swagger-ui .topbar { display: none }',
};

// Serve Swagger JSON
app.get('/api-docs/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Setup Swagger UI
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(null, {
    swaggerOptions: {
      url: '/api-docs/swagger.json',
    },
  })
);

// Routes
app.use('/api/users', userRoutes);
app.use('/api/monitoring', monitoringRoutes);
// Test route
app.get('/test', (req, res) => {
  res.json({
    message: 'Server is working!',
    timestamp: new Date().toISOString()
  });
});

app.get('/debug', (req, res) => {
  res.json({
    swagger: {
      loaded: !!swaggerSpec,
      routesCount: (swaggerSpec as any)?.paths ? Object.keys((swaggerSpec as any).paths).length : 0
    },
    paths: {
      current: __dirname,
      routes: path.join(__dirname, 'routes')
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT
    }
  });
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!'
  });
});

// MongoDB connection
const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }
    await mongoose.connect(process.env.MONGODB_URI, {
      // These options are no longer needed in Mongoose 6+
      // They are now default behavior

      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log(`MongoDB Connected: ${mongoose.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Connect to database
connectDB();

interface SwaggerSpec {
  paths: Record<string, any>;
}

export default app;
