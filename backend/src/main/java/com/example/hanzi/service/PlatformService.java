package com.example.hanzi.service;

import com.example.hanzi.domain.HanziCharacter;
import com.example.hanzi.domain.Poem;
import com.example.hanzi.domain.PracticeRecord;
import com.example.hanzi.domain.PracticeTask;
import com.example.hanzi.domain.TaskItem;
import com.example.hanzi.domain.UserAccount;
import com.example.hanzi.dto.BootstrapResponse;
import com.example.hanzi.dto.HanziStrokeResponse;
import com.example.hanzi.repository.HanziCharacterRepository;
import com.example.hanzi.repository.PoemRepository;
import com.example.hanzi.repository.PracticeRecordRepository;
import com.example.hanzi.repository.PracticeTaskRepository;
import com.example.hanzi.repository.UserAccountRepository;
import com.example.hanzi.web.InvalidCredentialsException;
import com.example.hanzi.web.ResourceNotFoundException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 平台业务服务。
 *
 * <p>封装管理端和原生微信小程序共用的数据库读写逻辑，控制器只负责 HTTP 协议转换。</p>
 */
@Service
public class PlatformService {
    private static final String USER_ID_PREFIX = "U";
    private static final String HANZI_ID_PREFIX = "H";
    private static final String TASK_ID_PREFIX = "T";
    private static final String TASK_ITEM_ID_PREFIX = "TI";
    private static final String RECORD_ID_PREFIX = "R";
    private static final String DEFAULT_ENABLED_STATUS = "enabled";
    private static final String ADMIN_USER_TYPE = "admin";
    private static final String TEACHER_USER_TYPE = "teacher";
    private static final String DEFAULT_ACTIVE_TASK_STATUS = "active";
    private static final long DEFAULT_TASK_DURATION_HOURS = 24L;
    private static final DateTimeFormatter BUSINESS_TIME_FORMATTER =
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final UserAccountRepository userRepository;
    private final HanziCharacterRepository hanziRepository;
    private final PoemRepository poemRepository;
    private final PracticeTaskRepository taskRepository;
    private final PracticeRecordRepository recordRepository;
    private final ObjectMapper objectMapper;
    private final BCryptPasswordEncoder passwordEncoder;

    /**
     * 创建平台业务服务。
     *
     * @param userRepository 用户数据库仓储。
     * @param hanziRepository 汉字数据库仓储。
     * @param poemRepository 古诗数据库仓储。
     * @param taskRepository 作业任务数据库仓储。
     * @param recordRepository 练习记录数据库仓储。
     * @param objectMapper Spring 统一配置的 JSON 解析器。
     */
    public PlatformService(UserAccountRepository userRepository,
                           HanziCharacterRepository hanziRepository,
                           PoemRepository poemRepository,
                           PracticeTaskRepository taskRepository,
                           PracticeRecordRepository recordRepository,
                           ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.hanziRepository = hanziRepository;
        this.poemRepository = poemRepository;
        this.taskRepository = taskRepository;
        this.recordRepository = recordRepository;
        this.objectMapper = objectMapper;
        this.passwordEncoder = new BCryptPasswordEncoder();
    }

    /**
     * 查询前端首屏所需数据。
     *
     * <p>该接口直接返回 JPA 聚合数据，不放入 Redis 缓存，避免 Hibernate 懒加载代理
     * 被序列化后在后续命中缓存时反序列化失败。后续如需缓存，应先转换为纯 DTO 快照。</p>
     *
     * @return 管理端和小程序共用的数据库聚合数据。
     */
    @Transactional(readOnly = true)
    public BootstrapResponse bootstrap() {
        return new BootstrapResponse(
            userRepository.findAll(),
            hanziRepository.findAll(),
            poemRepository.findAll(),
            taskRepository.findAll(),
            recordRepository.findAll()
        );
    }

    /**
     * 查询全部用户。
     *
     * @return 用户列表。
     */
    @Transactional(readOnly = true)
    public List<UserAccount> listUsers() {
        return userRepository.findAll();
    }

    /**
     * 使用数据库账号和 BCrypt 摘要完成管理端登录。
     *
     * @param username 管理端提交的登录账号。
     * @param password 管理端提交的明文密码，仅用于本次摘要比对。
     * @return 校验成功的管理员或教师用户，密码摘要不会被序列化。
     * @throws InvalidCredentialsException 账号、角色、状态或密码任一项不符合时抛出。
     */
    @Transactional(readOnly = true)
    public UserAccount authenticate(String username, String password) {
        UserAccount user = userRepository.findByUsername(username)
            .orElseThrow(InvalidCredentialsException::new);
        boolean managementRole = ADMIN_USER_TYPE.equals(user.getUserType())
            || TEACHER_USER_TYPE.equals(user.getUserType());
        boolean enabled = DEFAULT_ENABLED_STATUS.equals(user.getStatus());
        String passwordHash = user.getPasswordHash();
        if (!managementRole || !enabled || passwordHash == null
            || !passwordEncoder.matches(password, passwordHash)) {
            throw new InvalidCredentialsException();
        }
        return user;
    }

    /**
     * 新增用户并由服务端生成数据库主键和默认字段。
     *
     * @param user 管理端提交且通过校验的用户字段。
     * @return 数据库持久化后的用户。
     */
    @Transactional
    public UserAccount saveUser(UserAccount user) {
        if (isBlank(user.getId())) {
            user.setId(generateId(USER_ID_PREFIX));
        }
        if (isBlank(user.getStatus())) {
            user.setStatus(DEFAULT_ENABLED_STATUS);
        }
        if (isBlank(user.getJoinDate())) {
            user.setJoinDate(LocalDate.now().toString());
        }
        return userRepository.save(user);
    }

    /**
     * 更新用户启停状态。
     *
     * @param id 数据库用户主键。
     * @param status 已通过请求校验的目标状态。
     * @return 数据库更新后的用户。
     */
    @Transactional
    public UserAccount updateUserStatus(String id, String status) {
        UserAccount user = userRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("用户不存在"));
        user.setStatus(status);
        return userRepository.save(user);
    }

    /**
     * 查询全部汉字。
     *
     * @return 汉字列表。
     */
    @Transactional(readOnly = true)
    public List<HanziCharacter> listHanzi() {
        return hanziRepository.findAll();
    }

    /**
     * 新增汉字资源并由服务端生成数据库主键和推荐默认值。
     *
     * @param hanzi 管理端提交且通过校验的汉字字段。
     * @return 数据库持久化后的汉字资源。
     */
    @Transactional
    public HanziCharacter saveHanzi(HanziCharacter hanzi) {
        if (isBlank(hanzi.getId())) {
            hanzi.setId(generateId(HANZI_ID_PREFIX));
        }
        if (hanzi.getRecommended() == null) {
            hanzi.setRecommended(Boolean.FALSE);
        }
        return hanziRepository.save(hanzi);
    }

    /**
     * 更新汉字推荐状态。
     *
     * @param id 数据库汉字主键。
     * @param recommended 是否推荐。
     * @return 数据库更新后的汉字资源。
     */
    @Transactional
    public HanziCharacter updateHanziRecommended(String id, Boolean recommended) {
        HanziCharacter hanzi = hanziRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("汉字资源不存在"));
        hanzi.setRecommended(recommended);
        return hanziRepository.save(hanzi);
    }

    /**
     * 从数据库读取指定汉字的完整笔顺轨迹。
     *
     * @param characterText 单个汉字正文，用作数据库查询条件。
     * @return 包含 strokes、medians 和 radStrokes 数组的响应。
     * @throws ResourceNotFoundException 汉字或任一轨迹字段未配置时抛出。
     */
    @Transactional(readOnly = true)
    public HanziStrokeResponse getHanziStrokes(String characterText) {
        HanziCharacter hanzi = hanziRepository.findByCharacterText(characterText)
            .orElseThrow(() -> new ResourceNotFoundException("汉字资源不存在"));
        if (isBlank(hanzi.getStrokesJson()) || isBlank(hanzi.getMediansJson())
            || isBlank(hanzi.getRadStrokesJson())) {
            throw new ResourceNotFoundException("该汉字尚未配置笔顺轨迹");
        }
        return new HanziStrokeResponse(
            hanzi.getCharacterText(),
            parseJsonArray(hanzi.getStrokesJson(), "strokes_json"),
            parseJsonArray(hanzi.getMediansJson(), "medians_json"),
            parseJsonArray(hanzi.getRadStrokesJson(), "rad_strokes_json")
        );
    }

    /**
     * 查询全部古诗。
     *
     * @return 古诗列表。
     */
    @Transactional(readOnly = true)
    public List<Poem> listPoems() {
        return poemRepository.findAll();
    }

    /**
     * 查询全部任务。
     *
     * @return 任务列表。
     */
    @Transactional(readOnly = true)
    public List<PracticeTask> listTasks() {
        return taskRepository.findAll();
    }

    /**
     * 保存作业任务。
     *
     * @param task 待保存任务。
     * @return 保存后的任务。
     */
    @Transactional
    public PracticeTask saveTask(PracticeTask task) {
        if (isBlank(task.getId())) {
            task.setId(generateId(TASK_ID_PREFIX));
        }
        LocalDateTime startTime = LocalDateTime.now();
        if (isBlank(task.getStartTime())) {
            task.setStartTime(startTime.format(BUSINESS_TIME_FORMATTER));
        }
        if (isBlank(task.getEndTime())) {
            task.setEndTime(startTime.plusHours(DEFAULT_TASK_DURATION_HOURS)
                .format(BUSINESS_TIME_FORMATTER));
        }
        if (isBlank(task.getStatus())) {
            task.setStatus(DEFAULT_ACTIVE_TASK_STATUS);
        }
        for (TaskItem item : task.getItems()) {
            if (isBlank(item.getId())) {
                item.setId(generateId(TASK_ITEM_ID_PREFIX));
            }
        }
        return taskRepository.save(task);
    }

    /**
     * 删除作业任务。
     *
     * @param id 任务 ID。
     */
    @Transactional
    public void deleteTask(String id) {
        if (!taskRepository.existsById(id)) {
            throw new ResourceNotFoundException("作业任务不存在");
        }
        taskRepository.deleteById(id);
    }

    /**
     * 查询全部练习记录。
     *
     * @return 练习记录列表。
     */
    @Transactional(readOnly = true)
    public List<PracticeRecord> listRecords() {
        return recordRepository.findAll();
    }

    /**
     * 保存练习记录。
     *
     * @param record 待保存记录。
     * @return 保存后的记录。
     */
    @Transactional
    public PracticeRecord saveRecord(PracticeRecord record) {
        if (isBlank(record.getId())) {
            record.setId(generateId(RECORD_ID_PREFIX));
        }
        return recordRepository.save(record);
    }

    /**
     * 删除练习记录。
     *
     * @param id 记录 ID。
     */
    @Transactional
    public void deleteRecord(String id) {
        if (!recordRepository.existsById(id)) {
            throw new ResourceNotFoundException("练习记录不存在");
        }
        recordRepository.deleteById(id);
    }

    /**
     * 生成无连字符的领域主键。
     *
     * @param prefix 区分用户、汉字、任务等实体的语义前缀。
     * @return 前缀加 UUID 的全局唯一字符串。
     */
    private String generateId(String prefix) {
        return prefix + UUID.randomUUID().toString().replace("-", "");
    }

    /**
     * 判断业务文本是否缺失。
     *
     * @param value 待检查文本。
     * @return null、空串或仅空白字符时返回 true。
     */
    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    /**
     * 把数据库 JSON 文本解析为数组节点。
     *
     * @param value 数据库中的 JSON 文本。
     * @param columnName 用于定位脏数据的非敏感列名。
     * @return 校验通过的 JSON 数组节点。
     * @throws IllegalStateException 数据库内容不是合法 JSON 数组时抛出。
     */
    private JsonNode parseJsonArray(String value, String columnName) {
        try {
            JsonNode node = objectMapper.readTree(value);
            if (!node.isArray()) {
                throw new IllegalStateException("笔顺数据列 " + columnName + " 必须是 JSON 数组");
            }
            return node;
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("笔顺数据列 " + columnName + " 不是合法 JSON", exception);
        }
    }
}
