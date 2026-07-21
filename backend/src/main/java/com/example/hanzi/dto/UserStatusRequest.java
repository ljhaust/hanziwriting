package com.example.hanzi.dto;

import javax.validation.constraints.Pattern;
import javax.validation.constraints.NotBlank;

/** 用户启停状态更新请求，只允许数据库约定的两个状态值。 */
public class UserStatusRequest {
    /** 目标状态。 */
    @NotBlank
    @Pattern(regexp = "enabled|disabled")
    private String status;

    /**
     * 获取目标状态。
     *
     * @return `enabled` 或 `disabled`。
     */
    public String getStatus() {
        return status;
    }

    /**
     * 设置目标状态。
     *
     * @param status 数据库允许的用户状态。
     * @return 无返回值。
     */
    public void setStatus(String status) {
        this.status = status;
    }
}
