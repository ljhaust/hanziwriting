package com.example.hanzi.web;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** 管理端账号或密码校验失败异常，统一返回 HTTP 401。 */
@ResponseStatus(HttpStatus.UNAUTHORIZED)
public class InvalidCredentialsException extends RuntimeException {
    /** 创建不暴露具体失败原因的认证异常。 */
    public InvalidCredentialsException() {
        super("账号或密码不正确");
    }
}
