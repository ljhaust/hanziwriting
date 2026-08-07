package com.example.hanzi.service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 小学分年级受控汉字字表。
 *
 * <p>字表与应用一起发布，所有拼音、部首、笔画数都可审查且不依赖
 * 第三方网络。同一汉字只定义一次，年级用于批量生成时分组；单字
 * 新增时管理员选择的年级作为最终业务年级。</p>
 */
final class LocalHanziCatalog {
    /** 按汉字索引的不可变字表。 */
    private static final Map<String, Definition> BY_CHARACTER = createCatalog();

    /** 纯静态字表不允许实例化。 */
    private LocalHanziCatalog() {
    }

    /**
     * 按汉字查询可自动补全的属性。
     *
     * @param characterText 单个汉字。
     * @return 字表中存在时返回定义，否则返回空。
     */
    static Optional<Definition> find(String characterText) {
        return Optional.ofNullable(BY_CHARACTER.get(characterText));
    }

    /**
     * 查询指定年级全部受控字条目。
     *
     * @param gradeLevel 完整年级名称，例如“一年级”。
     * @return 可随机打乱的独立字条列表。
     */
    static List<Definition> findByGrade(String gradeLevel) {
        List<Definition> matches = new ArrayList<Definition>();
        for (Definition definition : BY_CHARACTER.values()) {
            if (definition.getGradeLevel().equals(gradeLevel)) {
                matches.add(definition);
            }
        }
        return matches;
    }

    /**
     * 构建经人工校验的分年级基础字表。
     *
     * @return 以汉字为唯一键的不可变字表。
     */
    private static Map<String, Definition> createCatalog() {
        Map<String, Definition> values = new LinkedHashMap<String, Definition>();
        add(values, "一", "yī", "一", 1, "一年级", "一个", "一天");
        add(values, "人", "rén", "人", 2, "一年级", "人们", "大人");
        add(values, "大", "dà", "大", 3, "一年级", "大小", "大家");
        add(values, "日", "rì", "日", 4, "一年级", "日子", "日月");
        add(values, "月", "yuè", "月", 4, "一年级", "月亮", "日月");
        add(values, "水", "shuǐ", "水", 4, "一年级", "水果", "河水");
        add(values, "火", "huǒ", "火", 4, "一年级", "火花", "火车");
        add(values, "山", "shān", "山", 3, "一年级", "高山", "山水");
        add(values, "田", "tián", "田", 5, "一年级", "田地", "水田");
        add(values, "书", "shū", "乛", 4, "一年级", "书本", "读书");
        add(values, "学", "xué", "子", 8, "一年级", "学习", "学校");
        add(values, "春", "chūn", "日", 9, "二年级", "春天", "春风");
        add(values, "风", "fēng", "风", 4, "二年级", "风雨", "春风");
        add(values, "花", "huā", "艹", 7, "二年级", "花朵", "开花");
        add(values, "树", "shù", "木", 9, "二年级", "大树", "树木");
        add(values, "海", "hǎi", "氵", 10, "二年级", "大海", "海水");
        add(values, "园", "yuán", "囗", 7, "二年级", "花园", "公园");
        add(values, "国", "guó", "囗", 8, "三年级", "国家", "中国");
        add(values, "家", "jiā", "宀", 10, "三年级", "家人", "国家");
        add(values, "静", "jìng", "青", 14, "三年级", "安静", "平静");
        add(values, "温", "wēn", "氵", 12, "三年级", "温暖", "温和");
        add(values, "暖", "nuǎn", "日", 13, "三年级", "温暖", "暖风");
        add(values, "诚", "chéng", "讠", 8, "四年级", "诚实", "真诚");
        add(values, "勇", "yǒng", "力", 9, "四年级", "勇气", "勇敢");
        add(values, "健", "jiàn", "亻", 10, "四年级", "健康", "强健");
        add(values, "康", "kāng", "广", 11, "四年级", "健康", "康复");
        add(values, "责", "zé", "贝", 8, "五年级", "责任", "负责");
        add(values, "任", "rèn", "亻", 6, "五年级", "任务", "责任");
        add(values, "智", "zhì", "日", 12, "五年级", "智慧", "机智");
        add(values, "慧", "huì", "心", 15, "五年级", "智慧", "聪慧");
        add(values, "谦", "qiān", "讠", 12, "六年级", "谦虚", "谦让");
        add(values, "虚", "xū", "虍", 11, "六年级", "谦虚", "虚心");
        add(values, "毅", "yì", "殳", 15, "六年级", "毅力", "坚毅");
        add(values, "恒", "héng", "忄", 9, "六年级", "恒心", "永恒");
        return Collections.unmodifiableMap(values);
    }

    /**
     * 向字表注册一个带基础组词的唯一汉字。
     *
     * @param values 待填充的有序字表。
     * @param characterText 汉字文本。
     * @param pinyin 带声调拼音。
     * @param radical 部首。
     * @param strokeCount 总笔画数。
     * @param gradeLevel 字表建议年级。
     * @param compounds 可供学习端展示的基础组词。
     */
    private static void add(Map<String, Definition> values, String characterText, String pinyin,
                            String radical, int strokeCount, String gradeLevel, String... compounds) {
        values.put(characterText, new Definition(
            characterText, pinyin, radical, strokeCount, gradeLevel, Arrays.asList(compounds)
        ));
    }

    /** 受控字表中一个汉字的不可变属性定义。 */
    static final class Definition {
        private final String characterText;
        private final String pinyin;
        private final String radical;
        private final int strokeCount;
        private final String gradeLevel;
        private final List<String> compounds;

        /**
         * 创建一条受控汉字定义。
         *
         * @param characterText 汉字文本。
         * @param pinyin 带声调拼音。
         * @param radical 部首。
         * @param strokeCount 总笔画数。
         * @param gradeLevel 建议年级。
         * @param compounds 基础组词。
         */
        Definition(String characterText, String pinyin, String radical, int strokeCount,
                   String gradeLevel, List<String> compounds) {
            this.characterText = characterText;
            this.pinyin = pinyin;
            this.radical = radical;
            this.strokeCount = strokeCount;
            this.gradeLevel = gradeLevel;
            this.compounds = Collections.unmodifiableList(new ArrayList<String>(compounds));
        }

        /** @return 汉字文本。 */
        String getCharacterText() { return characterText; }
        /** @return 带声调拼音。 */
        String getPinyin() { return pinyin; }
        /** @return 部首。 */
        String getRadical() { return radical; }
        /** @return 总笔画数。 */
        int getStrokeCount() { return strokeCount; }
        /** @return 字表建议年级。 */
        String getGradeLevel() { return gradeLevel; }
        /** @return 不可变的基础组词列表。 */
        List<String> getCompounds() { return compounds; }
    }
}
