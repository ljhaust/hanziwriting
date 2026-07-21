package com.example.hanzi.domain;

import java.util.ArrayList;
import java.util.List;
import javax.persistence.CascadeType;
import javax.persistence.CollectionTable;
import javax.persistence.Column;
import javax.persistence.ElementCollection;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.OneToMany;
import javax.persistence.OrderBy;
import javax.persistence.Table;
import javax.validation.constraints.NotBlank;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;

/**
 * 古诗资源实体。
 *
 * <p>保存正文、作者、注释、译文和可填空诗句，支持小程序端背诵、
 * 原生小程序学习与管理端资源维护。</p>
 */
@Entity
@Table(name = "poem")
public class Poem {
    /** 古诗资源 ID。 */
    @Id
    private String id;

    /** 古诗标题。 */
    @NotBlank
    private String title;

    /** 作者姓名。 */
    private String author;

    /** 作者朝代。 */
    private String dynasty;

    /** 古诗全文。 */
    @Column(length = 1000)
    private String content;

    /** 课文注释。 */
    @Column(length = 2000)
    private String annotation;

    /** 白话译文。 */
    @Column(length = 2000)
    private String translation;

    /** 适用年级。 */
    private String gradeLevel;

    /** 教材版本。 */
    private String textbookVersion;

    /** 关键词，用于搜索和推荐。 */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "poem_keyword", joinColumns = @JoinColumn(name = "poem_id"))
    @Column(name = "keyword")
    @Fetch(FetchMode.SUBSELECT)
    private List<String> keywords = new ArrayList<String>();

    /** 逐句配置，包含填空重点字。 */
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JoinColumn(name = "poem_id")
    @OrderBy("sortNo ASC")
    @Fetch(FetchMode.SUBSELECT)
    private List<PoemSentence> sentences = new ArrayList<PoemSentence>();

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getAuthor() {
        return author;
    }

    public void setAuthor(String author) {
        this.author = author;
    }

    public String getDynasty() {
        return dynasty;
    }

    public void setDynasty(String dynasty) {
        this.dynasty = dynasty;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getAnnotation() {
        return annotation;
    }

    public void setAnnotation(String annotation) {
        this.annotation = annotation;
    }

    public String getTranslation() {
        return translation;
    }

    public void setTranslation(String translation) {
        this.translation = translation;
    }

    public String getGradeLevel() {
        return gradeLevel;
    }

    public void setGradeLevel(String gradeLevel) {
        this.gradeLevel = gradeLevel;
    }

    public String getTextbookVersion() {
        return textbookVersion;
    }

    public void setTextbookVersion(String textbookVersion) {
        this.textbookVersion = textbookVersion;
    }

    public List<String> getKeywords() {
        return keywords;
    }

    public void setKeywords(List<String> keywords) {
        this.keywords = keywords;
    }

    public List<PoemSentence> getSentences() {
        return sentences;
    }

    public void setSentences(List<PoemSentence> sentences) {
        this.sentences = sentences;
    }
}
