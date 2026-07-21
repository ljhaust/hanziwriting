package com.example.hanzi.dto;

import javax.validation.constraints.NotBlank;

/**
 * 管理端密码登录请求。
 *
 * <p>仅承载本次认证所需的账号和明文密码；密码只在请求生命周期内参与
 * BCrypt 校验，不写日志、不写数据库。</p>
 */
public class LoginRequest {
    /** 管理员或教师的登录账号。 */
    @NotBlank
    private String username;

    /** 用户本次输入的明文密码。 */
    @NotBlank
    private String password;

    /**
     * 获取登录账号。
     *
     * @return 用户提交的账号名。
     */
    public String getUsername() {
        return username;
    }

    /**
     * 设置登录账号。
     *
     * @param username 用户提交的账号名。
     * @return 无返回值。
     */
    public void setUsername(String username) {
        this.username = username;
    }

    /**
     * 获取登录密码。
     *
     * @return 仅供认证服务即时校验的明文密码。
     */
    public String getPassword() {
        return password;
    }

    /**
     * 设置登录密码。
     *
     * @param password 用户提交的明文密码。
     * @return 无返回值。
     */
    public void setPassword(String password) {
        this.password = password;
    }
}
