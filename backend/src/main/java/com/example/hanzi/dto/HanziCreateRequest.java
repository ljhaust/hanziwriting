package com.example.hanzi.dto;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Pattern;

/**
 * 单个汉字新增请求。
 *
 * <p>管理端只提交汉字和年级，拼音、部首、笔画数和标签由后端
 * 从受控本地字表中补全。</p>
 */
public class HanziCreateRequest {
    /** 单个 CJK 统一汉字。 */
    @NotBlank
    @Pattern(regexp = "^[\\u4E00-\\u9FFF]$", message = "汉字必须是单个中文字符")
    private String characterText;

    /** 适用年级，例如“一年级”。 */
    @NotBlank
    @Pattern(regexp = "^[一二三四五六]年级$", message = "年级必须是一至六年级")
    private String gradeLevel;

    /**
     * 获取待新增的汉字。
     *
     * @return 单个汉字文本。
     */
    public String getCharacterText() {
        return characterText;
    }

    /**
     * 设置待新增的汉字。
     *
     * @param characterText 单个汉字文本。
     */
    public void setCharacterText(String characterText) {
        this.characterText = characterText;
    }

    /**
     * 获取管理员选择的年级。
     *
     * @return 年级名称。
     */
    public String getGradeLevel() {
        return gradeLevel;
    }

    /**
     * 设置汉字适用年级。
     *
     * @param gradeLevel 年级名称。
     */
    public void setGradeLevel(String gradeLevel) {
        this.gradeLevel = gradeLevel;
    }
}
