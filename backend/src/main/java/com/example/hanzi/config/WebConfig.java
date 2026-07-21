package com.example.hanzi.config;

import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Web 层配置。
 *
 * <p>当前只配置前后端分离开发所需的 CORS 白名单，白名单通过环境变量覆盖。</p>
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final List<String> allowedOrigins;

    public WebConfig(@Value("${app.cors.allowed-origins}") String allowedOrigins) {
        this.allowedOrigins = Arrays.asList(allowedOrigins.split(","));
    }

    /**
     * 注册跨域规则。
     *
     * @param registry Spring MVC 提供的 CORS 注册器。
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
            .allowedOrigins(allowedOrigins.toArray(new String[0]))
            .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
            .allowedHeaders("*");
    }
}
