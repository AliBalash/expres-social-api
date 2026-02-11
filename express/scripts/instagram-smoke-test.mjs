import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';
const ALLOW_MUTATIONS = process.env.ALLOW_MUTATIONS === '1';
const DEFAULT_TEAM_ID =
  process.env.BUNDLESOCIAL_DEFAULT_TEAM_ID ??
  process.env.DEFAULT_TEAM_ID ??
  '';
const DEFAULT_IG_SOCIAL_ACCOUNT_ID =
  process.env.BUNDLESOCIAL_DEFAULT_INSTAGRAM_SOCIAL_ACCOUNT_ID ?? '';

const EXISTING_POST_ID =
  process.env.EXISTING_POST_ID ??
  '2a79ef1b-2312-4aa1-81ae-387b6b3bca5f';

const VIDEO_PATH =
  process.env.VIDEO_PATH ??
  path.resolve(process.cwd(), 'src', 'video.mp4');

const IMG_PATH =
  process.env.IMG_PATH ?? path.resolve('/tmp', 'ig-test.jpg');

const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const jsonFetch = async (url, init) => {
  const res = await fetch(url, init);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { res, data };
};

const ensureTestImage = async () => {
  if (fs.existsSync(IMG_PATH)) return;

  const res = await fetch('https://picsum.photos/1080/1080.jpg');
  expect(res.ok, `failed to download test image: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(IMG_PATH, buf);
};

const uploadSimpleV1 = async (teamId) => {
  const form = new FormData();
  form.append('teamId', teamId);
  const buf = fs.readFileSync(IMG_PATH);
  form.append('file', new Blob([buf], { type: 'image/jpeg' }), 'ig-test.jpg');

  const { res, data } = await jsonFetch(`${BASE_URL}/api/v1/upload`, {
    method: 'POST',
    body: form,
  });

  expect(res.status === 201, `v1 upload expected 201 got ${res.status}`);
  expect(data && data.id, 'v1 upload missing id');
  return data.id;
};

const deleteUploadV1 = async (uploadId) => {
  const { res, data } = await jsonFetch(`${BASE_URL}/api/v1/upload/${uploadId}`, {
    method: 'DELETE',
  });
  expect(res.ok, `delete upload expected 200 got ${res.status}`);
  expect(data && data.id === uploadId, 'delete upload returned wrong id');
};

const largeUploadV1 = async (teamId) => {
  const { res: initRes, data: initData } = await jsonFetch(
    `${BASE_URL}/api/v1/upload/init`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamId,
        fileName: 'ig-test.jpg',
        mimeType: 'image/jpeg',
      }),
    },
  );

  expect(initRes.status === 201, `upload/init expected 201 got ${initRes.status}`);
  const url = initData?.signedUrl ?? initData?.url;
  const p = initData?.path;
  expect(typeof url === 'string' && url.length, 'upload/init missing signed url');
  expect(typeof p === 'string' && p.length, 'upload/init missing path');

  const buf = fs.readFileSync(IMG_PATH);
  const putRes = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: buf,
  });
  expect(putRes.ok, `PUT signedUrl failed: ${putRes.status}`);

  const { res: finRes, data: finData } = await jsonFetch(
    `${BASE_URL}/api/v1/upload/finalize`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, path: p }),
    },
  );

  expect(finRes.ok, `upload/finalize failed: ${finRes.status}`);
  expect(finData?.id, 'upload/finalize missing id');
  return finData.id;
};

const createDraftPostFromUpload = async (teamId, uploadId) => {
  const { res, data } = await jsonFetch(`${BASE_URL}/api/v1/post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      teamId,
      title: 'smoke test draft',
      status: 'DRAFT',
      postDate: new Date(Date.now() + 5 * 60_000).toISOString(),
      socialAccountTypes: ['INSTAGRAM'],
      data: {
        INSTAGRAM: {
          type: 'POST',
          text: 'smoke test',
          uploadIds: [uploadId],
        },
      },
    }),
  });

  expect(res.status === 201, `post create expected 201 got ${res.status}`);
  expect(data?.id, 'post create missing id');
  return data.id;
};

const deletePostV1 = async (postId) => {
  const { res, data } = await jsonFetch(`${BASE_URL}/api/v1/post/${postId}`, {
    method: 'DELETE',
  });
  expect(res.ok, `delete post expected 200 got ${res.status}`);
  expect(data?.id === postId, 'delete post returned wrong id');
};

const publishInstagram = async (route, filePath, mime, extraFields = {}) => {
  const form = new FormData();
  for (const [k, v] of Object.entries(extraFields)) {
    if (v !== undefined && v !== null) {
      form.append(k, String(v));
    }
  }
  const buf = fs.readFileSync(filePath);
  form.append('file', new Blob([buf], { type: mime }), path.basename(filePath));

  const { res, data } = await jsonFetch(`${BASE_URL}${route}`, {
    method: 'POST',
    body: form,
  });

  expect(res.status === 201, `${route} expected 201 got ${res.status}`);
  expect(data?.post?.id, `${route} missing post.id`);
  return data.post.id;
};

const main = async () => {
  console.log(`BASE_URL=${BASE_URL}`);
  console.log(`ALLOW_MUTATIONS=${ALLOW_MUTATIONS ? '1' : '0'}`);

  console.log(`[1] health`);
  {
    const { res, data } = await jsonFetch(`${BASE_URL}/api/v1/health`);
    expect(res.ok, `health failed: ${res.status}`);
    expect(data?.status === 'ok', 'health status != ok');
  }

  console.log(`[2] org + usage`);
  {
    const { res } = await jsonFetch(`${BASE_URL}/api/v1/organization`);
    expect(res.ok, `organization failed: ${res.status}`);
    const { res: postsUsageRes } = await jsonFetch(
      `${BASE_URL}/api/v1/organization/usage/posts`,
    );
    expect(postsUsageRes.ok, `posts usage failed: ${postsUsageRes.status}`);
  }

  console.log(`[3] team + social account`);
  expect(DEFAULT_TEAM_ID, 'BUNDLESOCIAL_DEFAULT_TEAM_ID missing (set it in .env)');
  {
    const { res } = await jsonFetch(`${BASE_URL}/api/v1/team/${DEFAULT_TEAM_ID}`);
    expect(res.ok, `team get failed: ${res.status}`);
  }

  if (DEFAULT_IG_SOCIAL_ACCOUNT_ID) {
    const { res } = await jsonFetch(
      `${BASE_URL}/api/v1/social-account/${DEFAULT_IG_SOCIAL_ACCOUNT_ID}?teamId=${DEFAULT_TEAM_ID}`,
    );
    expect(res.ok, `social-account get failed: ${res.status}`);
  }

  if (!ALLOW_MUTATIONS) {
    console.log(`[mutations skipped] set ALLOW_MUTATIONS=1 to run upload/post tests`);
    console.log(`OK`);
    return;
  }

  console.log(`[4] portal link`);
  {
    const { res, data } = await jsonFetch(
      `${BASE_URL}/api/v1/social-account/create-portal-link`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: DEFAULT_TEAM_ID,
          socialAccountTypes: ['INSTAGRAM'],
          redirectUrl: `${BASE_URL}/instagram/callback`,
        }),
      },
    );
    expect(res.status === 201, `portal link expected 201 got ${res.status}`);
    expect(typeof data?.url === 'string' && data.url.startsWith('https://'), 'portal link missing url');
  }

  console.log(`[5] upload simple + large + post draft`);
  await ensureTestImage();
  const up1 = await uploadSimpleV1(DEFAULT_TEAM_ID);
  await deleteUploadV1(up1);
  const up2 = await largeUploadV1(DEFAULT_TEAM_ID);
  await deleteUploadV1(up2);

  const up3 = await uploadSimpleV1(DEFAULT_TEAM_ID);
  const postDraftId = await createDraftPostFromUpload(DEFAULT_TEAM_ID, up3);
  await deletePostV1(postDraftId);

  console.log(`[6] publish one-call endpoints (draft)`);
  const feedId = await publishInstagram(
    '/api/instagram/publish/feed',
    IMG_PATH,
    'image/jpeg',
    { caption: 'smoke test feed', status: 'DRAFT' },
  );
  await deletePostV1(feedId);

  // Reel uses the local mp4 fixture from the repo.
  if (fs.existsSync(VIDEO_PATH)) {
    const reelId = await publishInstagram(
      '/api/instagram/publish/reel',
      VIDEO_PATH,
      'video/mp4',
      { caption: 'smoke test reel', status: 'DRAFT', shareToFeed: 'true' },
    );
    await deletePostV1(reelId);
  } else {
    console.log(`[6.1] skipping reel: video fixture not found at ${VIDEO_PATH}`);
  }

  const storyId = await publishInstagram(
    '/api/instagram/publish/story',
    IMG_PATH,
    'image/jpeg',
    { caption: 'smoke test story', status: 'DRAFT' },
  );
  await deletePostV1(storyId);

  console.log(`[7] existing post read + copy`);
  {
    const { res, data } = await jsonFetch(`${BASE_URL}/api/v1/post/${EXISTING_POST_ID}`);
    expect(res.ok, `existing post get failed: ${res.status}`);
    const uploadIds = data?.data?.INSTAGRAM?.uploadIds;
    if (Array.isArray(uploadIds) && uploadIds.length) {
      const copyId = await createDraftPostFromUpload(DEFAULT_TEAM_ID, uploadIds[0]);
      await deletePostV1(copyId);
    }
  }

  console.log(`[8] post history import status`);
  {
    const { res } = await jsonFetch(
      `${BASE_URL}/api/v1/post-history-import?teamId=${DEFAULT_TEAM_ID}&socialAccountType=INSTAGRAM`,
    );
    expect(res.ok, `import status failed: ${res.status}`);
  }

  console.log(`[9] analytics (expected to be subscription-gated on some tiers)`);
  {
    const { res } = await jsonFetch(
      `${BASE_URL}/api/v1/analytics/social-account?teamId=${DEFAULT_TEAM_ID}&platformType=INSTAGRAM`,
    );
    if (res.status !== 200) {
      console.log(`    analytics returned ${res.status} (ok if your plan disables analytics)`);
    }
  }

  console.log(`OK`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
