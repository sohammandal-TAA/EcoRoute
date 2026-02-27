package ai.theaware.stealth.service;

import java.util.Map;

import org.springframework.stereotype.Service;

import ai.theaware.stealth.dto.HealthMetricsResponseDTO;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class HealthMetricsService {

    /**
     * Parses the JSON response from POST /api/routes/process and computes
     * the three health metrics by delegating to RouteHealthMetricsService.
     *
     * Expected keys in processResponse:
     *   - "recommended"    : e.g. "Route_1"
     *   - "route_analysis" : map of routeId -> { duration, avg_pm25, details[] }
     */
    public HealthMetricsResponseDTO compute(Map<String, Object> processResponse) {

        // ── Extract recommended route ────────────────────────────────────────
        String recommendedRoute = (String) processResponse.get("recommended");
        if (recommendedRoute == null) {
            log.warn("[HEALTH] 'recommended' key missing, defaulting to Route_1");
            recommendedRoute = "Route_1";
        }

        // ── Extract route_analysis block ─────────────────────────────────────
        Object routeAnalysisRaw = processResponse.get("route_analysis");
        if (!(routeAnalysisRaw instanceof Map)) {
            throw new RuntimeException("'route_analysis' block is missing or invalid in the provided response");
        }

        Map<String, Object> routeAnalysis = (Map<String, Object>) routeAnalysisRaw;

        log.info("[HEALTH] Computing metrics | recommended={} | routes={}",
                recommendedRoute, routeAnalysis.keySet());

        // ── Compute ──────────────────────────────────────────────────────────
        RouteHealthMetricsService.HealthMetrics metrics =
                RouteHealthMetricsService.compute(routeAnalysis, recommendedRoute);

        log.info("[HEALTH] {}", metrics);

        return new HealthMetricsResponseDTO(
                metrics.exposureReductionPct,
                metrics.pm25AvoidedUg,
                metrics.equivalentMinutes
        );
    }
}