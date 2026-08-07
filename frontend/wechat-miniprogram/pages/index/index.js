const { createPracticeRecord, fetchBootstrapData, fetchStrokeGuide, wxLogin } = require("../../utils/api");

/** 小程序 2D Canvas 节点选择器。 */
const WRITING_CANVAS_SELECTOR = "#writingCanvas";

/** 古诗填空手写面板的 2D Canvas 节点选择器。 */
const POEM_WRITING_CANVAS_SELECTOR = "#poemWritingCanvas";

/** 书写笔迹的视觉宽度，单位为 CSS 像素。 */
const DRAW_LINE_WIDTH = 10;

/** 古诗填空手写面板的笔迹宽度，单位为 CSS 像素。 */
const POEM_DRAW_LINE_WIDTH = 9;

/** 用户中心中笔顺纠错开关的本地存储键。 */
const STROKE_VALIDATION_STORAGE_KEY = "hanziStrokeValidationEnabled";

/** 微信登录用户的本地缓存键，用于跨次启动免重新登录。 */
const WX_LOGIN_USER_STORAGE_KEY = "wxLoginUser";

/** 当前功能页签的本地缓存键，用于页面被微信回收重建后恢复用户所在位置。 */
const ACTIVE_TAB_STORAGE_KEY = "hanziActiveTab";

/** 小程序允许持久化的功能页签白名单，避免损坏缓存把页面切到不存在的内容。 */
const MINI_APP_TAB_KEYS = ["home", "hanzi", "poem", "records", "profile"];

/**
 * 微信隐私策略下可能返回的占位昵称。
 *
 * 这些文本不能被当作真实微信资料；命中时要求用户通过 type="nickname"
 * 输入框主动选择或填写展示昵称，再由登录接口保存。
 */
const WX_PLACEHOLDER_NICKNAMES = ["微信用户", "同学"];

/** 笔顺演示速度的本地存储键。 */
const STROKE_DEMO_SPEED_STORAGE_KEY = "hanziStrokeDemoSpeed";

/** 笔顺演示速度的最小、默认和最大值，单位为百分比倍率。 */
const STROKE_DEMO_SPEED_MIN = 50;
const STROKE_DEMO_SPEED_DEFAULT = 100;
const STROKE_DEMO_SPEED_MAX = 200;
const STROKE_DEMO_SPEED_STEP = 25;

/**
 * 归一化形状空间内的笔顺校验容差。
 *
 * alignStrokeForCompare 会把用户轨迹与标准轨迹各自按质心对齐、按外接矩形
 * 长边归一化到单位 1（坐标落入约 [-0.5, 0.5]）。容差在该空间内设定，
 * 不再依赖绝对像素，避免“字体预览位置”与“Hanzi Writer 坐标”不一致导致
 * 写对仍误判；同时保持与原像素级相当的严格度。
 */
const STROKE_NORMALIZED_START_TOLERANCE = 0.16;
const STROKE_NORMALIZED_END_TOLERANCE = 0.18;
const STROKE_NORMALIZED_PATH_TOLERANCE = 0.14;
const STROKE_NORMALIZED_DIRECTION_MARGIN = 0.06;
const STROKE_NORMALIZED_MIN_LENGTH = 0.12;
const STROKE_LENGTH_RATIO_MIN = 0.5;
const STROKE_LENGTH_RATIO_MAX = 2.0;

/**
 * 轨迹比较的统一采样点数。
 *
 * 真机 touchmove 频率会随设备性能和手指移动速度变化；比较前按路径长度
 * 重新采样到固定点数，可以避免某一小段因为事件更密集而过度影响质心和
 * 外接框，确保相同笔画在不同手机上的判定结果保持一致。
 */
const STROKE_COMPARISON_SAMPLE_COUNT = 24;

/**
 * 真机触摸坐标的基础噪声补偿。
 *
 * 约 3 CSS 像素的落笔误差对长横影响很小，却可能占“点”等短笔画尺寸的
 * 较大比例；因此按标准笔画屏幕尺寸换算为归一化容差，并通过上限避免把
 * 短笔画校验无限放宽。路径容差只吸收其中一部分，继续约束整体笔形。
 */
const STROKE_TOUCH_NOISE_ALLOWANCE_PX = 3;
const STROKE_TOUCH_NOISE_MAX_NORMALIZED = 0.1;
const STROKE_TOUCH_PATH_ALLOWANCE_FACTOR = 0.3;

/**
 * 连续触摸点的最小有效移动距离，单位为 CSS 像素。
 *
 * 低于该距离的事件视为设备抖动，不绘制零长度曲线；这样轻点可以稳定走
 * 圆点绘制分支，连续书写又不会因大量重复坐标增加轨迹噪声。
 */
const TOUCH_POINT_MIN_DISTANCE_PX = 1.5;

/** 单次绘制动画的兜底延迟，兼容不支持 canvas.requestAnimationFrame 的基础库。 */
const FALLBACK_FRAME_DELAY_MS = 16;

/** 笔顺演示的停顿时间与轮廓留白。 */
const STROKE_DEMO_MIN_DURATION_MS = 420;
const STROKE_DEMO_MAX_DURATION_MS = 900;
const STROKE_DEMO_PAUSE_MS = 180;
const STROKE_DEMO_PADDING = 18;

/** Hanzi Writer 使用 200 单位宽的中线遮罩揭示真实笔画轮廓。 */
const STROKE_DEMO_REVEAL_WIDTH = 200;

/** 笔顺演示各阶段的语义颜色。 */
const STROKE_DEMO_GUIDE_COLOR = "rgba(17, 24, 39, 0.08)";
const STROKE_DEMO_DONE_COLOR = "rgba(185, 28, 28, 0.82)";
const STROKE_DEMO_ACTIVE_COLOR = "rgba(220, 38, 38, 0.98)";

/** Hanzi Writer 数据使用的固定坐标范围。 */
const STROKE_GUIDE_BOUNDS = { minX: 0, maxX: 1024, minY: -124, maxY: 900 };

/**
 * 独立微信小程序首页。
 *
 * 该页面不复用浏览器中的 Vue/Element 组件，目的是在微信开发者工具中得到
 * 原生小程序的导航、视口、安全区、触摸和 Canvas 表现。
 */
Page({
  data: {
    activeTab: "home",
    tabs: [
      { key: "home", label: "首页", icon: "⌂" },
      { key: "hanzi", label: "练字", icon: "✎" },
      { key: "poem", label: "背诗", icon: "文" },
      { key: "records", label: "记录", icon: "✓" },
      { key: "profile", label: "我的", icon: "我" },
    ],
    bootstrapLoading: true,
    bootstrapError: "",
    loginVisible: false,
    loginLoading: false,
    loginNickname: "",
    currentStudent: null,
    users: [],
    consecutiveDays: 0,
    studentHanziCount: 0,
    studentPoemCount: 0,
    studentProgress: 0,
    hanziList: [],
    poemList: [],
    taskList: [],
    activeTasks: [],
    practiceRecords: [],
    studentRecords: [],
    selectedHanziIndex: 0,
    selectedPoemIndex: 0,
    currentHanzi: null,
    currentPoem: null,
    hanziPickerLabels: [],
    poemPickerLabels: [],
    poemLines: [],
    filledPoemChars: {},
    strokeCount: 0,
    strokePercent: 0,
    strokeHint: "请先从后台加载汉字数据。",
    strokeDemoVisible: false,
    strokeDemoCanvasVisible: false,
    strokeDemoImagePath: "",
    strokeDemoLoading: false,
    strokeDemoText: "点击笔顺演示查看示范。",
    strokeDemoSpeed: STROKE_DEMO_SPEED_DEFAULT,
    strokeDemoSpeedLabel: "1.0x",
    strokeValidationEnabled: true,
    writingGuideStatus: "loading",
    writingFeedbackVisible: true,
    writingFeedbackType: "info",
    writingFeedbackText: "正在准备笔顺纠错...",
    mistakeCount: 0,
    hintCount: 0,
    poemWritingVisible: false,
    poemWritingTargetChar: "",
    poemWritingTargetKey: "",
    poemWritingHasInk: false,
    poemWritingFeedback: "请在方格中写下目标文字。",
    recordDetailVisible: false,
    recordDetail: null,
    profileInitial: "",
    profileRecordCount: 0,
    profileWrongCount: 0,
    profileTotalMinutes: 0,
    profileAccuracy: 0,
  },

  /**
   * 页面加载生命周期。
   *
   * @returns {void} 无返回值。
   */
  onLoad() {
    const storedValidationSetting = wx.getStorageSync(STROKE_VALIDATION_STORAGE_KEY);
    const storedStrokeDemoSpeed = clampStrokeDemoSpeed(wx.getStorageSync(STROKE_DEMO_SPEED_STORAGE_KEY));
    this.isDrawing = false;
    this.hasDrawnSegment = false;
    this.canvasReady = false;
    this.canvasNode = null;
    this.canvasContext = null;
    this.canvasSize = { width: 0, height: 0 };
    this.canvasRect = { left: 0, top: 0 };
    // 滚动期间节流边界查询，避免每个 scroll 事件都创建新的选择器查询任务。
    this.canvasRectRefreshPending = false;
    this.lastPoint = null;
    this.lastMidPoint = null;
    this.pendingPoint = null;
    this.currentStrokePoints = [];
    this.acceptedStrokePaths = [];
    this.writingGuide = null;
    this.writingGuideCharacter = "";
    this.writingGuideLoadToken = 0;
    this.practiceStartedAt = 0;
    this.frameId = null;
    this.strokeDemoFrameId = null;
    this.strokeDemoCanvasNode = null;
    this.strokeDemoContext = null;
    this.strokeDemoSize = { width: 0, height: 0 };
    this.strokeDemoGuide = null;
    this.strokeDemoToken = 0;
    this.poemCanvasNode = null;
    this.poemCanvasRect = { left: 0, top: 0 };
    this.poemCanvasContext = null;
    this.poemCanvasSize = { width: 0, height: 0 };
    this.poemIsDrawing = false;
    this.poemLastPoint = null;
    this.poemPracticeStartedAt = 0;
    // onLoad 之后微信会立即调用一次 onShow；使用标记区分首次显示与真正的
    // 前后台恢复，避免首次启动重复请求聚合接口。
    this.hasCompletedInitialShow = false;
    // 分别恢复登录身份和当前页签。页面被系统回收并重新创建时，业务上下文
    // 仍然保留，不会因为 data 的默认值而误回首页或看起来像退出登录。
    this.cachedLoginUser = readPersistedLoginUser();
    const storedActiveTab = readPersistedActiveTab();
    const requiresNickname = needsNicknameCompletion(this.cachedLoginUser);
    this.setData({
      activeTab: storedActiveTab,
      strokeValidationEnabled: storedValidationSetting !== false,
      strokeDemoSpeed: storedStrokeDemoSpeed,
      strokeDemoSpeedLabel: formatStrokeDemoSpeedLabel(storedStrokeDemoSpeed),
      loginVisible: !this.cachedLoginUser || requiresNickname,
      loginNickname: requiresNickname ? "" : getUsableNickname(this.cachedLoginUser),
    }, () => this.syncDerivedState());
    this.loadBootstrapData();
  },

  /**
   * 页面从后台重新显示时重新读取持久化身份。
   *
   * @returns {void} 无返回值；仅在缓存与内存不一致时同步界面，不重置当前页签。
   */
  onShow() {
    const persistedUser = readPersistedLoginUser();
    const persistedUserId = persistedUser && persistedUser.id;
    const memoryUserId = this.cachedLoginUser && this.cachedLoginUser.id;
    if (persistedUserId !== memoryUserId) {
      this.cachedLoginUser = persistedUser;
      this.setData({
        loginVisible: !persistedUser || needsNicknameCompletion(persistedUser),
        loginNickname: needsNicknameCompletion(persistedUser) ? "" : getUsableNickname(persistedUser),
      }, () => this.syncDerivedState());
    }
    if (!this.hasCompletedInitialShow) {
      this.hasCompletedInitialShow = true;
      return;
    }
    // 从后台回到小程序时刷新账号状态；管理员已禁用的用户会在聚合数据返回后
    // 被明确退出，普通的页面隐藏/显示不会清除本地会话。
    this.loadBootstrapData();
  },

  /**
   * 页面初次渲染完成生命周期。
   *
   * @returns {void} 无返回值。
   */
  onReady() {
    if (this.data.activeTab === "hanzi") {
      this.initWritingCanvas();
    }
  },

  /**
   * 页面卸载生命周期。
   *
   * @returns {void} 无返回值。
   */
  onUnload() {
    this.cancelPendingFrame();
    this.stopStrokeDemo(true);
    this.closePoemWriting();
  },

  /**
   * 从后端读取首屏聚合数据。
   *
   * <p>页面只展示后端已持久化的数据。请求失败时保留明确错误并允许用户重试，
   * 不使用内置列表、缓存记录或静默兜底替代数据库响应。</p>
   *
   * @returns {Promise<void>} 数据同步或错误状态写入页面后解析。
   */
  loadBootstrapData() {
    this.setData({ bootstrapLoading: true, bootstrapError: "" });
    return fetchBootstrapData()
      .then((data) => {
        const matchedLoginUser = findUserById(data.users, this.cachedLoginUser && this.cachedLoginUser.id);
        if (isDisabledUser(matchedLoginUser)) {
          this.clearLoginSession("账号已被管理员禁用，请联系管理员后重新登录。");
        } else if (matchedLoginUser) {
          // 使用服务端最新昵称与状态刷新本地缓存，避免旧的占位昵称长期滞留。
          this.cachedLoginUser = matchedLoginUser;
          persistLoginUser(matchedLoginUser);
          if (needsNicknameCompletion(matchedLoginUser)) {
            this.setData({ loginVisible: true, loginNickname: "" });
          }
        }
        this.setData({
          bootstrapLoading: false,
          bootstrapError: "",
          users: data.users,
          hanziList: data.hanzi,
          poemList: data.poems,
          taskList: data.tasks,
          practiceRecords: data.records,
          selectedHanziIndex: 0,
          selectedPoemIndex: 0,
          filledPoemChars: {},
        }, () => {
          this.syncDerivedState();
          if (this.data.activeTab === "hanzi") {
            this.initWritingCanvas();
          }
        });
      })
      .catch((error) => {
        console.warn("后端启动数据读取失败。", error);
        this.setData({
          bootstrapLoading: false,
          bootstrapError: error.message || "后台数据加载失败，请检查网络后重试。",
        });
        wx.showToast({ title: "后台数据加载失败", icon: "none" });
      });
  },

  /**
   * 切换底部功能页。
   *
   * @param {WechatMiniprogram.TouchEvent} event 小程序点击事件，dataset.tab 为目标页签。
   * @returns {void} 无返回值。
   */
  switchTab(event) {
    const nextTab = event.currentTarget.dataset.tab;
    if (!MINI_APP_TAB_KEYS.includes(nextTab)) {
      return;
    }
    persistActiveTab(nextTab);
    this.setData({ activeTab: nextTab }, () => {
      if (nextTab !== "hanzi") {
        this.stopStrokeDemo(true);
      }
      if (nextTab === "hanzi") {
        this.initWritingCanvas(() => this.ensureCurrentStrokeGuide());
      }
    });
  },

  /**
   * 同步练字 Canvas 在可视区域中的当前位置。
   *
   * <p>练字页嵌在 scroll-view 内，页面滚动后 Canvas 的视口 top 会改变。
   * 真机部分基础库只在触摸事件中提供 clientX/clientY，此时必须重新读取
   * Canvas 边界，否则后续轨迹会把页面滚动距离误当成笔画坐标偏移。</p>
   *
   * @param {WechatMiniprogram.ScrollViewScrollEvent} event scroll-view 的滚动事件，
   *        当前实现不需要读取事件详情，但保留参数以匹配 WXML 事件契约。
   * @returns {void} 发起一次节流后的边界刷新；Canvas 未就绪时不执行操作。
   */
  handlePageScroll(event) {
    // 显式读取参数以说明该方法遵循 scroll-view 事件契约，同时避免未来移除
    // 参数时误以为滚动事件可以直接省略同步逻辑。
    void event;
    if (this.data.activeTab !== "hanzi") {
      return;
    }
    // 原生 Canvas 在部分 iOS 真机上不会与 scroll-view 的 WebView 内容同步合成。
    // 动画尚未转成普通图片时直接停止，防止滚动后出现红字停在旧屏幕位置。
    if (this.data.strokeDemoCanvasVisible) {
      this.stopStrokeDemo(true);
    }
    if (!this.canvasReady) {
      return;
    }
    this.refreshCanvasRect();
  },

  /**
   * 空点击处理器。
   *
   * <p>业务意图：弹层内容区需要阻止点击冒泡到遮罩关闭逻辑，小程序模板必须
   * 绑定一个存在的方法，因此这里提供无副作用处理器。</p>
   *
   * @returns {void} 无返回值。
   */
  noop() {},

  /**
   * 触发微信登录。
   *
   * <p>微信已不保证 wx.getUserProfile 返回真实昵称，因此页面使用官方
   * type="nickname" 输入组件，让用户主动选择微信建议昵称或自行填写。
   * 本方法只提交用户确认过的昵称，不伪造、不猜测真实微信资料。</p>
   *
   * @returns {void} 无返回值。
   */
  handleWxLogin() {
    if (this.data.loginLoading) {
      return;
    }
    const nickname = String(this.data.loginNickname || "").trim();
    if (!nickname) {
      wx.showToast({ title: "请先选择或填写昵称", icon: "none" });
      return;
    }
    this.setData({ loginLoading: true });

    const loginCode = new Promise((resolve, reject) => {
      wx.login({
        success: (res) => (res && res.code ? resolve(res.code) : reject(new Error("微信登录凭证获取失败"))),
        fail: () => reject(new Error("微信登录凭证获取失败")),
      });
    });
    loginCode
      .then((code) => wxLogin(code, { nickname }))
      .then((user) => {
        if (isDisabledUser(user)) {
          throw new Error("账号已被管理员禁用，请联系管理员");
        }
        if (needsNicknameCompletion(user)) {
          throw new Error("昵称未能保存，请确认后台服务已更新后重试");
        }
        this.cachedLoginUser = user;
        persistLoginUser(user);
        const users = replaceUserInList(this.data.users, user);
        this.setData({ users, loginVisible: false, loginLoading: false }, () => this.syncDerivedState());
        wx.showToast({ title: "登录成功", icon: "success" });
      })
      .catch((error) => {
        console.warn("微信登录失败。", error);
        this.setData({ loginLoading: false });
        wx.showToast({ title: (error && error.message) || "登录失败，请重试", icon: "none" });
      });
  },

  /**
   * 同步登录昵称输入值。
   *
   * @param {WechatMiniprogram.Input} event 微信昵称输入组件事件，detail.value 为用户确认的文本。
   * @returns {void} 无返回值；最长保留 64 个字符以匹配服务端字段约束。
   */
  handleLoginNicknameInput(event) {
    const nickname = String(event.detail && event.detail.value || "").slice(0, 64);
    this.setData({ loginNickname: nickname });
  },

  /**
   * 退出登录并重新展示登录引导层。
   *
   * @returns {void} 无返回值。
   */
  logout() {
    this.clearLoginSession("");
  },

  /**
   * 清除当前登录身份并展示登录层。
   *
   * @param {string} reason 非空时向用户说明被强制退出的原因；主动退出传空字符串。
   * @returns {void} 无返回值。
   */
  clearLoginSession(reason) {
    this.cachedLoginUser = null;
    removePersistedLoginUser();
    this.setData({ loginVisible: true, loginLoading: false, loginNickname: "" }, () => this.syncDerivedState());
    if (reason) {
      wx.showModal({ title: "登录已失效", content: reason, showCancel: false });
    }
  },

  /**
   * 切换用户中心中的实时笔顺纠错设置。
   *
   * @param {WechatMiniprogram.SwitchChange} event 开关事件，detail.value 为启用状态。
   * @returns {void} 无返回值。
   */
  toggleStrokeValidation(event) {
    const enabled = Boolean(event.detail.value);
    wx.setStorageSync(STROKE_VALIDATION_STORAGE_KEY, enabled);
    this.setData({
      strokeValidationEnabled: enabled,
      writingGuideStatus: enabled ? "loading" : "disabled",
      writingFeedbackVisible: true,
      writingFeedbackType: "info",
      writingFeedbackText: enabled ? "笔顺纠错已开启。" : "笔顺纠错已关闭，仅记录笔画数量。",
    }, () => {
      if (enabled) {
        this.ensureCurrentStrokeGuide();
      }
    });
  },

  /**
   * 调整笔顺演示的播放速度。
   *
   * @param {WechatMiniprogram.SliderChange} event 滑块事件，detail.value 为百分比倍率。
   * @returns {void} 无返回值。
   */
  changeStrokeDemoSpeed(event) {
    const speed = clampStrokeDemoSpeed(event.detail.value);
    wx.setStorageSync(STROKE_DEMO_SPEED_STORAGE_KEY, speed);
    this.setData({
      strokeDemoSpeed: speed,
      strokeDemoSpeedLabel: formatStrokeDemoSpeedLabel(speed),
      strokeDemoText: this.data.strokeDemoVisible
        ? `当前演示速度已调为 ${formatStrokeDemoSpeedLabel(speed)}`
        : this.data.strokeDemoText,
    });
  },

  /**
   * 从首页任务进入练字或背诗页面。
   *
   * @param {WechatMiniprogram.TouchEvent} event 小程序点击事件，dataset.taskId 为任务主键。
   * @returns {void} 无返回值。
   */
  openTask(event) {
    const taskId = event.currentTarget.dataset.taskId;
    const task = this.data.taskList.find((item) => item.id === taskId);
    const firstItem = task && task.items[0];
    if (!firstItem) {
      return;
    }

    if (firstItem.item_type === "poem") {
      const poemIndex = this.data.poemList.findIndex((item) => item.id === firstItem.item_id);
      this.setData({ activeTab: "poem", selectedPoemIndex: Math.max(poemIndex, 0) }, () => {
        this.stopStrokeDemo(true);
        this.syncDerivedState();
      });
      return;
    }

    const hanziIndex = this.data.hanziList.findIndex((item) => item.id === firstItem.item_id);
    this.setData({ activeTab: "hanzi", selectedHanziIndex: Math.max(hanziIndex, 0) }, () => {
      this.stopStrokeDemo(true);
      this.syncDerivedState();
      this.initWritingCanvas(() => {
        this.clearCanvas();
        this.ensureCurrentStrokeGuide();
      });
    });
  },

  /**
   * 选择当前练习汉字。
   *
   * @param {WechatMiniprogram.PickerChange} event 选择器变更事件，detail.value 为列表索引。
   * @returns {void} 无返回值。
   */
  changeHanzi(event) {
    this.setData({ selectedHanziIndex: Number(event.detail.value) }, () => {
      this.stopStrokeDemo(true);
      this.writingGuide = null;
      this.writingGuideCharacter = "";
      this.syncDerivedState();
      this.clearCanvas();
      this.ensureCurrentStrokeGuide();
    });
  },

  /**
   * 选择当前背诵古诗。
   *
   * @param {WechatMiniprogram.PickerChange} event 选择器变更事件，detail.value 为列表索引。
   * @returns {void} 无返回值。
   */
  changePoem(event) {
    this.setData({ selectedPoemIndex: Number(event.detail.value), filledPoemChars: {} }, () => {
      this.stopStrokeDemo(true);
      this.closePoemWriting();
      this.poemPracticeStartedAt = 0;
      this.syncDerivedState();
    });
  },

  /**
   * 预加载当前汉字的笔顺轨迹，供演示和实时纠错共同使用。
   *
   * @returns {Promise<object|null>} 当前字的 Hanzi Writer 数据；关闭纠错或加载失败时返回 null。
   */
  ensureCurrentStrokeGuide() {
    if (!this.data.strokeValidationEnabled) {
      this.setData({ writingGuideStatus: "disabled" });
      return Promise.resolve(null);
    }

    const characterText = this.data.currentHanzi && this.data.currentHanzi.character_text;
    if (!characterText) {
      return Promise.resolve(null);
    }
    if (this.writingGuide && this.writingGuideCharacter === characterText) {
      this.setData({ writingGuideStatus: "ready" });
      return Promise.resolve(this.writingGuide);
    }

    const loadToken = ++this.writingGuideLoadToken;
    this.setData({
      writingGuideStatus: "loading",
      writingFeedbackVisible: true,
      writingFeedbackType: "info",
      writingFeedbackText: "正在准备笔顺纠错...",
    });
    return fetchStrokeGuide(characterText)
      .then((guide) => {
        const latestCharacter = this.data.currentHanzi && this.data.currentHanzi.character_text;
        if (loadToken !== this.writingGuideLoadToken || characterText !== latestCharacter) {
          return null;
        }
        this.writingGuide = guide;
        this.writingGuideCharacter = characterText;
        this.setData({
          writingGuideStatus: "ready",
          writingFeedbackVisible: true,
          writingFeedbackType: "success",
          writingFeedbackText: "笔顺纠错已就绪，请从第一笔开始书写。",
        });
        return guide;
      })
      .catch((error) => {
        console.warn("笔顺纠错数据加载失败。", error);
        if (loadToken === this.writingGuideLoadToken) {
          // 向用户呈现真实的接口或网络错误，便于区分轨迹缺失与连接失败。
          const errorMessage = error && error.message ? error.message : "未知错误";
          this.setData({
            writingGuideStatus: "error",
            writingFeedbackVisible: true,
            writingFeedbackType: "error",
            writingFeedbackText: `笔顺纠错暂不可用：${errorMessage}`,
          });
        }
        return null;
      });
  },

  /**
   * 开始书写并初始化 Canvas 笔触。
   *
   * @param {WechatMiniprogram.TouchEvent} event 触摸起始事件。
   * @returns {void} 无返回值。
   */
  startDrawing(event) {
    if (this.data.strokeDemoVisible) {
      this.stopStrokeDemo(true);
    }

    // scroll-view 的最后一次滚动查询可能尚未完成；这里再发起一次轻量刷新，
    // 同时继续使用当前缓存的边界处理本次 touchstart，保证首笔不会等待异步查询。
    this.refreshCanvasRect();
    const point = getTouchPoint(event, this.canvasRect);
    if (!this.canvasReady || !point) {
      return;
    }
    if (!this.data.currentHanzi) {
      wx.showToast({ title: "暂无可练习汉字", icon: "none" });
      return;
    }
    if (this.data.strokeValidationEnabled && this.data.writingGuideStatus !== "ready") {
      this.ensureCurrentStrokeGuide();
      wx.showToast({ title: "笔顺纠错准备中", icon: "none" });
      return;
    }
    if (this.data.strokeCount >= this.data.currentHanzi.stroke_count) {
      wx.showToast({ title: "已完成，请提交评测", icon: "none" });
      return;
    }

    this.isDrawing = true;
    this.hasDrawnSegment = false;
    this.lastPoint = point;
    this.pendingPoint = point;
    this.currentStrokePoints = [point];
    if (!this.practiceStartedAt) {
      this.practiceStartedAt = Date.now();
    }
    this.canvasContext.beginPath();
    this.canvasContext.moveTo(point.x, point.y);
    // 增量绘制起点：落笔瞬间把上一中点锚定到起笔点，保证首段从中点法平滑过渡。
    this.lastMidPoint = point;
  },

  /**
   * 按触摸轨迹持续绘制笔迹。
   *
   * @param {WechatMiniprogram.TouchEvent} event 触摸移动事件。
   * @returns {void} 无返回值。
   */
  drawOnCanvas(event) {
    const point = getTouchPoint(event, this.canvasRect);
    if (!this.canvasReady || !this.isDrawing || !point) {
      return;
    }

    this.pendingPoint = point;
    appendDistinctPoint(this.currentStrokePoints, point);
    this.scheduleDrawFrame();
  },

  /**
   * 结束一笔书写并累计笔画进度。
   *
   * @param {WechatMiniprogram.TouchEvent} event 触摸结束事件，changedTouches 包含真实收笔坐标。
   * @returns {void} 无返回值。
   */
  stopDrawing(event) {
    if (!this.isDrawing) {
      return;
    }

    // 真机快速书写时，最后一次 touchmove 可能早于抬笔位置。必须从
    // changedTouches 补录终点，否则短横、点、撇会被截短并误报为书写错误。
    const endPoint = getTouchPoint(event, this.canvasRect);
    if (endPoint) {
      this.pendingPoint = endPoint;
      appendDistinctPoint(this.currentStrokePoints, endPoint);
    }
    this.cancelPendingFrame();
    this.paintPendingPoint();
    if (!this.hasDrawnSegment && this.lastPoint) {
      this.drawTapDot(this.lastPoint);
    }

    const currentHanzi = this.data.currentHanzi;
    const attemptedPoints = this.currentStrokePoints.slice();
    const expectedMedian = this.writingGuide && this.writingGuide.medians && this.writingGuide.medians[this.data.strokeCount];
    const validationResult = !this.data.strokeValidationEnabled
      ? { valid: true, message: "已记录当前笔画。" }
      : evaluateStrokeAttempt(attemptedPoints, expectedMedian, this.canvasSize.width, this.canvasSize.height);
    this.isDrawing = false;
    this.lastPoint = null;
    this.lastMidPoint = null;
    this.pendingPoint = null;
    this.currentStrokePoints = [];

    if (!validationResult.valid) {
      this.redrawAcceptedStrokes();
      this.setData({
        mistakeCount: this.data.mistakeCount + 1,
        writingFeedbackVisible: true,
        writingFeedbackType: "error",
        writingFeedbackText: validationResult.message,
      });
      return;
    }

    this.acceptedStrokePaths.push(attemptedPoints);
    const nextCount = Math.min(currentHanzi.stroke_count, this.data.strokeCount + 1);
    const strokeName = currentHanzi.strokesDesc[this.data.strokeCount] || `第 ${nextCount} 笔`;
    this.setData({
      writingFeedbackVisible: true,
      writingFeedbackType: "success",
      writingFeedbackText: `第 ${nextCount} 笔“${strokeName}”书写正确。`,
    });
    this.setStrokeProgress(nextCount);
  },

  /**
   * 清除错误笔画并重绘已经通过校验的笔画。
   *
   * @returns {void} 无返回值。
   */
  redrawAcceptedStrokes() {
    if (!this.canvasReady || !this.canvasContext) {
      return;
    }
    this.canvasContext.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height);
    this.acceptedStrokePaths.forEach((points) => {
      drawHandwritingPath(this.canvasContext, points, DRAW_LINE_WIDTH, "#111827");
    });
  },

  /**
   * 清空当前 Canvas 与笔画进度。
   *
   * @returns {void} 无返回值。
   */
  clearCanvas() {
    if (this.data.strokeDemoVisible) {
      this.stopStrokeDemo(true);
    }

    this.cancelPendingFrame();
    this.isDrawing = false;
    this.lastPoint = null;
    this.lastMidPoint = null;
    this.pendingPoint = null;
    this.currentStrokePoints = [];
    this.acceptedStrokePaths = [];
    this.practiceStartedAt = 0;
    if (this.canvasReady && this.canvasContext) {
      this.canvasContext.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height);
    }
    this.setData({
      mistakeCount: 0,
      hintCount: 0,
      writingFeedbackVisible: true,
      writingFeedbackType: "info",
      writingFeedbackText: !this.data.strokeValidationEnabled
        ? "笔顺纠错已关闭，本次仅记录笔画数量。"
        : this.data.writingGuideStatus === "ready"
        ? "请按提示从第一笔开始书写。"
        : "正在准备笔顺纠错...",
    });
    this.setStrokeProgress(0);
  },

  /**
   * 播放当前汉字的笔顺演示。
   *
   * <p>演示优先读取 Hanzi Writer 的真实笔顺数据，再用本地 2D canvas 逐笔播放，
   * 这样可以同时保留“示范”和“练习”两种模式。</p>
   *
   * @returns {Promise<void>} 演示播放完成后解析。
   */
  async playStrokeDemo() {
    if (this.data.strokeDemoLoading || !this.data.currentHanzi || !this.data.currentHanzi.character_text) {
      return;
    }

    this.stopStrokeDemo(true);
    // 每次播放使用独立令牌。网络请求、Canvas 初始化或图片导出任一阶段被
    // 清空/切字/滚动打断后，旧异步回调都不能重新打开已经关闭的演示层。
    const token = ++this.strokeDemoToken;
    this.setData({
      strokeDemoVisible: true,
      strokeDemoCanvasVisible: true,
      strokeDemoImagePath: "",
      strokeDemoLoading: true,
      strokeDemoText: "正在加载笔顺数据...",
      hintCount: this.data.hintCount + 1,
    });

    try {
      const guide = this.writingGuideCharacter === this.data.currentHanzi.character_text && this.writingGuide
        ? this.writingGuide
        : await fetchStrokeGuide(this.data.currentHanzi.character_text);
      if (token !== this.strokeDemoToken) {
        return;
      }
      this.strokeDemoGuide = guide;
      await this.initStrokeDemoCanvas();
      if (token !== this.strokeDemoToken) {
        return;
      }
      this.setData({
        strokeDemoLoading: false,
        strokeDemoText: `正在演示 ${guide.character_text} 的笔顺`,
      });
      await this.runStrokeDemo(token);
    } catch (error) {
      if (token !== this.strokeDemoToken) {
        return;
      }
      console.warn("笔顺演示加载失败。", error);
      this.setData({
        strokeDemoLoading: false,
        strokeDemoVisible: false,
        strokeDemoCanvasVisible: false,
        strokeDemoImagePath: "",
        strokeDemoText: "点击笔顺演示查看示范。",
      });
      // Toast 空间有限，提示错误类别；完整错误仍保留在调试控制台中。
      const errorMessage = error && error.message ? error.message : "未知错误";
      wx.showToast({
        title: `笔顺加载失败：${errorMessage}`,
        icon: "none",
      });
    }
  },

  /**
   * 初始化笔顺演示画布。
   *
   * @returns {Promise<void>} 演示画布准备完成后解析。
   */
  initStrokeDemoCanvas() {
    return new Promise((resolve) => {
      wx.nextTick(() => {
        wx.createSelectorQuery()
          .in(this)
          .select("#strokeDemoCanvas")
          .fields({ node: true, size: true })
          .exec((results) => {
            const canvasInfo = results && results[0];
            if (!canvasInfo || !canvasInfo.node || !canvasInfo.width || !canvasInfo.height) {
              this.strokeDemoCanvasNode = null;
              this.strokeDemoContext = null;
              resolve();
              return;
            }

            const pixelRatio = wx.getSystemInfoSync().pixelRatio || 1;
            const canvas = canvasInfo.node;
            const context = canvas.getContext("2d");
            canvas.width = Math.round(canvasInfo.width * pixelRatio);
            canvas.height = Math.round(canvasInfo.height * pixelRatio);
            context.scale(pixelRatio, pixelRatio);
            context.lineCap = "round";
            context.lineJoin = "round";

            this.strokeDemoCanvasNode = canvas;
            this.strokeDemoContext = context;
            this.strokeDemoSize = {
              width: canvasInfo.width,
              height: canvasInfo.height,
            };
            resolve();
          });
      });
    });
  },

  /**
   * 运行笔顺演示动画。
   *
   * @param {number} token 当前播放任务的唯一令牌，用于丢弃已取消任务的异步结果。
   * @returns {Promise<void>} 动画播放完成后解析。
   */
  async runStrokeDemo(token) {
    const guide = this.strokeDemoGuide;
    const context = this.strokeDemoContext;
    if (!guide || !context || !guide.strokes.length || !guide.medians.length) {
      throw new Error("笔顺数据或演示画布不可用");
    }

    const strokeShapes = createStrokeShapes(guide);
    const total = strokeShapes.length;
    if (!total) {
      throw new Error("笔顺数据中没有可播放的笔画");
    }
    const demoSpeedLabel = this.data.strokeDemoSpeedLabel || formatStrokeDemoSpeedLabel(this.data.strokeDemoSpeed);

    this.setData({
      strokeDemoText: `笔顺演示 ${0}/${total} · ${demoSpeedLabel}`,
    });

    for (let index = 0; index < strokeShapes.length; index += 1) {
      if (token !== this.strokeDemoToken) {
        return;
      }

      const strokeShape = strokeShapes[index];
      const strokeName = this.data.currentHanzi.strokesDesc[index] || `第 ${index + 1} 笔`;
      const currentSpeedLabel = formatStrokeDemoSpeedLabel(this.data.strokeDemoSpeed);
      this.setData({
        strokeDemoText: `笔顺演示 ${index + 1}/${total}：${strokeName} · ${currentSpeedLabel}`,
      });
      const startTime = Date.now();
      const duration = calculateStrokeDemoDuration(strokeShape.length, this.data.strokeDemoSpeed);
      let frameRunning = true;
      while (frameRunning && token === this.strokeDemoToken) {
        const elapsed = Date.now() - startTime;
        const progress = easeStrokeProgress(elapsed / duration);
        this.renderStrokeDemoFrame(strokeShapes, index, progress);

        if (progress >= 1) {
          frameRunning = false;
          break;
        }

        await this.waitForStrokeDemoFrame();
      }

      if (token !== this.strokeDemoToken) {
        return;
      }

      this.renderStrokeDemoFrame(strokeShapes, index, 1);
      await waitMs(calculateStrokeDemoPause(this.data.strokeDemoSpeed));
    }

    if (token === this.strokeDemoToken) {
      this.renderStrokeDemoFrame(strokeShapes, strokeShapes.length, 1);
      // 等待最终帧提交到渲染线程后再导出，避免 PNG 捕获到倒数第二帧。
      await this.waitForStrokeDemoFrame();
      await this.freezeStrokeDemoFrame(token);
    }
  },

  /**
   * 将演示最终帧冻结为普通图片组件使用的临时 PNG。
   *
   * <p>Canvas 属于小程序原生渲染层，在部分 iOS 版本中不会跟随 scroll-view
   * 同步移动；普通 image 与米字格处于同一页面布局层，滚动时不会发生错位。
   * 导出失败时隐藏原生 Canvas，并由 WXML 的普通文字层展示无错位回退。</p>
   *
   * @param {number} token 当前播放任务的唯一令牌，用于阻止过期导出结果覆盖新状态。
   * @returns {Promise<void>} 图片或文字回退层完成切换后解析。
   */
  freezeStrokeDemoFrame(token) {
    return new Promise((resolve) => {
      const canvas = this.strokeDemoCanvasNode;
      const completedText = `演示完成（${formatStrokeDemoSpeedLabel(this.data.strokeDemoSpeed)}），落笔即可开始练习。`;

      /**
       * 隐藏原生 Canvas，并切换到可随页面滚动的最终展示层。
       *
       * @param {string} imagePath 成功导出的临时 PNG 路径；空字符串表示使用文字回退。
       * @returns {void} 状态切换完成后释放 Promise。
       */
      const showScrollableResult = (imagePath) => {
        if (token !== this.strokeDemoToken) {
          resolve();
          return;
        }
        this.setData({
          strokeDemoCanvasVisible: false,
          strokeDemoImagePath: imagePath,
          strokeDemoText: completedText,
        }, resolve);
      };

      if (!canvas || typeof wx.canvasToTempFilePath !== "function") {
        showScrollableResult("");
        return;
      }

      wx.canvasToTempFilePath({
        canvas,
        fileType: "png",
        success: (result) => {
          const imagePath = result && result.tempFilePath ? result.tempFilePath : "";
          showScrollableResult(imagePath);
        },
        fail: (error) => {
          // 不向用户暴露底层路径或设备信息；控制台仅记录平台返回的错误对象，
          // 页面则无缝降级为普通文字层，继续保证滚动位置正确。
          console.warn("笔顺演示最终帧导出失败，已使用文字回退。", error);
          showScrollableResult("");
        },
      }, this);
    });
  },

  /**
   * 等待演示 Canvas 的下一次刷新。
   *
   * <p>优先使用 Canvas 节点自身的 requestAnimationFrame，让动画节奏跟随
   * 微信渲染线程；旧基础库再回退到短定时器。</p>
   *
   * @returns {Promise<void>} 下一帧可绘制时解析。
   */
  waitForStrokeDemoFrame() {
    return new Promise((resolve) => {
      const canvas = this.strokeDemoCanvasNode;
      const requestFrame = canvas && canvas.requestAnimationFrame;
      const onFrame = () => {
        this.strokeDemoFrameId = null;
        resolve();
      };

      if (requestFrame) {
        this.strokeDemoFrameId = requestFrame.call(canvas, onFrame);
        return;
      }

      this.strokeDemoFrameId = setTimeout(onFrame, FALLBACK_FRAME_DELAY_MS);
    });
  },

  /**
   * 渲染笔顺演示当前帧。
   *
   * @param {Array<object>} strokeShapes 真实笔画轮廓与中线轨迹集合。
   * @param {number} activeIndex 当前正在播放的笔顺索引。
   * @param {number} progress 当前笔顺的播放进度，范围 0-1。
   * @returns {void} 无返回值。
   */
  renderStrokeDemoFrame(strokeShapes, activeIndex, progress) {
    const context = this.strokeDemoContext;
    if (!context) {
      return;
    }

    const width = this.strokeDemoSize.width || 0;
    const height = this.strokeDemoSize.height || 0;
    context.clearRect(0, 0, width, height);

    for (let index = 0; index < strokeShapes.length; index += 1) {
      const isActive = index === activeIndex;
      const isDone = index < activeIndex;
      const strokeShape = strokeShapes[index];
      drawStrokeOutline(context, strokeShape, STROKE_GUIDE_BOUNDS, width, height, STROKE_DEMO_GUIDE_COLOR);

      if (isDone) {
        drawStrokeOutline(context, strokeShape, STROKE_GUIDE_BOUNDS, width, height, STROKE_DEMO_DONE_COLOR);
      } else if (isActive) {
        drawStrokePortion(context, strokeShape, STROKE_GUIDE_BOUNDS, width, height, progress, STROKE_DEMO_ACTIVE_COLOR);
      }
    }
  },

  /**
   * 停止笔顺演示并释放临时状态。
   *
   * @param {boolean} immediate 是否立即清理画布。
   * @returns {void} 无返回值。
   */
  stopStrokeDemo(immediate = false) {
    this.strokeDemoToken += 1;
    this.strokeDemoFrameId = null;

    if (immediate && this.strokeDemoContext) {
      this.strokeDemoContext.clearRect(0, 0, this.strokeDemoSize.width, this.strokeDemoSize.height);
    }

    this.strokeDemoGuide = null;
    this.strokeDemoCanvasNode = null;
    this.strokeDemoContext = null;
    this.strokeDemoSize = { width: 0, height: 0 };
    this.setData({
      strokeDemoVisible: false,
      strokeDemoCanvasVisible: false,
      strokeDemoImagePath: "",
      strokeDemoLoading: false,
      strokeDemoText: "点击笔顺演示查看示范。",
    });
  },

  /**
   * 初始化高清书写 Canvas。
   *
   * @param {Function} callback Canvas 节点准备完成后的回调。
   * @returns {void} 无返回值。
   */
  initWritingCanvas(callback) {
    wx.nextTick(() => {
      wx.createSelectorQuery()
        .in(this)
        .select(WRITING_CANVAS_SELECTOR)
        .fields({ node: true, size: true, rect: true })
        .exec((results) => {
          const canvasInfo = results && results[0];
          if (!canvasInfo || !canvasInfo.node || !canvasInfo.width || !canvasInfo.height) {
            this.canvasReady = false;
            if (typeof callback === "function") {
              callback();
            }
            return;
          }

          const pixelRatio = wx.getSystemInfoSync().pixelRatio || 1;
          const canvas = canvasInfo.node;
          const context = canvas.getContext("2d");
          canvas.width = Math.round(canvasInfo.width * pixelRatio);
          canvas.height = Math.round(canvasInfo.height * pixelRatio);
          context.scale(pixelRatio, pixelRatio);
          context.lineWidth = DRAW_LINE_WIDTH;
          context.lineCap = "round";
          context.lineJoin = "round";
          context.strokeStyle = "#111827";
          context.fillStyle = "#111827";

          this.canvasNode = canvas;
          this.canvasContext = context;
          this.canvasReady = true;
          this.canvasSize = {
            width: canvasInfo.width,
            height: canvasInfo.height,
          };
          this.canvasRect = {
            left: Number(canvasInfo.left) || 0,
            top: Number(canvasInfo.top) || 0,
          };
          this.canvasRectRefreshPending = false;

          if (typeof callback === "function") {
            callback();
          }
        });
    });
  },

  /**
   * 异步读取练字 Canvas 相对当前视口的边界。
   *
   * <p>该方法只更新坐标基准，不重置 Canvas 尺寸或清空已有笔迹，因此可以
   * 安全地在 scroll-view 的高频滚动事件中调用。一次查询未完成前会合并后续
   * 事件，避免滚动时堆积选择器任务并造成渲染延迟。</p>
   *
   * @returns {void} 发起或合并一次边界查询；没有可用 Canvas 时直接返回。
   */
  refreshCanvasRect() {
    if (!this.canvasReady || this.canvasRectRefreshPending) {
      return;
    }

    this.canvasRectRefreshPending = true;
    wx.createSelectorQuery()
      .in(this)
      .select(WRITING_CANVAS_SELECTOR)
      .fields({ rect: true })
      .exec((results) => {
        const canvasRect = results && results[0];
        if (canvasRect) {
          this.canvasRect = {
            left: Number(canvasRect.left) || 0,
            top: Number(canvasRect.top) || 0,
          };
        }
        this.canvasRectRefreshPending = false;
      });
  },

  /**
   * 合并高频 touchmove 绘制，降低开发者工具模拟器里的卡顿。
   *
   * @returns {void} 无返回值。
   */
  scheduleDrawFrame() {
    if (this.frameId) {
      return;
    }

    const requestFrame = this.canvasNode && this.canvasNode.requestAnimationFrame;
    if (requestFrame) {
      this.frameId = requestFrame.call(this.canvasNode, () => {
        this.frameId = null;
        this.paintPendingPoint();
      });
      return;
    }

    this.frameId = setTimeout(() => {
      this.frameId = null;
      this.paintPendingPoint();
    }, FALLBACK_FRAME_DELAY_MS);
  },

  /**
   * 绘制当前待处理触摸点。
   *
   * <p>每次只绘制上一中点到当前中点的一小段二次贝塞尔曲线，并立即 stroke。
   * 这样单帧渲染成本恒定，不会随笔画变长而累积重绘整条路径，避免越写越卡；
   * 中点法同时保证连续段之间平滑过渡、无明显棱角。</p>
   *
   * @returns {void} 无返回值。
   */
  paintPendingPoint() {
    if (!this.canvasReady || !this.lastPoint || !this.pendingPoint || !this.canvasContext) {
      return;
    }

    const last = this.lastPoint;
    const next = this.pendingPoint;
    if (distanceBetweenPoints(last, next) < TOUCH_POINT_MIN_DISTANCE_PX) {
      return;
    }
    const midPoint = {
      x: (last.x + next.x) / 2,
      y: (last.y + next.y) / 2,
    };
    const startPoint = this.lastMidPoint || last;
    this.canvasContext.beginPath();
    this.canvasContext.moveTo(startPoint.x, startPoint.y);
    this.canvasContext.quadraticCurveTo(last.x, last.y, midPoint.x, midPoint.y);
    this.canvasContext.stroke();
    this.lastMidPoint = midPoint;
    this.lastPoint = next;
    this.hasDrawnSegment = true;
  },

  /**
   * 绘制轻点产生的圆点，避免用户短按时画布没有反馈。
   *
   * @param {{x:number,y:number}} point 触摸点在 Canvas CSS 坐标系中的位置。
   * @returns {void} 无返回值。
   */
  drawTapDot(point) {
    if (!this.canvasReady || !this.canvasContext) {
      return;
    }

    this.canvasContext.beginPath();
    this.canvasContext.arc(point.x, point.y, DRAW_LINE_WIDTH / 2, 0, Math.PI * 2);
    this.canvasContext.fill();
  },

  /**
   * 取消等待中的绘制动画帧。
   *
   * @returns {void} 无返回值。
   */
  cancelPendingFrame() {
    if (!this.frameId) {
      return;
    }

    const cancelFrame = this.canvasNode && this.canvasNode.cancelAnimationFrame;
    if (cancelFrame) {
      cancelFrame.call(this.canvasNode, this.frameId);
    } else {
      clearTimeout(this.frameId);
    }
    this.frameId = null;
  },

  /**
   * 提交汉字练习，并在后端持久化成功后使用接口响应更新记录。
   *
   * @returns {Promise<void>} 保存和用户反馈处理完成后解析。
   */
  async submitHanziPractice() {
    const hanzi = this.data.currentHanzi;
    if (!hanzi || !hanzi.id) {
      wx.showToast({ title: "暂无可练习汉字", icon: "none" });
      return;
    }
    if (!this.data.strokeCount) {
      wx.showToast({ title: "请先完成书写", icon: "none" });
      return;
    }
    const completed = this.data.strokeCount >= hanzi.stroke_count;
    const currentStudent = this.data.currentStudent || {};
    if (!currentStudent.id) {
      wx.showToast({ title: "后台暂无学生用户", icon: "none" });
      return;
    }
    const durationSeconds = calculatePracticeDuration(this.practiceStartedAt);
    const nextRecord = {
      user_id: currentStudent.id || "",
      user_name: currentStudent.nickname || "",
      item_type: "hanzi",
      item_id: hanzi.id,
      item_name: hanzi.character_text,
      task_name: findRelatedTaskName(this.data.taskList, "hanzi", hanzi.id),
      complete_status: completed ? "completed" : "in_progress",
      stroke_total: hanzi.stroke_count,
      stroke_completed: this.data.strokeCount,
      mistake_count: this.data.mistakeCount,
      hint_count: this.data.hintCount,
      score_level: completed ? (this.data.mistakeCount ? "A" : "A+") : "B",
      duration_seconds: durationSeconds,
      practice_time: formatDateTime(new Date()),
    };
    try {
      await this.savePracticeRecord(nextRecord);
      wx.showToast({
        title: completed ? "评测完成" : "已保存练习",
        icon: "success",
      });
      this.clearCanvas();
    } catch (error) {
      console.warn("练习记录保存失败。", error);
      wx.showToast({ title: "保存失败，请重试", icon: "none" });
    }
  },

  /**
   * 打开古诗空格的手写输入面板。
   *
   * @param {WechatMiniprogram.TouchEvent} event 空格点击事件，dataset 携带目标字与唯一键。
   * @returns {void} 无返回值。
   */
  openPoemWriting(event) {
    const { char, key, blank, filled } = event.currentTarget.dataset;
    const isBlank = blank === true || blank === "true" || blank === "1";
    const isFilled = filled === true || filled === "true" || filled === "1";
    if (!isBlank || isFilled) {
      return;
    }
    if (!this.poemPracticeStartedAt) {
      this.poemPracticeStartedAt = Date.now();
    }
    this.setData({
      poemWritingVisible: true,
      poemWritingTargetChar: char,
      poemWritingTargetKey: key,
      poemWritingHasInk: false,
      poemWritingFeedback: `请手写“${char}”，写完后确认填入。`,
    }, () => this.initPoemWritingCanvas());
  },

  /**
   * 初始化古诗填空弹层中的高清 Canvas。
   *
   * @returns {void} 无返回值。
   */
  initPoemWritingCanvas() {
    wx.nextTick(() => {
      wx.createSelectorQuery()
        .in(this)
        .select(POEM_WRITING_CANVAS_SELECTOR)
        .fields({ node: true, size: true, rect: true })
        .exec((results) => {
          const canvasInfo = results && results[0];
          if (!canvasInfo || !canvasInfo.node || !canvasInfo.width || !canvasInfo.height) {
            return;
          }
          const pixelRatio = wx.getSystemInfoSync().pixelRatio || 1;
          const canvas = canvasInfo.node;
          const context = canvas.getContext("2d");
          canvas.width = Math.round(canvasInfo.width * pixelRatio);
          canvas.height = Math.round(canvasInfo.height * pixelRatio);
          context.scale(pixelRatio, pixelRatio);
          context.lineWidth = POEM_DRAW_LINE_WIDTH;
          context.lineCap = "round";
          context.lineJoin = "round";
          context.strokeStyle = "#111827";
          context.fillStyle = "#111827";
          this.poemCanvasNode = canvas;
          this.poemCanvasContext = context;
          this.poemCanvasSize = { width: canvasInfo.width, height: canvasInfo.height };
          this.poemCanvasRect = {
            left: Number(canvasInfo.left) || 0,
            top: Number(canvasInfo.top) || 0,
          };
        });
    });
  },

  /**
   * 开始古诗填空手写。
   *
   * @param {WechatMiniprogram.TouchEvent} event Canvas 触摸起始事件。
   * @returns {void} 无返回值。
   */
  startPoemWriting(event) {
    const point = getTouchPoint(event, this.poemCanvasRect);
    if (!this.poemCanvasContext || !point) {
      return;
    }
    this.poemIsDrawing = true;
    this.poemLastPoint = point;
    this.poemCanvasContext.beginPath();
    this.poemCanvasContext.moveTo(point.x, point.y);
  },

  /**
   * 持续绘制古诗填空笔迹。
   *
   * @param {WechatMiniprogram.TouchEvent} event Canvas 触摸移动事件。
   * @returns {void} 无返回值。
   */
  drawPoemWriting(event) {
    const point = getTouchPoint(event, this.poemCanvasRect);
    if (!this.poemIsDrawing || !this.poemCanvasContext || !point || !this.poemLastPoint) {
      return;
    }
    const midPoint = {
      x: (this.poemLastPoint.x + point.x) / 2,
      y: (this.poemLastPoint.y + point.y) / 2,
    };
    this.poemCanvasContext.quadraticCurveTo(this.poemLastPoint.x, this.poemLastPoint.y, midPoint.x, midPoint.y);
    this.poemCanvasContext.stroke();
    this.poemLastPoint = point;
    this.setData({ poemWritingHasInk: true, poemWritingFeedback: "已识别到书写，确认后填入诗句。" });
  },

  /**
   * 结束古诗填空的一笔书写。
   *
   * @param {WechatMiniprogram.TouchEvent} event 触摸结束事件，changedTouches 包含真实收笔坐标。
   * @returns {void} 无返回值。
   */
  stopPoemWriting(event) {
    if (!this.poemIsDrawing) {
      return;
    }

    // 与主练字 Canvas 保持一致：真机快速抬笔时使用 touchend 的终点补齐
    // 最后一段，避免短笔画只留下起点或半截轨迹。
    const endPoint = getTouchPoint(event, this.poemCanvasRect);
    const hasFinalSegment = endPoint
      && this.poemLastPoint
      && distanceBetweenPoints(this.poemLastPoint, endPoint) >= TOUCH_POINT_MIN_DISTANCE_PX;
    if (hasFinalSegment && this.poemCanvasContext) {
      this.poemCanvasContext.quadraticCurveTo(
        this.poemLastPoint.x,
        this.poemLastPoint.y,
        endPoint.x,
        endPoint.y,
      );
      this.poemCanvasContext.stroke();
      this.poemLastPoint = endPoint;
      this.setData({
        poemWritingHasInk: true,
        poemWritingFeedback: "已识别到书写，确认后填入诗句。",
      });
    }
    if (!this.data.poemWritingHasInk && !hasFinalSegment && this.poemLastPoint && this.poemCanvasContext) {
      this.poemCanvasContext.beginPath();
      this.poemCanvasContext.arc(this.poemLastPoint.x, this.poemLastPoint.y, POEM_DRAW_LINE_WIDTH / 2, 0, Math.PI * 2);
      this.poemCanvasContext.fill();
      this.setData({ poemWritingHasInk: true, poemWritingFeedback: "已识别到书写，确认后填入诗句。" });
    }
    this.poemIsDrawing = false;
    this.poemLastPoint = null;
  },

  /**
   * 清空古诗填空手写 Canvas。
   *
   * @returns {void} 无返回值。
   */
  clearPoemWriting() {
    if (this.poemCanvasContext) {
      this.poemCanvasContext.clearRect(0, 0, this.poemCanvasSize.width, this.poemCanvasSize.height);
    }
    this.poemIsDrawing = false;
    this.poemLastPoint = null;
    this.setData({ poemWritingHasInk: false, poemWritingFeedback: "请重新书写目标文字。" });
  },

  /**
   * 确认手写内容并填入对应古诗空格。
   *
   * @returns {void} 无返回值。
   */
  async confirmPoemWriting() {
    if (!this.data.currentPoem) {
      wx.showToast({ title: "暂无可练习古诗", icon: "none" });
      return;
    }
    if (!this.data.poemWritingHasInk) {
      this.setData({ poemWritingFeedback: "还没有检测到笔迹，请先在方格中书写。" });
      return;
    }
    const targetKey = this.data.poemWritingTargetKey;
    const filledPoemChars = Object.assign({}, this.data.filledPoemChars, { [targetKey]: true });
    const blankItems = getPoemBlankItems(this.data.currentPoem);
    const isDone = blankItems.every((item) => filledPoemChars[item.key]);
    this.setData({
      filledPoemChars,
      poemLines: buildPoemLines(this.data.currentPoem, filledPoemChars),
    });
    this.closePoemWriting();

    if (isDone) {
      const currentStudent = this.data.currentStudent || {};
      if (!currentStudent.id) {
        wx.showToast({ title: "后台暂无学生用户", icon: "none" });
        return;
      }
      const nextRecord = {
        user_id: currentStudent.id || "",
        user_name: currentStudent.nickname || "",
        item_type: "poem",
        item_id: this.data.currentPoem.id,
        item_name: this.data.currentPoem.title,
        task_name: findRelatedTaskName(this.data.taskList, "poem", this.data.currentPoem.id),
        complete_status: "completed",
        stroke_total: blankItems.length,
        stroke_completed: blankItems.length,
        mistake_count: 0,
        hint_count: 0,
        score_level: "A+",
        duration_seconds: calculatePracticeDuration(this.poemPracticeStartedAt),
        practice_time: formatDateTime(new Date()),
      };
      try {
        await this.savePracticeRecord(nextRecord);
        wx.showToast({ title: "背诵书写完成", icon: "success" });
      } catch (error) {
        console.warn("古诗练习记录保存失败。", error);
        wx.showToast({ title: "保存失败，请重试", icon: "none" });
      }
    }
  },

  /**
   * 关闭古诗填空手写面板并释放临时 Canvas 引用。
   *
   * @returns {void} 无返回值。
   */
  closePoemWriting() {
    this.poemIsDrawing = false;
    this.poemLastPoint = null;
    this.poemCanvasNode = null;
    this.poemCanvasContext = null;
    this.poemCanvasSize = { width: 0, height: 0 };
    this.setData({
      poemWritingVisible: false,
      poemWritingTargetChar: "",
      poemWritingTargetKey: "",
      poemWritingHasInk: false,
    });
  },

  /**
   * 打开练习记录详情弹层。
   *
   * @param {WechatMiniprogram.TouchEvent} event 记录卡片点击事件，dataset.recordId 为记录主键。
   * @returns {void} 无返回值。
   */
  openRecordDetail(event) {
    const recordId = event.currentTarget.dataset.recordId;
    const record = this.data.studentRecords.find((item) => item.id === recordId);
    if (!record) {
      return;
    }

    this.setData({
      recordDetailVisible: true,
      recordDetail: this.buildRecordDetail(record),
    });
  },

  /**
   * 关闭练习记录详情弹层。
   *
   * @returns {void} 无返回值。
   */
  closeRecordDetail() {
    this.setData({
      recordDetailVisible: false,
      recordDetail: null,
    });
  },

  /**
   * 生成记录详情展示模型。
   *
   * <p>业务意图：后端早期记录可能没有写入 writing_steps，本方法会基于当前
   * 汉字笔画描述或古诗填空关键字补齐可读步骤，保证记录页总能看到过程详情。</p>
   *
   * @param {object} record 原始练习记录。
   * @returns {object} 包含完成度、耗时和步骤列表的详情对象。
   */
  buildRecordDetail(record) {
    const total = Math.max(Number(record.stroke_total) || 0, 0);
    const completed = Math.max(Number(record.stroke_completed) || 0, 0);
    const progressText = total ? `${Math.min(completed, total)}/${total}` : "已记录";
    const durationSeconds = Math.max(Number(record.duration_seconds) || 0, 0);
    const steps = buildWritingSteps(record, this.data.hanziList, this.data.poemList);

    return Object.assign({}, record, {
      progressText,
      durationText: formatDuration(durationSeconds),
      mistakeText: `${Number(record.mistake_count) || 0} 次`,
      hintText: `${Number(record.hint_count) || 0} 次`,
      writing_steps: steps,
    });
  },

  /**
   * 保存练习记录到后端，并仅在数据库写入成功后更新页面记录。
   *
   * @param {object} record 待保存的练习记录。
   * @returns {Promise<void>} 保存成功且页面状态更新后解析；失败时拒绝。
   */
  savePracticeRecord(record) {
    const appendRecord = (savedRecord) => {
      this.setData({
        practiceRecords: [savedRecord].concat(this.data.practiceRecords),
      }, () => this.syncDerivedState());
    };

    return createPracticeRecord(record).then((savedRecord) => appendRecord(savedRecord));
  },

  /**
   * 同步由基础数据推导出的页面显示数据。
   *
   * @returns {void} 无返回值。
   */
  syncDerivedState() {
    const hanziList = this.data.hanziList;
    const poemList = this.data.poemList;
    const taskList = this.data.taskList;
    const currentStudent = findCurrentStudent(this.data.users, this.cachedLoginUser);
    const studentRecords = filterStudentRecords(this.data.practiceRecords, currentStudent);
    const activeTasks = taskList
      .filter((task) => !task.status || task.status === "active")
      .map((task) => formatTask(task, hanziList, poemList));
    const currentHanzi = hanziList[this.data.selectedHanziIndex] || hanziList[0] || null;
    const currentPoem = poemList[this.data.selectedPoemIndex] || poemList[0] || null;
    const totalMistakes = studentRecords.reduce((total, record) => total + (Number(record.mistake_count) || 0), 0);
    const totalHints = studentRecords.reduce((total, record) => total + (Number(record.hint_count) || 0), 0);
    const totalCompleted = studentRecords.reduce((total, record) => total + (Number(record.stroke_completed) || 0), 0);
    const totalAttempts = totalCompleted + totalMistakes;
    const totalSeconds = studentRecords.reduce((total, record) => total + (Number(record.duration_seconds) || 0), 0);
    this.setData({
      currentStudent,
      activeTasks,
      studentRecords,
      consecutiveDays: calculateConsecutiveDays(studentRecords),
      studentHanziCount: countUniqueRecords(studentRecords, "hanzi"),
      studentPoemCount: countUniqueRecords(studentRecords, "poem"),
      studentProgress: calculateTaskProgress(activeTasks, studentRecords),
      currentHanzi,
      currentPoem,
      hanziPickerLabels: hanziList.map((item) => `${item.character_text} ${item.pinyin || ""}`),
      poemPickerLabels: poemList.map((item) => item.title),
      poemLines: currentPoem ? buildPoemLines(currentPoem, this.data.filledPoemChars) : [],
      profileInitial: getProfileInitial(currentStudent),
      profileRecordCount: studentRecords.length,
      profileWrongCount: totalMistakes,
      profileTotalMinutes: Math.ceil(totalSeconds / 60),
      profileAccuracy: totalAttempts ? Math.max(0, Math.round((totalCompleted / totalAttempts) * 100)) : 0,
    }, () => {
      const safeCount = this.data.currentHanzi
        ? Math.min(this.data.strokeCount, this.data.currentHanzi.stroke_count)
        : 0;
      this.setStrokeProgress(safeCount);
    });
  },

  /**
   * 设置笔画进度、百分比和下一笔文案。
   *
   * @param {number} count 当前已完成笔画数。
   * @returns {void} 无返回值。
   */
  setStrokeProgress(count) {
    const currentHanzi = this.data.currentHanzi;
    if (!currentHanzi) {
      this.setData({
        strokeCount: 0,
        strokePercent: 0,
        strokeHint: "请先从后台加载汉字数据。",
      });
      return;
    }
    const safeTotal = Math.max(currentHanzi.stroke_count, 1);
    const strokePercent = Math.min(100, Math.round((count / safeTotal) * 100));
    const strokeHint = count >= currentHanzi.stroke_count
      ? "已经完成全部笔画，可以提交评测。"
      : `下一笔：${currentHanzi.strokesDesc[count] || "继续描红"}。`;
    this.setData({ strokeCount: count, strokePercent, strokeHint });
  },
});

/**
 * 从本地存储读取微信登录用户。
 *
 * @returns {object|null} 结构有效且包含用户 ID 时返回缓存用户，否则返回 null。
 */
function readPersistedLoginUser() {
  try {
    const storedUser = wx.getStorageSync(WX_LOGIN_USER_STORAGE_KEY);
    return storedUser && typeof storedUser === "object" && storedUser.id ? storedUser : null;
  } catch (error) {
    console.warn("读取微信登录缓存失败。", error);
    return null;
  }
}

/**
 * 持久化微信登录用户。
 *
 * @param {object} user 后端确认过的当前用户，不得包含登录 code 等临时凭证。
 * @returns {void} 无返回值；写入失败时记录警告，当前内存会话仍可继续使用。
 */
function persistLoginUser(user) {
  try {
    wx.setStorageSync(WX_LOGIN_USER_STORAGE_KEY, user);
  } catch (error) {
    console.warn("保存微信登录缓存失败。", error);
  }
}

/**
 * 删除持久化微信登录用户。
 *
 * @returns {void} 无返回值；即使底层存储异常也保持内存退出流程可完成。
 */
function removePersistedLoginUser() {
  try {
    wx.removeStorageSync(WX_LOGIN_USER_STORAGE_KEY);
  } catch (error) {
    console.warn("清除微信登录缓存失败。", error);
  }
}

/**
 * 读取上次功能页签。
 *
 * @returns {string} 白名单内的缓存页签；无缓存或缓存损坏时返回首页。
 */
function readPersistedActiveTab() {
  try {
    const storedTab = wx.getStorageSync(ACTIVE_TAB_STORAGE_KEY);
    return MINI_APP_TAB_KEYS.includes(storedTab) ? storedTab : "home";
  } catch (error) {
    console.warn("读取页面位置缓存失败。", error);
    return "home";
  }
}

/**
 * 保存当前功能页签。
 *
 * @param {string} activeTab 已通过白名单校验的页签键。
 * @returns {void} 无返回值；存储失败不影响本次页面切换。
 */
function persistActiveTab(activeTab) {
  try {
    wx.setStorageSync(ACTIVE_TAB_STORAGE_KEY, activeTab);
  } catch (error) {
    console.warn("保存页面位置缓存失败。", error);
  }
}

/**
 * 判断用户是否仍需主动完善昵称。
 *
 * @param {object|null} user 当前微信用户。
 * @returns {boolean} 昵称为空或属于微信隐私占位文本时返回 true。
 */
function needsNicknameCompletion(user) {
  const nickname = getUsableNickname(user);
  return !nickname || WX_PLACEHOLDER_NICKNAMES.includes(nickname);
}

/**
 * 读取可展示昵称。
 *
 * @param {object|null} user 当前用户对象。
 * @returns {string} 去除首尾空白后的昵称；无昵称时返回空字符串。
 */
function getUsableNickname(user) {
  return String(user && user.nickname || "").trim();
}

/**
 * 按用户 ID 查找服务端最新用户。
 *
 * @param {Array<object>} users 后端用户列表。
 * @param {string} userId 当前登录用户 ID。
 * @returns {object|null} 找到时返回用户，否则返回 null。
 */
function findUserById(users, userId) {
  if (!userId) {
    return null;
  }
  return toArraySafe(users).find((user) => user.id === userId) || null;
}

/**
 * 判断账号是否被管理员禁用。
 *
 * @param {object|null} user 后端用户对象。
 * @returns {boolean} status 明确为 disabled 时返回 true。
 */
function isDisabledUser(user) {
  return String(user && user.status || "").toLowerCase() === "disabled";
}

/**
 * 用登录接口返回的最新用户替换列表中的旧记录。
 *
 * @param {Array<object>} users 当前聚合用户列表。
 * @param {object} currentUser 登录接口返回的当前用户。
 * @returns {Array<object>} 包含且仅包含一条当前用户记录的新数组。
 */
function replaceUserInList(users, currentUser) {
  const remainingUsers = toArraySafe(users).filter((user) => user.id !== currentUser.id);
  return remainingUsers.concat(currentUser);
}

/**
 * 格式化首页任务展示字段。
 *
 * @param {object} task 原始任务对象。
 * @param {Array<object>} hanziList 当前汉字数据源。
 * @param {Array<object>} poemList 当前古诗数据源。
 * @returns {object} 包含标签和条目文案的任务对象。
 */
function formatTask(task, hanziList, poemList) {
  const typeLabel = task.task_type === "poem" ? "古诗背诵" : "汉字书写";
  const itemsText = task.items
    .map((taskItem) => {
      if (taskItem.item_type === "poem") {
        return (poemList.find((poem) => poem.id === taskItem.item_id) || {}).title;
      }
      return (hanziList.find((hanzi) => hanzi.id === taskItem.item_id) || {}).character_text;
    })
    .filter(Boolean)
    .join("、");
  return Object.assign({}, task, { typeLabel, itemsText });
}

/**
 * 查找当前学生用户。
 *
 * <p>已微信登录时优先用服务端最新用户刷新缓存字段；未登录时返回空对象，
 * 避免登录遮罩背后误展示数据库中的其他学生资料。</p>
 *
 * @param {Array<object>} users 用户列表。
 * @param {object} cachedLoginUser 本地缓存的微信登录用户。
 * @returns {object} 当前学生；没有学生数据时返回空对象。
 */
function findCurrentStudent(users, cachedLoginUser) {
  if (cachedLoginUser && cachedLoginUser.id) {
    const matched = toArraySafe(users).find((user) => user.id === cachedLoginUser.id);
    return matched || cachedLoginUser;
  }
  return {};
}

/**
 * 过滤当前学生的练习记录。
 *
 * @param {Array<object>} records 全部练习记录。
 * @param {object} currentStudent 当前学生用户。
 * @returns {Array<object>} 当前学生可见的练习记录。
 */
function filterStudentRecords(records, currentStudent) {
  if (!currentStudent.id) {
    return [];
  }
  return records.filter((record) => record.user_id === currentStudent.id);
}

/**
 * 按练习对象类型统计去重数量。
 *
 * @param {Array<object>} records 练习记录列表。
 * @param {string} itemType 练习对象类型，例如 hanzi 或 poem。
 * @returns {number} 去重后的练习对象数量。
 */
function countUniqueRecords(records, itemType) {
  return new Set(records
    .filter((record) => record.item_type === itemType)
    .map((record) => record.item_id || record.item_name)
    .filter(Boolean)).size;
}

/**
 * 计算用户中心头像首字。
 *
 * @param {object} currentStudent 当前学生用户。
 * @returns {string} 用户昵称首字；缺少昵称时返回空字符串。
 */
function getProfileInitial(currentStudent) {
  const nickname = String((currentStudent && currentStudent.nickname) || "").trim();
  return nickname ? nickname.charAt(0) : "";
}

/**
 * 依据数据库练习记录计算连续练习天数。
 *
 * <p>只把能够解析为本地日期且从今天开始连续出现的日期计入结果；缺失或格式
 * 非法的练习时间不会被替换成客户端演示值。</p>
 *
 * @param {Array<object>} records 当前学生从后端取得的练习记录。
 * @returns {number} 从今天向前连续存在练习记录的自然日数量。
 */
function calculateConsecutiveDays(records) {
  const practicedDates = new Set(toArraySafe(records)
    .map((record) => normalizePracticeDate(record.practice_time || record.practiceTime))
    .filter(Boolean));
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  let days = 0;
  while (practicedDates.has(formatCalendarDate(cursor))) {
    days += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return days;
}

/**
 * 依据后端任务和已完成记录计算任务完成率。
 *
 * @param {Array<object>} tasks 后端返回且已筛选为生效状态的任务。
 * @param {Array<object>} records 当前学生从后端取得的练习记录。
 * @returns {number} 已完成任务条目占全部任务条目的百分比，数据库无任务时为 0。
 */
function calculateTaskProgress(tasks, records) {
  const taskItems = toArraySafe(tasks).reduce((items, task) => items.concat(toArraySafe(task.items)), []);
  if (!taskItems.length) {
    return 0;
  }
  const completedKeys = new Set(toArraySafe(records)
    .filter((record) => record.complete_status === "completed")
    .map((record) => `${record.item_type}:${record.item_id}`));
  const completedCount = taskItems.filter((item) => completedKeys.has(`${item.item_type}:${item.item_id}`)).length;
  return Math.min(100, Math.round((completedCount / taskItems.length) * 100));
}

/**
 * 将后端练习时间转换为本地日历日期。
 *
 * @param {string} value 后端返回的时间文本，推荐格式为 yyyy-MM-dd HH:mm。
 * @returns {string} yyyy-MM-dd 日期；无法解析时返回空字符串。
 */
function normalizePracticeDate(value) {
  const rawValue = String(value || "").trim();
  const directMatch = rawValue.match(/^(\d{4}-\d{2}-\d{2})/);
  if (directMatch) {
    return directMatch[1];
  }
  const parsedDate = new Date(rawValue);
  return Number.isNaN(parsedDate.getTime()) ? "" : formatCalendarDate(parsedDate);
}

/**
 * 格式化本地自然日。
 *
 * @param {Date} date 有效日期对象。
 * @returns {string} yyyy-MM-dd 格式日期。
 */
function formatCalendarDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 生成古诗填空字符渲染模型。
 *
 * @param {object} poem 当前古诗对象。
 * @param {Record<string, boolean>} filledPoemChars 已填入的关键字映射。
 * @returns {Array<object>} 适合 WXML 循环渲染的诗句列表。
 */
function buildPoemLines(poem, filledPoemChars) {
  return poem.sentences.map((sentence) => ({
    id: sentence.id,
    characters: sentence.sentence_text.split("").map((text, index) => {
      const isBlank = sentence.key_characters.includes(text);
      const key = `${sentence.id}-${text}-${index}`;
      const isFilled = Boolean(filledPoemChars[key]);
      return {
        key,
        text,
        displayText: isBlank && !isFilled ? "" : text,
        className: isBlank ? (isFilled ? "filled" : "blank") : "",
        isBlank,
        isFilled,
      };
    }),
  }));
}

/**
 * 读取古诗中需要手写填空的唯一字符项。
 *
 * @param {object} poem 当前古诗对象。
 * @returns {Array<object>} 包含 key、char、lineIndex 和 charIndex 的填空项。
 */
function getPoemBlankItems(poem) {
  if (!poem || !Array.isArray(poem.sentences)) {
    return [];
  }

  return poem.sentences.reduce((items, sentence, lineIndex) => {
    String(sentence.sentence_text || "").split("").forEach((char, charIndex) => {
      if (toArraySafe(sentence.key_characters).includes(char)) {
        items.push({
          key: `${sentence.id}-${char}-${charIndex}`,
          char,
          lineIndex,
          charIndex,
        });
      }
    });
    return items;
  }, []);
}

/**
 * 从触摸事件中读取 Canvas 内部坐标。
 *
 * @param {WechatMiniprogram.TouchEvent} event 小程序触摸事件。
 * @param {{left:number,top:number}} canvasRect Canvas 相对于当前视口的边界位置。
 * @returns {{x:number,y:number}|null} 可绘制坐标；无触摸点时返回 null。
 */
function getTouchPoint(event, canvasRect = { left: 0, top: 0 }) {
  const touch = (event.touches && event.touches[0]) || (event.changedTouches && event.changedTouches[0]);
  if (!touch) {
    return null;
  }

  // CanvasTouch 优先提供相对画布的 x/y；部分基础库只提供视口 clientX/clientY，
  // 后一种情况必须减去画布边界，否则页面纵向偏移会被误算成笔画起点偏差。
  const hasCanvasCoordinates = touch.x !== undefined
    && touch.x !== null
    && touch.y !== undefined
    && touch.y !== null
    && Number.isFinite(Number(touch.x))
    && Number.isFinite(Number(touch.y));
  const x = hasCanvasCoordinates ? touch.x : Number(touch.clientX) - (Number(canvasRect.left) || 0);
  const y = hasCanvasCoordinates ? touch.y : Number(touch.clientY) - (Number(canvasRect.top) || 0);
  if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) {
    return null;
  }

  return {
    x: Number(x),
    y: Number(y),
  };
}

/**
 * 向轨迹数组追加去抖后的坐标点。
 *
 * @param {Array<{x:number,y:number}>} points 当前笔画已经采集的触摸点数组，会被原地追加。
 * @param {{x:number,y:number}} point 新触摸点。
 * @returns {boolean} 成功追加返回 true，距离过近或坐标非法返回 false。
 */
function appendDistinctPoint(points, point) {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    return false;
  }

  const lastPoint = points[points.length - 1];
  if (lastPoint && distanceBetweenPoints(lastPoint, point) < TOUCH_POINT_MIN_DISTANCE_PX) {
    return false;
  }

  points.push(point);
  return true;
}

/**
 * 校验用户单笔轨迹是否匹配当前应写笔画。
 *
 * <p>用户轨迹与标准中线先各自调用 alignStrokeForCompare 归一化到统一形状
 * 空间（质心对齐 + 长边归一化），再比较起点、终点、方向和整体贴合度。
 * 这样校验只关心笔画的方向与形状，不再受“字体预览位置”与“Hanzi Writer
 * 坐标”不一致的绝对像素偏差影响——照田字格写对方向和形状即可通过，
 * 同时仍能拦截“写错笔画”与“倒着写”。</p>
 *
 * @param {Array<{x:number,y:number}>} attemptedPoints 用户当前一笔采集到的 Canvas 坐标。
 * @param {Array<Array<number>>} expectedMedian Hanzi Writer 当前笔的标准中线。
 * @param {number} canvasWidth 练字 Canvas 的 CSS 宽度。
 * @param {number} canvasHeight 练字 Canvas 的 CSS 高度。
 * @returns {{valid:boolean,message:string}} 校验结果与面向用户的提示文案。
 */
function evaluateStrokeAttempt(attemptedPoints, expectedMedian, canvasWidth, canvasHeight) {
  const userPoints = normalizeCanvasPoints(attemptedPoints);
  const expectedPoints = transformMedianToCanvas(expectedMedian, canvasWidth, canvasHeight);

  if (userPoints.length < 2) {
    return { valid: false, message: "这一笔太短了，请按标准起笔方向重新写。" };
  }
  if (expectedPoints.length < 2) {
    return { valid: false, message: "当前笔顺数据暂不可用，请稍后重试。" };
  }

  const normalizedUser = alignStrokeForCompare(userPoints);
  const normalizedExpected = alignStrokeForCompare(expectedPoints);

  const expectedLength = calculatePolylineLength(normalizedExpected);
  const userLength = calculatePolylineLength(normalizedUser);
  const lengthRatio = expectedLength > 0 ? userLength / expectedLength : 0;
  const forwardDistance = calculateAverageTrackDistance(normalizedUser, normalizedExpected);
  const reverseDistance = calculateAverageTrackDistance(normalizedUser, normalizedExpected.slice().reverse());
  const expectedBounds = getPolylineBounds(expectedPoints);
  const expectedSpan = Math.max(expectedBounds.width, expectedBounds.height, 1);
  const touchNoiseAllowance = Math.min(
    STROKE_TOUCH_NOISE_MAX_NORMALIZED,
    STROKE_TOUCH_NOISE_ALLOWANCE_PX / expectedSpan,
  );
  const startTolerance = STROKE_NORMALIZED_START_TOLERANCE + touchNoiseAllowance;
  const endTolerance = STROKE_NORMALIZED_END_TOLERANCE + touchNoiseAllowance;
  const pathTolerance = STROKE_NORMALIZED_PATH_TOLERANCE
    + touchNoiseAllowance * STROKE_TOUCH_PATH_ALLOWANCE_FACTOR;
  const startDistance = distanceBetweenPoints(normalizedUser[0], normalizedExpected[0]);
  const endDistance = distanceBetweenPoints(
    normalizedUser[normalizedUser.length - 1],
    normalizedExpected[normalizedExpected.length - 1],
  );

  if (!Number.isFinite(userLength) || userLength < STROKE_NORMALIZED_MIN_LENGTH) {
    return { valid: false, message: "这一笔太短了，请沿着示范完整写出。" };
  }
  if (lengthRatio < STROKE_LENGTH_RATIO_MIN || lengthRatio > STROKE_LENGTH_RATIO_MAX) {
    return { valid: false, message: "这一笔长度差异太大，请重新书写。" };
  }
  if (startDistance > startTolerance) {
    return { valid: false, message: "起笔位置不对，请看准这一笔的开头再写。" };
  }
  if (reverseDistance + STROKE_NORMALIZED_DIRECTION_MARGIN < forwardDistance) {
    return { valid: false, message: "这一笔方向反了，请按笔顺从起笔处写到收笔处。" };
  }
  if (endDistance > endTolerance) {
    return { valid: false, message: "收笔位置偏差较大，请沿着这一笔写完整。" };
  }
  if (forwardDistance > pathTolerance) {
    return { valid: false, message: "笔画轨迹偏离较多，请贴近示范笔画重新写。" };
  }

  return { valid: true, message: "当前笔画校验通过。" };
}

/**
 * 把单笔轨迹归一化到统一形状空间。
 *
 * <p>以质心为原点、以外接矩形长边为单位长度，使后续比较脱离绝对像素位置，
 * 只关注笔画的方向与形状。用户照田字格或字体预览书写时，只要形状方向与
 * 标准笔画一致即可通过，不再因坐标系不一致被误判。</p>
 *
 * @param {Array<{x:number,y:number}>} points Canvas 坐标点。
 * @returns {Array<{x:number,y:number}>} 归一化后的点列表；输入为空时返回空数组。
 */
function alignStrokeForCompare(points) {
  const safePoints = normalizeCanvasPoints(points);
  if (!safePoints.length) {
    return [];
  }

  // 先按路径进度统一采样，再计算质心与外接框。直接对原始 touchmove 点
  // 求质心会让高频设备或手指停顿区域获得过高权重，造成正确笔画位置漂移。
  const sampledPoints = samplePolyline(safePoints, STROKE_COMPARISON_SAMPLE_COUNT);
  let sumX = 0;
  let sumY = 0;
  sampledPoints.forEach((point) => {
    sumX += point.x;
    sumY += point.y;
  });
  const centroid = {
    x: sumX / sampledPoints.length,
    y: sumY / sampledPoints.length,
  };
  const bounds = getPolylineBounds(sampledPoints);
  const size = Math.max(bounds.width, bounds.height, 1);

  return sampledPoints.map((point) => ({
    x: (point.x - centroid.x) / size,
    y: (point.y - centroid.y) / size,
  }));
}

/**
 * 用统一样式重绘一条已通过校验的手写轨迹。
 *
 * @param {CanvasRenderingContext2D} context 小程序 2D Canvas 上下文。
 * @param {Array<{x:number,y:number}>} points 需要重绘的 Canvas 坐标点。
 * @param {number} lineWidth 轨迹线宽，单位 CSS 像素。
 * @param {string} strokeStyle 轨迹颜色。
 * @returns {void} 无返回值。
 */
function drawHandwritingPath(context, points, lineWidth, strokeStyle) {
  const safePoints = normalizeCanvasPoints(points);
  if (!context || !safePoints.length) {
    return;
  }

  context.save();
  context.lineWidth = lineWidth;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.strokeStyle = strokeStyle;
  context.fillStyle = strokeStyle;
  if (safePoints.length === 1) {
    context.beginPath();
    context.arc(safePoints[0].x, safePoints[0].y, lineWidth / 2, 0, Math.PI * 2);
    context.fill();
    context.restore();
    return;
  }

  context.beginPath();
  context.moveTo(safePoints[0].x, safePoints[0].y);
  for (let index = 1; index < safePoints.length; index += 1) {
    const previous = safePoints[index - 1];
    const current = safePoints[index];
    const midPoint = {
      x: (previous.x + current.x) / 2,
      y: (previous.y + current.y) / 2,
    };
    context.quadraticCurveTo(previous.x, previous.y, midPoint.x, midPoint.y);
  }
  context.stroke();
  context.restore();
}

/**
 * 计算本次练习耗时。
 *
 * @param {number} startedAt 练习开始时间戳，单位毫秒。
 * @returns {number} 至少为 1 的耗时秒数；没有开始时间时返回 0。
 */
function calculatePracticeDuration(startedAt) {
  if (!startedAt) {
    return 0;
  }

  return Math.max(1, Math.round((Date.now() - startedAt) / 1000));
}

/**
 * 在任务列表中查找练习对象关联的任务名称。
 *
 * @param {Array<object>} taskList 当前任务列表。
 * @param {string} itemType 练习对象类型，例如 hanzi 或 poem。
 * @param {string} itemId 练习对象主键。
 * @returns {string} 命中的任务名称，未命中时返回空字符串。
 */
function findRelatedTaskName(taskList, itemType, itemId) {
  const matchedTask = toArraySafe(taskList).find((task) => toArraySafe(task.items).some((item) => (
    (item.item_type || item.itemType) === itemType && (item.item_id || item.itemId) === itemId
  )));
  return matchedTask ? (matchedTask.task_name || matchedTask.taskName || "") : "";
}

/**
 * 生成记录详情的书写步骤。
 *
 * @param {object} record 练习记录。
 * @param {Array<object>} hanziList 汉字数据源。
 * @param {Array<object>} poemList 古诗数据源。
 * @returns {Array<object>} 可直接渲染的步骤列表。
 */
function buildWritingSteps(record, hanziList, poemList) {
  const existingSteps = toArraySafe(record.writing_steps || record.writingSteps);
  if (existingSteps.length) {
    return existingSteps.map((step, index) => normalizeWritingStep(step, index));
  }

  if (record.item_type === "poem") {
    const poem = toArraySafe(poemList).find((item) => item.id === record.item_id || item.title === record.item_name);
    return getPoemBlankItems(poem).map((item, index) => ({
      index: index + 1,
      label: `填入“${item.char}”`,
      status: "completed",
      detail: `第 ${item.lineIndex + 1} 句，第 ${item.charIndex + 1} 个字 · 手写完成`,
    }));
  }

  const hanzi = toArraySafe(hanziList).find((item) => item.id === record.item_id || item.character_text === record.item_name);
  const strokeNames = toArraySafe(hanzi && hanzi.strokesDesc);
  const total = Math.max(Number(record.stroke_total) || strokeNames.length || 0, 0);
  const completed = Math.max(Number(record.stroke_completed) || 0, 0);
  return Array.from({ length: total }).map((_, index) => {
    const strokeName = strokeNames[index] || "笔画";
    return {
      index: index + 1,
      label: `第 ${index + 1} 笔 · ${strokeName}`,
      status: index < completed ? "completed" : "pending",
      detail: index < completed ? "笔顺与轨迹校验通过" : "尚未完成",
    };
  });
}

/**
 * 归一化单个书写步骤。
 *
 * @param {object} step 原始步骤对象。
 * @param {number} index 步骤在列表中的零基索引。
 * @returns {object} 包含 index、label、status 和 detail 的步骤对象。
 */
function normalizeWritingStep(step, index) {
  return {
    index: Number(step.index) || index + 1,
    label: step.label || `第 ${index + 1} 步`,
    status: step.status || "completed",
    detail: step.detail || "已完成",
  };
}

/**
 * 格式化练习耗时。
 *
 * @param {number} durationSeconds 耗时秒数。
 * @returns {string} 面向用户展示的中文耗时。
 */
function formatDuration(durationSeconds) {
  const safeSeconds = Math.max(Number(durationSeconds) || 0, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  if (!minutes) {
    return `${seconds} 秒`;
  }
  return `${minutes} 分 ${seconds} 秒`;
}

/**
 * 将标准中线从 Hanzi Writer 坐标转换为 Canvas 坐标。
 *
 * @param {Array<Array<number>>} median Hanzi Writer 单笔中线。
 * @param {number} canvasWidth Canvas CSS 宽度。
 * @param {number} canvasHeight Canvas CSS 高度。
 * @returns {Array<{x:number,y:number}>} Canvas 坐标点。
 */
function transformMedianToCanvas(median, canvasWidth, canvasHeight) {
  const transform = createStrokeTransform(STROKE_GUIDE_BOUNDS, canvasWidth, canvasHeight);
  return normalizeStrokeTrack(median).map((point) => transformStrokePointWithTransform(point, transform));
}

/**
 * 过滤并归一化 Canvas 坐标点。
 *
 * @param {Array<object>} points 原始坐标点。
 * @returns {Array<{x:number,y:number}>} 坐标合法的点列表。
 */
function normalizeCanvasPoints(points) {
  return toArraySafe(points)
    .map((point) => ({ x: Number(point && point.x), y: Number(point && point.y) }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
}

/**
 * 计算用户轨迹到标准轨迹的平均最短距离。
 *
 * @param {Array<{x:number,y:number}>} userPoints 用户轨迹点。
 * @param {Array<{x:number,y:number}>} expectedPoints 标准中线点。
 * @returns {number} 平均距离，单位 CSS 像素。
 */
function calculateAverageTrackDistance(userPoints, expectedPoints) {
  if (!userPoints.length || expectedPoints.length < 2) {
    return Number.POSITIVE_INFINITY;
  }

  const sampledPoints = samplePolyline(userPoints, 12);
  const totalDistance = sampledPoints.reduce((total, point) => total + calculatePointToPolylineDistance(point, expectedPoints), 0);
  return totalDistance / Math.max(sampledPoints.length, 1);
}

/**
 * 从折线中按长度均匀重采样。
 *
 * 无论原始点数多于还是少于目标点数，都返回沿路径进度均匀分布的点；
 * 这样既能压缩高频 touchmove 数据，也能为真机稀疏轨迹补出稳定的比较点。
 *
 * @param {Array<{x:number,y:number}>} points 原始折线点。
 * @param {number} sampleCount 目标采样数量。
 * @returns {Array<{x:number,y:number}>} 采样后的点列表。
 */
function samplePolyline(points, sampleCount) {
  const safePoints = normalizeCanvasPoints(points);
  const safeSampleCount = Math.max(Math.floor(Number(sampleCount) || 0), 0);
  if (!safePoints.length || !safeSampleCount) {
    return [];
  }
  if (safePoints.length === 1 || safeSampleCount === 1) {
    return [safePoints[0]];
  }
  if (safeSampleCount === 2) {
    return [safePoints[0], safePoints[safePoints.length - 1]];
  }

  const sampledPoints = Array.from({ length: safeSampleCount }).map((_, index) => (
    getPointAtPolylineProgress(safePoints, index / (safeSampleCount - 1))
  )).filter(Boolean);
  if (!sampledPoints.length) {
    return safePoints.slice();
  }
  return sampledPoints;
}

/**
 * 计算点到折线的最短距离。
 *
 * @param {{x:number,y:number}} point 待计算的点。
 * @param {Array<{x:number,y:number}>} polyline 标准折线点。
 * @returns {number} 最短距离，单位 CSS 像素。
 */
function calculatePointToPolylineDistance(point, polyline) {
  let minDistance = Number.POSITIVE_INFINITY;
  for (let index = 1; index < polyline.length; index += 1) {
    minDistance = Math.min(minDistance, calculatePointToSegmentDistance(point, polyline[index - 1], polyline[index]));
  }
  return minDistance;
}

/**
 * 计算点到线段的最短距离。
 *
 * @param {{x:number,y:number}} point 待计算的点。
 * @param {{x:number,y:number}} segmentStart 线段起点。
 * @param {{x:number,y:number}} segmentEnd 线段终点。
 * @returns {number} 最短距离，单位 CSS 像素。
 */
function calculatePointToSegmentDistance(point, segmentStart, segmentEnd) {
  const segmentX = segmentEnd.x - segmentStart.x;
  const segmentY = segmentEnd.y - segmentStart.y;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
  if (!segmentLengthSquared) {
    return distanceBetweenPoints(point, segmentStart);
  }

  const rawProjection = ((point.x - segmentStart.x) * segmentX + (point.y - segmentStart.y) * segmentY) / segmentLengthSquared;
  const projection = Math.max(0, Math.min(1, rawProjection));
  const closestPoint = {
    x: segmentStart.x + projection * segmentX,
    y: segmentStart.y + projection * segmentY,
  };
  return distanceBetweenPoints(point, closestPoint);
}

/**
 * 将未知值安全转换为数组。
 *
 * @param {*} value 待转换的值。
 * @returns {Array} 数组输入原样返回，其他输入返回空数组。
 */
function toArraySafe(value) {
  return Array.isArray(value) ? value : [];
}

/**
 * 格式化本地练习时间。
 *
 * @param {Date} date 待格式化时间。
 * @returns {string} yyyy-MM-dd HH:mm 格式的时间文本。
 */
function formatDateTime(date) {
  const parts = [
    date.getFullYear(),
    padNumber(date.getMonth() + 1),
    padNumber(date.getDate()),
    padNumber(date.getHours()),
    padNumber(date.getMinutes()),
  ];
  return `${parts[0]}-${parts[1]}-${parts[2]} ${parts[3]}:${parts[4]}`;
}

/**
 * 将数字补齐为两位字符串。
 *
 * @param {number} value 日期或时间数字。
 * @returns {string} 两位数字字符串。
 */
function padNumber(value) {
  return String(value).padStart(2, "0");
}

/**
 * 归一化单笔的中线轨迹。
 *
 * @param {Array<Array<number>>} median Hanzi Writer 返回的单笔 medians 坐标。
 * @returns {Array<{x:number,y:number}>} 可用于 canvas 绘制的点列表。
 */
function normalizeStrokeTrack(median) {
  if (!Array.isArray(median)) {
    return [];
  }

  return median
    .map((point) => ({
      x: Number(point && point[0]),
      y: Number(point && point[1]),
    }))
    .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
}

/**
 * 将接口返回的轮廓路径与中线轨迹组合为可绘制笔画。
 *
 * @param {{strokes:Array<string>,medians:Array<Array<Array<number>>>}} guide Hanzi Writer 字形数据。
 * @returns {Array<{commands:Array<object>,track:Array<object>,length:number}>} Canvas 演示使用的笔画集合。
 */
function createStrokeShapes(guide) {
  const strokeCount = Math.min(guide.strokes.length, guide.medians.length);
  const shapes = [];
  for (let index = 0; index < strokeCount; index += 1) {
    const track = normalizeStrokeTrack(guide.medians[index]);
    const commands = parseStrokePath(guide.strokes[index]);
    if (track.length < 2 || !commands.length) {
      continue;
    }

    shapes.push({
      commands,
      track,
      length: calculatePolylineLength(track),
    });
  }
  return shapes;
}

/**
 * 解析 MakeMeAHanzi 使用的 SVG 绝对路径命令。
 *
 * <p>数据源只使用 M、L、Q、C、Z 命令。这里保留结构化参数，避免依赖
 * 小程序 Canvas 不稳定的 Path2D 支持。</p>
 *
 * @param {string} pathString 单笔 SVG 轮廓路径。
 * @returns {Array<{type:string,values:Array<number>}>} Canvas 可执行的路径命令。
 */
function parseStrokePath(pathString) {
  const tokens = String(pathString || "").match(/[MLCQZ]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) || [];
  const parameterCounts = { M: 2, L: 2, Q: 4, C: 6, Z: 0 };
  const commands = [];
  let commandType = null;
  let tokenIndex = 0;

  while (tokenIndex < tokens.length) {
    const token = tokens[tokenIndex];
    if (/^[MLCQZ]$/i.test(token)) {
      commandType = token.toUpperCase();
      tokenIndex += 1;
    }

    if (!commandType || parameterCounts[commandType] === undefined) {
      break;
    }

    const parameterCount = parameterCounts[commandType];
    if (parameterCount === 0) {
      commands.push({ type: commandType, values: [] });
      commandType = null;
      continue;
    }

    const values = tokens.slice(tokenIndex, tokenIndex + parameterCount).map(Number);
    if (values.length !== parameterCount || values.some((value) => !Number.isFinite(value))) {
      break;
    }
    commands.push({ type: commandType, values });
    tokenIndex += parameterCount;
  }

  return commands;
}

/**
 * 绘制一笔完整的真实轮廓。
 *
 * @param {CanvasRenderingContext2D} context 小程序 2D Canvas 上下文。
 * @param {{commands:Array<object>}} strokeShape 当前笔画结构。
 * @param {{minX:number,maxX:number,minY:number,maxY:number}} bounds Hanzi Writer 固定坐标范围。
 * @param {number} width 画布 CSS 宽度。
 * @param {number} height 画布 CSS 高度。
 * @param {string} color 轮廓填充颜色。
 * @returns {void} 无返回值。
 */
function drawStrokeOutline(context, strokeShape, bounds, width, height, color) {
  const transform = createStrokeTransform(bounds, width, height);
  traceStrokeOutline(context, strokeShape.commands, transform);
  context.fillStyle = color;
  context.fill();
}

/**
 * 在真实轮廓裁剪区内逐步揭示当前笔画。
 *
 * <p>这一算法与 Hanzi Writer Canvas 渲染器一致：轮廓负责笔锋形状，
 * 中线只作为 200 单位宽的动画遮罩，因此转折和收笔不会退化成粗折线。</p>
 *
 * @param {CanvasRenderingContext2D} context 小程序 2D Canvas 上下文。
 * @param {{commands:Array<object>,track:Array<object>,length:number}} strokeShape 当前笔画结构。
 * @param {{minX:number,maxX:number,minY:number,maxY:number}} bounds Hanzi Writer 固定坐标范围。
 * @param {number} width 画布 CSS 宽度。
 * @param {number} height 画布 CSS 高度。
 * @param {number} progress 当前笔画进度，范围 0-1。
 * @param {string} color 当前笔画颜色。
 * @returns {void} 无返回值。
 */
function drawStrokePortion(context, strokeShape, bounds, width, height, progress, color) {
  const transform = createStrokeTransform(bounds, width, height);
  const revealWidth = STROKE_DEMO_REVEAL_WIDTH * transform.scale;
  const transformedPoints = strokeShape.track.map((point) => transformStrokePointWithTransform(point, transform));
  const points = extendStrokeTrackStart(transformedPoints, revealWidth / 2);
  const pathLength = calculatePolylineLength(points);
  const dashOffset = pathLength * 0.999 * (1 - clampProgress(progress));

  context.save();
  traceStrokeOutline(context, strokeShape.commands, transform);
  // 微信 Canvas 需要先绘制一次路径，后续 clip 才能稳定识别复杂汉字轮廓。
  context.globalAlpha = 0;
  context.stroke();
  context.globalAlpha = 1;
  context.clip();
  context.strokeStyle = color;
  context.lineWidth = revealWidth;
  context.lineCap = "round";
  context.lineJoin = "round";

  if (typeof context.setLineDash === "function") {
    context.setLineDash([pathLength, pathLength], dashOffset);
    context.lineDashOffset = dashOffset;
    drawPolyline(context, points);
  } else {
    drawPolylinePortion(context, points, progress);
  }
  context.restore();
}

/**
 * 将中线起点反向延长半个遮罩宽度。
 *
 * <p>圆头粗线如果直接从原起点播放，首帧会缺少笔画尖端。延长后，遮罩会从
 * 轮廓外进入，与 Hanzi Writer 的起笔处理保持一致。</p>
 *
 * @param {Array<{x:number,y:number}>} points 已转换到 Canvas 坐标的中线点。
 * @param {number} distance 需要向后延长的 CSS 像素距离。
 * @returns {Array<{x:number,y:number}>} 带延长起点的新轨迹。
 */
function extendStrokeTrackStart(points, distance) {
  if (points.length < 2) {
    return points.slice();
  }

  const first = points[0];
  const second = points[1];
  const segmentLength = Math.max(distanceBetweenPoints(first, second), 1);
  const ratio = distance / segmentLength;
  return [{
    x: first.x + (first.x - second.x) * ratio,
    y: first.y + (first.y - second.y) * ratio,
  }, ...points.slice(1)];
}

/**
 * 将结构化轮廓命令写入当前 Canvas 路径。
 *
 * @param {CanvasRenderingContext2D} context 小程序 2D Canvas 上下文。
 * @param {Array<{type:string,values:Array<number>}>} commands 轮廓路径命令。
 * @param {{scale:number,xOffset:number,yOffset:number}} transform 坐标变换参数。
 * @returns {void} 无返回值。
 */
function traceStrokeOutline(context, commands, transform) {
  context.beginPath();
  commands.forEach((command) => {
    const points = [];
    for (let index = 0; index < command.values.length; index += 2) {
      points.push(transformStrokePointWithTransform({
        x: command.values[index],
        y: command.values[index + 1],
      }, transform));
    }

    if (command.type === "M") {
      context.moveTo(points[0].x, points[0].y);
    } else if (command.type === "L") {
      context.lineTo(points[0].x, points[0].y);
    } else if (command.type === "Q") {
      context.quadraticCurveTo(points[0].x, points[0].y, points[1].x, points[1].y);
    } else if (command.type === "C") {
      context.bezierCurveTo(points[0].x, points[0].y, points[1].x, points[1].y, points[2].x, points[2].y);
    } else if (command.type === "Z") {
      context.closePath();
    }
  });
}

/**
 * 计算 Hanzi Writer 坐标到 Canvas CSS 坐标的统一变换。
 *
 * @param {{minX:number,maxX:number,minY:number,maxY:number}} bounds 笔顺数据坐标范围。
 * @param {number} width 画布 CSS 宽度。
 * @param {number} height 画布 CSS 高度。
 * @returns {{scale:number,xOffset:number,yOffset:number}} 缩放与偏移参数。
 */
function createStrokeTransform(bounds, width, height) {
  const sourceWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const sourceHeight = Math.max(bounds.maxY - bounds.minY, 1);
  const availableWidth = Math.max(width - STROKE_DEMO_PADDING * 2, 1);
  const availableHeight = Math.max(height - STROKE_DEMO_PADDING * 2, 1);
  const scale = Math.min(availableWidth / sourceWidth, availableHeight / sourceHeight);
  return {
    scale,
    xOffset: (width - sourceWidth * scale) / 2 - bounds.minX * scale,
    yOffset: (height - sourceHeight * scale) / 2 + bounds.maxY * scale,
  };
}

/**
 * 使用已计算的变换参数转换单个坐标点。
 *
 * @param {{x:number,y:number}} point Hanzi Writer 原始坐标点。
 * @param {{scale:number,xOffset:number,yOffset:number}} transform 缩放与偏移参数。
 * @returns {{x:number,y:number}} Canvas CSS 坐标点。
 */
function transformStrokePointWithTransform(point, transform) {
  const { scale, xOffset, yOffset } = transform;

  return {
    x: xOffset + point.x * scale,
    y: yOffset - point.y * scale,
  };
}

/**
 * 绘制完整中线轨迹，供裁剪遮罩使用。
 *
 * @param {CanvasRenderingContext2D} context 小程序 2D Canvas 上下文。
 * @param {Array<{x:number,y:number}>} points Canvas 坐标点。
 * @returns {void} 无返回值。
 */
function drawPolyline(context, points) {
  if (points.length < 2) {
    return;
  }

  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
  context.stroke();
}

/**
 * 绘制折线的一部分。
 *
 * @param {CanvasRenderingContext2D} context 小程序 2D canvas 上下文。
 * @param {Array<{x:number,y:number}>} points 已转换到 canvas 坐标的折线点。
 * @param {number} progress 折线绘制进度，范围 0-1。
 * @returns {void} 无返回值。
 */
function drawPolylinePortion(context, points, progress) {
  if (points.length < 2) {
    return;
  }

  const endPoint = getPointAtPolylineProgress(points, progress);
  const targetLength = calculatePolylineLength(points) * clampProgress(progress);
  let drawnLength = 0;

  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const segmentLength = distanceBetweenPoints(start, end);
    if (drawnLength + segmentLength <= targetLength) {
      context.lineTo(end.x, end.y);
      drawnLength += segmentLength;
      continue;
    }

    if (endPoint) {
      context.lineTo(endPoint.x, endPoint.y);
    }
    break;
  }
  context.stroke();
}

/**
 * 获取折线指定进度处的坐标。
 *
 * @param {Array<{x:number,y:number}>} points 折线点。
 * @param {number} progress 折线进度，范围 0-1。
 * @returns {{x:number,y:number}|null} 指定进度处坐标。
 */
function getPointAtPolylineProgress(points, progress) {
  if (points.length < 2) {
    return points[0] || null;
  }

  const safeProgress = clampProgress(progress);
  const targetLength = calculatePolylineLength(points) * safeProgress;
  let walkedLength = 0;

  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const segmentLength = distanceBetweenPoints(start, end);
    if (walkedLength + segmentLength >= targetLength) {
      const ratio = segmentLength === 0 ? 0 : (targetLength - walkedLength) / segmentLength;
      return {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio,
      };
    }
    walkedLength += segmentLength;
  }

  return points[points.length - 1];
}

/**
 * 计算折线总长度。
 *
 * @param {Array<{x:number,y:number}>} points 折线点。
 * @returns {number} 折线总长度。
 */
function calculatePolylineLength(points) {
  return points.reduce((total, point, index) => {
    if (index === 0) {
      return total;
    }
    return total + distanceBetweenPoints(points[index - 1], point);
  }, 0);
}

/**
 * 计算两点距离。
 *
 * @param {{x:number,y:number}} start 起点。
 * @param {{x:number,y:number}} end 终点。
 * @returns {number} 欧氏距离。
 */
function distanceBetweenPoints(start, end) {
  const diffX = end.x - start.x;
  const diffY = end.y - start.y;
  return Math.sqrt(diffX * diffX + diffY * diffY);
}

/**
 * 将动画进度限制在合法范围。
 *
 * @param {number} progress 原始进度。
 * @returns {number} 0-1 之间的进度。
 */
function clampProgress(progress) {
  return Math.max(0, Math.min(1, Number(progress) || 0));
}

/**
 * 计算折线的外接矩形尺寸。
 *
 * @param {Array<{x:number,y:number}>} points 折线点。
 * @returns {{width:number,height:number}} 外接矩形宽高。
 */
function getPolylineBounds(points) {
  if (!points.length) {
    return { width: 0, height: 0 };
  }

  const initial = {
    minX: points[0].x,
    maxX: points[0].x,
    minY: points[0].y,
    maxY: points[0].y,
  };
  const bounds = points.reduce((accumulator, point) => ({
    minX: Math.min(accumulator.minX, point.x),
    maxX: Math.max(accumulator.maxX, point.x),
    minY: Math.min(accumulator.minY, point.y),
    maxY: Math.max(accumulator.maxY, point.y),
  }), initial);

  return {
    width: Math.max(bounds.maxX - bounds.minX, 0),
    height: Math.max(bounds.maxY - bounds.minY, 0),
  };
}

/**
 * 按笔画中线长度计算播放时长。
 *
 * <p>长度公式沿用 Hanzi Writer 的节奏，并设置上下限，避免点画过快或长折画
 * 占用过久。</p>
 *
 * @param {number} strokeLength Hanzi Writer 原始坐标中的中线长度。
 * @param {number} speedValue 演示速度的百分比倍率。
 * @returns {number} 当前笔画的动画时长，单位毫秒。
 */
function calculateStrokeDemoDuration(strokeLength, speedValue) {
  const safeSpeed = Math.max(clampStrokeDemoSpeed(speedValue) / 100, 0.5);
  const writerDuration = (Math.max(Number(strokeLength) || 0, 0) + 600) / 3;
  return Math.max(STROKE_DEMO_MIN_DURATION_MS / safeSpeed, Math.min(STROKE_DEMO_MAX_DURATION_MS / safeSpeed, writerDuration / safeSpeed));
}

/**
 * 为笔画动画添加平滑的缓入缓出曲线。
 *
 * @param {number} progress 线性时间进度。
 * @returns {number} 经过余弦缓动后的 0-1 进度。
 */
function easeStrokeProgress(progress) {
  const safeProgress = clampProgress(progress);
  return -Math.cos(safeProgress * Math.PI) / 2 + 0.5;
}

/**
 * 计算笔顺演示的停顿时长。
 *
 * @param {number} speedValue 当前速度倍率的百分比值。
 * @returns {number} 适配当前速度的停顿毫秒数。
 */
function calculateStrokeDemoPause(speedValue) {
  const safeSpeed = Math.max(clampStrokeDemoSpeed(speedValue) / 100, 0.5);
  return Math.max(80, Math.round(STROKE_DEMO_PAUSE_MS / safeSpeed));
}

/**
 * 规范化笔顺演示速度。
 *
 * @param {*} speedValue 滑块或存储读取出的速度值。
 * @returns {number} 介于最小与最大值之间的百分比倍率。
 */
function clampStrokeDemoSpeed(speedValue) {
  const rawSpeed = Math.round(Number(speedValue) || STROKE_DEMO_SPEED_DEFAULT);
  const clampedSpeed = Math.max(STROKE_DEMO_SPEED_MIN, Math.min(STROKE_DEMO_SPEED_MAX, rawSpeed));
  const normalizedStep = Math.round(clampedSpeed / STROKE_DEMO_SPEED_STEP) * STROKE_DEMO_SPEED_STEP;
  return Math.max(STROKE_DEMO_SPEED_MIN, Math.min(STROKE_DEMO_SPEED_MAX, normalizedStep));
}

/**
 * 格式化笔顺演示速度标签。
 *
 * @param {number} speedValue 速度百分比值。
 * @returns {string} 用于界面展示的倍率文本。
 */
function formatStrokeDemoSpeedLabel(speedValue) {
  const safeSpeed = clampStrokeDemoSpeed(speedValue);
  return `${(safeSpeed / 100).toFixed(2).replace(/0$/, "")}x`;
}

/**
 * 等待指定时长。
 *
 * @param {number} durationMs 等待毫秒数。
 * @returns {Promise<void>} 等待结束后解析。
 */
function waitMs(durationMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, durationMs);
  });
}
