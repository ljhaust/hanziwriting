package com.example.hanzi.dto;

import javax.validation.constraints.NotBlank;

/** 管理端新增古诗的最小完整请求。 */
public class PoemCreateRequest {
    /** 诗名。 */
    @NotBlank
    private String title;
    /** 作者姓名。 */
    @NotBlank
    private String author;
    /** 作者朝代。 */
    @NotBlank
    private String dynasty;
    /** 古诗全文。 */
    @NotBlank
    private String content;
    /** 适用年级。 */
    @NotBlank
    private String gradeLevel;
    /** 可选的课文注释。 */
    private String annotation;
    /** 可选的白话译文。 */
    private String translation;
    /** 可选的教材版本。 */
    private String textbookVersion;

    /** @return 古诗标题。 */
    public String getTitle() { return title; }
    /** @param title 古诗标题。 */
    public void setTitle(String title) { this.title = title; }
    /** @return 作者姓名。 */
    public String getAuthor() { return author; }
    /** @param author 作者姓名。 */
    public void setAuthor(String author) { this.author = author; }
    /** @return 作者朝代。 */
    public String getDynasty() { return dynasty; }
    /** @param dynasty 作者朝代。 */
    public void setDynasty(String dynasty) { this.dynasty = dynasty; }
    /** @return 古诗全文。 */
    public String getContent() { return content; }
    /** @param content 古诗全文。 */
    public void setContent(String content) { this.content = content; }
    /** @return 适用年级。 */
    public String getGradeLevel() { return gradeLevel; }
    /** @param gradeLevel 适用年级。 */
    public void setGradeLevel(String gradeLevel) { this.gradeLevel = gradeLevel; }
    /** @return 课文注释，未填写时为空。 */
    public String getAnnotation() { return annotation; }
    /** @param annotation 课文注释，可为空。 */
    public void setAnnotation(String annotation) { this.annotation = annotation; }
    /** @return 白话译文，未填写时为空。 */
    public String getTranslation() { return translation; }
    /** @param translation 白话译文，可为空。 */
    public void setTranslation(String translation) { this.translation = translation; }
    /** @return 教材版本，未填写时为空。 */
    public String getTextbookVersion() { return textbookVersion; }
    /** @param textbookVersion 教材版本，可为空。 */
    public void setTextbookVersion(String textbookVersion) { this.textbookVersion = textbookVersion; }
}
