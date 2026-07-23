package com.example.hanzi;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 汉字书写与古诗背诵平台后端启动类。
 *
 * <p>输入是 JVM 启动参数和 Spring Boot 配置，输出是一个提供 REST API 和
 * MySQL 持久化能力的应用进程。</p>
 */
@SpringBootApplication
public class HanziWritingApplication {

    /**
     * 应用启动入口。
     *
     * @param args 命令行参数，由 Spring Boot 原样接收。
     */
    public static void main(String[] args) {
        SpringApplication.run(HanziWritingApplication.class, args);
    }
}
