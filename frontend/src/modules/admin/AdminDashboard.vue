<template>
  <section
    class="admin-client"
    v-loading="isLoading"
    element-loading-text="正在从后台读取数据…"
  >
    <section v-if="!adminUser" class="admin-login">
      <div class="login-card">
        <div class="brand-mark">管</div>
        <h2>管理后台登录</h2>
        <p>请输入后台已配置的管理员或教师账号，登录信息由服务端校验。</p>
        <el-form @submit.prevent="loginAdmin">
          <el-form-item>
            <el-input v-model="adminUsername" autocomplete="username" placeholder="请输入账号" :prefix-icon="User" />
          </el-form-item>
          <el-form-item>
            <el-input
              v-model="adminPassword"
              autocomplete="current-password"
              placeholder="请输入密码"
              :prefix-icon="Lock"
              type="password"
              show-password
              @keyup.enter="loginAdmin"
            />
          </el-form-item>
          <el-alert v-if="loginError" :title="loginError" type="error" show-icon :closable="false" />
          <el-button class="login-submit" type="primary" size="large" native-type="submit" :loading="loginLoading">
            登录
          </el-button>
        </el-form>
      </div>
    </section>

    <template v-else>
      <aside class="admin-sidebar">
        <div class="admin-profile">
          <strong>{{ displayUserName(adminUser) }}</strong>
          <span>{{ userTypeLabel(adminUser.user_type) }}</span>
        </div>
        <button
          v-for="item in adminMenu"
          :key="item.value"
          :class="{ active: adminSection === item.value }"
          @click="adminSection = item.value"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </button>
        <el-button text @click="logoutAdmin">退出登录</el-button>
      </aside>

      <section class="admin-main">
        <header class="admin-toolbar">
          <div>
            <span>后台管理</span>
            <h2>{{ adminSectionTitle }}</h2>
          </div>
          <div class="toolbar-actions">
            <el-input v-model="adminSearch" class="search-input" placeholder="搜索当前列表" :prefix-icon="Search" clearable />
            <el-button :icon="Refresh" :loading="isLoading" @click="handleReload">刷新</el-button>
            <el-button v-if="adminSection === 'users'" type="primary" :icon="Plus" @click="showUserDialog = true">新增用户</el-button>
            <el-button v-if="adminSection === 'hanzi'" :icon="MagicStick" @click="showGenerateHanziDialog = true">按年级批量补充</el-button>
            <el-button v-if="adminSection === 'hanzi'" type="primary" :icon="Plus" @click="showHanziDialog = true">新增汉字</el-button>
            <el-button v-if="adminSection === 'poems'" type="primary" :icon="Plus" @click="showPoemDialog = true">新增古诗</el-button>
            <el-button v-if="adminSection === 'tasks'" type="primary" :icon="Plus" @click="showTaskDialog = true">发布任务</el-button>
          </div>
        </header>

        <el-alert
          v-if="loadError"
          class="load-error"
          :title="loadError"
          description="当前页面没有使用本地兜底数据，请检查后台服务后重试。"
          type="error"
          show-icon
          :closable="false"
        >
          <template #default>
            <el-button type="danger" link @click="handleReload">重新加载</el-button>
          </template>
        </el-alert>

        <template v-else>
          <el-table v-if="adminSection === 'users'" :data="filteredUsers" :empty-text="emptyText" class="data-table">
            <el-table-column label="ID" width="180">
              <template #default="{ row }">
                <div class="user-id-cell">
                  <el-tooltip :content="row.id" placement="top">
                    <span class="user-id-text">{{ abbreviateId(row.id) }}</span>
                  </el-tooltip>
                  <el-button text :icon="CopyDocument" aria-label="复制完整用户 ID" @click="copyUserId(row.id)" />
                </div>
              </template>
            </el-table-column>
            <el-table-column label="昵称">
              <template #default="{ row }">{{ displayUserName(row) }}</template>
            </el-table-column>
            <el-table-column prop="phone" label="手机号" />
            <el-table-column prop="user_type" label="角色">
              <template #default="{ row }">{{ userTypeLabel(row.user_type) }}</template>
            </el-table-column>
            <el-table-column label="账号状态" width="190">
              <template #default="{ row }">
                <el-tooltip content="启用：允许登录和使用；停用：禁止登录和使用" placement="top">
                  <div class="user-status-control">
                    <el-switch
                      :model-value="row.status === USER_STATUS_ENABLED"
                      :loading="pendingUserIds.has(row.id)"
                      @change="handleToggleUserStatus(row.id)"
                    />
                    <span :class="row.status === USER_STATUS_ENABLED ? 'status-enabled' : 'status-disabled'">
                      {{ row.status === USER_STATUS_ENABLED ? '已启用（允许登录）' : '已停用（禁止登录）' }}
                    </span>
                  </div>
                </el-tooltip>
              </template>
            </el-table-column>
          </el-table>

          <el-table v-if="adminSection === 'hanzi'" :data="filteredHanzi" :empty-text="emptyText" class="data-table">
            <el-table-column prop="character_text" label="汉字" width="90" />
            <el-table-column prop="pinyin" label="拼音" width="120" />
            <el-table-column prop="radical" label="部首" width="90" />
            <el-table-column prop="stroke_count" label="笔画" width="90" />
            <el-table-column prop="grade_level" label="年级" width="120" />
            <el-table-column label="推荐" width="100">
              <template #default="{ row }">
                <el-switch
                  :model-value="Boolean(row.is_recommended)"
                  :loading="pendingHanziIds.has(row.id)"
                  @change="handleToggleHanziRecommended(row.id)"
                />
              </template>
            </el-table-column>
          </el-table>

          <el-table v-if="adminSection === 'poems'" :data="filteredPoems" :empty-text="emptyText" class="data-table">
            <el-table-column prop="title" label="诗名" width="150" />
            <el-table-column prop="author" label="作者" width="110" />
            <el-table-column prop="dynasty" label="朝代" width="90" />
            <el-table-column prop="grade_level" label="年级" width="120" />
            <el-table-column prop="content" label="正文" />
          </el-table>

          <el-table v-if="adminSection === 'tasks'" :data="filteredTasks" :empty-text="emptyText" class="data-table">
            <el-table-column prop="task_name" label="任务名称" />
            <el-table-column prop="task_type" label="类型" width="120">
              <template #default="{ row }">{{ taskTypeLabel(row.task_type) }}</template>
            </el-table-column>
            <el-table-column prop="target_id" label="对象" width="160" />
            <el-table-column prop="status" label="状态" width="110" />
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button type="danger" text :icon="Delete" :loading="pendingTaskIds.has(row.id)" @click="handleRemoveTask(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <el-table v-if="adminSection === 'records'" :data="filteredRecords" :empty-text="emptyText" class="data-table">
            <el-table-column prop="practice_time" label="时间" width="160" />
            <el-table-column prop="user_name" label="学生" width="120" />
            <el-table-column prop="item_name" label="内容" width="120" />
            <el-table-column prop="task_name" label="任务" />
            <el-table-column prop="score_level" label="评级" width="90" />
            <el-table-column label="操作" width="120">
              <template #default="{ row }">
                <el-button type="danger" text :icon="Delete" :loading="pendingRecordIds.has(row.id)" @click="handleRemoveRecord(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </template>
      </section>
    </template>

    <el-dialog v-model="showUserDialog" title="新增用户" width="420px" destroy-on-close>
      <el-form label-width="76px">
        <el-form-item label="昵称" required><el-input v-model="newUser.nickname" /></el-form-item>
        <el-form-item label="账号" required><el-input v-model="newUser.username" autocomplete="off" /></el-form-item>
        <el-form-item label="手机号"><el-input v-model="newUser.phone" /></el-form-item>
        <el-form-item label="角色" required>
          <el-select v-model="newUser.user_type" placeholder="请选择用户角色">
            <el-option v-for="role in USER_ROLE_OPTIONS" :key="role.value" :label="role.label" :value="role.value" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showUserDialog = false">取消</el-button>
        <el-button type="primary" :loading="formSubmitting === 'user'" @click="handleCreateUser">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showHanziDialog" title="新增汉字" width="420px" destroy-on-close>
      <el-form label-width="76px">
        <el-form-item label="汉字" required><el-input v-model="newHanzi.character_text" maxlength="1" /></el-form-item>
        <el-form-item label="年级" required>
          <el-select v-model="newHanzi.grade_level" placeholder="请选择适用年级">
            <el-option v-for="grade in GRADE_OPTIONS" :key="grade" :label="grade" :value="grade" />
          </el-select>
        </el-form-item>
        <el-alert title="拼音、部首、笔画等信息将由后台字库自动补全。" type="info" show-icon :closable="false" />
      </el-form>
      <template #footer>
        <el-button @click="showHanziDialog = false">取消</el-button>
        <el-button type="primary" :loading="formSubmitting === 'hanzi'" @click="handleCreateHanzi">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showGenerateHanziDialog" title="按年级批量补充汉字" width="440px" destroy-on-close>
      <el-form label-width="88px">
        <el-form-item label="年级" required>
          <el-select v-model="hanziGeneration.grade_level" placeholder="请选择年级">
            <el-option v-for="grade in GRADE_OPTIONS" :key="grade" :label="grade" :value="grade" />
          </el-select>
        </el-form-item>
        <el-form-item label="补充数量" required>
          <el-input-number v-model="hanziGeneration.count" :min="MIN_GENERATION_COUNT" :max="MAX_GENERATION_COUNT" />
        </el-form-item>
        <el-alert title="系统会从该年级字库中随机选取尚未导入的汉字，已有汉字不会重复创建。" type="info" show-icon :closable="false" />
      </el-form>
      <template #footer>
        <el-button @click="showGenerateHanziDialog = false">取消</el-button>
        <el-button type="primary" :loading="formSubmitting === 'hanzi-generation'" @click="handleGenerateHanzi">开始补充</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showPoemDialog" title="新增古诗" width="600px" destroy-on-close>
      <el-form label-width="76px">
        <el-form-item label="诗名" required><el-input v-model="newPoem.title" /></el-form-item>
        <el-form-item label="作者" required><el-input v-model="newPoem.author" /></el-form-item>
        <el-form-item label="朝代" required><el-input v-model="newPoem.dynasty" /></el-form-item>
        <el-form-item label="年级" required>
          <el-select v-model="newPoem.grade_level" placeholder="请选择适用年级">
            <el-option v-for="grade in GRADE_OPTIONS" :key="grade" :label="grade" :value="grade" />
          </el-select>
        </el-form-item>
        <el-form-item label="正文" required><el-input v-model="newPoem.content" type="textarea" :rows="4" /></el-form-item>
        <el-form-item label="注释"><el-input v-model="newPoem.annotation" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="译文"><el-input v-model="newPoem.translation" type="textarea" :rows="2" /></el-form-item>
        <el-form-item label="教材版本"><el-input v-model="newPoem.textbook_version" placeholder="如：人教版" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPoemDialog = false">取消</el-button>
        <el-button type="primary" :loading="formSubmitting === 'poem'" @click="handleCreatePoem">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showTaskDialog" title="发布练习任务" width="560px" destroy-on-close>
      <el-form label-width="90px">
        <el-form-item label="任务名称" required><el-input v-model="newTask.task_name" /></el-form-item>
        <el-form-item label="任务类型" required>
          <el-radio-group v-model="newTask.task_type">
            <el-radio-button v-for="type in TASK_TYPE_OPTIONS" :key="type.value" :value="type.value">{{ type.label }}</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="目标类型" required>
          <el-select v-model="newTask.target_type" placeholder="请选择目标类型">
            <el-option v-for="target in TASK_TARGET_OPTIONS" :key="target.value" :label="target.label" :value="target.value" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="newTask.target_type && newTask.target_type !== 'all'" label="目标对象" required><el-input v-model="newTask.target_id" /></el-form-item>
        <el-form-item label="开始时间" required>
          <el-date-picker
            v-model="newTask.start_time"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="选择任务开始时间"
          />
        </el-form-item>
        <el-form-item label="结束时间" required>
          <el-date-picker
            v-model="newTask.end_time"
            type="datetime"
            value-format="YYYY-MM-DD HH:mm:ss"
            placeholder="选择任务结束时间"
          />
        </el-form-item>
        <el-form-item label="任务状态" required>
          <el-select v-model="newTask.status" placeholder="请选择任务状态">
            <el-option v-for="status in TASK_STATUS_OPTIONS" :key="status.value" :label="status.label" :value="status.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="任务内容" required>
          <el-checkbox-group v-model="selectedTaskItemIds" class="task-item-picker">
            <el-checkbox v-for="hanzi in hanziDb" :key="hanzi.id" :value="hanzi.id">{{ hanzi.character_text }}</el-checkbox>
            <el-checkbox v-for="poem in poemsDb" :key="poem.id" :value="poem.id">{{ poem.title }}</el-checkbox>
          </el-checkbox-group>
          <el-empty v-if="!hanziDb.length && !poemsDb.length" description="后台暂无可选汉字或古诗" :image-size="64" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showTaskDialog = false">取消</el-button>
        <el-button type="primary" :loading="formSubmitting === 'task'" @click="handlePublishTask">发布</el-button>
      </template>
    </el-dialog>
  </section>
</template>

<script setup>
/**
 * 管理端主页面组件。
 *
 * 组件只负责收集管理员输入并展示服务端状态，任何业务数据的读取和修改均通过
 * platform 提供的异步 API 操作完成，不保存演示账号、验证码或本地业务兜底数据。
 */
import { computed, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { Collection, CopyDocument, Delete, Grid, Lock, MagicStick, Memo, Notebook, Plus, Refresh, Search, User } from '@element-plus/icons-vue';

/** 后端用户启用状态，用于把数据库枚举转换为开关值。 */
const USER_STATUS_ENABLED = 'enabled';

/** 持久化的管理端会话键，带版本后缀便于未来升级结构。 */
const ADMIN_SESSION_STORAGE_KEY = 'hanzi-admin-session-v1';

/** 当前会话数据版本，防止旧结构在页面升级后被误恢复。 */
const ADMIN_SESSION_VERSION = 1;

/** 可访问管理端的角色白名单。 */
const ADMIN_ROLE_VALUES = ['admin', 'teacher'];

/** 小学年级选项，统一单字、批量补充和古诗表单的数据格式。 */
const GRADE_OPTIONS = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];

/** 单次批量补充的最小数量。 */
const MIN_GENERATION_COUNT = 1;

/** 单次批量补充上限，避免误操作产生过大请求。 */
const MAX_GENERATION_COUNT = 100;

/** 批量补充表单默认数量，用语义常量避免页面散落魔法值。 */
const DEFAULT_GENERATION_COUNT = 10;

/** 可创建的用户角色，值与后端 UserAccount 枚举约定一致。 */
const USER_ROLE_OPTIONS = [
  { label: '学生', value: 'student' },
  { label: '家长', value: 'parent' },
  { label: '教师', value: 'teacher' },
  { label: '管理员', value: 'admin' },
];

/** 任务类型选项，值与后端 PracticeTask 枚举约定一致。 */
const TASK_TYPE_OPTIONS = [
  { label: '汉字', value: 'hanzi' },
  { label: '古诗', value: 'poem' },
  { label: '混合', value: 'mixed' },
];

/** 任务投放范围，只有非全体任务需要管理员输入具体目标 ID。 */
const TASK_TARGET_OPTIONS = [
  { label: '全部学生', value: 'all' },
  { label: '指定班级', value: 'class' },
  { label: '指定用户', value: 'user' },
];

/** 任务生命周期状态，值与后端 PracticeTask 状态枚举约定一致。 */
const TASK_STATUS_OPTIONS = [
  { label: '未开始', value: 'not_started' },
  { label: '进行中', value: 'active' },
  { label: '已结束', value: 'ended' },
];

const props = defineProps({
  /** 根组件创建的管理端状态和后台操作集合。 */
  platform: {
    type: Object,
    required: true,
  },
});

const {
  createHanzi,
  createPoem,
  createUser,
  generateHanzi,
  hanziDb,
  isLoading,
  loadError,
  initialLoadCompleted,
  login,
  poemsDb,
  publishTask,
  records,
  reload,
  removeRecord,
  removeTask,
  taskTypeLabel,
  tasks,
  toggleHanziRecommended,
  toggleUserStatus,
  userTypeLabel,
  users,
} = props.platform;

/** 管理端侧栏只描述界面结构，不包含数据库业务数据。 */
const adminMenu = [
  { label: '用户管理', value: 'users', icon: User },
  { label: '汉字字库', value: 'hanzi', icon: Collection },
  { label: '古诗资源', value: 'poems', icon: Notebook },
  { label: '作业任务', value: 'tasks', icon: Grid },
  { label: '练习记录', value: 'records', icon: Memo },
];

const adminUser = ref(null);
const adminUsername = ref('');
const adminPassword = ref('');
const loginError = ref('');
const loginLoading = ref(false);
const adminSection = ref('users');
const adminSearch = ref('');
const showUserDialog = ref(false);
const showHanziDialog = ref(false);
const showGenerateHanziDialog = ref(false);
const showPoemDialog = ref(false);
const showTaskDialog = ref(false);
const formSubmitting = ref('');
const selectedTaskItemIds = ref([]);
const pendingUserIds = ref(new Set());
const pendingHanziIds = ref(new Set());
const pendingTaskIds = ref(new Set());
const pendingRecordIds = ref(new Set());
const newUser = reactive(createEmptyUser());
const newHanzi = reactive(createEmptyHanzi());
const hanziGeneration = reactive(createEmptyHanziGeneration());
const newPoem = reactive(createEmptyPoem());
const newTask = reactive(createEmptyTask());

const adminSectionTitle = computed(() => adminMenu.find((item) => item.value === adminSection.value)?.label || '后台管理');
const filteredUsers = computed(() => filterRows(users.value, ['id', 'nickname', 'username', 'phone']));
const filteredHanzi = computed(() => filterRows(hanziDb.value, ['id', 'character_text', 'pinyin', 'grade_level']));
const filteredPoems = computed(() => filterRows(poemsDb.value, ['id', 'title', 'author', 'grade_level', 'content']));
const filteredTasks = computed(() => filterRows(tasks.value, ['id', 'task_name', 'target_id', 'status']));
const filteredRecords = computed(() => filterRows(records.value, ['id', 'user_name', 'item_name', 'task_name', 'score_level']));
const emptyText = computed(() => adminSearch.value.trim() ? '没有匹配当前搜索条件的数据' : '数据库暂无数据');

/**
 * 首次后端数据加载完成后才恢复会话，并与服务端用户列表核对权限和状态。
 *
 * 这个校验保证刷新或热更新不会无故返回登录页，同时已停用或已删除账号
 * 也不会仅凭浏览器缓存继续进入管理端。
 */
watch(initialLoadCompleted, (completed) => {
  if (completed && !adminUser.value) {
    restoreAdminSession();
  }
}, { immediate: true });

/**
 * 使用管理员输入的账号密码请求后台鉴权。
 *
 * @returns {Promise<void>} 登录完成或错误已写入 loginError 后解析。
 */
async function loginAdmin() {
  const username = adminUsername.value.trim();
  const password = adminPassword.value;
  loginError.value = '';

  if (!username || !password) {
    loginError.value = '请输入账号和密码';
    return;
  }

  loginLoading.value = true;
  try {
    const authenticatedUser = await login({ username, password });
    if (!authenticatedUser || !ADMIN_ROLE_VALUES.includes(authenticatedUser.user_type)) {
      throw new Error('当前账号没有管理端访问权限');
    }
    if (authenticatedUser.status !== USER_STATUS_ENABLED) {
      throw new Error('当前账号已被停用');
    }
    adminUser.value = authenticatedUser;
    persistAdminSession(authenticatedUser);
    adminPassword.value = '';
    if (loadError.value) {
      await reload();
    }
  } catch (error) {
    adminUser.value = null;
    clearPersistedAdminSession();
    loginError.value = errorMessage(error, '登录失败，请稍后重试');
  } finally {
    loginLoading.value = false;
  }
}

/**
 * 退出当前管理端会话。
 *
 * @returns {void} 清除内存中的登录用户、密码输入和浏览器持久化会话。
 */
function logoutAdmin() {
  adminUser.value = null;
  adminPassword.value = '';
  loginError.value = '';
  clearPersistedAdminSession();
}

/**
 * 手动刷新后台数据并展示结果。
 *
 * @returns {Promise<void>} 刷新成功或错误由页面 loadError 展示后解析。
 */
async function handleReload() {
  try {
    await reload();
    reconcileAdminSession();
    ElMessage.success('后台数据已刷新');
  } catch (error) {
    ElMessage.error(errorMessage(error, '刷新后台数据失败'));
  }
}

/**
 * 新增用户并在成功后重置表单。
 *
 * @returns {Promise<void>} 后台保存完成或错误消息展示后解析。
 */
async function handleCreateUser() {
  if (!newUser.nickname.trim() || !newUser.username.trim() || !newUser.user_type) {
    ElMessage.warning('请填写昵称、账号并选择用户角色');
    return;
  }

  formSubmitting.value = 'user';
  try {
    await createUser(normalizeTextFields(newUser));
    Object.assign(newUser, createEmptyUser());
    showUserDialog.value = false;
    ElMessage.success('用户已保存到数据库');
  } catch (error) {
    ElMessage.error(errorMessage(error, '新增用户失败'));
  } finally {
    formSubmitting.value = '';
  }
}

/**
 * 新增汉字并在成功后重置表单。
 *
 * @returns {Promise<void>} 后台保存完成或错误消息展示后解析。
 */
async function handleCreateHanzi() {
  if (!newHanzi.character_text.trim() || !newHanzi.grade_level) {
    ElMessage.warning('请输入汉字并选择年级');
    return;
  }

  formSubmitting.value = 'hanzi';
  try {
    await createHanzi(normalizeTextFields(newHanzi));
    Object.assign(newHanzi, createEmptyHanzi());
    showHanziDialog.value = false;
    ElMessage.success('汉字已保存到数据库');
  } catch (error) {
    ElMessage.error(errorMessage(error, '新增汉字失败'));
  } finally {
    formSubmitting.value = '';
  }
}

/**
 * 请求后端按年级随机补充汉字库。
 *
 * @returns {Promise<void>} 补充完成或错误消息展示后解析。
 */
async function handleGenerateHanzi() {
  if (!hanziGeneration.grade_level || hanziGeneration.count < MIN_GENERATION_COUNT) {
    ElMessage.warning('请选择年级并输入有效的补充数量');
    return;
  }

  formSubmitting.value = 'hanzi-generation';
  try {
    const generated = await generateHanzi({
      grade_level: hanziGeneration.grade_level,
      count: hanziGeneration.count,
    });
    Object.assign(hanziGeneration, createEmptyHanziGeneration());
    showGenerateHanziDialog.value = false;
    ElMessage.success(generated.length ? `已新增 ${generated.length} 个汉字` : '该年级字库已全部导入，无需重复补充');
  } catch (error) {
    ElMessage.error(errorMessage(error, '批量补充汉字失败'));
  } finally {
    formSubmitting.value = '';
  }
}

/**
 * 新增古诗并在成功后重置表单。
 *
 * @returns {Promise<void>} 后端保存完成或错误消息展示后解析。
 */
async function handleCreatePoem() {
  const requiredFieldMissing = !newPoem.title.trim()
    || !newPoem.author.trim()
    || !newPoem.dynasty.trim()
    || !newPoem.grade_level
    || !newPoem.content.trim();
  if (requiredFieldMissing) {
    ElMessage.warning('请完整填写诗名、作者、朝代、年级和正文');
    return;
  }

  formSubmitting.value = 'poem';
  try {
    await createPoem(normalizeTextFields(newPoem));
    Object.assign(newPoem, createEmptyPoem());
    showPoemDialog.value = false;
    ElMessage.success('古诗已保存到数据库');
  } catch (error) {
    ElMessage.error(errorMessage(error, '新增古诗失败'));
  } finally {
    formSubmitting.value = '';
  }
}

/**
 * 发布任务并在成功后重置表单。
 *
 * @returns {Promise<void>} 后台发布完成或错误消息展示后解析。
 */
async function handlePublishTask() {
  const targetRequired = Boolean(newTask.target_type) && newTask.target_type !== 'all';
  const requiredFieldMissing = !newTask.task_name.trim()
    || !newTask.task_type
    || !newTask.target_type
    || (targetRequired && !newTask.target_id.trim())
    || !newTask.start_time
    || !newTask.end_time
    || !newTask.status
    || !selectedTaskItemIds.value.length;
  if (requiredFieldMissing) {
    ElMessage.warning('请完整填写任务名称、目标、时间、状态和任务内容');
    return;
  }
  if (newTask.end_time <= newTask.start_time) {
    ElMessage.warning('任务结束时间必须晚于开始时间');
    return;
  }

  formSubmitting.value = 'task';
  try {
    const payload = normalizeTextFields(newTask);
    if (payload.target_type === 'all') {
      payload.target_id = '';
    }
    await publishTask(payload, selectedTaskItemIds.value);
    selectedTaskItemIds.value = [];
    Object.assign(newTask, createEmptyTask());
    showTaskDialog.value = false;
    ElMessage.success('任务已保存到数据库');
  } catch (error) {
    ElMessage.error(errorMessage(error, '发布任务失败'));
  } finally {
    formSubmitting.value = '';
  }
}

/**
 * 请求后台切换用户状态，期间锁定对应行开关。
 *
 * @param {string} userId 用户唯一标识。
 * @returns {Promise<void>} 后台更新完成或错误消息展示后解析。
 */
async function handleToggleUserStatus(userId) {
  await runRowOperation(pendingUserIds.value, userId, () => toggleUserStatus(userId), '修改用户状态失败');
  reconcileAdminSession();
}

/**
 * 请求后台切换汉字推荐状态，期间锁定对应行开关。
 *
 * @param {string} hanziId 汉字唯一标识。
 * @returns {Promise<void>} 后台更新完成或错误消息展示后解析。
 */
async function handleToggleHanziRecommended(hanziId) {
  await runRowOperation(pendingHanziIds.value, hanziId, () => toggleHanziRecommended(hanziId), '修改推荐状态失败');
}

/**
 * 请求后台删除任务，删除成功后状态层才移除对应行。
 *
 * @param {string} taskId 任务唯一标识。
 * @returns {Promise<void>} 后台删除完成或错误消息展示后解析。
 */
async function handleRemoveTask(taskId) {
  await runRowOperation(pendingTaskIds.value, taskId, () => removeTask(taskId), '删除任务失败');
}

/**
 * 请求后台删除练习记录，删除成功后状态层才移除对应行。
 *
 * @param {string} recordId 记录唯一标识。
 * @returns {Promise<void>} 后台删除完成或错误消息展示后解析。
 */
async function handleRemoveRecord(recordId) {
  await runRowOperation(pendingRecordIds.value, recordId, () => removeRecord(recordId), '删除练习记录失败');
}

/**
 * 执行带行级加载状态的异步操作。
 *
 * @param {Set<string>} pendingIds 正在操作的实体 ID 集合。
 * @param {string} entityId 本次操作实体 ID。
 * @param {() => Promise<unknown>} operation 实际后台请求函数。
 * @param {string} fallbackMessage 请求失败时的默认业务提示。
 * @returns {Promise<void>} 操作完成并清理行级加载状态后解析。
 */
async function runRowOperation(pendingIds, entityId, operation, fallbackMessage) {
  if (pendingIds.has(entityId)) {
    return;
  }

  pendingIds.add(entityId);
  try {
    await operation();
    ElMessage.success('操作成功');
  } catch (error) {
    ElMessage.error(errorMessage(error, fallbackMessage));
  } finally {
    pendingIds.delete(entityId);
  }
}

/**
 * 保存最小化管理端会话。
 *
 * 仅保存恢复界面所需的非敏感用户字段，不保存密码、微信 openid 或任何凭据。
 *
 * @param {object} user 服务端鉴权成功后的管理用户。
 * @returns {void} 存储成功后返回；浏览器禁用存储时静默降级为当前页会话。
 */
function persistAdminSession(user) {
  const session = {
    version: ADMIN_SESSION_VERSION,
    user: {
      id: user.id,
      nickname: user.nickname || '',
      user_type: user.user_type,
      status: user.status,
    },
  };
  try {
    window.localStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    // Safari 无痕模式或禁用站点存储时，当前页内的内存会话仍可正常使用。
  }
}

/**
 * 从浏览器读取会话，并使用后端最新用户数据恢复管理身份。
 *
 * @returns {void} 会话结构、角色、启用状态任一无效时清理缓存并保持未登录。
 */
function restoreAdminSession() {
  let parsedSession;
  try {
    const serializedSession = window.localStorage.getItem(ADMIN_SESSION_STORAGE_KEY);
    parsedSession = serializedSession ? JSON.parse(serializedSession) : null;
  } catch (error) {
    clearPersistedAdminSession();
    return;
  }

  if (!isValidPersistedSession(parsedSession)) {
    clearPersistedAdminSession();
    return;
  }

  const serverUser = users.value.find((user) => user.id === parsedSession.user.id);
  if (!serverUser || serverUser.status !== USER_STATUS_ENABLED || !ADMIN_ROLE_VALUES.includes(serverUser.user_type)) {
    clearPersistedAdminSession();
    return;
  }
  adminUser.value = serverUser;
  persistAdminSession(serverUser);
}

/**
 * 校验持久化会话的版本和必要字段。
 *
 * @param {unknown} session 从 localStorage 解析的未知数据。
 * @returns {boolean} 结构完整、版本匹配且字段类型正确时返回 true。
 */
function isValidPersistedSession(session) {
  return Boolean(
    session
    && typeof session === 'object'
    && session.version === ADMIN_SESSION_VERSION
    && session.user
    && typeof session.user === 'object'
    && typeof session.user.id === 'string'
    && session.user.id
    && typeof session.user.user_type === 'string'
    && typeof session.user.status === 'string',
  );
}

/**
 * 使当前会话与服务端用户列表保持一致。
 *
 * @returns {void} 账号仍有权限时更新展示信息；已删除、已停用或角色改变时退出。
 */
function reconcileAdminSession() {
  if (!adminUser.value) {
    return;
  }
  const serverUser = users.value.find((user) => user.id === adminUser.value.id);
  if (!serverUser || serverUser.status !== USER_STATUS_ENABLED || !ADMIN_ROLE_VALUES.includes(serverUser.user_type)) {
    logoutAdmin();
    ElMessage.warning('当前账号已停用、删除或失去管理权限，请重新登录');
    return;
  }
  adminUser.value = serverUser;
  persistAdminSession(serverUser);
}

/**
 * 清理浏览器中的管理端会话。
 *
 * @returns {void} 键不存在或存储不可用时也不抛出异常。
 */
function clearPersistedAdminSession() {
  try {
    window.localStorage.removeItem(ADMIN_SESSION_STORAGE_KEY);
  } catch (error) {
    // 存储不可用时无其他持久化状态需要清理。
  }
}

/**
 * 生成用户友好的昵称，兼容微信资料的常见字段命名。
 *
 * @param {object} user 用户记录。
 * @returns {string} 优先使用真实昵称，缺失时返回明确的微信用户占位文本。
 */
function displayUserName(user) {
  const nicknameCandidates = [user.nickname, user.wx_nickname, user.wechat_nickname, user.nickName];
  const nickname = nicknameCandidates.find((candidate) => typeof candidate === 'string' && candidate.trim());
  return nickname ? nickname.trim() : '微信用户';
}

/**
 * 将较长用户 ID 缩略为可扫读格式。
 *
 * @param {unknown} userId 后端用户唯一标识。
 * @returns {string} 短 ID 原样返回，长 ID 保留首尾并在中间显示省略号。
 */
function abbreviateId(userId) {
  const normalizedId = String(userId || '');
  return normalizedId.length > 18 ? `${normalizedId.slice(0, 8)}…${normalizedId.slice(-6)}` : normalizedId;
}

/**
 * 复制完整用户 ID，便于在缩略显示时仍可排查精确账号。
 *
 * @param {unknown} userId 待复制的用户唯一标识。
 * @returns {Promise<void>} 复制完成或错误消息展示后解析。
 */
async function copyUserId(userId) {
  try {
    await navigator.clipboard.writeText(String(userId || ''));
    ElMessage.success('完整用户 ID 已复制');
  } catch (error) {
    ElMessage.error('复制失败，请点击 ID 提示后手动复制');
  }
}

/**
 * 根据管理端搜索框过滤表格。
 *
 * @param {Array<object>} rows 表格原始行。
 * @param {string[]} fields 可搜索字段。
 * @returns {Array<object>} 命中搜索词的表格行。
 */
function filterRows(rows, fields) {
  const keyword = adminSearch.value.trim().toLowerCase();
  if (!keyword) {
    return rows;
  }
  return rows.filter((row) => fields.some((field) => String(row[field] || '').toLowerCase().includes(keyword)));
}

/**
 * 去除表单字符串字段首尾空白，避免把纯空格写入数据库。
 *
 * @param {object} source 需要提交的表单对象。
 * @returns {object} 新对象；字符串字段已清理，数字和布尔值保持原类型。
 */
function normalizeTextFields(source) {
  return Object.fromEntries(Object.entries(source).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]));
}

/**
 * 创建空用户表单。
 *
 * @returns {object} 不包含任何演示账号或数据库业务值的表单初始状态。
 */
function createEmptyUser() {
  return { username: '', nickname: '', phone: '', user_type: '' };
}

/**
 * 创建空汉字表单。
 *
 * @returns {object} 汉字文本字段为空、笔画数使用输入组件下限的初始状态。
 */
function createEmptyHanzi() {
  return { character_text: '', grade_level: '' };
}

/**
 * 创建空的汉字批量补充表单。
 *
 * @returns {{grade_level: string, count: number}} 年级待选且使用安全默认数量的表单。
 */
function createEmptyHanziGeneration() {
  return { grade_level: '', count: DEFAULT_GENERATION_COUNT };
}

/**
 * 创建空古诗表单。
 *
 * @returns {object} 与后端古诗实体创建接口对应的空字段集合。
 */
function createEmptyPoem() {
  return {
    title: '',
    author: '',
    dynasty: '',
    content: '',
    annotation: '',
    translation: '',
    grade_level: '',
    textbook_version: '',
  };
}

/**
 * 创建空任务表单。
 *
 * @returns {object} 只含后端枚举默认选项，不含写死任务名称、目标 ID 或资源数据。
 */
function createEmptyTask() {
  return {
    task_name: '',
    task_type: '',
    target_type: '',
    target_id: '',
    start_time: '',
    end_time: '',
    status: '',
  };
}

/**
 * 将未知异常转换为界面错误说明。
 *
 * @param {unknown} error 捕获到的异常。
 * @param {string} fallback 无异常信息时的默认说明。
 * @returns {string} 可直接展示且非空的提示文本。
 */
function errorMessage(error, fallback) {
  return error instanceof Error && error.message ? error.message : fallback;
}
</script>
