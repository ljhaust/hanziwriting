import { onMounted, ref } from 'vue';
import {
  authenticateAdmin,
  createHanzi as apiCreateHanzi,
  createTask as apiCreateTask,
  createUser as apiCreateUser,
  deletePracticeRecord,
  deleteTask,
  fetchBootstrapData,
  updateHanziRecommended,
  updateUserStatus,
} from '../api/client';

/** 启用状态值由后端实体约定，集中定义避免在组件中散落字符串。 */
const USER_STATUS_ENABLED = 'enabled';

/** 启用状态对应的禁用值。 */
const USER_STATUS_DISABLED = 'disabled';

/**
 * 创建管理端共享状态。
 *
 * 页面启动时所有集合保持为空，只有后端聚合接口成功后才填充数据，确保界面
 * 不会在断网或服务异常时退回 mock 数据。写操作也以后台成功响应作为唯一依据。
 *
 * @returns {object} 管理端响应式数据、加载状态和数据库写操作。
 */
export function usePlatformState() {
  const users = ref([]);
  const hanziDb = ref([]);
  const poemsDb = ref([]);
  const tasks = ref([]);
  const records = ref([]);
  const isLoading = ref(false);
  const loadError = ref('');

  /**
   * 从后端重新加载管理端全部业务数据。
   *
   * @returns {Promise<void>} 数据校验并写入响应式集合后解析；失败时保留空集合并抛错。
   */
  async function reload() {
    isLoading.value = true;
    loadError.value = '';

    try {
      const data = await fetchBootstrapData();
      validateBootstrapData(data);
      users.value = data.users;
      hanziDb.value = data.hanzi;
      poemsDb.value = data.poems;
      tasks.value = data.tasks;
      records.value = data.records;
    } catch (error) {
      clearCollections();
      loadError.value = toErrorMessage(error, '加载后台数据失败');
      throw error;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 清空管理端集合。
   *
   * 后端加载失败时不保留上一次或本地演示数据，避免管理员误把过期内容当成数据库现状。
   *
   * @returns {void} 此方法仅更新本地响应式状态。
   */
  function clearCollections() {
    users.value = [];
    hanziDb.value = [];
    poemsDb.value = [];
    tasks.value = [];
    records.value = [];
  }

  /**
   * 调用后台鉴权接口登录。
   *
   * @param {{username: string, password: string}} credentials 管理员输入的账号密码。
   * @returns {Promise<object>} 后端确认身份后的用户信息。
   */
  async function login(credentials) {
    return authenticateAdmin(credentials);
  }

  /**
   * 新增用户并使用后台响应更新列表。
   *
   * @param {object} user 用户表单数据。
   * @returns {Promise<object>} 数据库保存后的完整用户。
   */
  async function createUser(user) {
    const savedUser = await apiCreateUser(user);
    assertEntity(savedUser, '新增用户接口未返回有效数据');
    users.value = [savedUser, ...users.value];
    return savedUser;
  }

  /**
   * 新增汉字并使用后台响应更新字库。
   *
   * @param {object} hanzi 汉字表单数据。
   * @returns {Promise<object>} 数据库保存后的完整汉字。
   */
  async function createHanzi(hanzi) {
    const savedHanzi = await apiCreateHanzi(hanzi);
    assertEntity(savedHanzi, '新增汉字接口未返回有效数据');
    hanziDb.value = [savedHanzi, ...hanziDb.value];
    return savedHanzi;
  }

  /**
   * 发布新作业任务。
   *
   * 任务 ID 由后端产生；任务时间、状态和资源顺序均来自管理员提交的表单。
   *
   * @param {object} taskForm 任务表单数据。
   * @param {string[]} selectedItemIds 被选择的汉字或古诗 ID。
   * @returns {Promise<object>} 数据库保存后的完整任务。
   */
  async function publishTask(taskForm, selectedItemIds) {
    const poemIds = new Set(poemsDb.value.map((poem) => poem.id));
    const items = selectedItemIds.map((id, index) => ({
      item_id: id,
      item_type: poemIds.has(id) ? 'poem' : 'hanzi',
      sort_no: index + 1,
    }));
    const savedTask = await apiCreateTask({ ...taskForm, items });
    assertEntity(savedTask, '发布任务接口未返回有效数据');
    tasks.value = [savedTask, ...tasks.value];
    return savedTask;
  }

  /**
   * 删除任务。
   *
   * @param {string} taskId 任务 ID。
   * @returns {Promise<void>} 后台确认删除后解析。
   */
  async function removeTask(taskId) {
    await deleteTask(taskId);
    tasks.value = tasks.value.filter((task) => task.id !== taskId);
  }

  /**
   * 删除练习记录。
   *
   * @param {string} recordId 记录 ID。
   * @returns {Promise<void>} 后台确认删除后解析。
   */
  async function removeRecord(recordId) {
    await deletePracticeRecord(recordId);
    records.value = records.value.filter((record) => record.id !== recordId);
  }

  /**
   * 切换用户启用状态。
   *
   * @param {string} userId 用户 ID。
   * @returns {Promise<object>} 数据库更新后的用户；用户不存在时抛出显式错误。
   */
  async function toggleUserStatus(userId) {
    const user = users.value.find((item) => item.id === userId);
    if (!user) {
      throw new Error('无法修改状态：用户不存在或列表已过期');
    }

    const nextStatus = user.status === USER_STATUS_ENABLED ? USER_STATUS_DISABLED : USER_STATUS_ENABLED;
    const savedUser = await updateUserStatus(userId, nextStatus);
    assertEntity(savedUser, '用户状态接口未返回有效数据');
    replaceById(users.value, savedUser);
    return savedUser;
  }

  /**
   * 切换汉字推荐状态。
   *
   * @param {string} hanziId 汉字资源 ID。
   * @returns {Promise<object>} 数据库更新后的汉字；资源不存在时抛出显式错误。
   */
  async function toggleHanziRecommended(hanziId) {
    const hanzi = hanziDb.value.find((item) => item.id === hanziId);
    if (!hanzi) {
      throw new Error('无法修改推荐状态：汉字不存在或列表已过期');
    }

    const savedHanzi = await updateHanziRecommended(hanziId, !Boolean(hanzi.is_recommended));
    assertEntity(savedHanzi, '汉字推荐状态接口未返回有效数据');
    replaceById(hanziDb.value, savedHanzi);
    return savedHanzi;
  }

  // 组件挂载后立即读取数据库；异常已写入 loadError，由页面提供重试入口。
  onMounted(() => {
    reload().catch(() => {});
  });

  return {
    users,
    hanziDb,
    poemsDb,
    tasks,
    records,
    isLoading,
    loadError,
    reload,
    login,
    createHanzi,
    createUser,
    publishTask,
    removeRecord,
    removeTask,
    taskTypeLabel,
    toggleHanziRecommended,
    toggleUserStatus,
    userTypeLabel,
  };
}

/**
 * 校验聚合接口的最低数据契约。
 *
 * @param {unknown} data `/api/bootstrap` 的响应体。
 * @returns {void} 五类集合均存在且为数组时正常返回。
 * @throws {Error} 响应体不是对象或任一集合缺失时抛出，避免静默使用不完整数据。
 */
function validateBootstrapData(data) {
  const collectionNames = ['users', 'hanzi', 'poems', 'tasks', 'records'];
  if (!data || typeof data !== 'object') {
    throw new Error('后台启动数据格式不正确');
  }

  const invalidName = collectionNames.find((name) => !Array.isArray(data[name]));
  if (invalidName) {
    throw new Error(`后台启动数据缺少有效集合：${invalidName}`);
  }
}

/**
 * 校验写接口返回的实体。
 *
 * @param {unknown} entity 后端写接口响应体。
 * @param {string} message 校验失败时的业务提示。
 * @returns {void} 实体具有非空 id 时正常返回。
 */
function assertEntity(entity, message) {
  if (!entity || typeof entity !== 'object' || !entity.id) {
    throw new Error(message);
  }
}

/**
 * 按 ID 原位替换集合项，保持服务端返回字段为最新真值。
 *
 * @param {Array<object>} rows 待更新的响应式集合。
 * @param {object} savedEntity 后端返回的新实体。
 * @returns {void} 找到时替换对应项；找不到时将实体加入集合头部。
 */
function replaceById(rows, savedEntity) {
  const index = rows.findIndex((row) => row.id === savedEntity.id);
  if (index === -1) {
    rows.unshift(savedEntity);
    return;
  }
  rows.splice(index, 1, savedEntity);
}

/**
 * 将未知异常转换为界面可展示文本。
 *
 * @param {unknown} error 捕获到的异常。
 * @param {string} fallback 无有效异常信息时的默认提示。
 * @returns {string} 稳定且非空的错误文本。
 */
function toErrorMessage(error, fallback) {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * 任务类型中文标签。
 *
 * @param {string} type 后端任务类型枚举。
 * @returns {string} 中文名称；未知值直接返回原值以便排查数据问题。
 */
function taskTypeLabel(type) {
  return { hanzi: '汉字', poem: '古诗', mixed: '混合' }[type] || type;
}

/**
 * 用户类型中文标签。
 *
 * @param {string} type 后端用户类型枚举。
 * @returns {string} 中文名称；未知值直接返回原值以便排查数据问题。
 */
function userTypeLabel(type) {
  return { admin: '管理员', teacher: '教师', parent: '家长', student: '学生' }[type] || type;
}
