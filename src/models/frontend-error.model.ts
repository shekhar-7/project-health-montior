import mongoose, { Document } from 'mongoose';

export interface IFrontendError extends Document {
  errorName: string;
  message: string;
  stack?: string;
  componentName?: string;
  path: string;
  browserInfo: {
    userAgent: string;
    platform: string;
    language: string;
    screenSize?: string;
  };
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

const frontendErrorSchema = new mongoose.Schema({
  errorName: {
    type: String,
    required: true,
    index: true
  },
  message: {
    type: String,
    required: true
  },
  stack: String,
  componentName: {
    type: String,
    required: false
  },
  path: {
    type: String,
    required: true,
    index: true
  },
  browserInfo: {
    userAgent: String,
    platform: String,
    language: String,
    screenSize: String
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  userId: String,
  sessionId: String,
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

export const FrontendError = mongoose.model<IFrontendError>('FrontendError', frontendErrorSchema); 