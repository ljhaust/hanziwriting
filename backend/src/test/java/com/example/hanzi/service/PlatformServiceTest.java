package com.example.hanzi.service;

import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.example.hanzi.domain.UserAccount;
import com.example.hanzi.repository.HanziCharacterRepository;
import com.example.hanzi.repository.PoemRepository;
import com.example.hanzi.repository.PracticeRecordRepository;
import com.example.hanzi.repository.PracticeTaskRepository;
import com.example.hanzi.repository.UserAccountRepository;
import com.example.hanzi.web.InvalidCredentialsException;
import com.fasterxml.jackson.databind.ObjectMapper;
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

    /** 每个测试前创建隔离的仓储桩，避免测试之间共享认证状态。 */
    @BeforeEach
    void setUp() {
        userRepository = mock(UserAccountRepository.class);
        platformService = new PlatformService(
            userRepository,
            mock(HanziCharacterRepository.class),
            mock(PoemRepository.class),
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

}
