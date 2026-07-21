package com.example.hanzi.dto;

import javax.validation.constraints.NotNull;

/** 汉字推荐状态更新请求。 */
public class HanziRecommendedRequest {
    /** 是否在推荐区域展示。 */
    @NotNull
    private Boolean recommended;

    /**
     * 获取目标推荐状态。
     *
     * @return true 表示推荐，false 表示取消推荐。
     */
    public Boolean getRecommended() {
        return recommended;
    }

    /**
     * 设置目标推荐状态。
     *
     * @param recommended 管理端提交的推荐状态。
     * @return 无返回值。
     */
    public void setRecommended(Boolean recommended) {
        this.recommended = recommended;
    }
}
