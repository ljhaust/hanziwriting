package com.example.hanzi.domain;

import javax.persistence.Entity;
import javax.persistence.Id;
import javax.persistence.Table;

/**
 * 任务明细实体。
 *
 * <p>一条明细指向一个汉字或一首古诗，前端按 `sortNo` 展示练习顺序。</p>
 */
@Entity
@Table(name = "task_item")
public class TaskItem {
    /** 明细 ID。 */
    @Id
    private String id;

    /** 条目类型：hanzi 或 poem。 */
    private String itemType;

    /** 被引用的汉字或古诗 ID。 */
    private String itemId;

    /** 任务内排序。 */
    private Integer sortNo;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
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

    public Integer getSortNo() {
        return sortNo;
    }

    public void setSortNo(Integer sortNo) {
        this.sortNo = sortNo;
    }
}
