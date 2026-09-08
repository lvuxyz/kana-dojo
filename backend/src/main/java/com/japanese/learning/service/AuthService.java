package com.japanese.learning.service;

import com.japanese.learning.common.ApiException;
import com.japanese.learning.domain.entity.User;
import com.japanese.learning.domain.entity.UserOauth;
import com.japanese.learning.domain.enums.UserStatus;
import com.japanese.learning.repository.UserOauthRepository;
import com.japanese.learning.repository.UserRepository;
import com.japanese.learning.security.GoogleTokenVerifier;
import com.japanese.learning.security.JwtService;
import com.japanese.learning.security.RefreshTokenService;
import com.japanese.learning.web.dto.AuthDtos.AuthResponse;
import com.japanese.learning.web.dto.AuthDtos.GoogleAuthRequest;
import com.japanese.learning.web.dto.AuthDtos.LoginRequest;
import com.japanese.learning.web.dto.AuthDtos.RefreshRequest;
import com.japanese.learning.web.dto.AuthDtos.RegisterRequest;
import com.japanese.learning.web.dto.AuthDtos.UpdateProfileRequest;
import com.japanese.learning.web.dto.AuthDtos.UserDto;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.ZoneId;
import java.util.Map;
import java.util.Optional;

/** Đăng ký, đăng nhập (mật khẩu và Google), làm mới phiên và hồ sơ người dùng. */
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String PROVIDER_GOOGLE = "google";
    private static final String DEFAULT_TIMEZONE = "Asia/Ho_Chi_Minh";

    private final UserRepository userRepository;
    private final UserOauthRepository userOauthRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final GoogleTokenVerifier googleTokenVerifier;
    private final GamificationService gamificationService;

    @Transactional
    public AuthResponse register(RegisterRequest request, String userAgent, String ip) {
        String email = request.email().trim().toLowerCase();
        String username = request.username().trim();

        if (userRepository.existsByEmail(email)) {
            throw ApiException.conflict("Email đã được sử dụng", Map.of("email", "Email đã được sử dụng"));
        }
        if (userRepository.existsByUsername(username)) {
            throw ApiException.conflict("Tên đăng nhập đã được sử dụng",
                    Map.of("username", "Tên đăng nhập đã được sử dụng"));
        }

        User user = User.builder()
                .email(email)
                .username(username)
                .passwordHash(passwordEncoder.encode(request.password()))
                .displayName(request.displayName().trim())
                .timezone(normalizeTimezone(request.timezone()))
                .lastLoginAt(Instant.now())
                .build();
        user = userRepository.save(user);
        gamificationService.statsFor(user.getId());

        return issueSession(user, userAgent, ip);
    }

    @Transactional
    public AuthResponse login(LoginRequest request, String userAgent, String ip) {
        User user = userRepository.findByEmailOrUsername(request.emailOrUsername().trim())
                .orElseThrow(() -> ApiException.unauthorized("Email/tên đăng nhập hoặc mật khẩu không đúng"));

        if (!StringUtils.hasText(user.getPasswordHash())
                || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            // Cùng một thông báo cho mọi nguyên nhân để không giúp dò xem tài khoản có tồn tại không.
            throw ApiException.unauthorized("Email/tên đăng nhập hoặc mật khẩu không đúng");
        }
        ensureActive(user);

        user.setLastLoginAt(Instant.now());
        userRepository.save(user);
        gamificationService.statsFor(user.getId());
        return issueSession(user, userAgent, ip);
    }

    @Transactional
    public AuthResponse loginWithGoogle(GoogleAuthRequest request, String userAgent, String ip) {
        GoogleTokenVerifier.GoogleUser googleUser = googleTokenVerifier.verify(request.idToken());

        Optional<UserOauth> link = userOauthRepository
                .findByProviderAndProviderUserId(PROVIDER_GOOGLE, googleUser.subject());

        User user;
        if (link.isPresent()) {
            user = userRepository.findById(link.get().getUserId())
                    .orElseThrow(() -> ApiException.unauthorized("Tài khoản liên kết không còn tồn tại"));
        } else {
            String email = googleUser.email().toLowerCase();
            user = userRepository.findByEmail(email).orElseGet(() -> createFromGoogle(googleUser, email));
            userOauthRepository.save(UserOauth.builder()
                    .userId(user.getId())
                    .provider(PROVIDER_GOOGLE)
                    .providerUserId(googleUser.subject())
                    .email(email)
                    .build());
        }
        ensureActive(user);

        if (!user.isEmailVerified()) {
            // Google đã xác minh email trước khi cấp token nên có thể tin cậy ở đây.
            user.setEmailVerified(true);
        }
        user.setLastLoginAt(Instant.now());
        userRepository.save(user);
        gamificationService.statsFor(user.getId());
        return issueSession(user, userAgent, ip);
    }

    @Transactional
    public AuthResponse refresh(RefreshRequest request, String userAgent, String ip) {
        Long userId = refreshTokenService.ownerOf(request.refreshToken());
        RefreshTokenService.IssuedToken rotated =
                refreshTokenService.rotate(request.refreshToken(), userAgent, ip);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.unauthorized("Tài khoản không còn tồn tại"));
        ensureActive(user);

        return new AuthResponse(
                jwtService.generateAccessToken(user),
                rotated.rawToken(),
                jwtService.accessTokenTtlSeconds(),
                toDto(user));
    }

    @Transactional
    public void logout(String refreshToken) {
        refreshTokenService.revoke(refreshToken);
    }

    @Transactional(readOnly = true)
    public User requireUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.unauthorized("Phiên đăng nhập không còn hợp lệ"));
        ensureActive(user);
        return user;
    }

    @Transactional
    public UserDto updateProfile(Long userId, UpdateProfileRequest request) {
        User user = requireUser(userId);
        if (StringUtils.hasText(request.displayName())) {
            user.setDisplayName(request.displayName().trim());
        }
        if (StringUtils.hasText(request.timezone())) {
            user.setTimezone(requireValidTimezone(request.timezone()));
        }
        if (request.dailyGoalXp() != null) {
            user.setDailyGoalXp(request.dailyGoalXp());
        }
        if (StringUtils.hasText(request.locale())) {
            user.setLocale(request.locale().trim());
        }
        return toDto(userRepository.save(user));
    }

    public static UserDto toDto(User user) {
        return new UserDto(
                user.getId(),
                user.getEmail(),
                user.getUsername(),
                user.getDisplayName(),
                user.getAvatarUrl(),
                user.getRole(),
                user.getPlan(),
                user.getTimezone(),
                user.getLocale(),
                user.getDailyGoalXp(),
                user.getCreatedAt());
    }

    private AuthResponse issueSession(User user, String userAgent, String ip) {
        RefreshTokenService.IssuedToken refreshToken =
                refreshTokenService.issue(user.getId(), null, userAgent, ip);
        return new AuthResponse(
                jwtService.generateAccessToken(user),
                refreshToken.rawToken(),
                jwtService.accessTokenTtlSeconds(),
                toDto(user));
    }

    private User createFromGoogle(GoogleTokenVerifier.GoogleUser googleUser, String email) {
        User user = User.builder()
                .email(email)
                .username(uniqueUsernameFrom(email))
                .passwordHash(null)
                .displayName(StringUtils.hasText(googleUser.name()) ? googleUser.name() : email.split("@")[0])
                .avatarUrl(googleUser.pictureUrl())
                .emailVerified(true)
                .timezone(DEFAULT_TIMEZONE)
                .build();
        user = userRepository.save(user);
        gamificationService.statsFor(user.getId());
        return user;
    }

    /** Sinh username hợp lệ và chưa bị chiếm từ phần trước dấu @ của email. */
    private String uniqueUsernameFrom(String email) {
        String base = email.split("@")[0].replaceAll("[^a-zA-Z0-9._-]", "");
        if (base.length() < 3) {
            base = "user" + base;
        }
        if (base.length() > 26) {
            base = base.substring(0, 26);
        }
        String candidate = base;
        int suffix = 1;
        while (userRepository.existsByUsername(candidate)) {
            candidate = base + suffix++;
        }
        return candidate;
    }

    private void ensureActive(User user) {
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw ApiException.forbidden("Tài khoản đã bị khoá hoặc ngừng hoạt động");
        }
    }

    private String normalizeTimezone(String timezone) {
        return StringUtils.hasText(timezone) ? requireValidTimezone(timezone) : DEFAULT_TIMEZONE;
    }

    private String requireValidTimezone(String timezone) {
        try {
            return ZoneId.of(timezone.trim()).getId();
        } catch (RuntimeException ex) {
            throw ApiException.validation("Múi giờ không hợp lệ",
                    Map.of("timezone", "Múi giờ không hợp lệ, ví dụ hợp lệ: Asia/Ho_Chi_Minh"));
        }
    }
}
