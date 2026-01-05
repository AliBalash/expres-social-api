import { Router } from 'express';
import multer from 'multer';
import asyncHandler from '../middleware/asyncHandler';
import {
  createFeedPost,
  createInstagramPost,
  createPortalLink,
  createReelPost,
  createStoryPost,
  createTeam,
  getPostStatus,
  getTeam,
  healthCheck,
  organizationDetails,
  retryPost,
  setChannel,
  uploadMedia,
} from './controller';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 * 1024, // 1 GB
  },
});

router.get('/health', asyncHandler(healthCheck));
router.get('/organization', asyncHandler(organizationDetails));
router.post('/teams', asyncHandler(createTeam));
router.get('/teams/:teamId', asyncHandler(getTeam));

router.post('/accounts/portal-link', asyncHandler(createPortalLink));
router.post('/accounts/channel', asyncHandler(setChannel));

router.post(
  '/uploads/simple',
  upload.single('file'),
  asyncHandler(uploadMedia),
);

router.post('/posts', asyncHandler(createInstagramPost));
router.post('/posts/feed', asyncHandler(createFeedPost));
router.post('/posts/reel', asyncHandler(createReelPost));
router.post('/posts/story', asyncHandler(createStoryPost));
router.get('/posts/:postId', asyncHandler(getPostStatus));
router.post('/posts/:postId/retry', asyncHandler(retryPost));

export default router;
