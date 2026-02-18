package ai.theaware.stealth.config;

import java.io.IOException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import ai.theaware.stealth.entity.Users;
import ai.theaware.stealth.repository.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private static final Logger logger = LoggerFactory.getLogger(OAuth2LoginSuccessHandler.class);
    
    private final UserRepository userRepository;
    
    @Value("${app.frontend.url}")
    private String frontendUrl;

    public OAuth2LoginSuccessHandler(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        
        logger.info("OAuth2 authentication success handler called");
        
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String picture = oAuth2User.getAttribute("picture");
        
        logger.info("OAuth2 User Email: {}", email);
        logger.info("OAuth2 User Name: {}", name);
        logger.debug("OAuth2 User Picture: {}", picture);

        Users user = userRepository.findById(email).orElseGet(() -> {
            Users newUser = new Users();
            newUser.setEmail(email);
            logger.info("Creating new user with email: {}", email);
            return newUser;
        });

        user.setFullName(name != null ? name : "Unknown User");
        user.setAvatarUrl(picture);
        userRepository.save(user);
        
        logger.info("User saved/updated successfully");

        String redirectUrl = frontendUrl + "/dashboard";
        logger.info("Frontend URL from properties: {}", frontendUrl);
        logger.info("Redirect URL: {}", redirectUrl);
        
        try {
            getRedirectStrategy().sendRedirect(request, response, redirectUrl);
            logger.info("Redirect sent successfully to: {}", redirectUrl);
        } catch (IOException e) {
            logger.error("Error sending redirect to: {}", redirectUrl, e);
            throw e;
        }
    }
}