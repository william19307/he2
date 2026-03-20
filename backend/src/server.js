import config from './config/index.js';
import app from './app.js';

app.listen(config.port, () => {
  console.log(`[Server] 心理健康测评平台 API 已启动`);
  console.log(`[Server] 环境: ${config.nodeEnv}`);
  console.log(`[Server] 地址: http://localhost:${config.port}`);
  console.log(`[Server] 健康检查: http://localhost:${config.port}/api/health`);
  console.log(
    `[Server] 预警负责人下拉: GET /api/v1/alerts/counselors-list（需心理老师 Token）`
  );
});
