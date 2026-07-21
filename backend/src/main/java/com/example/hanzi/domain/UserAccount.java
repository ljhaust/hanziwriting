package com.example.hanzi.domain;

import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;
import com.fasterxml.jackson.annotation.JsonIgnore;
import javax.validation.constraints.NotBlank;

/**
 * 平台用户实体。
 *
 * <p>覆盖管理员、教师、家长和学生四类账号，管理端用它做权限入口，
 * 学习端用它归属练习记录。</p>
 */
@Entity
@Table(name = "user_account")
public class UserAccount {
    /** 用户唯一标识，对应前端 id。 */
    @Id
    private String id;

    /** 登录账号名。 */
    @NotBlank
    private String username;

    /** 页面展示昵称。 */
    @NotBlank
    private String nickname;

    /** 手机号，用于短信登录和家长学生关联。 */
    private String phone;

    /** 用户类型：admin、teacher、parent、student。 */
    private String userType;

    /** 启停状态：enabled、disabled。 */
    private String status;

    /** 注册日期，格式为 yyyy-MM-dd。 */
    private String joinDate;

    /** BCrypt 密码摘要；仅用于后端校验，任何接口都不得序列化返回。 */
    @JsonIgnore
    private String passwordHash;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getNickname() {
        return nickname;
    }

    public void setNickname(String nickname) {
        this.nickname = nickname;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getUserType() {
        return userType;
    }

    public void setUserType(String userType) {
        this.userType = userType;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getJoinDate() {
        return joinDate;
    }

    public void setJoinDate(String joinDate) {
        this.joinDate = joinDate;
    }

    /**
     * 获取数据库中的密码摘要。
     *
     * @return BCrypt 密码摘要；只允许认证服务使用。
     */
    public String getPasswordHash() {
        return passwordHash;
    }

    /**
     * 设置密码摘要。
     *
     * @param passwordHash 已由 BCrypt 生成的摘要，禁止传入明文密码。
     * @return 无返回值。
     */
    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }
}
