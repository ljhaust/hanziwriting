package com.example.hanzi.dto;

import javax.validation.constraints.NotBlank;

/**
 * 微信小程序登录请求。
 *
 * <p>承载 wx.login 返回的临时 code 与可选的用户资料；code 由后端调用微信
 * code2session 接口换取 openid，不直接落库或写日志。用户资料字段在用户
 * 拒绝授权时为空，后端将使用默认昵称兜底。</p>
 */
public class WxLoginRequest {
    /** wx.login 返回的临时登录凭证，5 分钟内有效且只能使用一次。 */
    @NotBlank
    private String code;

    /** wx.getUserProfile 返回的昵称，用户拒绝授权时为空。 */
    private String nickname;

    /** wx.getUserProfile 返回的头像地址，用户拒绝授权时为空。 */
    private String avatarUrl;

    /**
     * 获取登录凭证。
     *
     * @return wx.login 返回的临时 code。
     */
    public String getCode() {
        return code;
    }

    /**
     * 设置登录凭证。
     *
     * @param code wx.login 返回的临时 code。
     */
    public void setCode(String code) {
        this.code = code;
    }

    /**
     * 获取昵称。
     *
     * @return 用户授权的昵称，可能为空。
     */
    public String getNickname() {
        return nickname;
    }

    /**
     * 设置昵称。
     *
     * @param nickname 用户授权的昵称。
     */
    public void setNickname(String nickname) {
        this.nickname = nickname;
    }

    /**
     * 获取头像地址。
     *
     * @return 用户授权的头像 URL，可能为空。
     */
    public String getAvatarUrl() {
        return avatarUrl;
    }

    /**
     * 设置头像地址。
     *
     * @param avatarUrl 用户授权的头像 URL。
     */
    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }
}
