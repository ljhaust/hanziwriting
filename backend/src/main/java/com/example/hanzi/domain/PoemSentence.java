package com.example.hanzi.domain;

import java.util.ArrayList;
import java.util.List;
import javax.persistence.CollectionTable;
import javax.persistence.Column;
import javax.persistence.ElementCollection;
import javax.persistence.Entity;
import javax.persistence.FetchType;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.Table;

/**
 * 古诗诗句实体。
 *
 * <p>每条诗句属于一首诗，`keyCharacters` 决定背诵填空时哪些字被隐藏。</p>
 */
@Entity
@Table(name = "poem_sentence")
public class PoemSentence {
    /** 诗句 ID。 */
    @Id
    private String id;

    /** 诗句正文，不含标点。 */
    private String sentenceText;

    /** 在诗中的排序号。 */
    private Integer sortNo;

    /** 背诵填空重点字。 */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "poem_sentence_key_character", joinColumns = @JoinColumn(name = "sentence_id"))
    @Column(name = "key_character")
    private List<String> keyCharacters = new ArrayList<String>();

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getSentenceText() {
        return sentenceText;
    }

    public void setSentenceText(String sentenceText) {
        this.sentenceText = sentenceText;
    }

    public Integer getSortNo() {
        return sortNo;
    }

    public void setSortNo(Integer sortNo) {
        this.sortNo = sortNo;
    }

    public List<String> getKeyCharacters() {
        return keyCharacters;
    }

    public void setKeyCharacters(List<String> keyCharacters) {
        this.keyCharacters = keyCharacters;
    }
}
