import mongoose from 'mongoose';

const tokenBlacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // Automatically delete records after 24 hours
  }
});

export const TokenBlacklist = mongoose.model('TokenBlacklist', tokenBlacklistSchema); 