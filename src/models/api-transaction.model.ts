import mongoose, { Document } from 'mongoose';

export interface IApiTransaction extends Document {
  method: string;
  path: string;
  requestBody: any;
  requestHeaders: any;
  responseStatus: number;
  responseBody: any;
  duration: number;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
}

const apiTransactionSchema = new mongoose.Schema({
  method: {
    type: String,
    required: true,
  },
  mainRoute: {
    type: String,
    // required: true,
  },
  path: {
    type: String,
    required: true,
  },
  requestBody: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  requestHeaders: {
    type: Object,
    default: {},
  },
  responseStatus: {
    type: Number,
    required: true,
  },
  responseBody: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  duration: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  ipAddress: {
    type: String,
    // required: true,
  },
  userAgent: {
    type: String,
    default: '',
  }
}, {
  timestamps: true
});

export const ApiTransaction = mongoose.model<IApiTransaction>('ApiTransaction', apiTransactionSchema); 