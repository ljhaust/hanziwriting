package com.example.hanzi.web;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * 数据库资源不存在异常。
 *
 * <p>统一映射为 HTTP 404，避免查询不到数据时被错误报告为服务器内部异常。</p>
 */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class ResourceNotFoundException extends RuntimeException {
    /**
     * 创建资源不存在异常。
     *
     * @param message 可安全返回给调用端的缺失资源说明，不应包含敏感信息。
     */
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
