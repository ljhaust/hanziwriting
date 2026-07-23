package com.example.hanzi.dto;

import com.example.hanzi.domain.HanziCharacter;
import com.example.hanzi.domain.Poem;
import com.example.hanzi.domain.PracticeRecord;
import com.example.hanzi.domain.PracticeTask;
import com.example.hanzi.domain.UserAccount;
import java.util.List;

/**
 * 前端启动聚合响应。
 *
 * <p>一次返回管理端和原生微信小程序首屏需要的用户、字库、诗库、任务和练习记录，
 * 减少原型阶段的接口往返次数。</p>
 */
public class BootstrapResponse {
    /** 用户列表。 */
    private List<UserAccount> users;

    /** 汉字字库。 */
    private List<HanziCharacter> hanzi;

    /** 古诗资源。 */
    private List<Poem> poems;

    /** 练习任务。 */
    private List<PracticeTask> tasks;

    /** 练习记录。 */
    private List<PracticeRecord> records;

    /**
     * 无参构造。
     *
     * <p>Spring Boot 在反序列化请求体或框架内部重建对象时需要无参构造，
     * 业务代码应使用全参构造直接组装聚合数据。</p>
     */
    public BootstrapResponse() {
    }

    /**
     * 构造前端首屏聚合响应。
     *
     * @param users 用户列表。
     * @param hanzi 汉字字库。
     * @param poems 古诗资源。
     * @param tasks 练习任务。
     * @param records 练习记录。
     */
    public BootstrapResponse(List<UserAccount> users,
                             List<HanziCharacter> hanzi,
                             List<Poem> poems,
                             List<PracticeTask> tasks,
                             List<PracticeRecord> records) {
        this.users = users;
        this.hanzi = hanzi;
        this.poems = poems;
        this.tasks = tasks;
        this.records = records;
    }

    public List<UserAccount> getUsers() {
        return users;
    }

    public void setUsers(List<UserAccount> users) {
        this.users = users;
    }

    public List<HanziCharacter> getHanzi() {
        return hanzi;
    }

    public void setHanzi(List<HanziCharacter> hanzi) {
        this.hanzi = hanzi;
    }

    public List<Poem> getPoems() {
        return poems;
    }

    public void setPoems(List<Poem> poems) {
        this.poems = poems;
    }

    public List<PracticeTask> getTasks() {
        return tasks;
    }

    public void setTasks(List<PracticeTask> tasks) {
        this.tasks = tasks;
    }

    public List<PracticeRecord> getRecords() {
        return records;
    }

    public void setRecords(List<PracticeRecord> records) {
        this.records = records;
    }
}
