-- 汉字书写与古诗背诵平台 MySQL 初始化脚本。
-- 业务意图：显式维护数据库结构，便于开发、测试和部署环境不依赖 Hibernate 自动建表。
-- 使用方式：先创建数据库，再执行本文件；演示数据可继续执行 seed.sql。

CREATE DATABASE IF NOT EXISTS hanzi_writing
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE hanzi_writing;

-- 用户账号表：覆盖管理员、教师、家长、学生四类用户。
CREATE TABLE IF NOT EXISTS user_account (
  id VARCHAR(64) NOT NULL COMMENT '用户唯一标识',
  username VARCHAR(64) NOT NULL COMMENT '登录账号',
  nickname VARCHAR(64) NOT NULL COMMENT '展示昵称',
  phone VARCHAR(32) DEFAULT NULL COMMENT '手机号，用于短信登录和家校关联',
  user_type VARCHAR(32) DEFAULT NULL COMMENT '用户类型：admin、teacher、parent、student',
  status VARCHAR(32) DEFAULT NULL COMMENT '账号状态：enabled、disabled',
  join_date VARCHAR(20) DEFAULT NULL COMMENT '注册日期，格式 yyyy-MM-dd',
  openid VARCHAR(64) DEFAULT NULL COMMENT '微信小程序 openid，用于微信登录识别用户',
  password_hash VARCHAR(100) DEFAULT NULL COMMENT 'BCrypt 密码摘要，禁止存储明文',
  PRIMARY KEY (id),
  UNIQUE KEY uk_user_account_username (username),
  UNIQUE KEY uk_user_account_openid (openid),
  KEY idx_user_account_phone (phone),
  KEY idx_user_account_type (user_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='平台用户账号';

-- 汉字字库主表：保存练字所需基础属性。
CREATE TABLE IF NOT EXISTS hanzi_character (
  id VARCHAR(64) NOT NULL COMMENT '汉字资源 ID',
  character_text VARCHAR(8) NOT NULL COMMENT '单个汉字',
  pinyin VARCHAR(64) DEFAULT NULL COMMENT '拼音，含声调',
  radical VARCHAR(16) DEFAULT NULL COMMENT '部首',
  stroke_count INT DEFAULT NULL COMMENT '总笔画数',
  grade_level VARCHAR(32) DEFAULT NULL COMMENT '适用年级',
  recommended BIT(1) DEFAULT b'0' COMMENT '是否推荐',
  strokes_json LONGTEXT DEFAULT NULL COMMENT 'Hanzi Writer SVG 笔画路径 JSON 数组',
  medians_json LONGTEXT DEFAULT NULL COMMENT 'Hanzi Writer 笔画中线 JSON 数组',
  rad_strokes_json LONGTEXT DEFAULT NULL COMMENT '部首笔画索引 JSON 数组',
  PRIMARY KEY (id),
  UNIQUE KEY uk_hanzi_character_text (character_text),
  KEY idx_hanzi_grade_level (grade_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='汉字字库';

-- 汉字标签表：一个汉字可拥有多个标签。
CREATE TABLE IF NOT EXISTS hanzi_tag (
  hanzi_id VARCHAR(64) NOT NULL COMMENT '汉字资源 ID',
  tag VARCHAR(64) NOT NULL COMMENT '标签',
  KEY idx_hanzi_tag_hanzi_id (hanzi_id),
  CONSTRAINT fk_hanzi_tag_hanzi
    FOREIGN KEY (hanzi_id) REFERENCES hanzi_character (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='汉字标签';

-- 汉字笔画说明表：按插入顺序保存每一笔的中文说明。
CREATE TABLE IF NOT EXISTS hanzi_stroke_desc (
  hanzi_id VARCHAR(64) NOT NULL COMMENT '汉字资源 ID',
  stroke_desc VARCHAR(64) NOT NULL COMMENT '笔画说明',
  KEY idx_hanzi_stroke_desc_hanzi_id (hanzi_id),
  CONSTRAINT fk_hanzi_stroke_desc_hanzi
    FOREIGN KEY (hanzi_id) REFERENCES hanzi_character (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='汉字笔画说明';

-- 汉字组词表：用于学习端展示词语拓展。
CREATE TABLE IF NOT EXISTS hanzi_compound (
  hanzi_id VARCHAR(64) NOT NULL COMMENT '汉字资源 ID',
  compound VARCHAR(64) NOT NULL COMMENT '组词',
  KEY idx_hanzi_compound_hanzi_id (hanzi_id),
  CONSTRAINT fk_hanzi_compound_hanzi
    FOREIGN KEY (hanzi_id) REFERENCES hanzi_character (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='汉字组词';

-- 古诗资源主表：保存正文、注释、译文和教材信息。
CREATE TABLE IF NOT EXISTS poem (
  id VARCHAR(64) NOT NULL COMMENT '古诗资源 ID',
  title VARCHAR(128) NOT NULL COMMENT '诗名',
  author VARCHAR(64) DEFAULT NULL COMMENT '作者',
  dynasty VARCHAR(32) DEFAULT NULL COMMENT '朝代',
  content VARCHAR(1000) DEFAULT NULL COMMENT '古诗全文',
  annotation VARCHAR(2000) DEFAULT NULL COMMENT '注释',
  translation VARCHAR(2000) DEFAULT NULL COMMENT '译文',
  grade_level VARCHAR(32) DEFAULT NULL COMMENT '适用年级',
  textbook_version VARCHAR(64) DEFAULT NULL COMMENT '教材版本',
  PRIMARY KEY (id),
  KEY idx_poem_title (title),
  KEY idx_poem_grade_level (grade_level)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='古诗资源';

-- 古诗关键词表：用于搜索、推荐和分类。
CREATE TABLE IF NOT EXISTS poem_keyword (
  poem_id VARCHAR(64) NOT NULL COMMENT '古诗资源 ID',
  keyword VARCHAR(64) NOT NULL COMMENT '关键词',
  KEY idx_poem_keyword_poem_id (poem_id),
  CONSTRAINT fk_poem_keyword_poem
    FOREIGN KEY (poem_id) REFERENCES poem (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='古诗关键词';

-- 古诗诗句表：拆分诗句并配置排序。
CREATE TABLE IF NOT EXISTS poem_sentence (
  id VARCHAR(64) NOT NULL COMMENT '诗句 ID',
  poem_id VARCHAR(64) DEFAULT NULL COMMENT '古诗资源 ID',
  sentence_text VARCHAR(255) DEFAULT NULL COMMENT '诗句正文',
  sort_no INT DEFAULT NULL COMMENT '诗句排序',
  PRIMARY KEY (id),
  KEY idx_poem_sentence_poem_id (poem_id),
  CONSTRAINT fk_poem_sentence_poem
    FOREIGN KEY (poem_id) REFERENCES poem (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='古诗诗句';

-- 古诗填空重点字表：背诵练习时隐藏的关键字。
CREATE TABLE IF NOT EXISTS poem_sentence_key_character (
  sentence_id VARCHAR(64) NOT NULL COMMENT '诗句 ID',
  key_character VARCHAR(8) NOT NULL COMMENT '填空重点字',
  KEY idx_poem_sentence_key_sentence_id (sentence_id),
  CONSTRAINT fk_poem_sentence_key_sentence
    FOREIGN KEY (sentence_id) REFERENCES poem_sentence (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='诗句填空重点字';

-- 练习任务主表：管理端发布给原生微信小程序学生端的作业。
CREATE TABLE IF NOT EXISTS practice_task (
  id VARCHAR(64) NOT NULL COMMENT '任务 ID',
  task_name VARCHAR(255) NOT NULL COMMENT '任务名称',
  task_type VARCHAR(32) DEFAULT NULL COMMENT '任务类型：hanzi、poem、mixed',
  target_type VARCHAR(32) DEFAULT NULL COMMENT '投放对象类型：all、class、user',
  target_id VARCHAR(128) DEFAULT NULL COMMENT '投放对象 ID',
  start_time VARCHAR(32) DEFAULT NULL COMMENT '开始时间，格式 yyyy-MM-dd HH:mm',
  end_time VARCHAR(32) DEFAULT NULL COMMENT '结束时间，格式 yyyy-MM-dd HH:mm',
  status VARCHAR(32) DEFAULT NULL COMMENT '状态：not_started、active、ended',
  PRIMARY KEY (id),
  KEY idx_practice_task_status (status),
  KEY idx_practice_task_target (target_type, target_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='练习任务';

-- 任务明细表：一条任务可以包含多个汉字或古诗。
CREATE TABLE IF NOT EXISTS task_item (
  id VARCHAR(64) NOT NULL COMMENT '任务明细 ID',
  task_id VARCHAR(64) DEFAULT NULL COMMENT '任务 ID',
  item_type VARCHAR(32) DEFAULT NULL COMMENT '条目类型：hanzi、poem',
  item_id VARCHAR(64) DEFAULT NULL COMMENT '条目资源 ID',
  sort_no INT DEFAULT NULL COMMENT '任务内排序',
  PRIMARY KEY (id),
  KEY idx_task_item_task_id (task_id),
  CONSTRAINT fk_task_item_task
    FOREIGN KEY (task_id) REFERENCES practice_task (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='任务明细';

-- 练习记录表：记录学生每次书写或背诵结果。
CREATE TABLE IF NOT EXISTS practice_record (
  id VARCHAR(64) NOT NULL COMMENT '记录 ID',
  user_id VARCHAR(64) DEFAULT NULL COMMENT '学生用户 ID',
  user_name VARCHAR(64) DEFAULT NULL COMMENT '学生展示姓名',
  task_id VARCHAR(64) DEFAULT NULL COMMENT '来源任务 ID',
  task_name VARCHAR(255) DEFAULT NULL COMMENT '来源任务名称',
  item_type VARCHAR(32) DEFAULT NULL COMMENT '练习对象类型：hanzi、poem',
  item_id VARCHAR(64) DEFAULT NULL COMMENT '练习对象 ID',
  item_name VARCHAR(128) DEFAULT NULL COMMENT '练习对象名称',
  complete_status VARCHAR(32) DEFAULT NULL COMMENT '完成状态：completed、in_progress',
  stroke_total INT DEFAULT NULL COMMENT '总笔画或总字数',
  stroke_completed INT DEFAULT NULL COMMENT '已完成笔画或字数',
  mistake_count INT DEFAULT NULL COMMENT '错误次数',
  hint_count INT DEFAULT NULL COMMENT '提示次数',
  score_level VARCHAR(8) DEFAULT NULL COMMENT '评分等级：A+、A、B、C',
  duration_seconds INT DEFAULT NULL COMMENT '练习耗时，单位秒',
  practice_time VARCHAR(32) DEFAULT NULL COMMENT '练习时间，格式 yyyy-MM-dd HH:mm',
  PRIMARY KEY (id),
  KEY idx_practice_record_user_id (user_id),
  KEY idx_practice_record_task_id (task_id),
  KEY idx_practice_record_time (practice_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='练习记录';
