package com.example.hanzi.repository;

import com.example.hanzi.domain.Poem;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 古诗资源仓储。
 */
public interface PoemRepository extends JpaRepository<Poem, String> {
}
