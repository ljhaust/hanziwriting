package com.example.hanzi.domain;

import java.util.ArrayList;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonIgnore;
import javax.persistence.CollectionTable;
import javax.persistence.Column;
import javax.persistence.ElementCollection;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.Id;
import javax.persistence.Lob;
import javax.persistence.JoinColumn;
import javax.persistence.Table;
import javax.validation.constraints.NotBlank;
import org.hibernate.annotations.Fetch;
import org.hibernate.annotations.FetchMode;

/**
 * 汉字字库实体。
 *
 * <p>保存拼音、部首、笔画数、年级和前端练习需要的笔画说明。
 * 复杂笔顺轨迹可在后续版本扩展为独立表或对象存储资源。</p>
 */
@Entity
@Table(name = "hanzi_character")
public class HanziCharacter {
    /** 汉字资源 ID。 */
    @Id
    private String id;

    /** 单个汉字文本。 */
    @NotBlank
    private String characterText;

    /** 拼音，含声调。 */
    private String pinyin;

    /** 部首。 */
    private String radical;

    /** 总笔画数。 */
    private Integer strokeCount;

    /** 适用年级。 */
    private String gradeLevel;

    /** 是否推荐到首页或常用练习区。 */
    private Boolean recommended;

    /** 资源标签，例如常用字、古诗常用。 */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "hanzi_tag", joinColumns = @JoinColumn(name = "hanzi_id"))
    @Column(name = "tag")
    @Fetch(FetchMode.SUBSELECT)
    private List<String> tags = new ArrayList<String>();

    /** 每一笔的中文说明。 */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "hanzi_stroke_desc", joinColumns = @JoinColumn(name = "hanzi_id"))
    @Column(name = "stroke_desc")
    @Fetch(FetchMode.SUBSELECT)
    private List<String> strokesDesc = new ArrayList<String>();

    /** 常见组词。 */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "hanzi_compound", joinColumns = @JoinColumn(name = "hanzi_id"))
    @Column(name = "compound")
    @Fetch(FetchMode.SUBSELECT)
    private List<String> compounds = new ArrayList<String>();

    /** Hanzi Writer 笔画路径数组的 JSON 文本，由后台导入并持久化。 */
    @Lob
    @JsonIgnore
    private String strokesJson;

    /** Hanzi Writer 笔画中线数组的 JSON 文本，由后台导入并持久化。 */
    @Lob
    @JsonIgnore
    private String mediansJson;

    /** 部首对应笔画索引数组的 JSON 文本，由后台导入并持久化。 */
    @Lob
    @JsonIgnore
    private String radStrokesJson;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getCharacterText() {
        return characterText;
    }

    public void setCharacterText(String characterText) {
        this.characterText = characterText;
    }

    public String getPinyin() {
        return pinyin;
    }

    public void setPinyin(String pinyin) {
        this.pinyin = pinyin;
    }

    public String getRadical() {
        return radical;
    }

    public void setRadical(String radical) {
        this.radical = radical;
    }

    public Integer getStrokeCount() {
        return strokeCount;
    }

    public void setStrokeCount(Integer strokeCount) {
        this.strokeCount = strokeCount;
    }

    public String getGradeLevel() {
        return gradeLevel;
    }

    public void setGradeLevel(String gradeLevel) {
        this.gradeLevel = gradeLevel;
    }

    @JsonProperty("is_recommended")
    public Boolean getRecommended() {
        return recommended;
    }

    @JsonProperty("is_recommended")
    public void setRecommended(Boolean recommended) {
        this.recommended = recommended;
    }

    public List<String> getTags() {
        return tags;
    }

    public void setTags(List<String> tags) {
        this.tags = tags;
    }

    public List<String> getStrokesDesc() {
        return strokesDesc;
    }

    public void setStrokesDesc(List<String> strokesDesc) {
        this.strokesDesc = strokesDesc;
    }

    public List<String> getCompounds() {
        return compounds;
    }

    public void setCompounds(List<String> compounds) {
        this.compounds = compounds;
    }

    /**
     * 获取笔画路径 JSON。
     *
     * @return 数据库存储的 JSON 数组文本，未配置时为空。
     */
    public String getStrokesJson() {
        return strokesJson;
    }

    /**
     * 设置笔画路径 JSON。
     *
     * @param strokesJson 经过 JSON 校验的笔画路径数组文本。
     * @return 无返回值。
     */
    public void setStrokesJson(String strokesJson) {
        this.strokesJson = strokesJson;
    }

    /**
     * 获取笔画中线 JSON。
     *
     * @return 数据库存储的 JSON 数组文本，未配置时为空。
     */
    public String getMediansJson() {
        return mediansJson;
    }

    /**
     * 设置笔画中线 JSON。
     *
     * @param mediansJson 经过 JSON 校验的笔画中线数组文本。
     * @return 无返回值。
     */
    public void setMediansJson(String mediansJson) {
        this.mediansJson = mediansJson;
    }

    /**
     * 获取部首笔画索引 JSON。
     *
     * @return 数据库存储的 JSON 数组文本，未配置时为空。
     */
    public String getRadStrokesJson() {
        return radStrokesJson;
    }

    /**
     * 设置部首笔画索引 JSON。
     *
     * @param radStrokesJson 经过 JSON 校验的部首笔画索引数组文本。
     * @return 无返回值。
     */
    public void setRadStrokesJson(String radStrokesJson) {
        this.radStrokesJson = radStrokesJson;
    }
}
