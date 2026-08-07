package com.example.hanzi.dto;

import javax.validation.constraints.Max;
import javax.validation.constraints.Min;
import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;
import javax.validation.constraints.Pattern;

/** 按年级从本地受控字表随机生成缺失汉字的请求。 */
public class HanziGenerateRequest {
    /** 目标年级，与本地字表的年级名称一致。 */
    @NotBlank
    @Pattern(regexp = "^[一二三四五六]年级$", message = "年级必须是一至六年级")
    private String gradeLevel;

    /** 本次最多新增数量，限制为 1 至 100 以避免误操作。 */
    @NotNull
    @Min(1)
    @Max(100)
    private Integer count;

    /**
     * 获取目标年级。
     *
     * @return 年级名称。
     */
    public String getGradeLevel() {
        return gradeLevel;
    }

    /**
     * 设置目标年级。
     *
     * @param gradeLevel 年级名称。
     */
    public void setGradeLevel(String gradeLevel) {
        this.gradeLevel = gradeLevel;
    }

    /**
     * 获取期望生成数量。
     *
     * @return 1 至 100 的数量。
     */
    public Integer getCount() {
        return count;
    }

    /**
     * 设置期望生成数量。
     *
     * @param count 本次最多新增数量。
     */
    public void setCount(Integer count) {
        this.count = count;
    }
}
