import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as authService from '../services/authService.js';
import { success } from '../utils/response.js';
import { ValidationError } from '../utils/errors.js';

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const { username, password, tenant_code } = req.body;
    if (!username || !password || !tenant_code) {
      throw new ValidationError('用户名、密码、学校编码不能为空');
    }
    const data = await authService.login(username, password, tenant_code);
    success(res, data, '登录成功');
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) throw new ValidationError('refresh_token不能为空');
    const data = await authService.refreshAccessToken(refresh_token);
    success(res, data);
  } catch (err) {
    next(err);
  }
});

router.post('/logout', authenticate, (_req, res) => {
  success(res, null, '退出成功');
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user.userId);
    success(res, user);
  } catch (err) {
    next(err);
  }
});

router.put('/password', authenticate, async (req, res, next) => {
  try {
    const { old_password, new_password } = req.body;
    if (!old_password || !new_password) {
      throw new ValidationError('原密码和新密码不能为空');
    }
    await authService.changePassword(req.user.userId, old_password, new_password);
    success(res, null, '密码修改成功');
  } catch (err) {
    next(err);
  }
});

export default router;
