import { networkInterfaces } from 'node:os';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

/**
 * 获取当前电脑在局域网中的 IPv4 地址。
 *
 * @returns {string | null} 找到可供手机访问的局域网地址时返回 IP，否则返回 null。
 */
function getLanAddress() {
  const interfaces = networkInterfaces();
  for (const interfaceItems of Object.values(interfaces)) {
    for (const item of interfaceItems || []) {
      if (item.family === 'IPv4' && !item.internal) {
        return item.address;
      }
    }
  }
  return null;
}

/**
 * 注册分享地址接口。
 *
 * @param {{ middlewares: { use: Function }, config?: { server?: { https?: boolean } } }} server Vite 开发或预览服务器。
 * @returns {void} 无返回值，方法会把接口挂到 Vite 中间件上。
 */
function registerShareUrlEndpoint(server) {
  server.middlewares.use('/share-url', (request, response) => {
    const lanAddress = getLanAddress();
    const hostHeader = request.headers.host || '';
    const port = hostHeader.includes(':') ? hostHeader.split(':').pop() : '';
    const protocol = server.config?.server?.https ? 'https' : 'http';
    const shareUrl = lanAddress && port ? `${protocol}://${lanAddress}:${port}/` : null;

    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({ shareUrl }));
  });
}

export default defineConfig({
  server: {
    host: '0.0.0.0',
  },
  preview: {
    host: '0.0.0.0',
  },
  plugins: [
    vue(),
    {
      name: 'local-share-url',
      configureServer(server) {
        registerShareUrlEndpoint(server);
      },
      configurePreviewServer(server) {
        registerShareUrlEndpoint(server);
      },
    },
  ],
});
