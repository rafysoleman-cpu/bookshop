import { getDefaultUploadService } from './uploadService.js';

const toStoragePath = (url) => {
  if (typeof url !== 'string' || url.trim() === '') return null;

  try {
    const { pathname } = new URL(url);
    return decodeURIComponent(pathname).replace(/^\/+/, '');
  } catch {
    return null;
  }
};

const buildAltText = (file, fallback) => {
  if (typeof file?.originalname === 'string') {
    const base = file.originalname.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
    if (base) return base;
  }
  return fallback ?? '';
};

export const uploadProductImages = async (files, { folder = 'products', altText } = {}) => {
  if (!Array.isArray(files) || files.length === 0) return [];

  const uploadService = await getDefaultUploadService();
  const uploaded = [];

  for (const file of files) {
    const result = await uploadService.uploadFile(file.buffer, file.originalname, folder);

    const image = {
      url: result.url,
      alt: altText || buildAltText(file, result.fileName),
      isMain: false
    };

    if (result.fileId) image.fileId = result.fileId;

    uploaded.push(image);
  }

  return uploaded;
};

export const destroyProductImages = async (images) => {
  if (!Array.isArray(images) || images.length === 0) return [];

  const uploadService = await getDefaultUploadService();
  const outcomes = await Promise.allSettled(
    images.map(async (image) => {
      let fileId = typeof image?.fileId === 'string' && image.fileId ? image.fileId : null;

      if (!fileId) {
        const path = toStoragePath(image?.url);
        if (!path) return { url: image?.url ?? null, deleted: false, reason: 'unresolvable-url' };
        fileId = await uploadService.findFileIdByPath(path);
      }

      if (!fileId) return { url: image?.url ?? null, deleted: false, reason: 'unresolvable-id' };

      await uploadService.deleteFile(fileId);
      return { url: image?.url ?? null, deleted: true };
    })
  );

  return outcomes.map((outcome, index) => {
    const image = images[index];

    if (outcome.status === 'fulfilled') return outcome.value;

    console.error(
      `Failed to delete orphaned product image "${image?.url ?? 'unknown'}":`,
      outcome.reason?.message ?? outcome.reason
    );

    return { url: image?.url ?? null, deleted: false, reason: 'delete-failed' };
  });
};
 