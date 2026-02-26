package ai.theaware.stealth.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.OAuthFlow;
import io.swagger.v3.oas.models.security.OAuthFlows;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class SwaggerConfig {

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    private static final String OAUTH2_SCHEME = "Google OAuth2";

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(buildInfo())
                .servers(List.of(
                        new Server().url(baseUrl).description("Active Server")
                ))
                .components(new Components()
                        .addSecuritySchemes(OAUTH2_SCHEME, buildOAuth2Scheme())
                )
                .addSecurityItem(
                        new SecurityRequirement().addList(OAUTH2_SCHEME)
                );
    }

    private Info buildInfo() {
        return new Info()
                .title("Stealth AQI API")
                .version("1.0.0")
                .description("""
                        ## Stealth – Air Quality Intelligent Routing API

                        Provides real-time AQI-aware route recommendations for Durgapur, West Bengal.

                        ### Key features
                        - **Route Analysis** (`/api/routes/process`) — Returns 2–3 Google Maps routes \
                        enriched with pollutant data (PM2.5, PM10, CO, NO2, O3) and a composite \
                        AQI-exposure + travel-time score. Each route receives a rank label \
                        (`best` / `moderate` / `poor`) and one route is marked `recommended`.
                        - **AQI Forecast** (`/api/routes/predict`) — 12-hour per-station and per-route \
                        AQI forecast powered by LSTM and TinyTimeMixer (TTM) models.
                        - **History** (`/api/routes/history`) — Returns the authenticated user's \
                        past route searches.

                        ### Authentication
                        Every endpoint is protected by **Google OAuth2**. except home page\
                        Sign in via the lock icon (:lock:) at the top of this page.
                        """)
                .contact(new Contact()
                        .name("Bishal Karmakar")
                        .email("bishal@theaware.ai")
                );
    }

    private SecurityScheme buildOAuth2Scheme() {
        return new SecurityScheme()
                .type(SecurityScheme.Type.OAUTH2)
                .description("""
                        **Google OAuth2 Required**

                        All API endpoints are protected. You must sign in with a valid Google account.

                        1. Click **Authorize** (lock icon :lock:)
                        2. You will be redirected to Google's sign-in page
                        3. After sign-in, your session cookie is set automatically
                        4. All subsequent requests in this session are authenticated
                        """)
                .flows(new OAuthFlows()
                        .authorizationCode(new OAuthFlow()
                                .authorizationUrl("/oauth2/authorization/google")
                                .tokenUrl("/login/oauth2/code/google")
                        )
                );
    }
}