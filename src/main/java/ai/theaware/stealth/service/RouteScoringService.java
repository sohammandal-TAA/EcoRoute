package ai.theaware.stealth.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import ai.theaware.stealth.dto.PredictionResponseDTO.RouteForecast;
import ai.theaware.stealth.dto.PredictionResponseDTO.StationForecastEntry;

/**
 * High-performance route scoring engine.
 *
 * - O(totalSegments) time complexity
 * - Two lightweight passes
 * - No streams
 * - No object churn inside loops
 * - Works for N >= 1
 */
public final class RouteScoringService {

    private static final double AQI_MAX = 300.0;

    private RouteScoringService() {
        // Utility class
    }

    /**
     * Computes route scores using:
     *
     * E_r = sum((AQI/300)^2 * t)
     *
     * J_r = (1-w)*(T_r/mean(T)) + w*(E_r/mean(E))
     *
     * @param routeForecasts routeId -> forecast
     * @param routeDurations routeId -> duration in minutes
     * @param w weight between time and exposure (0 <= w <= 1)
     * @return routeId -> score
     */
    public static Map<String, Double> computeScores(
            Map<String, RouteForecast> routeForecasts,
            Map<String, Double> routeDurations,
            double w
    ) {

        int routeCount = routeForecasts.size();

        // Edge case: no routes
        if (routeCount == 0) {
            return new HashMap<>();
        }

        // First pass: compute exposure + accumulate totals
        Map<String, Double> exposureMap = new HashMap<>(routeCount);

        double totalTime = 0.0;
        double totalExposure = 0.0;

        for (Map.Entry<String, RouteForecast> entry : routeForecasts.entrySet()) {

            String routeId = entry.getKey();
            RouteForecast forecast = entry.getValue();

            double duration = routeDurations.getOrDefault(routeId, 0.0);
            totalTime += duration;

            List<StationForecastEntry> points = forecast.getForecast();

            // If only 1 segment, avoid division by zero
            int segmentCount = (points == null || points.isEmpty()) ? 1 : points.size();
            double timePerSegment = duration / segmentCount;

            double exposure = 0.0;

            if (points != null) {
                for (int i = 0; i < points.size(); i++) {

                    Double aqiValue = points.get(i).getAqi();
                    if (aqiValue == null) continue;

                    double normalized = aqiValue / AQI_MAX;

                    // (AQI / 300)^2
                    double risk = normalized * normalized;

                    exposure += risk * timePerSegment;
                }
            }

            exposureMap.put(routeId, exposure);
            totalExposure += exposure;
        }

        // Compute means (safe for N=1)
        double meanTime = totalTime / routeCount;
        double meanExposure = totalExposure / routeCount;

        // Second pass: compute final scores
        Map<String, Double> scoreMap = new HashMap<>(routeCount);

        for (Map.Entry<String, RouteForecast> entry : routeForecasts.entrySet()) {

            String routeId = entry.getKey();

            double duration = routeDurations.getOrDefault(routeId, 0.0);
            double exposure = exposureMap.get(routeId);

            double normalizedTime =
                    (meanTime == 0.0) ? 0.0 : duration / meanTime;

            double normalizedExposure =
                    (meanExposure == 0.0) ? 0.0 : exposure / meanExposure;

            double score =
                    (1.0 - w) * normalizedTime
                    + w * normalizedExposure;

            scoreMap.put(routeId, score);
        }

        return scoreMap;
    }

    /**
     * Returns the routeId with minimum score.
     * O(N) scan, no streams.
     */
    public static String selectBestRoute(Map<String, Double> scores) {

        String bestRoute = null;
        double minScore = Double.MAX_VALUE;

        for (Map.Entry<String, Double> entry : scores.entrySet()) {

            double score = entry.getValue();

            if (score < minScore) {
                minScore = score;
                bestRoute = entry.getKey();
            }
        }

        return bestRoute;
    }
}