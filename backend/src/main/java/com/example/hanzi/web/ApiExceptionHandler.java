package com.example.hanzi.web;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 将可预期业务异常转换为前端可直接展示的稳定 JSON 错误结构。
 *
 * <p>响应固定包含 code 和 message，不返回堆栈、数据库信息或认证凭据。</p>
 */
@RestControllerAdvice
public class ApiExceptionHandler {
    /**
     * 把禁用账号登录映射为明确的 HTTP 403。
     *
     * @param exception 账号禁用异常，其消息为固定的非敏感用户提示。
     * @return 包含 ACCOUNT_DISABLED 业务码和中文提示的 403 响应。
     */
    @ExceptionHandler(AccountDisabledException.class)
    public ResponseEntity<Map<String, String>> handleAccountDisabled(
        AccountDisabledException exception) {
        return error(HttpStatus.FORBIDDEN, "ACCOUNT_DISABLED", exception.getMessage());
    }

    /**
     * 把字表未收录、重复资源等业务校验失败映射为 HTTP 400。
     *
     * @param exception 携带可修正原因的请求异常。
     * @return 包含 INVALID_REQUEST 业务码和中文原因的 400 响应。
     */
    @ExceptionHandler(InvalidRequestException.class)
    public ResponseEntity<Map<String, String>> handleInvalidRequest(InvalidRequestException exception) {
        return error(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", exception.getMessage());
    }

    /**
     * 构建顺序稳定的简洁错误响应。
     *
     * @param status HTTP 状态。
     * @param code 便于前端分支处理的稳定业务码。
     * @param message 可向用户展示的中文说明。
     * @return 包含 code 和 message 的 HTTP 响应。
     */
    private ResponseEntity<Map<String, String>> error(HttpStatus status, String code, String message) {
        Map<String, String> body = new LinkedHashMap<String, String>();
        body.put("code", code);
        body.put("message", message);
        return ResponseEntity.status(status).body(body);
    }
}
