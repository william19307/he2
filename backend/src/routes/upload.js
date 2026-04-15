import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Router } from 'express';
import multer from 'multer';
import { authorize } from '../middleware/auth.js';
import { success } from '../utils/response.js';
import { ValidationError } from '../utils/errors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadRoot = path.resolve(__dirname, '../../uploads/form');

if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadRoot);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.bin';
    const safe = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}${ext}`;
    cb(null, safe);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
});

const router = Router();

router.use(authorize('teacher'));

router.post('/', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new ValidationError('文件过大，单文件不超过 8MB'));
      }
      return next(err);
    }
    try {
      if (!req.file) throw new ValidationError('请选择文件');
      const url = `/uploads/form/${req.file.filename}`;
      return success(res, { url, filename: req.file.filename });
    } catch (e) {
      next(e);
    }
  });
});

export default router;
