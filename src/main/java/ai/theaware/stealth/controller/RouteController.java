package ai.theaware.stealth.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import ai.theaware.stealth.dto.PredictionResponseDTO;
import ai.theaware.stealth.dto.RouteAnalysisResponseDTO;
import ai.theaware.stealth.dto.RouteRequestDTO;
import ai.theaware.stealth.dto.RouteResponseDTO;
import ai.theaware.stealth.entity.Users;
import ai.theaware.stealth.service.GoogleRoutingService;
import ai.theaware.stealth.service.PredictionService;
import ai.theaware.stealth.service.UserService;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/routes")
@Slf4j
public class RouteController {

    private final PredictionService predictionService;
    private final GoogleRoutingService googleRoutingService;
    private final UserService userService;
    private final ObjectMapper objectMapper;

    public RouteController(GoogleRoutingService googleRoutingService, UserService userService,
                           PredictionService predictionService) {
        this.googleRoutingService = googleRoutingService;
        this.predictionService = predictionService;
        this.userService = userService;
        this.objectMapper = new ObjectMapper();
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
    public ResponseEntity<RouteAnalysisResponseDTO> processRoute(
            @RequestBody RouteRequestDTO request,
            @AuthenticationPrincipal OAuth2User principal
    ) {

        if (principal == null) {
            return ResponseEntity.status(401).build();
        }

        String email = principal.getAttribute("email");
        Users user = userService.findByEmail(email);

        RouteAnalysisResponseDTO result =
                googleRoutingService.processRoute(
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
        log.info("[CONTROLLER] /predict called for user: {}", email);

        PredictionResponseDTO result = predictionService.getPrediction(email);

        try {
            String json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(result);
            log.info("[CONTROLLER] /predict response:\n{}", json);
        } catch (JsonProcessingException e) {
            log.warn("[CONTROLLER] Could not serialize prediction response: {}", e.getMessage());
        }

        if ("pending".equals(result.getStatus())) {
            log.info("[CONTROLLER] Prediction still pending for user: {}", email);
            return ResponseEntity.accepted().body(result);
        }

        if ("error".equals(result.getStatus())) {
            log.warn("[CONTROLLER] Prediction error for user: {}", email);
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