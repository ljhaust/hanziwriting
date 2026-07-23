/**
 * 原生微信小程序 API 适配层。
 *
 * 业务意图：小程序端只通过 Spring Boot 后端读取和写入数据库业务数据。
 * 请求失败会原样交给页面处理，不提供本地业务数据或第三方 CDN 兜底。
 */

/** 小程序首屏聚合数据接口路径。 */
const BOOTSTRAP_PATH = "/api/bootstrap";

/** 练习记录接口路径。 */
const RECORDS_PATH = "/api/records";

/** 微信小程序登录接口路径。 */
const WX_LOGIN_PATH = "/api/auth/wx-login";

/** 本地开发请求超时时间，避免后端不可用时页面长时间停留在加载态。 */
const REQUEST_TIMEOUT_MS = 5000;

/** 笔顺数据请求缓存，避免重复点击演示时反复拉取同一汉字资源。 */
const strokeGuideCache = new Map();

/**
 * 读取小程序首屏聚合数据。
 *
 * @returns {Promise<object>} 归一化后的 users、hanzi、poems、tasks、records 数据。
 */
function fetchBootstrapData() {
  return requestJson(BOOTSTRAP_PATH).then((payload) => normalizeBootstrapData(payload));
}

/**
 * 创建练习记录。
 *
 * @param {object} record 练字或背诗产生的记录对象。
 * @returns {Promise<object>} 后端返回的 JSON 对象。
 */
function createPracticeRecord(record) {
  return requestJson(RECORDS_PATH, {
    method: "POST",
    data: record,
  }).then((payload) => normalizeRecord(payload));
}

/**
 * 使用 wx.login 的 code 完成微信登录。
 *
 * @param {string} code wx.login 返回的临时登录凭证。
 * @param {{nickname?:string,avatarUrl?:string}} profile wx.getUserProfile 返回的可选资料。
 * @returns {Promise<object>} 后端按 openid 识别或新建的当前学生用户。
 */
function wxLogin(code, profile = {}) {
  return requestJson(WX_LOGIN_PATH, {
    method: "POST",
    data: {
      code,
      nickname: profile.nickname || "",
      avatarUrl: profile.avatarUrl || "",
    },
  }).then((payload) => normalizeUser(payload));
}

/**
 * 读取汉字笔顺演示数据。
 *
 * <p>笔顺数据由后端从受控数据源读取并返回；小程序不直接请求第三方 CDN，
 * 从而让业务数据入口、错误处理和生产合法域名保持一致。</p>
 *
 * @param {string} characterText 需要加载笔顺数据的单个汉字。
 * @returns {Promise<object>} 经过基础归一化的笔顺数据对象。
 */
function fetchStrokeGuide(characterText) {
  const cacheKey = String(characterText || "").trim();
  if (!cacheKey) {
    return Promise.reject(new Error("笔顺演示缺少汉字文本"));
  }

  if (strokeGuideCache.has(cacheKey)) {
    return strokeGuideCache.get(cacheKey);
  }

  const guidePath = `/api/hanzi/${encodeURIComponent(cacheKey)}/strokes`;
  const guidePromise = requestJson(guidePath)
    .then((payload) => normalizeStrokeGuide(cacheKey, payload))
    .catch((error) => {
      // 失败的 Promise 不应长期驻留，否则用户点击重试仍会直接得到旧错误。
      strokeGuideCache.delete(cacheKey);
      throw error;
    });
  strokeGuideCache.set(cacheKey, guidePromise);
  return guidePromise;
}

/**
 * 发送 JSON 请求。
 *
 * @param {string} path 后端资源路径，必须以斜杠开头。
 * @param {object} options wx.request 选项覆盖值。
 * @returns {Promise<object>} 后端返回的 JSON 对象。
 */
function requestJson(path, options = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: resolveRequestUrl(path),
      method: options.method || "GET",
      data: options.data,
      timeout: REQUEST_TIMEOUT_MS,
      header: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data === undefined ? {} : response.data);
          return;
        }

        reject(new Error(`接口请求失败：${response.statusCode}`));
      },
      fail(error) {
        reject(new Error(error.errMsg || "接口请求失败"));
      },
    });
  });
}

/**
 * 解析请求地址。
 *
 * @param {string} path 后端相对路径。
 * @returns {string} 可直接交给 wx.request 的最终地址。
 */
function resolveRequestUrl(path) {
  const application = getApp();
  const apiBaseUrl = String(application.globalData && application.globalData.apiBaseUrl || "")
    .trim()
    .replace(/\/$/, "");
  if (!apiBaseUrl) {
    throw new Error("未配置后端地址，请通过 ext.json 设置 apiBaseUrl");
  }
  return `${apiBaseUrl}${path}`;
}

/**
 * 归一化后端聚合数据字段。
 *
 * @param {object} payload 后端 `/api/bootstrap` 原始响应。
 * @returns {object} 页面可直接消费的数据集合。
 */
function normalizeBootstrapData(payload) {
  return {
    users: toArray(payload.users).map(normalizeUser),
    hanzi: toArray(payload.hanzi).map(normalizeHanzi),
    poems: toArray(payload.poems).map(normalizePoem),
    tasks: toArray(payload.tasks).map(normalizeTask),
    records: toArray(payload.records).map(normalizeRecord),
  };
}

/**
 * 归一化用户字段。
 *
 * @param {object} user 后端用户对象。
 * @returns {object} 小程序页面使用的用户对象。
 */
function normalizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    nickname: user.nickname || user.username || "",
    user_type: user.user_type || user.userType || "",
    status: user.status || "",
  };
}

/**
 * 归一化汉字字段。
 *
 * @param {object} hanzi 后端汉字对象。
 * @returns {object} 统一为页面既有 snake_case 字段的汉字对象。
 */
function normalizeHanzi(hanzi) {
  const strokeCount = Number(hanzi.stroke_count || hanzi.strokeCount || 0);
  return {
    ...hanzi,
    character_text: hanzi.character_text || hanzi.characterText || "",
    stroke_count: Math.max(strokeCount, 0),
    strokesDesc: toArray(hanzi.strokesDesc || hanzi.strokes_desc),
  };
}

/**
 * 归一化古诗字段。
 *
 * @param {object} poem 后端古诗对象。
 * @returns {object} 包含可渲染诗句列表的古诗对象。
 */
function normalizePoem(poem) {
  return {
    ...poem,
    title: poem.title || "",
    author: poem.author || "",
    dynasty: poem.dynasty || "",
    translation: poem.translation || "",
    sentences: toArray(poem.sentences).map(normalizeSentence),
  };
}

/**
 * 归一化古诗句子字段。
 *
 * @param {object} sentence 后端句子对象。
 * @returns {object} 页面填空组件可消费的句子对象。
 */
function normalizeSentence(sentence) {
  return {
    id: sentence.id,
    sentence_text: sentence.sentence_text || sentence.sentenceText || "",
    key_characters: toArray(sentence.key_characters || sentence.keyCharacters),
  };
}

/**
 * 归一化任务字段。
 *
 * @param {object} task 后端任务对象。
 * @returns {object} 首页任务卡片可消费的任务对象。
 */
function normalizeTask(task) {
  return {
    ...task,
    task_name: task.task_name || task.taskName || "",
    task_type: task.task_type || task.taskType || "",
    status: task.status || "",
    items: toArray(task.items).map(normalizeTaskItem),
  };
}

/**
 * 归一化任务条目字段。
 *
 * @param {object} item 后端任务条目对象。
 * @returns {object} 统一 item_type 和 item_id 后的任务条目。
 */
function normalizeTaskItem(item) {
  return {
    ...item,
    item_type: item.item_type || item.itemType || "",
    item_id: item.item_id || item.itemId || "",
  };
}

/**
 * 归一化练习记录字段。
 *
 * @param {object} record 后端记录对象。
 * @returns {object} 记录页可展示的练习记录。
 */
function normalizeRecord(record) {
  const strokeTotal = Number(record.stroke_total || record.strokeTotal || 0);
  const strokeCompleted = Number(record.stroke_completed || record.strokeCompleted || 0);
  const mistakeCount = Number(record.mistake_count || record.mistakeCount || 0);
  const hintCount = Number(record.hint_count || record.hintCount || 0);
  const durationSeconds = Number(record.duration_seconds || record.durationSeconds || 0);
  return {
    ...record,
    user_id: record.user_id || record.userId || "",
    task_name: record.task_name || record.taskName || "",
    item_type: record.item_type || record.itemType || "",
    item_id: record.item_id || record.itemId || "",
    item_name: record.item_name || record.itemName || "",
    complete_status: record.complete_status || record.completeStatus || "",
    stroke_total: Math.max(strokeTotal, 0),
    stroke_completed: Math.max(strokeCompleted, 0),
    mistake_count: Math.max(mistakeCount, 0),
    hint_count: Math.max(hintCount, 0),
    duration_seconds: Math.max(durationSeconds, 0),
    practice_time: record.practice_time || record.practiceTime || "",
    score_level: record.score_level || record.scoreLevel || "",
    writing_steps: toArray(record.writing_steps || record.writingSteps),
  };
}

/**
 * 归一化汉字笔顺数据。
 *
 * @param {string} characterText 汉字文本。
 * @param {object} payload 笔顺数据原始响应。
 * @returns {object} 页面可直接使用的笔顺数据。
 * @throws {Error} 笔画或中线为空、数量不一致时抛出，防止把坏数据标记为可用。
 */
function normalizeStrokeGuide(characterText, payload) {
  const strokes = toArray(payload.strokes);
  const medians = toArray(payload.medians);
  if (!strokes.length || strokes.length !== medians.length) {
    throw new Error("后台笔顺数据为空或笔画与中线数量不一致");
  }
  return {
    character_text: characterText,
    strokes,
    medians,
    radStrokes: toArray(payload.rad_strokes || payload.radStrokes),
  };
}

/**
 * 将未知输入安全转换为数组。
 *
 * @param {*} value 待转换的接口字段。
 * @returns {Array} 如果输入是数组则原样返回，否则返回空数组。
 */
function toArray(value) {
  return Array.isArray(value) ? value : [];
}

module.exports = {
  createPracticeRecord,
  fetchBootstrapData,
  fetchStrokeGuide,
  normalizeBootstrapData,
  wxLogin,
};
