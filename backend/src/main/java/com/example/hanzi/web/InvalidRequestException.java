package com.example.hanzi.web;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/** 业务请求不符合本地资源或数据约束时的 HTTP 400 异常。 */
@ResponseStatus(HttpStatus.BAD_REQUEST)
public class InvalidRequestException extends RuntimeException {
    /**
     * 创建携带可修正原因的请求异常。
     *
     * @param message 面向调用方的非敏感错误说明。
     */
    public InvalidRequestException(String message) {
        super(message);
    }
}
