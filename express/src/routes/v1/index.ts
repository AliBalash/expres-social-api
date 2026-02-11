import { Router } from 'express';
import multer from 'multer';
import asyncHandler from '../../middleware/asyncHandler';
import getHealth from '../../controllers/v1/appController';
import getOrganization, {
  getImportsUsage,
  getPostsUsage,
  getUploadsUsage,
} from '../../controllers/v1/organizationController';
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
  copySocialAccount,
  deleteSocialAccount,
  disconnectSocialAccount,
  getSocialAccount,
  refreshSocialAccountChannels,
  setSocialAccountChannel,
  updateSocialAccount,
} from '../../controllers/v1/socialAccountController';
import {
  deleteUpload,
  deleteUploads,
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
  forcePostAnalyticsRefreshDirect,
  forceSocialAccountAnalyticsRefreshDirect,
  forcePostAnalyticsRefresh,
  forceTeamAnalyticsRefresh,
  getBulkPostAnalyticsDirect,
  getPostAnalyticsDirect,
  getPostAnalyticsRawDirect,
  getPostAnalytics,
  getSocialAccountAnalyticsDirect,
  getSocialAccountAnalyticsRawDirect,
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
  instagramBusinessDiscovery,
  getPlatforms,
  getServerInfo,
  getTimeZones,
} from '../../controllers/v1/miscController';
import {
  createPostImport,
  getImportedPosts,
  getPostImportById,
  getPostImportStatus,
  retryPostImport,
} from '../../controllers/v1/postImportController';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    // Keep "simple upload" safely in-memory; use /upload/init for large files.
    fileSize: 25 * 1024 * 1024,
  },
});

router.get('/health', asyncHandler(getHealth));
router.get('/', asyncHandler(getHealth));
router.get('/organization', asyncHandler(getOrganization));
router.get('/organization/usage/posts', asyncHandler(getPostsUsage));
router.get('/organization/usage/uploads', asyncHandler(getUploadsUsage));
router.get('/organization/usage/imports', asyncHandler(getImportsUsage));

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
socialAccountRouter.post('/copy', asyncHandler(copySocialAccount));
socialAccountRouter.post('/set-channel', asyncHandler(setSocialAccountChannel));
socialAccountRouter.post(
  '/refresh-channels',
  asyncHandler(refreshSocialAccountChannels),
);
socialAccountRouter.delete(
  '/disconnect',
  asyncHandler(disconnectSocialAccount),
);
socialAccountRouter.get('/:id', asyncHandler(getSocialAccount));
socialAccountRouter.patch('/:id', asyncHandler(updateSocialAccount));
socialAccountRouter.delete('/:id', asyncHandler(deleteSocialAccount));
router.use('/social-account', socialAccountRouter);

const uploadRouter = Router();
uploadRouter.get('/', asyncHandler(listUploads));
uploadRouter.post('/', upload.single('file'), asyncHandler(createUpload));
uploadRouter.delete('/', asyncHandler(deleteUploads));
uploadRouter.post(
  '/create',
  upload.single('file'),
  asyncHandler(createUpload),
);
uploadRouter.post('/init', asyncHandler(initLargeUpload));
uploadRouter.post('/finalize', asyncHandler(finalizeLargeUpload));
uploadRouter.get('/:id', asyncHandler(getUpload));
uploadRouter.delete('/:id', asyncHandler(deleteUpload));
router.use('/upload', uploadRouter);

const postRouter = Router();
postRouter.get('/', asyncHandler(listPosts));
postRouter.post('/', asyncHandler(createPost));
postRouter.get('/:id', asyncHandler(getPost));
postRouter.patch('/:id', asyncHandler(updatePost));
postRouter.delete('/:id', asyncHandler(deletePost));
postRouter.post('/:id/retry', asyncHandler(retryPost));
router.use('/post', postRouter);

const postImportRouter = Router();
postImportRouter.post('/', asyncHandler(createPostImport));
postImportRouter.get('/', asyncHandler(getPostImportStatus));
postImportRouter.get('/posts', asyncHandler(getImportedPosts));
postImportRouter.get('/:importId', asyncHandler(getPostImportById));
postImportRouter.post('/:importId/retry', asyncHandler(retryPostImport));
router.use('/post-history-import', postImportRouter);

const analyticsRouter = Router();
analyticsRouter.get(
  '/social-account/raw',
  asyncHandler(getSocialAccountAnalyticsRawDirect),
);
analyticsRouter.get(
  '/social-account',
  asyncHandler(getSocialAccountAnalyticsDirect),
);
analyticsRouter.post(
  '/social-account/force',
  asyncHandler(forceSocialAccountAnalyticsRefreshDirect),
);
analyticsRouter.get(
  '/post/raw',
  asyncHandler(getPostAnalyticsRawDirect),
);
analyticsRouter.get(
  '/post/bulk',
  asyncHandler(getBulkPostAnalyticsDirect),
);
analyticsRouter.get('/post', asyncHandler(getPostAnalyticsDirect));
analyticsRouter.post(
  '/post/force',
  asyncHandler(forcePostAnalyticsRefreshDirect),
);
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
router.get('/misc/instagram/tags', asyncHandler(instagramBusinessDiscovery));

export default router;
