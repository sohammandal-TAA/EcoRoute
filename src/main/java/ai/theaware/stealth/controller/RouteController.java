package ai.theaware.stealth.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import ai.theaware.stealth.dto.RouteRequestDTO;
import ai.theaware.stealth.entity.Users;
import ai.theaware.stealth.service.GoogleRoutingService;
import ai.theaware.stealth.service.UserService;

@RestController
@RequestMapping("/api/routes")
public class RouteController {

    private final GoogleRoutingService googleRoutingService;
    private final UserService userService;

    public RouteController(GoogleRoutingService googleRoutingService, UserService userService) {
        this.googleRoutingService = googleRoutingService;
        this.userService = userService;
    }

    @PostMapping("/process")
    public ResponseEntity<?> processRoute(
            @RequestBody RouteRequestDTO request,
            @AuthenticationPrincipal OAuth2User principal) {

        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "User not authenticated"));
        }

        String email = principal.getAttribute("email");

        Users user = userService.findByEmail(email);

        Object result = googleRoutingService.processRoute(
                request.getSLat(), 
                request.getSLon(), 
                request.getDLat(), 
                request.getDLon(), 
                user
        );

        return ResponseEntity.ok(result);
    }
}
