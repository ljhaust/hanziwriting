package com.example.hanzi.repository;

import com.example.hanzi.domain.UserAccount;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 用户仓储。
 *
 * <p>输入为用户实体和 ID，输出为 Spring Data JPA 自动实现的 CRUD 能力。</p>
 */
public interface UserAccountRepository extends JpaRepository<UserAccount, String> {
    /**
     * 按唯一登录账号查询用户。
     *
     * @param username 用户输入的登录账号。
     * @return 命中时包含数据库用户，否则为空。
     */
    Optional<UserAccount> findByUsername(String username);

    /**
     * 按微信 openid 查询用户。
     *
     * @param openid 微信小程序登录后由 code2session 换取的 openid。
     * @return 命中时包含数据库用户，否则为空。
     */
    Optional<UserAccount> findByOpenid(String openid);
}
