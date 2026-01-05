import { Router } from 'express';
import multer from 'multer';
import asyncHandler from '../../middleware/asyncHandler';
import getHealth from '../../controllers/v1/appController';
import getOrganization from '../../controllers/v1/organizationController';
import {
  createTeam,
  deleteTeam,
  getTeam,
  listTeams,
  updateTeam,
} from '../../controllers/v1/teamController';
import {
  connectSocialAccount,
  createPortalLink,
  deleteSocialAccount,
  getSocialAccount,
  updateSocialAccount,
} from '../../controllers/v1/socialAccountController';
import {
  finalizeLargeUpload,
  getUpload,
  initLargeUpload,
  listUploads,
  createUpload,
} from '../../controllers/v1/uploadController';
import {
  createPost,
  deletePost,
  getPost,
  listPosts,
  retryPost,
  updatePost,
} from '../../controllers/v1/postController';
import {
  forcePostAnalyticsRefresh,
  forceTeamAnalyticsRefresh,
  getPostAnalytics,
  getSocialAccountAnalytics,
  getTeamAnalytics,
} from '../../controllers/v1/analyticsController';
import {
  createComment,
  deleteComment,
  getComment,
  listComments,
  updateComment,
} from '../../controllers/v1/commentController';
import {
  getPlatforms,
  getServerInfo,
  getTimeZones,
} from '../../controllers/v1/miscController';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 * 1024,
  },
});

router.get('/health', asyncHandler(getHealth));
router.get('/organization', asyncHandler(getOrganization));

const teamRouter = Router();
teamRouter.get('/', asyncHandler(listTeams));
teamRouter.post('/', asyncHandler(createTeam));
teamRouter.get('/:id', asyncHandler(getTeam));
teamRouter.patch('/:id', asyncHandler(updateTeam));
teamRouter.delete('/:id', asyncHandler(deleteTeam));
router.use('/team', teamRouter);

const socialAccountRouter = Router();
socialAccountRouter.post(
  '/create-portal-link',
  asyncHandler(createPortalLink),
);
socialAccountRouter.post('/connect', asyncHandler(connectSocialAccount));
socialAccountRouter.get('/:id', asyncHandler(getSocialAccount));
socialAccountRouter.patch('/:id', asyncHandler(updateSocialAccount));
socialAccountRouter.delete('/:id', asyncHandler(deleteSocialAccount));
router.use('/social-account', socialAccountRouter);

const uploadRouter = Router();
uploadRouter.get('/', asyncHandler(listUploads));
uploadRouter.get('/:id', asyncHandler(getUpload));
uploadRouter.post('/init', asyncHandler(initLargeUpload));
uploadRouter.post(
  '/create',
  upload.single('file'),
  asyncHandler(createUpload),
);
uploadRouter.post('/finalize', asyncHandler(finalizeLargeUpload));
router.use('/upload', uploadRouter);

const postRouter = Router();
postRouter.get('/', asyncHandler(listPosts));
postRouter.post('/', asyncHandler(createPost));
postRouter.get('/:id', asyncHandler(getPost));
postRouter.patch('/:id', asyncHandler(updatePost));
postRouter.delete('/:id', asyncHandler(deletePost));
postRouter.post('/:id/retry', asyncHandler(retryPost));
router.use('/post', postRouter);

const analyticsRouter = Router();
analyticsRouter.get('/team/:teamId', asyncHandler(getTeamAnalytics));
analyticsRouter.post(
  '/team/:teamId/force-refresh',
  asyncHandler(forceTeamAnalyticsRefresh),
);
analyticsRouter.get(
  '/social-account/:id',
  asyncHandler(getSocialAccountAnalytics),
);
analyticsRouter.get('/post/:postId', asyncHandler(getPostAnalytics));
analyticsRouter.post(
  '/post/:postId/force-refresh',
  asyncHandler(forcePostAnalyticsRefresh),
);
router.use('/analytics', analyticsRouter);

const commentRouter = Router();
commentRouter.get('/', asyncHandler(listComments));
commentRouter.post('/', asyncHandler(createComment));
commentRouter.get('/:id', asyncHandler(getComment));
commentRouter.patch('/:id', asyncHandler(updateComment));
commentRouter.delete('/:id', asyncHandler(deleteComment));
router.use('/comment', commentRouter);

router.get('/misc/timezones', asyncHandler(getTimeZones));
router.get('/misc/platforms', asyncHandler(getPlatforms));
router.get('/misc/server', asyncHandler(getServerInfo));

export default router;
