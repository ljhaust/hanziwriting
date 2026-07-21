package com.example.hanzi.repository;

import com.example.hanzi.domain.PracticeRecord;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 练习记录仓储。
 */
public interface PracticeRecordRepository extends JpaRepository<PracticeRecord, String> {

    /**
     * 按学生倒序查询练习记录。
     *
     * @param userId 学生用户 ID。
     * @return 指定学生的练习记录列表。
     */
    List<PracticeRecord> findByUserIdOrderByPracticeTimeDesc(String userId);
}
