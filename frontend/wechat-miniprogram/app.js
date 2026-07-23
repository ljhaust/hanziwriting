/**
 * 微信小程序入口。
 *
 * <p>API 地址优先读取发行环境注入的 ext.json，其次读取被 Git 忽略的
 * local-config.js，最后才使用 globalData 中的默认值。这样微信开发者工具模拟器
 * 不支持 ext.json 注入时仍能稳定进行本地联调；所有配置只允许保存公开服务地址，
 * 不得保存口令或访问令牌。</p>
 */

/**
 * 读取仅存在于本机的调试覆盖配置。
 *
 * 业务意图：local-config.js 被 .gitignore 排除，开发者可在本机保存 API 地址而不
 * 修改业务入口文件；发布包不存在该文件时，捕获模块缺失并回退为空配置。
 *
 * @returns {{apiBaseUrl?: string}} 本地调试配置对象；文件不存在或内容异常时返回空对象。
 */
function loadLocalDebugConfig() {
  try {
    return require("./local-config");
  } catch (error) {
    return {};
  }
}

const localDebugConfig = loadLocalDebugConfig();

App({
  /**
   * 小程序启动生命周期。
   *
   * @returns {void} 无返回值。
   */
  onLaunch() {
    const extensionConfig = wx.getExtConfigSync ? wx.getExtConfigSync() : {};
    const configuredApiBaseUrl = extensionConfig.apiBaseUrl
      || localDebugConfig.apiBaseUrl
      || this.globalData.apiBaseUrl;
    this.globalData.apiBaseUrl = String(configuredApiBaseUrl || "").trim();
  },

  /**
   * 全局运行配置。
   *
   * @property {string} apiBaseUrl 后端 HTTP(S) 根地址，可直接按环境配置或由 ext.json 覆盖。
   */
  globalData: {
    apiBaseUrl: "",
  },
});
