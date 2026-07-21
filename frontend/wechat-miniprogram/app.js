/**
 * 微信小程序入口。
 *
 * <p>API 地址优先读取微信开发者工具或发行环境注入的 ext.json 配置，也可在
 * globalData 中为当前环境配置。两处均未配置时由请求层给出明确错误，避免把开发、测试或生产域名固化
 * 到业务代码。ext.json 只应保存公开服务地址，不得保存口令或访问令牌。</p>
 */
App({
  /**
   * 小程序启动生命周期。
   *
   * @returns {void} 无返回值。
   */
  onLaunch() {
    const extensionConfig = wx.getExtConfigSync ? wx.getExtConfigSync() : {};
    this.globalData.apiBaseUrl = String(extensionConfig.apiBaseUrl || this.globalData.apiBaseUrl || "").trim();
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
