/**
 * 管理端 API 适配层。
 *
 * 所有业务数据均通过 Spring Boot 接口读写；`VITE_API_BASE_URL` 仅用于
 * 本地开发时指定跨端口服务地址，未配置时使用当前站点的同源 `/api` 接口。
 */
const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');

/** 单次请求最长等待时间，避免后端异常时管理页面永久停留在加载状态。 */
const REQUEST_TIMEOUT_MS = 10000;

/**
 * 统一的后端请求错误。
 *
 * 调用方可以使用 `status` 判断 HTTP 错误类型，并使用 `message` 向管理员
 * 展示后端返回的可读错误说明，而不需要解析 fetch 的底层响应对象。
 */
export class ApiError extends Error {
  /**
   * 创建接口错误。
   *
   * @param {string} message 面向管理员的错误说明。
   * @param {number|null} status HTTP 状态码；网络错误或超时时为 null。
   */
  constructor(message, status = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * 发送 JSON 请求并统一处理超时、状态码和响应体。
 *
 * @param {string} path 后端资源路径，例如 `/api/bootstrap`。
 * @param {RequestInit} options fetch 原生选项。
 * @returns {Promise<unknown>} 后端 JSON 响应体；204 响应返回 null。
 * @throws {ApiError} 后端返回非 2xx、响应格式错误、网络中断或请求超时时抛出。
 */
async function request(path, options = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    const payload = await parseResponseBody(response);

    if (!response.ok) {
      const serverMessage = extractErrorMessage(payload);
      throw new ApiError(serverMessage || `接口请求失败：${response.status} ${response.statusText}`, response.status);
    }

    return payload;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('接口请求超时，请确认后台服务和网络连接正常');
    }
    throw new ApiError(error instanceof Error ? `无法连接后台服务：${error.message}` : '无法连接后台服务');
  } finally {
    window.clearTimeout(timeoutId);
  }
}

/**
 * 解析后端响应体。
 *
 * @param {Response} response fetch 返回的 HTTP 响应。
 * @returns {Promise<unknown>} JSON 数据、普通文本或无内容响应的 null。
 */
async function parseResponseBody(response) {
  if (response.status === 204) {
    return null;
  }

  const responseText = await response.text();
  if (!responseText) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return responseText;
  }

  try {
    return JSON.parse(responseText);
  } catch (error) {
    throw new ApiError('后台返回了无法解析的 JSON 数据', response.status);
  }
}

/**
 * 从常见后端错误结构中提取提示文本。
 *
 * @param {unknown} payload 后端错误响应体。
 * @returns {string} 可展示的错误文本；找不到时返回空字符串。
 */
function extractErrorMessage(payload) {
  if (typeof payload === 'string') {
    return payload;
  }
  if (!payload || typeof payload !== 'object') {
    return '';
  }
  return String(payload.message || payload.error || '');
}

/**
 * 读取管理端首页所需的数据库数据。
 *
 * @returns {Promise<object>} 包含 users、hanzi、poems、tasks、records 的聚合对象。
 */
export function fetchBootstrapData() {
  return request('/api/bootstrap');
}

/**
 * 使用后台账号和密码登录管理端。
 *
 * @param {{username: string, password: string}} credentials 管理员输入的登录凭据。
 * @returns {Promise<object>} 后端校验通过的管理员或教师用户信息。
 */
export function authenticateAdmin(credentials) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

/**
 * 创建平台用户。
 *
 * @param {object} user 管理员填写的用户字段，不包含由后端生成的 ID 和日期。
 * @returns {Promise<object>} 数据库保存后的完整用户。
 */
export function createUser(user) {
  return request('/api/users', {
    method: 'POST',
    body: JSON.stringify(user),
  });
}

/**
 * 修改用户启停状态。
 *
 * @param {string} userId 用户唯一标识。
 * @param {string} status 目标状态，值为 enabled 或 disabled。
 * @returns {Promise<object>} 数据库更新后的用户。
 */
export function updateUserStatus(userId, status) {
  return request(`/api/users/${encodeURIComponent(userId)}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
}

/**
 * 创建汉字资源。
 *
 * @param {object} hanzi 管理员填写的汉字业务字段。
 * @returns {Promise<object>} 数据库保存后的完整汉字资源。
 */
export function createHanzi(hanzi) {
  return request('/api/hanzi', {
    method: 'POST',
    body: JSON.stringify(hanzi),
  });
}

/**
 * 修改汉字推荐状态。
 *
 * @param {string} hanziId 汉字资源唯一标识。
 * @param {boolean} recommended 是否推荐。
 * @returns {Promise<object>} 数据库更新后的汉字资源。
 */
export function updateHanziRecommended(hanziId, recommended) {
  return request(`/api/hanzi/${encodeURIComponent(hanziId)}/recommended`, {
    method: 'PUT',
    body: JSON.stringify({ recommended }),
  });
}

/**
 * 创建作业任务。
 *
 * @param {object} task 管理端配置的作业任务，不包含由后端生成的主键和时间。
 * @returns {Promise<object>} 数据库保存后的任务。
 */
export function createTask(task) {
  return request('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(task),
  });
}

/**
 * 删除作业任务。
 *
 * @param {string} taskId 任务唯一标识。
 * @returns {Promise<null>} 删除成功时无响应体。
 */
export function deleteTask(taskId) {
  return request(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: 'DELETE',
  });
}

/**
 * 删除练习记录。
 *
 * @param {string} recordId 记录唯一标识。
 * @returns {Promise<null>} 删除成功时无响应体。
 */
export function deletePracticeRecord(recordId) {
  return request(`/api/records/${encodeURIComponent(recordId)}`, {
    method: 'DELETE',
  });
}
