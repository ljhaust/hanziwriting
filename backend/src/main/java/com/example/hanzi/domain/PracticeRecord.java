package com.example.hanzi.domain;

import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;

/**
 * 练习记录实体。
 *
 * <p>承载学生每次汉字书写或古诗背诵的结果，用于学生端记录、
 * 小程序成长记录和管理端统计审阅。</p>
 */
@Entity
@Table(name = "practice_record")
public class PracticeRecord {
    /** 记录 ID。 */
    @Id
    private String id;

    /** 学生用户 ID。 */
    private String userId;

    /** 学生展示姓名，冗余保存便于历史记录阅读。 */
    private String userName;

    /** 来源任务 ID，可为空表示自主练习。 */
    private String taskId;

    /** 来源任务名称，可为空表示自主练习。 */
    private String taskName;

    /** 练习对象类型：hanzi 或 poem。 */
    private String itemType;

    /** 练习对象 ID。 */
    private String itemId;

    /** 练习对象名称，例如汉字或诗名。 */
    private String itemName;

    /** 完成状态：completed 或 in_progress。 */
    private String completeStatus;

    /** 总笔画或总字数。 */
    private Integer strokeTotal;

    /** 已完成笔画或已完成字数。 */
    private Integer strokeCompleted;

    /** 错误次数。 */
    private Integer mistakeCount;

    /** 提示次数。 */
    private Integer hintCount;

    /** 评分等级：A+、A、B、C。 */
    private String scoreLevel;

    /** 练习耗时，单位秒。 */
    private Integer durationSeconds;

    /** 练习时间文本，格式为 yyyy-MM-dd HH:mm。 */
    private String practiceTime;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public String getTaskId() {
        return taskId;
    }

    public void setTaskId(String taskId) {
        this.taskId = taskId;
    }

    public String getTaskName() {
        return taskName;
    }

    public void setTaskName(String taskName) {
        this.taskName = taskName;
    }

    public String getItemType() {
        return itemType;
    }

    public void setItemType(String itemType) {
        this.itemType = itemType;
    }

    public String getItemId() {
        return itemId;
    }

    public void setItemId(String itemId) {
        this.itemId = itemId;
    }

    public String getItemName() {
        return itemName;
    }

    public void setItemName(String itemName) {
        this.itemName = itemName;
    }

    public String getCompleteStatus() {
        return completeStatus;
    }

    public void setCompleteStatus(String completeStatus) {
        this.completeStatus = completeStatus;
    }

    public Integer getStrokeTotal() {
        return strokeTotal;
    }

    public void setStrokeTotal(Integer strokeTotal) {
        this.strokeTotal = strokeTotal;
    }

    public Integer getStrokeCompleted() {
        return strokeCompleted;
    }

    public void setStrokeCompleted(Integer strokeCompleted) {
        this.strokeCompleted = strokeCompleted;
    }

    public Integer getMistakeCount() {
        return mistakeCount;
    }

    public void setMistakeCount(Integer mistakeCount) {
        this.mistakeCount = mistakeCount;
    }

    public Integer getHintCount() {
        return hintCount;
    }

    public void setHintCount(Integer hintCount) {
        this.hintCount = hintCount;
    }

    public String getScoreLevel() {
        return scoreLevel;
    }

    public void setScoreLevel(String scoreLevel) {
        this.scoreLevel = scoreLevel;
    }

    public Integer getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(Integer durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public String getPracticeTime() {
        return practiceTime;
    }

    public void setPracticeTime(String practiceTime) {
        this.practiceTime = practiceTime;
    }
}
