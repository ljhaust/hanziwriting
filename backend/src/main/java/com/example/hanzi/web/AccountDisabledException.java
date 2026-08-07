package com.example.hanzi.web;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * 账号被管理员禁用时的明确认证异常。
 *
 * <p>使用 HTTP 403 区分“凭据错误”与“账号已禁用”，便于管理端和
 * 小程序向用户展示可操作的原因，而不暴露任何认证凭据。</p>
 */
@ResponseStatus(HttpStatus.FORBIDDEN)
public class AccountDisabledException extends RuntimeException {
    /** 创建带固定用户提示的禁用异常。 */
    public AccountDisabledException() {
        super("账号已被禁用，请联系管理员");
    }
}
