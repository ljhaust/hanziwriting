package com.example.hanzi.repository;

import com.example.hanzi.domain.PracticeTask;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 作业任务仓储。
 */
public interface PracticeTaskRepository extends JpaRepository<PracticeTask, String> {
}
