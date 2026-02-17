package ai.theaware.stealth.config;

import ai.theaware.stealth.entity.Users;
import ai.theaware.stealth.repository.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;

    public OAuth2LoginSuccessHandler(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");
        String picture = oAuth2User.getAttribute("picture");

        Users user = userRepository.findById(email).orElseGet(() -> {
            Users newUser = new Users();
            newUser.setEmail(email);
            return newUser;
        });

        user.setFullName(name != null ? name : "Unknown User");
        user.setAvatarUrl(picture);
        userRepository.save(user);

        System.out.println("(Success)! Logged in user: " + email);

        getRedirectStrategy().sendRedirect(request, response, "http://localhost:5173/home"); // "/home" for now
    }
}