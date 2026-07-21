package com.example.hanzi.domain;

import java.util.ArrayList;
import java.util.List;
import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.OneToMany;
import javax.persistence.OrderBy;
import javax.persistence.Table;
import javax.validation.constraints.NotBlank;

/**
 * 练习任务实体。
 *
 * <p>由管理端创建，原生微信小程序读取后展示为今日作业。</p>
 */
@Entity
@Table(name = "practice_task")
public class PracticeTask {
    /** 任务 ID。 */
    @Id
    private String id;

    /** 任务名称。 */
    @NotBlank
    private String taskName;

    /** 任务类型：hanzi、poem、mixed。 */
    private String taskType;

    /** 投放对象类型：all、class、user。 */
    private String targetType;

    /** 投放对象 ID。 */
    private String targetId;

    /** 开始时间文本，原型阶段使用 yyyy-MM-dd HH:mm。 */
    private String startTime;

    /** 结束时间文本，原型阶段使用 yyyy-MM-dd HH:mm。 */
    private String endTime;

    /** 状态：not_started、active、ended。 */
    private String status;

    /** 任务包含的汉字或古诗条目。 */
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    @JoinColumn(name = "task_id")
    @OrderBy("sortNo ASC")
    private List<TaskItem> items = new ArrayList<TaskItem>();

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTaskName() {
        return taskName;
    }

    public void setTaskName(String taskName) {
        this.taskName = taskName;
    }

    public String getTaskType() {
        return taskType;
    }

    public void setTaskType(String taskType) {
        this.taskType = taskType;
    }

    public String getTargetType() {
        return targetType;
    }

    public void setTargetType(String targetType) {
        this.targetType = targetType;
    }

    public String getTargetId() {
        return targetId;
    }

    public void setTargetId(String targetId) {
        this.targetId = targetId;
    }

    public String getStartTime() {
        return startTime;
    }

    public void setStartTime(String startTime) {
        this.startTime = startTime;
    }

    public String getEndTime() {
        return endTime;
    }

    public void setEndTime(String endTime) {
        this.endTime = endTime;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public List<TaskItem> getItems() {
        return items;
    }

    public void setItems(List<TaskItem> items) {
        this.items = items;
    }
}
