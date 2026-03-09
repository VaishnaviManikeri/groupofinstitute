const mongoose = require('mongoose');

const galleryItemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['image', 'video'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  cloudinaryId: {
    type: String
  },
  thumbnail: {
    type: String
  },
  sourceType: {
    type: String,
    enum: ['upload', 'url'],
    default: 'upload'
  },
  category: {
    type: String,
    default: 'general'
  },
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  },
  order: {
    type: Number,
    default: 0
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
}, {
  timestamps: true
});

// Index for better search performance
galleryItemSchema.index({ title: 'text', description: 'text', tags: 'text' });
galleryItemSchema.index({ type: 1, isActive: 1, order: -1 });

module.exports = mongoose.model('Gallery', galleryItemSchema);