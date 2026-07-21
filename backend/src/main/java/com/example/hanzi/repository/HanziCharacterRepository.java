package com.example.hanzi.repository;

import com.example.hanzi.domain.HanziCharacter;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 汉字字库仓储。
 */
public interface HanziCharacterRepository extends JpaRepository<HanziCharacter, String> {
    /**
     * 按汉字正文查询字库记录。
     *
     * @param characterText 单个汉字正文。
     * @return 命中时包含数据库汉字记录，否则为空。
     */
    Optional<HanziCharacter> findByCharacterText(String characterText);
}
