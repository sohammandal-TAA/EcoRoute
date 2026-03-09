package ai.theaware.stealth.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.validation.annotation.Validated;
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
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/routes")
@Validated  // Required to activate @Valid on @RequestParam methods
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

    /**
     * Debug endpoint: resampled route polyline.
     * Locked to authenticated users only. Remove or gate behind a profile/flag before production.
     */
    @GetMapping("/debug-resampled")
    public ResponseEntity<RouteResponseDTO> getDebugResampled(
            @RequestParam @NotNull @DecimalMin("-90.0") @DecimalMax("90.0")   Double sLat,
            @RequestParam @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") Double sLon,
            @RequestParam @NotNull @DecimalMin("-90.0") @DecimalMax("90.0")   Double dLat,
            @RequestParam @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") Double dLon,
            @AuthenticationPrincipal OAuth2User principal) {

        if (principal == null) {
            return ResponseEntity.status(401).build();
        }

        RouteResponseDTO processedData = googleRoutingService.getProcessedRouteDTO(sLat, sLon, dLat, dLon);
        return ResponseEntity.ok(processedData);
    }

    @PostMapping("/process")
    public ResponseEntity<RouteAnalysisResponseDTO> processRoute(
            @Valid @RequestBody RouteRequestDTO request,   // @Valid triggers DTO-level constraints
            @AuthenticationPrincipal OAuth2User principal
    ) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }

        String email = sanitizeEmail(principal.getAttribute("email"));
        if (email == null) {
            return ResponseEntity.status(401).build();
        }

        // Guard: source and destination must not be the same point
        if (request.getSLat().equals(request.getDLat()) &&
            request.getSLon().equals(request.getDLon())) {
            return ResponseEntity.badRequest().build();
        }

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

        String email = sanitizeEmail(principal.getAttribute("email"));
        if (email == null) {
            PredictionResponseDTO err = new PredictionResponseDTO();
            err.setStatus("error");
            return ResponseEntity.status(401).body(err);
        }

        log.info("[CONTROLLER] /predict called for user: {}", email);

        PredictionResponseDTO result = predictionService.getPrediction(email);

        try {
            String json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(result);
            log.debug("[CONTROLLER] /predict response:\n{}", json);
        } catch (JsonProcessingException e) {
            log.warn("[CONTROLLER] Could not serialize prediction response: {}", e.getMessage());
        }

        if ("pending".equals(result.getStatus())) {
            return ResponseEntity.accepted().body(result);
        }

        return ResponseEntity.ok(result);
    }

    @GetMapping("/raw")
    public ResponseEntity<?> getRawRoute(
            @RequestParam @NotNull @DecimalMin("-90.0") @DecimalMax("90.0")   Double sLat,
            @RequestParam @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") Double sLon,
            @RequestParam @NotNull @DecimalMin("-90.0") @DecimalMax("90.0")   Double dLat,
            @RequestParam @NotNull @DecimalMin("-180.0") @DecimalMax("180.0") Double dLon,
            @AuthenticationPrincipal OAuth2User principal) {

        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("error", "User not authenticated"));
        }

        RouteResponseDTO result = googleRoutingService.getRawRouteDTO(sLat, sLon, dLat, dLon);
        return ResponseEntity.ok(result);
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    /**
     * Strips whitespace and enforces a sane max length on the email extracted
     * from the OAuth2 token. The token is trusted (signed by Google), but this
     * prevents edge-case issues with unusually long or malformed values being
     * used as cache/map keys.
     */
    private String sanitizeEmail(String raw) {
        if (raw == null) return null;
        String trimmed = raw.trim().toLowerCase();
        // RFC 5321 max email length
        if (trimmed.isEmpty() || trimmed.length() > 254) return null;
        return trimmed;
    }
}