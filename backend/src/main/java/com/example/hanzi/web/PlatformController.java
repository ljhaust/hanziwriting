package com.example.hanzi.web;

import com.example.hanzi.domain.HanziCharacter;
import com.example.hanzi.domain.Poem;
import com.example.hanzi.domain.PracticeRecord;
import com.example.hanzi.domain.PracticeTask;
import com.example.hanzi.domain.UserAccount;
import com.example.hanzi.dto.BootstrapResponse;
import com.example.hanzi.dto.HanziRecommendedRequest;
import com.example.hanzi.dto.HanziStrokeResponse;
import com.example.hanzi.dto.LoginRequest;
import com.example.hanzi.dto.UserStatusRequest;
import com.example.hanzi.service.PlatformService;
import java.util.List;
import javax.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * 平台 REST 控制器。
 *
 * <p>向管理端和原生微信小程序提供数据库 API：启动数据、基础资源、作业任务和练习记录。</p>
 */
@RestController
@RequestMapping("/api")
public class PlatformController {
    private final PlatformService platformService;

    /**
     * 创建平台 REST 控制器。
     *
     * @param platformService 数据库业务服务。
     */
    public PlatformController(PlatformService platformService) {
        this.platformService = platformService;
    }

    /**
     * 获取前端启动聚合数据。
     *
     * @return 聚合后的用户、字库、诗库、任务和记录。
     */
    @GetMapping("/bootstrap")
    public BootstrapResponse bootstrap() {
        return platformService.bootstrap();
    }

    /**
     * 获取用户列表。
     *
     * @return 全部用户。
     */
    @GetMapping("/users")
    public List<UserAccount> users() {
        return platformService.listUsers();
    }

    /**
     * 使用数据库账号与密码摘要完成管理端登录。
     *
     * @param request 包含账号和本次输入密码的请求体。
     * @return 已通过认证的管理员或教师用户，响应不包含密码摘要。
     */
    @PostMapping("/auth/login")
    public UserAccount login(@Valid @RequestBody LoginRequest request) {
        return platformService.authenticate(request.getUsername(), request.getPassword());
    }

    /**
     * 创建用户。
     *
     * @param user 管理端提交的用户字段，主键和默认字段可省略。
     * @return 数据库保存后的用户。
     */
    @PostMapping("/users")
    public UserAccount createUser(@Valid @RequestBody UserAccount user) {
        return platformService.saveUser(user);
    }

    /**
     * 更新用户启停状态。
     *
     * @param id 用户数据库主键。
     * @param request 只包含合法目标状态的请求体。
     * @return 数据库更新后的用户。
     */
    @PutMapping("/users/{id}/status")
    public UserAccount updateUserStatus(@PathVariable String id,
                                        @Valid @RequestBody UserStatusRequest request) {
        return platformService.updateUserStatus(id, request.getStatus());
    }

    /**
     * 获取汉字字库。
     *
     * @return 全部汉字。
     */
    @GetMapping("/hanzi")
    public List<HanziCharacter> hanzi() {
        return platformService.listHanzi();
    }

    /**
     * 创建汉字资源。
     *
     * @param hanzi 管理端提交的汉字字段，主键可省略。
     * @return 数据库保存后的汉字资源。
     */
    @PostMapping("/hanzi")
    public HanziCharacter createHanzi(@Valid @RequestBody HanziCharacter hanzi) {
        return platformService.saveHanzi(hanzi);
    }

    /**
     * 更新汉字推荐状态。
     *
     * @param id 汉字数据库主键。
     * @param request 包含目标推荐状态的请求体。
     * @return 数据库更新后的汉字资源。
     */
    @PutMapping("/hanzi/{id}/recommended")
    public HanziCharacter updateHanziRecommended(@PathVariable String id,
                                                  @Valid @RequestBody HanziRecommendedRequest request) {
        return platformService.updateHanziRecommended(id, request.getRecommended());
    }

    /**
     * 获取指定汉字的数据库笔顺轨迹。
     *
     * @param characterText 单个汉字正文；Spring 会解码 URL 编码后的中文路径参数。
     * @return strokes、medians 和 radStrokes 均来自数据库 JSON 列的轨迹响应。
     */
    @GetMapping("/hanzi/{characterText}/strokes")
    public HanziStrokeResponse hanziStrokes(@PathVariable String characterText) {
        return platformService.getHanziStrokes(characterText);
    }

    /**
     * 获取古诗资源。
     *
     * @return 全部古诗。
     */
    @GetMapping("/poems")
    public List<Poem> poems() {
        return platformService.listPoems();
    }

    /**
     * 获取作业任务。
     *
     * @return 全部任务。
     */
    @GetMapping("/tasks")
    public List<PracticeTask> tasks() {
        return platformService.listTasks();
    }

    /**
     * 创建作业任务。
     *
     * @param task 请求体中的任务数据。
     * @return 保存后的任务。
     */
    @PostMapping("/tasks")
    public PracticeTask createTask(@Valid @RequestBody PracticeTask task) {
        return platformService.saveTask(task);
    }

    /**
     * 删除作业任务。
     *
     * @param id 任务 ID。
     */
    @DeleteMapping("/tasks/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTask(@PathVariable String id) {
        platformService.deleteTask(id);
    }

    /**
     * 获取练习记录。
     *
     * @return 全部练习记录。
     */
    @GetMapping("/records")
    public List<PracticeRecord> records() {
        return platformService.listRecords();
    }

    /**
     * 创建练习记录。
     *
     * @param record 请求体中的练习结果。
     * @return 保存后的练习记录。
     */
    @PostMapping("/records")
    public PracticeRecord createRecord(@Valid @RequestBody PracticeRecord record) {
        return platformService.saveRecord(record);
    }

    /**
     * 删除练习记录。
     *
     * @param id 记录 ID。
     */
    @DeleteMapping("/records/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRecord(@PathVariable String id) {
        platformService.deleteRecord(id);
    }
}
