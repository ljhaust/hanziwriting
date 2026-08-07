package com.example.hanzi.service;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.example.hanzi.domain.HanziCharacter;
import com.example.hanzi.domain.Poem;
import com.example.hanzi.domain.UserAccount;
import com.example.hanzi.repository.HanziCharacterRepository;
import com.example.hanzi.repository.PoemRepository;
import com.example.hanzi.repository.PracticeRecordRepository;
import com.example.hanzi.repository.PracticeTaskRepository;
import com.example.hanzi.repository.UserAccountRepository;
import com.example.hanzi.web.AccountDisabledException;
import com.example.hanzi.web.InvalidCredentialsException;
import com.example.hanzi.web.InvalidRequestException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * 管理端账号认证单元测试。
 *
 * <p>测试直接构造业务服务并替换仓储依赖，验证认证契约与数据库数据缺失时的
 * 安全行为。测试不连接真实 MySQL，也不使用或记录任何真实账号密码。</p>
 */
class PlatformServiceTest {
    /** 测试专用登录账号，不对应任何本地或生产账号。 */
    private static final String TEST_USERNAME = "unit-test-admin";

    /** 测试专用明文，仅在内存中用于 BCrypt 比对。 */
    private static final String TEST_PASSWORD = "unit-test-password";

    /** 被测业务服务。 */
    private PlatformService platformService;

    /** 测试专用用户仓储桩，用于配置账号查询结果。 */
    private UserAccountRepository userRepository;

    /** 测试专用汉字仓储桩，用于验证自动补全与批量生成。 */
    private HanziCharacterRepository hanziRepository;

    /** 测试专用古诗仓储桩，用于验证新增持久化数据。 */
    private PoemRepository poemRepository;

    /** 每个测试前创建隔离的仓储桩，避免测试之间共享认证状态。 */
    @BeforeEach
    void setUp() {
        userRepository = mock(UserAccountRepository.class);
        hanziRepository = mock(HanziCharacterRepository.class);
        poemRepository = mock(PoemRepository.class);
        platformService = new PlatformService(
            userRepository,
            hanziRepository,
            poemRepository,
            mock(PracticeTaskRepository.class),
            mock(PracticeRecordRepository.class),
            new ObjectMapper()
        );
    }

    /**
     * 验证数据库账号缺少密码摘要时必须拒绝登录。
     *
     * <p>这覆盖当前本地数据库的实际故障：用户、角色和启用状态均正确，
     * 但 password_hash 为空时不能把任意输入当作有效密码。</p>
     *
     * @return 无返回值；断言失败时由 JUnit 抛出测试异常。
     */
    @Test
    void shouldRejectEnabledAdminWhenPasswordHashIsMissing() {
        UserAccount user = createManagementUser(null);
        when(userRepository.findByUsername(TEST_USERNAME)).thenReturn(Optional.of(user));

        assertThrows(
            InvalidCredentialsException.class,
            () -> platformService.authenticate(TEST_USERNAME, TEST_PASSWORD)
        );
    }

    /**
     * 验证启用中的管理员使用有效 BCrypt 摘要可以登录。
     *
     * @return 无返回值；断言失败时由 JUnit 抛出测试异常。
     */
    @Test
    void shouldAuthenticateEnabledAdminWhenPasswordHashMatches() {
        String passwordHash = new BCryptPasswordEncoder().encode(TEST_PASSWORD);
        UserAccount user = createManagementUser(passwordHash);
        when(userRepository.findByUsername(TEST_USERNAME)).thenReturn(Optional.of(user));

        assertSame(user, platformService.authenticate(TEST_USERNAME, TEST_PASSWORD));
    }

    /**
     * 验证已禁用管理账号返回明确的禁用异常，而不会混同为密码错误。
     *
     * @return 无返回值；断言失败时由 JUnit 抛出测试异常。
     */
    @Test
    void shouldRejectDisabledManagementAccountExplicitly() {
        UserAccount user = createManagementUser(new BCryptPasswordEncoder().encode(TEST_PASSWORD));
        user.setStatus("disabled");
        when(userRepository.findByUsername(TEST_USERNAME)).thenReturn(Optional.of(user));

        assertThrows(
            AccountDisabledException.class,
            () -> platformService.authenticate(TEST_USERNAME, TEST_PASSWORD)
        );
    }

    /**
     * 验证微信再次授权的非空昵称会更新已有用户并持久化。
     *
     * @return 无返回值；断言失败时由 JUnit 抛出测试异常。
     */
    @Test
    void shouldUpdateExistingWechatNicknameWhenProfileProvidesOne() {
        UserAccount user = createWechatUser("wx-openid", "微信同学", "enabled");
        when(userRepository.findByOpenid("wx-openid")).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        UserAccount result = platformService.loginByOpenid("wx-openid", "  真实昵称  ", null);

        assertSame(user, result);
        assertEquals("真实昵称", result.getNickname());
        verify(userRepository).save(user);
    }

    /**
     * 验证微信资料缺失时不覆盖数据库中已有真实昵称。
     *
     * @return 无返回值；断言失败时由 JUnit 抛出测试异常。
     */
    @Test
    void shouldKeepExistingWechatNicknameWhenProfileIsBlank() {
        UserAccount user = createWechatUser("wx-openid", "已保存昵称", "enabled");
        when(userRepository.findByOpenid("wx-openid")).thenReturn(Optional.of(user));

        UserAccount result = platformService.loginByOpenid("wx-openid", "  ", null);

        assertEquals("已保存昵称", result.getNickname());
        verify(userRepository, never()).save(any(UserAccount.class));
    }

    /**
     * 验证已禁用微信用户不能通过 openid 绕过管理端的状态控制。
     *
     * @return 无返回值；断言失败时由 JUnit 抛出测试异常。
     */
    @Test
    void shouldRejectDisabledWechatAccountExplicitly() {
        UserAccount user = createWechatUser("wx-openid", "微信同学", "disabled");
        when(userRepository.findByOpenid("wx-openid")).thenReturn(Optional.of(user));

        assertThrows(
            AccountDisabledException.class,
            () -> platformService.loginByOpenid("wx-openid", "新昵称", null)
        );
        verify(userRepository, never()).save(any(UserAccount.class));
    }

    /**
     * 验证单字新增仅需汉字和年级，其余学习属性均来自本地字表。
     *
     * @return 无返回值；断言失败时由 JUnit 抛出测试异常。
     */
    @Test
    void shouldCompleteHanziPropertiesFromLocalCatalog() {
        HanziCharacter request = new HanziCharacter();
        request.setCharacterText("水");
        request.setGradeLevel("一年级");
        when(hanziRepository.findByCharacterText("水")).thenReturn(Optional.empty());
        when(hanziRepository.save(request)).thenReturn(request);

        HanziCharacter saved = platformService.saveHanzi(request);

        assertEquals("shuǐ", saved.getPinyin());
        assertEquals("水", saved.getRadical());
        assertEquals(Integer.valueOf(4), saved.getStrokeCount());
        assertEquals("一年级", saved.getGradeLevel());
        assertFalse(saved.getRecommended());
        assertTrue(saved.getCompounds().contains("水果"));
    }

    /**
     * 验证未收录汉字不会以空拼音、空部首等不完整数据入库。
     *
     * @return 无返回值；断言失败时由 JUnit 抛出测试异常。
     */
    @Test
    void shouldRejectHanziMissingFromControlledCatalog() {
        HanziCharacter request = new HanziCharacter();
        request.setCharacterText("嘉");
        request.setGradeLevel("一年级");
        when(hanziRepository.findByCharacterText("嘉")).thenReturn(Optional.empty());

        assertThrows(InvalidRequestException.class, () -> platformService.saveHanzi(request));
        verify(hanziRepository, never()).save(any(HanziCharacter.class));
    }

    /**
     * 验证字库中已存在的汉字会在保存前被明确拒绝。
     *
     * @return 无返回值；断言失败时由 JUnit 抛出测试异常。
     */
    @Test
    void shouldRejectDuplicateHanzi() {
        HanziCharacter request = new HanziCharacter();
        request.setCharacterText("水");
        request.setGradeLevel("一年级");
        HanziCharacter existing = new HanziCharacter();
        existing.setCharacterText("水");
        when(hanziRepository.findByCharacterText("水")).thenReturn(Optional.of(existing));

        assertThrows(InvalidRequestException.class, () -> platformService.saveHanzi(request));
        verify(hanziRepository, never()).save(any(HanziCharacter.class));
    }

    /**
     * 验证按年级生成会跳过已存在字，并将返回数量限制在请求数量内。
     *
     * @return 无返回值；断言失败时由 JUnit 抛出测试异常。
     */
    @Test
    void shouldGenerateMissingHanziForRequestedGrade() {
        HanziCharacter existing = new HanziCharacter();
        existing.setCharacterText("春");
        when(hanziRepository.findAll()).thenReturn(Collections.singletonList(existing));
        when(hanziRepository.save(any(HanziCharacter.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        List<HanziCharacter> created = platformService.generateHanzi("二年级", 3);

        assertEquals(3, created.size());
        assertTrue(created.stream().noneMatch(item -> "春".equals(item.getCharacterText())));
        assertTrue(created.stream().allMatch(item -> "二年级".equals(item.getGradeLevel())));
        assertTrue(created.stream().allMatch(item -> item.getPinyin() != null));
    }

    /**
     * 验证请求数量大于本地字表库存时返回实际可创建数量。
     *
     * @return 无返回值；断言失败时由 JUnit 抛出测试异常。
     */
    @Test
    void shouldReturnActualCountWhenRequestedCountExceedsCatalogStock() {
        when(hanziRepository.findAll()).thenReturn(Collections.emptyList());
        when(hanziRepository.save(any(HanziCharacter.class)))
            .thenAnswer(invocation -> invocation.getArgument(0));

        List<HanziCharacter> created = platformService.generateHanzi("六年级", 100);

        assertEquals(4, created.size());
    }

    /**
     * 验证古诗新增会生成主键，并按标点生成有序逐句练习数据。
     *
     * @return 无返回值；断言失败时由 JUnit 抛出测试异常。
     */
    @Test
    void shouldPersistPoemWithGeneratedSentences() {
        Poem poem = new Poem();
        poem.setTitle("登鹳雀楼");
        poem.setAuthor("王之涣");
        poem.setDynasty("唐");
        poem.setGradeLevel("二年级");
        poem.setContent("白日依山尽，黄河入海流。欲穷千里目，更上一层楼。");
        poem.setAnnotation("鹳雀楼：旧址在山西。");
        poem.setTranslation("登楼远望的所见所思。");
        poem.setTextbookVersion("部编版");
        when(poemRepository.save(poem)).thenReturn(poem);

        Poem saved = platformService.savePoem(poem);

        assertTrue(saved.getId().startsWith("P"));
        assertEquals(4, saved.getSentences().size());
        assertEquals("白日依山尽", saved.getSentences().get(0).getSentenceText());
        assertEquals(Integer.valueOf(4), saved.getSentences().get(3).getSortNo());
        assertEquals("鹳雀楼：旧址在山西。", saved.getAnnotation());
        assertEquals("登楼远望的所见所思。", saved.getTranslation());
        assertEquals("部编版", saved.getTextbookVersion());
        verify(poemRepository).save(poem);
    }

    /**
     * 构造测试用的管理端用户实体。
     *
     * @param passwordHash BCrypt 摘要；传入 null 用于模拟数据库字段缺失。
     * @return 角色为 admin 且状态为 enabled 的测试用户。
     */
    private UserAccount createManagementUser(String passwordHash) {
        UserAccount user = new UserAccount();
        user.setId("UNIT-ADMIN");
        user.setUsername(TEST_USERNAME);
        user.setNickname("单元测试管理员");
        user.setUserType("admin");
        user.setStatus("enabled");
        user.setPasswordHash(passwordHash);
        return user;
    }

    /**
     * 构造已绑定 openid 的测试微信用户。
     *
     * @param openid 测试用非真实微信标识。
     * @param nickname 数据库已保存的昵称。
     * @param status enabled 或 disabled 状态。
     * @return 学生角色的测试用户。
     */
    private UserAccount createWechatUser(String openid, String nickname, String status) {
        UserAccount user = new UserAccount();
        user.setId("UNIT-WX");
        user.setUsername("wx_unit");
        user.setNickname(nickname);
        user.setUserType("student");
        user.setStatus(status);
        user.setOpenid(openid);
        return user;
    }

}
