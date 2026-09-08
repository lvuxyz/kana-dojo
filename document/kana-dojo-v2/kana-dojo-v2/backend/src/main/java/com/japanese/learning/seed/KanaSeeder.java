package com.japanese.learning.seed;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.japanese.learning.domain.entity.KanaCharacter;
import com.japanese.learning.domain.entity.KanaGlyph;
import com.japanese.learning.domain.enums.KanaGroup;
import com.japanese.learning.domain.enums.Script;
import com.japanese.learning.repository.KanaCharacterRepository;
import com.japanese.learning.repository.KanaGlyphRepository;
import com.japanese.learning.service.KanaService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Nạp 148 glyph và 208 ký tự kana từ {@code classpath:data/kana-data.json}.
 *
 * <p>Idempotent: chỉ chạy khi {@code kana_glyphs} rỗng, nên khởi động lại ứng dụng
 * hay chạy nhiều bản sao đều không sinh dữ liệu trùng. Dữ liệu nét không đặt trong
 * migration SQL vì nó là nội dung (~60 KB JSON), không phải lược đồ.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class KanaSeeder implements ApplicationRunner {

    private static final String DATA_PATH = "data/kana-data.json";

    private final KanaGlyphRepository kanaGlyphRepository;
    private final KanaCharacterRepository kanaCharacterRepository;
    private final KanaService kanaService;
    private final ObjectMapper objectMapper;

    /** Ánh xạ tối thiểu của file dữ liệu; các trường khác (license, rowLabels) không cần cho CSDL. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record KanaDataFile(int viewBox, Map<String, List<String>> glyphs, List<CharEntry> chars) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record CharEntry(String c, String r, String vn, String s, String g, String row, int col, int n) {
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws IOException {
        if (kanaGlyphRepository.count() > 0) {
            log.debug("Bỏ qua seed kana: bảng kana_glyphs đã có dữ liệu");
            return;
        }

        KanaDataFile data = readData();
        seedGlyphs(data);
        seedCharacters(data);
        kanaService.invalidateStrokesEtag();

        log.info("Đã seed {} glyph và {} ký tự kana", data.glyphs().size(), data.chars().size());
    }

    private KanaDataFile readData() throws IOException {
        ClassPathResource resource = new ClassPathResource(DATA_PATH);
        if (!resource.exists()) {
            throw new IllegalStateException("Không tìm thấy " + DATA_PATH + " trong classpath");
        }
        try (InputStream input = resource.getInputStream()) {
            return objectMapper.readValue(input, KanaDataFile.class);
        }
    }

    private void seedGlyphs(KanaDataFile data) {
        List<KanaGlyph> glyphs = new ArrayList<>(data.glyphs().size());
        data.glyphs().forEach((glyph, strokePaths) -> glyphs.add(KanaGlyph.builder()
                .glyph(glyph)
                .strokePaths(strokePaths)
                .strokeCount(strokePaths.size())
                .viewBox(data.viewBox())
                .build()));
        kanaGlyphRepository.saveAll(glyphs);
    }

    private void seedCharacters(KanaDataFile data) {
        if (kanaCharacterRepository.count() > 0) {
            return;
        }
        List<CharEntry> entries = data.chars();
        List<KanaCharacter> characters = new ArrayList<>(entries.size());
        for (int i = 0; i < entries.size(); i++) {
            CharEntry entry = entries.get(i);
            characters.add(KanaCharacter.builder()
                    .character(entry.c())
                    // Chuỗi ký tự cũng chính là chuỗi glyph thành phần: "きゃ" gồm "き" và "ゃ".
                    .glyphSequence(entry.c())
                    .romaji(entry.r())
                    .script(toScript(entry.s()))
                    .kanaGroup(toGroup(entry.g()))
                    .rowKey(entry.row())
                    .colIndex((short) entry.col())
                    .strokeCount((short) entry.n())
                    .readingVi(entry.vn())
                    .displayOrder(i)
                    .build());
        }
        kanaCharacterRepository.saveAll(characters);
    }

    private Script toScript(String code) {
        return "k".equalsIgnoreCase(code) ? Script.KATAKANA : Script.HIRAGANA;
    }

    private KanaGroup toGroup(String code) {
        return KanaGroup.valueOf(code.toUpperCase());
    }
}
