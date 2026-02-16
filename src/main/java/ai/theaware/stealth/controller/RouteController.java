package ai.theaware.stealth.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import ai.theaware.stealth.entity.Users;
import ai.theaware.stealth.repository.UserRepository;
import ai.theaware.stealth.service.GoogleRoutingService;

@RestController
@RequestMapping("/api/v1/routes")
public class RouteController {

    private final GoogleRoutingService googleRoutingService;
    private final UserRepository userRepository;  

    public RouteController(GoogleRoutingService googleRoutingService, 
                          UserRepository userRepository) { 
        this.googleRoutingService = googleRoutingService;
        this.userRepository = userRepository;
    }

    @GetMapping
    public ResponseEntity<?> getRoute(
            @RequestParam Double sLat, @RequestParam Double sLon,
            @RequestParam Double dLat, @RequestParam Double dLon,
            @AuthenticationPrincipal org.springframework.security.core.userdetails.User userDetails) { 
        
        Users user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Object response = googleRoutingService.processRoute(sLat, sLon, dLat, dLon, user);
        
        return ResponseEntity.ok(response);
    }
}