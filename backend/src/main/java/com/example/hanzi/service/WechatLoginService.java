package com.example.hanzi.service;

import com.example.hanzi.web.InvalidCredentialsException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

/**
 * 微信小程序登录服务。
 *
 * <p>封装 code2session 调用：把前端 wx.login 返回的 code 换成 openid，
 * 供 PlatformService 查找或创建本地用户。AppSecret 通过环境变量注入，
 * 缺失时直接抛出 IllegalStateException，不静默降级为匿名登录。</p>
 */
@Service
public class WechatLoginService {
    /** 仅记录微信返回的错误码与错误说明，严禁记录 AppSecret、登录 code 或 openid。 */
    private static final Logger LOGGER = LoggerFactory.getLogger(WechatLoginService.class);

    private static final String CODE2SESSION_URL =
        "https://api.weixin.qq.com/sns/jscode2session"
            + "?appid={appid}&secret={secret}&js_code={code}&grant_type=authorization_code";

    private final String appid;
    private final String secret;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    /**
     * 创建微信登录服务。
     *
     * @param appid 微信小程序 appid，由 wx.appid 配置项注入。
     * @param secret 微信小程序 AppSecret，由 wx.secret 配置项注入。
     */
    @Autowired
    public WechatLoginService(@Value("${wx.appid:}") String appid,
                              @Value("${wx.secret:}") String secret) {
        this(appid, secret, new RestTemplate(), new ObjectMapper());
    }

    /**
     * 创建可注入 HTTP 客户端的微信登录服务。
     *
     * <p>该构造器保持包级可见，专门用于单元测试绑定 MockRestServiceServer；
     * 生产环境仍通过公开构造器创建默认 RestTemplate，避免增加额外 Bean 配置。</p>
     *
     * @param appid 微信小程序 appid。
     * @param secret 微信小程序 AppSecret。
     * @param restTemplate 调用微信 code2session 的 HTTP 客户端。
     */
    WechatLoginService(String appid, String secret, RestTemplate restTemplate) {
        this(appid, secret, restTemplate, new ObjectMapper());
    }

    /**
     * 创建可注入 HTTP 客户端和 JSON 解析器的微信登录服务。
     *
     * <p>该构造器保持包级可见，供单元测试绑定 MockRestServiceServer；生产环境
     * 使用公开构造器。将响应先按字符串读取，是为了兼容微信接口返回 JSON 文本但
     * Content-Type 标记为 text/plain 的情况。</p>
     *
     * @param appid 微信小程序 appid。
     * @param secret 微信小程序 AppSecret。
     * @param restTemplate 调用微信 code2session 的 HTTP 客户端。
     * @param objectMapper 解析微信 JSON 响应的 Jackson 解析器。
     */
    WechatLoginService(String appid, String secret, RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.appid = appid;
        this.secret = secret;
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * 用 code 换取微信 openid。
     *
     * @param code wx.login 返回的临时登录凭证。
     * @return 当前微信用户的 openid。
     * @throws IllegalStateException 未配置 appid 或 AppSecret 时抛出，映射为 HTTP 500。
     * @throws InvalidCredentialsException 微信返回错误或缺少 openid 时抛出，映射为 HTTP 401。
     */
    public String exchangeOpenid(String code) {
        if (isBlank(appid) || isBlank(secret)) {
            throw new IllegalStateException("未配置微信登录凭据，请通过 HANZI_WX_APPID/HANZI_WX_SECRET 设置");
        }
        try {
            // 微信部分环境会把 JSON 响应标记为 text/plain；按 String 接收可避免
            // RestTemplate 因媒体类型不匹配抛出 UnknownContentTypeException。
            String responseBody = restTemplate.getForObject(
                CODE2SESSION_URL,
                String.class,
                appid,
                secret,
                code
            );
            if (isBlank(responseBody)) {
                // 空响应不能区分用户身份，记录不含凭据的原因后统一按认证失败处理。
                LOGGER.warn("微信 code2session 返回空响应");
                throw new InvalidCredentialsException();
            }
            Map<String, Object> response;
            try {
                response = objectMapper.readValue(
                    responseBody,
                    new TypeReference<Map<String, Object>>() { }
                );
            } catch (JsonProcessingException exception) {
                // 仅记录异常类型，不记录原始响应，避免第三方响应携带会话字段或敏感内容。
                LOGGER.warn("微信 code2session 返回内容无法解析：{}", exception.getClass().getSimpleName());
                throw new InvalidCredentialsException();
            }
            Object errcode = response.get("errcode");
            if (errcode != null && !"0".equals(String.valueOf(errcode))) {
                // errcode 与 errmsg 不包含本地密钥，可帮助区分无效 code、频率限制等上游原因。
                LOGGER.warn(
                    "微信 code2session 拒绝登录：errcode={}, errmsg={}",
                    String.valueOf(errcode),
                    String.valueOf(response.get("errmsg"))
                );
                throw new InvalidCredentialsException();
            }
            Object openid = response.get("openid");
            if (!(openid instanceof String) || ((String) openid).isEmpty()) {
                // 成功响应缺少 openid 属于微信响应契约异常，不记录完整响应以避免泄露会话字段。
                LOGGER.warn("微信 code2session 响应缺少 openid");
                throw new InvalidCredentialsException();
            }
            return (String) openid;
        } catch (InvalidCredentialsException | IllegalStateException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            // 网络异常或反序列化失败统一视为登录失败，避免把底层堆栈暴露给调用端。
            LOGGER.warn("调用微信 code2session 失败：{}", exception.getClass().getSimpleName());
            throw new InvalidCredentialsException();
        }
    }

    /**
     * 判断业务文本是否缺失。
     *
     * @param value 待检查文本。
     * @return null、空串或仅空白字符时返回 true。
     */
    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
