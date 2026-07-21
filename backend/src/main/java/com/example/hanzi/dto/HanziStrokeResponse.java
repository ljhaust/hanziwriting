package com.example.hanzi.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;

/**
 * 小程序笔顺轨迹响应。
 *
 * <p>三个轨迹字段均由数据库 JSON 列解析得到，接口不会请求 CDN，
 * 也不会在无数据时构造占位轨迹。</p>
 */
public class HanziStrokeResponse {
    /** 汉字正文。 */
    @JsonProperty("character_text")
    private final String characterText;

    /** SVG 笔画路径数组。 */
    private final JsonNode strokes;

    /** 每一笔的中线坐标数组。 */
    private final JsonNode medians;

    /** 属于部首的笔画索引数组。 */
    @JsonProperty("radStrokes")
    private final JsonNode radStrokes;

    /**
     * 创建数据库笔顺响应。
     *
     * @param characterText 汉字正文。
     * @param strokes 数据库 strokes_json 解析结果。
     * @param medians 数据库 medians_json 解析结果。
     * @param radStrokes 数据库 rad_strokes_json 解析结果。
     */
    public HanziStrokeResponse(String characterText, JsonNode strokes, JsonNode medians, JsonNode radStrokes) {
        this.characterText = characterText;
        this.strokes = strokes;
        this.medians = medians;
        this.radStrokes = radStrokes;
    }

    /** @return 汉字正文。 */
    public String getCharacterText() {
        return characterText;
    }

    /** @return SVG 笔画路径数组。 */
    public JsonNode getStrokes() {
        return strokes;
    }

    /** @return 每一笔的中线坐标数组。 */
    public JsonNode getMedians() {
        return medians;
    }

    /** @return 属于部首的笔画索引数组。 */
    public JsonNode getRadStrokes() {
        return radStrokes;
    }
}
