package com.example.hanzi.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.example.hanzi.web.InvalidCredentialsException;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

/**
 * 微信 code2session 登录服务单元测试。
 *
 * <p>测试使用本地 MockRestServiceServer，不连接微信网络，也不使用任何真实
 * AppID、AppSecret、登录 code 或 openid，确保认证行为可重复且不会泄露凭据。</p>
 */
class WechatLoginServiceTest {
    /** 测试专用 AppID，仅用于构造预期请求地址。 */
    private static final String TEST_APPID = "test-appid";

    /** 测试专用 AppSecret，不对应任何真实微信应用。 */
    private static final String TEST_SECRET = "test-secret";

    /** 测试专用一次性登录 code。 */
    private static final String TEST_CODE = "test-code";

    /** 测试专用 openid。 */
    private static final String TEST_OPENID = "test-openid";

    /** code2session 请求的完整测试地址。 */
    private static final String EXPECTED_REQUEST_URL =
        "https://api.weixin.qq.com/sns/jscode2session"
            + "?appid=" + TEST_APPID
            + "&secret=" + TEST_SECRET
            + "&js_code=" + TEST_CODE
            + "&grant_type=authorization_code";

    /**
     * 验证微信返回 openid 时服务原样返回身份标识。
     *
     * @return 无返回值；断言失败时由 JUnit 抛出测试异常。
     */
    @Test
    void shouldReturnOpenidWhenWechatAcceptsCode() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        WechatLoginService service = new WechatLoginService(TEST_APPID, TEST_SECRET, restTemplate);
        server.expect(requestTo(EXPECTED_REQUEST_URL))
            .andRespond(withSuccess("{\"openid\":\"" + TEST_OPENID + "\"}", MediaType.APPLICATION_JSON));

        String actualOpenid = service.exchangeOpenid(TEST_CODE);

        assertEquals(TEST_OPENID, actualOpenid);
        server.verify();
    }

    /**
     * 验证微信将 JSON 标记为 text/plain 时仍能成功解析 openid。
     *
     * @return 无返回值；断言失败时由 JUnit 抛出测试异常。
     */
    @Test
    void shouldParseJsonBodyWhenWechatUsesTextPlainContentType() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        WechatLoginService service = new WechatLoginService(TEST_APPID, TEST_SECRET, restTemplate);
        server.expect(requestTo(EXPECTED_REQUEST_URL))
            .andRespond(withSuccess("{\"openid\":\"" + TEST_OPENID + "\"}", MediaType.TEXT_PLAIN));

        String actualOpenid = service.exchangeOpenid(TEST_CODE);

        assertEquals(TEST_OPENID, actualOpenid);
        server.verify();
    }

    /**
     * 验证微信返回非零错误码时服务统一拒绝本地登录。
     *
     * @return 无返回值；断言失败时由 JUnit 抛出测试异常。
     */
    @Test
    void shouldRejectLoginWhenWechatReturnsErrorCode() {
        RestTemplate restTemplate = new RestTemplate();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restTemplate).build();
        WechatLoginService service = new WechatLoginService(TEST_APPID, TEST_SECRET, restTemplate);
        server.expect(requestTo(EXPECTED_REQUEST_URL))
            .andRespond(withSuccess("{\"errcode\":40029,\"errmsg\":\"invalid code\"}", MediaType.APPLICATION_JSON));

        assertThrows(InvalidCredentialsException.class, () -> service.exchangeOpenid(TEST_CODE));
        server.verify();
    }

    /**
     * 验证缺少微信凭据时在发起网络请求前立即报告配置错误。
     *
     * @return 无返回值；断言失败时由 JUnit 抛出测试异常。
     */
    @Test
    void shouldRejectMissingWechatCredentials() {
        RestTemplate restTemplate = new RestTemplate();
        WechatLoginService service = new WechatLoginService("", "", restTemplate);

        assertThrows(IllegalStateException.class, () -> service.exchangeOpenid(TEST_CODE));
    }
}
