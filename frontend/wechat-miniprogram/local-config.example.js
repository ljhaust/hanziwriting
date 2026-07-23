/**
 * 微信开发者工具本地调试配置示例。
 *
 * 首次使用时复制为 local-config.js；真实文件已被 Git 忽略，仅保存公开的
 * 本机后端地址，不得在这里添加数据库密码、微信 Secret 或访问令牌。
 */
module.exports = {
  /** 本机 Spring Boot 服务根地址；请求层会自动追加 /api。 */
  apiBaseUrl: "http://127.0.0.1:8080",
};
