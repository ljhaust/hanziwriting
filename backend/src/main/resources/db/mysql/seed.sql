-- 汉字书写与古诗背诵平台演示数据。
-- 业务意图：让新环境导入 schema.sql 后能立即看到原生小程序端和管理端的联动效果。
-- 注意：本脚本使用 DELETE 清理演示主键数据，适合开发和测试环境，不建议直接在生产库执行。

USE hanzi_writing;

DELETE FROM practice_record WHERE id IN ('R901', 'R902');
DELETE FROM task_item WHERE id IN ('TI50101', 'TI50102', 'TI50103', 'TI50201');
DELETE FROM practice_task WHERE id IN ('T501', 'T502');
DELETE FROM poem_sentence_key_character WHERE sentence_id IN ('S101', 'S102', 'S103', 'S104', 'S201', 'S202', 'S203', 'S204');
DELETE FROM poem_sentence WHERE id IN ('S101', 'S102', 'S103', 'S104', 'S201', 'S202', 'S203', 'S204');
DELETE FROM poem_keyword WHERE poem_id IN ('P001', 'P002');
DELETE FROM poem WHERE id IN ('P001', 'P002');
DELETE FROM hanzi_compound WHERE hanzi_id IN ('H001', 'H003', 'H005', 'H006', 'H007');
DELETE FROM hanzi_stroke_desc WHERE hanzi_id IN ('H001', 'H003', 'H005', 'H006', 'H007');
DELETE FROM hanzi_tag WHERE hanzi_id IN ('H001', 'H003', 'H005', 'H006', 'H007');
DELETE FROM hanzi_character WHERE id IN ('H001', 'H003', 'H005', 'H006', 'H007');
DELETE FROM user_account WHERE id IN ('U101', 'U102', 'U103', 'U104', 'U105');

INSERT INTO user_account (id, username, nickname, phone, user_type, status, join_date, password_hash) VALUES
('U101', 'admin', '张系统管理员', '13800000001', 'admin', 'enabled', '2026-01-01', '$2y$10$ChLwwQ229DDOoPcK5Xd96u4J/yIdDTY334LSJYMunGNI6XJQY/OCi'),
('U102', 'teacher_wang', '王美玲老师', '13911112222', 'teacher', 'enabled', '2026-02-15', '$2y$10$ChLwwQ229DDOoPcK5Xd96u4J/yIdDTY334LSJYMunGNI6XJQY/OCi'),
('U103', 'parent_li', '轩轩妈妈', '18655556666', 'parent', 'enabled', '2026-03-10', NULL),
('U104', 'student_xuan', '李梓轩', '18655556666', 'student', 'enabled', '2026-03-11', NULL),
('U105', 'student_yanyan', '陈妍妍', '13599998888', 'student', 'enabled', '2026-03-12', NULL);

INSERT INTO hanzi_character (id, character_text, pinyin, radical, stroke_count, grade_level, recommended) VALUES
('H001', '书', 'shū', '乛', 4, '一年级', b'1'),
('H003', '学', 'xué', '子', 8, '一年级', b'1'),
('H005', '静', 'jìng', '青', 14, '三年级', b'0'),
('H006', '夜', 'yè', '夕', 8, '一年级', b'1'),
('H007', '思', 'sī', '心', 9, '一年级', b'1');

INSERT INTO hanzi_tag (hanzi_id, tag) VALUES
('H001', '基础生字'), ('H001', '常用字'),
('H003', '核心字'), ('H003', '高频字'),
('H005', '品质'), ('H005', '抒情'),
('H006', '自然'), ('H006', '时间'),
('H007', '心理'), ('H007', '常用字');

INSERT INTO hanzi_stroke_desc (hanzi_id, stroke_desc) VALUES
('H001', '横折'), ('H001', '横折钩'), ('H001', '竖'), ('H001', '点'),
('H003', '点'), ('H003', '点'), ('H003', '撇'), ('H003', '点'), ('H003', '横撇'), ('H003', '弯钩'), ('H003', '横'),
('H005', '横'), ('H005', '横'), ('H005', '竖'), ('H005', '横'), ('H005', '竖'), ('H005', '横折'), ('H005', '横'), ('H005', '横'), ('H005', '撇'), ('H005', '折'), ('H005', '竖'), ('H005', '横'), ('H005', '竖'), ('H005', '横'),
('H006', '点'), ('H006', '横'), ('H006', '撇'), ('H006', '竖'), ('H006', '横折'), ('H006', '横'), ('H006', '撇'), ('H006', '捺'),
('H007', '竖'), ('H007', '横折'), ('H007', '横'), ('H007', '竖'), ('H007', '横'), ('H007', '点'), ('H007', '卧钩'), ('H007', '点'), ('H007', '点');

INSERT INTO hanzi_compound (hanzi_id, compound) VALUES
('H001', '书本'), ('H001', '书写'), ('H001', '读书'), ('H001', '书法'),
('H003', '学生'), ('H003', '学习'), ('H003', '学校'),
('H005', '安静'), ('H005', '静夜'),
('H006', '夜晚'), ('H006', '静夜'),
('H007', '思念'), ('H007', '静夜思');

INSERT INTO poem (id, title, author, dynasty, content, annotation, translation, grade_level, textbook_version) VALUES
('P001', '静夜思', '李白', '唐', '床前明月光，疑是地上霜。举头望明月，低头思故乡。', '床：井栏，或写作为床榻。疑：这里作“以为”讲。霜：白色的冰晶。', '明亮的月光洒在床前，好像地上铺了一层洁白的霜。抬头望月，低头思念故乡。', '一年级', '部编版'),
('P002', '春晓', '孟浩然', '唐', '春眠不觉晓，处处闻啼鸟。夜来风雨声，花落知多少。', '春眠：春季睡梦。晓：天亮。闻：听到。啼鸟：鸟儿叫。', '春天熟睡中不知不觉天亮了，到处听见鸟鸣。想起昨夜风雨，不知落花多少。', '二年级', '部编版');

INSERT INTO poem_keyword (poem_id, keyword) VALUES
('P001', '思乡'), ('P001', '月光'), ('P001', '李白'),
('P002', '写景'), ('P002', '伤春'), ('P002', '鸟鸣');

INSERT INTO poem_sentence (id, poem_id, sentence_text, sort_no) VALUES
('S101', 'P001', '床前明月光', 1),
('S102', 'P001', '疑是地上霜', 2),
('S103', 'P001', '举头望明月', 3),
('S104', 'P001', '低头思故乡', 4),
('S201', 'P002', '春眠不觉晓', 1),
('S202', 'P002', '处处闻啼鸟', 2),
('S203', 'P002', '夜来风雨声', 3),
('S204', 'P002', '花落知多少', 4);

INSERT INTO poem_sentence_key_character (sentence_id, key_character) VALUES
('S101', '明'), ('S101', '月'),
('S102', '地'), ('S102', '霜'),
('S103', '望'), ('S103', '月'),
('S104', '思'), ('S104', '乡'),
('S201', '春'), ('S201', '晓'),
('S202', '鸟'),
('S203', '风'), ('S203', '雨'),
('S204', '花'), ('S204', '多');

INSERT INTO practice_task (id, task_name, task_type, target_type, target_id, start_time, end_time, status) VALUES
('T501', '今日必练生字：《静夜思》核心字', 'hanzi', 'all', 'all_students', '2026-07-14 08:00', '2026-07-14 22:00', 'active'),
('T502', '古诗背诵书写作业：《春晓》', 'poem', 'class', 'class_二年级一班', '2026-07-14 09:00', '2026-07-15 18:00', 'active');

INSERT INTO task_item (id, task_id, item_type, item_id, sort_no) VALUES
('TI50101', 'T501', 'hanzi', 'H006', 1),
('TI50102', 'T501', 'hanzi', 'H007', 2),
('TI50103', 'T501', 'hanzi', 'H005', 3),
('TI50201', 'T502', 'poem', 'P002', 1);

INSERT INTO practice_record (
  id, user_id, user_name, task_id, task_name, item_type, item_id, item_name,
  complete_status, stroke_total, stroke_completed, mistake_count, hint_count,
  score_level, duration_seconds, practice_time
) VALUES
('R901', 'U104', '李梓轩', 'T501', '今日必练生字：《静夜思》核心字', 'hanzi', 'H006', '夜', 'completed', 8, 8, 0, 0, 'A', 180, '2026-07-14 19:12'),
('R902', 'U104', '李梓轩', 'T502', '古诗背诵书写作业：《春晓》', 'poem', 'P002', '春晓', 'completed', 20, 20, 0, 0, 'A+', 180, '2026-07-13 20:03');
