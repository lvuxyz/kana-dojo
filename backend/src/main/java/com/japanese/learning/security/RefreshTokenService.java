package com.japanese.learning.security;

import com.japanese.learning.common.ApiException;
import com.japanese.learning.config.AppProperties;
import com.japanese.learning.domain.entity.RefreshToken;
import com.japanese.learning.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.time.Instant;
import java.util.UUID;

/**
 * Vòng đời refresh token.
 *
 * <p>Bản rõ chỉ tồn tại trong phản hồi HTTP; CSDL giữ SHA-256. Mỗi lần dùng, token cũ
 * bị thu hồi và thay bằng token mới (rotation). Nếu một token đã bị thay thế lại được
 * trình lần nữa thì gần như chắc chắn nó đã bị đánh cắp — khi đó toàn bộ họ token
 * sinh từ cùng lần đăng nhập bị thu hồi, buộc mọi thiết bị đăng nhập lại.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private final RefreshTokenRepository refreshTokenRepository;
    private final AppProperties properties;
    private final PlatformTransactionManager transactionManager;

    /** Kết quả cấp token: chuỗi bản rõ để trả cho client và bản ghi đã lưu. */
    public record IssuedToken(String rawToken, RefreshToken stored) {
    }

    @Transactional
    public IssuedToken issue(Long userId, UUID familyId, String userAgent, String ipAddress) {
        String raw = TokenHasher.randomToken();
        RefreshToken entity = RefreshToken.builder()
                .userId(userId)
                .tokenHash(TokenHasher.sha256Hex(raw))
                .familyId(familyId == null ? UUID.randomUUID() : familyId)
                .expiresAt(Instant.now().plus(properties.jwt().refreshTokenTtl()))
                .userAgent(truncate(userAgent))
                .ip(parseIp(ipAddress))
                .build();
        return new IssuedToken(raw, refreshTokenRepository.save(entity));
    }

    /**
     * Đổi refresh token lấy cặp mới. Ném lỗi 401 với mọi trường hợp không hợp lệ và
     * không tiết lộ lý do cụ thể để không giúp kẻ tấn công dò trạng thái token.
     */
    @Transactional
    public IssuedToken rotate(String rawToken, String userAgent, String ipAddress) {
        String hash = TokenHasher.sha256Hex(rawToken);
        RefreshToken current = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> ApiException.unauthorized("Refresh token không hợp lệ hoặc đã hết hạn"));

        Instant now = Instant.now();
        if (current.getRevokedAt() != null) {
            // Token đã bị thay thế nhưng vẫn được dùng lại: coi như bị lộ.
            log.warn("Phát hiện tái sử dụng refresh token, thu hồi họ token {}", current.getFamilyId());
            revokeFamilyCommitted(current.getFamilyId(), now);
            throw ApiException.unauthorized("Phiên đăng nhập đã bị thu hồi vì lý do bảo mật, vui lòng đăng nhập lại");
        }
        if (!current.isActive(now)) {
            throw ApiException.unauthorized("Refresh token không hợp lệ hoặc đã hết hạn");
        }

        IssuedToken next = issue(current.getUserId(), current.getFamilyId(), userAgent, ipAddress);
        current.setRevokedAt(now);
        current.setReplacedBy(next.stored().getTokenHash());
        refreshTokenRepository.save(current);
        return next;
    }

    /** Đăng xuất một thiết bị: chỉ thu hồi đúng token được trình, không đụng thiết bị khác. */
    @Transactional
    public void revoke(String rawToken) {
        refreshTokenRepository.findByTokenHash(TokenHasher.sha256Hex(rawToken)).ifPresent(token -> {
            if (token.getRevokedAt() == null) {
                token.setRevokedAt(Instant.now());
                refreshTokenRepository.save(token);
            }
        });
    }

    @Transactional
    public void revokeAllForUser(Long userId) {
        refreshTokenRepository.revokeAllForUser(userId, Instant.now());
    }

    /** Chủ sở hữu của token, dùng để nạp lại người dùng khi làm mới phiên. */
    @Transactional(readOnly = true)
    public Long ownerOf(String rawToken) {
        return refreshTokenRepository.findByTokenHash(TokenHasher.sha256Hex(rawToken))
                .map(RefreshToken::getUserId)
                .orElseThrow(() -> ApiException.unauthorized("Refresh token không hợp lệ hoặc đã hết hạn"));
    }

    /**
     * Thu hồi cả họ token trong một transaction độc lập. Ngay sau đó {@link #rotate} ném 401, và
     * exception đó rollback transaction đang bao ngoài — nếu thu hồi chạy chung transaction thì nó
     * bị huỷ theo, token mới nhất của kẻ trộm vẫn dùng được.
     */
    private void revokeFamilyCommitted(UUID familyId, Instant now) {
        TransactionTemplate independent = new TransactionTemplate(transactionManager);
        independent.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        independent.executeWithoutResult(status -> refreshTokenRepository.revokeFamily(familyId, now));
    }

    private InetAddress parseIp(String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank()) {
            return null;
        }
        try {
            return InetAddress.getByName(ipAddress.split(",")[0].trim());
        } catch (UnknownHostException ex) {
            return null;
        }
    }

    private String truncate(String userAgent) {
        if (userAgent == null) {
            return null;
        }
        return userAgent.length() > 512 ? userAgent.substring(0, 512) : userAgent;
    }
}
