import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import gradeRoutes from './routes/grades.js';
import classRoutes from './routes/classes.js';
import scaleRoutes from './routes/scales.js';
import scaleCategoryRoutes from './routes/scaleCategories.js';
import assessmentRoutes from './routes/assessments.js';
import studentTaskRoutes from './routes/studentTasks.js';
import alertRoutes from './routes/alerts.js';
import studentProfileRoutes from './routes/students.js';
import dashboardRoutes from './routes/dashboard.js';
import adminRoutes from './routes/admin.js';
import notificationRoutes from './routes/notifications.js';
import h5Routes from './routes/h5.js';
import consultRoutes from './routes/consult.js';
import parentRoutes from './routes/parent.js';
import parentNotificationRoutes from './routes/parentNotifications.js';
import reportRoutes from './routes/reports.js';
import aiChatStaffRoutes from './routes/aiChatStaff.js';
import { injectTenant } from './middleware/tenant.js';
import { authenticate, authorize } from './middleware/auth.js';
import { alertFilterCounselorsHandler } from './routes/alertFilterRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 5001, message: '请求过于频繁，请稍后再试', data: null },
}));

// BigInt → string for JSON serialization
app.set('json replacer', (_key, value) =>
  typeof value === 'bigint' ? value.toString() : value
);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 公开路由（无需鉴权）
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/h5', h5Routes);
app.use('/api/v1/parent', parentRoutes);

// 预警负责人下拉：独立路径，避免被 app.use('/api/v1/alerts') 整条吞掉导致 404
app.get(
  '/api/v1/meta/alert-counselors',
  authenticate,
  injectTenant,
  authorize('counselor'),
  alertFilterCounselorsHandler
);

// 鉴权路由（需要 JWT + 租户上下文）
app.use('/api/v1/grades', authenticate, injectTenant, gradeRoutes);
app.use('/api/v1/classes', authenticate, injectTenant, classRoutes);
app.use('/api/v1/scale-categories', authenticate, injectTenant, scaleCategoryRoutes);
app.use('/api/v1/scales', authenticate, injectTenant, scaleRoutes);
app.use('/api/v1/assessment-plans', authenticate, injectTenant, assessmentRoutes);
app.use('/api/v1/student', authenticate, injectTenant, studentTaskRoutes);
app.use('/api/v1/alerts', authenticate, injectTenant, alertRoutes);
app.use('/api/v1/students', authenticate, injectTenant, studentProfileRoutes);
app.use('/api/v1/dashboard', authenticate, injectTenant, dashboardRoutes);
app.use('/api/v1/admin', authenticate, injectTenant, adminRoutes);
app.use('/api/v1/notifications', authenticate, injectTenant, notificationRoutes);
app.use('/api/v1/consult', authenticate, injectTenant, consultRoutes);
app.use('/api/v1/parent-notifications', authenticate, injectTenant, parentNotificationRoutes);
app.use('/api/v1/reports', authenticate, injectTenant, reportRoutes);
app.use('/api/v1/ai-chat', authenticate, injectTenant, authorize('counselor'), aiChatStaffRoutes);

// 静态文件：报告下载
app.use('/uploads', express.static('uploads'));

app.use(errorHandler);

export default app;
