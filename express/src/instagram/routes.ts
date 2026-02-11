import { Router } from 'express';
import multer from 'multer';
import asyncHandler from '../middleware/asyncHandler';
import { getInstagramUsage } from './debugController';
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
import { publishFeed, publishReel, publishStory } from './publishController';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    // Keep "simple upload" safely in-memory; use /api/v1/upload/init for large files.
    fileSize: 25 * 1024 * 1024, // 25 MB
  },
});

router.get('/health', asyncHandler(healthCheck));
router.get('/usage', asyncHandler(getInstagramUsage));
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

// One-call helpers: upload + create post
router.post(
  '/publish/feed',
  upload.fields([
    { name: 'file', maxCount: 10 },
    { name: 'files', maxCount: 10 },
  ]),
  asyncHandler(publishFeed),
);
router.post(
  '/publish/reel',
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'files', maxCount: 1 },
  ]),
  asyncHandler(publishReel),
);
router.post(
  '/publish/story',
  upload.fields([
    { name: 'file', maxCount: 1 },
    { name: 'files', maxCount: 1 },
  ]),
  asyncHandler(publishStory),
);

router.post('/posts', asyncHandler(createInstagramPost));
router.post('/posts/feed', asyncHandler(createFeedPost));
router.post('/posts/reel', asyncHandler(createReelPost));
router.post('/posts/story', asyncHandler(createStoryPost));
router.get('/posts/:postId', asyncHandler(getPostStatus));
router.post('/posts/:postId/retry', asyncHandler(retryPost));

export default router;
