package ai.theaware.stealth.config;

import java.util.Arrays;
import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import jakarta.servlet.DispatcherType;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final OAuth2LoginSuccessHandler successHandler;

    public SecurityConfig(OAuth2LoginSuccessHandler successHandler) {
        this.successHandler = successHandler;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(csrf -> csrf.disable())

            // ── Security response headers ──────────────────────────────────
            .headers(headers -> headers
                // Prevent MIME-type sniffing
                .contentTypeOptions(Customizer.withDefaults())
                // Prevent clickjacking
                .frameOptions(frame -> frame.deny())
                // Enable XSS filter in older browsers
                .xssProtection(Customizer.withDefaults())
                // HSTS: tell browsers to always use HTTPS (1 year)
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000)
                )
                // Only send Referer header on same-origin requests
                .referrerPolicy(referrer -> referrer
                    .policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.SAME_ORIGIN)
                )
                // Basic Content-Security-Policy
                .contentSecurityPolicy(csp -> csp
                    .policyDirectives("default-src 'self'; frame-ancestors 'none'")
                )
            )

            .authorizeHttpRequests(auth -> auth
                .dispatcherTypeMatchers(DispatcherType.FORWARD, DispatcherType.ERROR).permitAll()

                // Swagger — permit only in non-prod; gate behind a Spring profile if possible
                .requestMatchers(
                    "/v3/api-docs/**",
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/swagger-resources/**",
                    "/webjars/**"
                ).permitAll()

                // Actuator — expose only health; lock everything else
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/actuator/**").denyAll()

                // IMPORTANT: root "/" (TestController) is internal-only — lock it down
                .requestMatchers("/").authenticated()

                // All /api/** routes require authentication
                .anyRequest().authenticated()
            )

            .exceptionHandling(exception -> exception
                .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
            )
            .oauth2Login(oauth2 -> oauth2
                .successHandler(successHandler)
            )
            .logout(logout -> logout
                .logoutSuccessUrl("http://localhost:5173/logout")
                .permitAll()
            );

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Explicit allowlist — never use allowedOriginPatterns("*") in production
        configuration.setAllowedOrigins(List.of("http://localhost:5173"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "OPTIONS"));
        // Do NOT include headers like "X-Custom-*" unless needed
        configuration.setAllowedHeaders(Arrays.asList(
            "Authorization",
            "Content-Type",
            "X-Requested-With",
            "Accept"
        ));
        // Expose no custom headers to JS — reduces attack surface
        configuration.setExposedHeaders(List.of());
        configuration.setAllowCredentials(true);
        // Cache preflight for 1 hour
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}