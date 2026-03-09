const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Storage for images
const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'college_website/images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 1000, height: 1000, crop: 'limit' }]
  }
});

// Storage for videos
const videoStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'college_website/videos',
    allowed_formats: ['mp4', 'mov', 'avi', 'mkv', 'webm'],
    resource_type: 'video',
    transformation: [
      { width: 1000, crop: 'limit' },
      { quality: 'auto' }
    ]
  }
});

// Create separate upload middlewares
const uploadImage = multer({ 
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const uploadVideo = multer({ 
  storage: videoStorage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Dynamic upload based on file type
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, '/tmp');
    },
    filename: (req, file, cb) => {
      cb(null, Date.now() + '-' + file.originalname);
    }
  })
});

// Custom upload middleware that routes to appropriate Cloudinary storage
const uploadToCloudinary = (req, res, next) => {
  if (!req.file) {
    return next();
  }

  const isVideo = req.file.mimetype.startsWith('video/');
  const uploadMiddleware = isVideo ? uploadVideo.single('media') : uploadImage.single('media');
  
  uploadMiddleware(req, res, (err) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(400).json({ message: 'File upload failed', error: err.message });
    }
    next();
  });
};

module.exports = { 
  cloudinary, 
  uploadImage, 
  uploadVideo, 
  upload,
  uploadToCloudinary 
};