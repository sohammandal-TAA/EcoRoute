package ai.theaware.stealth.controller;

import ai.theaware.stealth.dto.PredictionResponseDTO;
import ai.theaware.stealth.dto.RouteRequestDTO;
import ai.theaware.stealth.dto.RouteResponseDTO;
import ai.theaware.stealth.entity.Users;
import ai.theaware.stealth.service.GoogleRoutingService;
import ai.theaware.stealth.service.PredictionService;
import ai.theaware.stealth.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/routes")
public class RouteController {

    private final PredictionService predictionService;
    private final GoogleRoutingService googleRoutingService;
    private final UserService userService;

    public RouteController(GoogleRoutingService googleRoutingService, UserService userService,
                           PredictionService predictionService) {
        this.googleRoutingService = googleRoutingService;
        this.predictionService = predictionService;
        this.userService = userService;
    }

    @GetMapping("/debug-resampled")
    public ResponseEntity<RouteResponseDTO> getDebugResampled(
            @RequestParam Double sLat,
            @RequestParam Double sLon,
            @RequestParam Double dLat,
            @RequestParam Double dLon) {

        RouteResponseDTO processedData = googleRoutingService.getProcessedRouteDTO(sLat, sLon, dLat, dLon);
        return ResponseEntity.ok(processedData);
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

    @GetMapping("/predict")
    public ResponseEntity<PredictionResponseDTO> getPrediction(
            @AuthenticationPrincipal OAuth2User principal) {

        if (principal == null) {
            PredictionResponseDTO err = new PredictionResponseDTO();
            err.setStatus("error");
            return ResponseEntity.status(401).body(err);
        }

        String email = principal.getAttribute("email");
        PredictionResponseDTO result = predictionService.getPrediction(email);

        if ("pending".equals(result.getStatus())) {
            return ResponseEntity.accepted().body(result);   // 202 – still processing
        }

        return ResponseEntity.ok(result);
    }

    @GetMapping("/raw")
    public ResponseEntity<?> getRawRoute(
            @RequestParam Double sLat,
            @RequestParam Double sLon,
            @RequestParam Double dLat,
            @RequestParam Double dLon,
            @AuthenticationPrincipal OAuth2User principal) {

        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "User not authenticated"));
        }

        RouteResponseDTO result = googleRoutingService.getRawRouteDTO(sLat, sLon, dLat, dLon);
        return ResponseEntity.ok(result);
    }
}