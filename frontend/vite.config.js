import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

/**
 * 管理端 Vite 构建配置。
 *
 * 业务意图：本工程只承载 Vue 3 管理后台，因此仅注册 Vue 单文件组件插件，
 * 不再保留为多端原型服务的局域网分享中间件。后端接口地址通过
 * `frontend/.env.local` 的 `VITE_API_BASE_URL` 指定，请求层会自行拼接 `/api`，
 * 这里不配置反向代理或跨端口转发。
 */
export default defineConfig({
  plugins: [vue()],
});
