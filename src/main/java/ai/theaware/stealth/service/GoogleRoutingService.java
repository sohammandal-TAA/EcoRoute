package ai.theaware.stealth.service;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.maps.DirectionsApi;
import com.google.maps.GeoApiContext;
import com.google.maps.errors.ApiException;
import com.google.maps.model.DirectionsResult;
import com.google.maps.model.DirectionsRoute;
import com.google.maps.model.LatLng;

import ai.theaware.stealth.dto.PredictionResponseDTO.RouteForecast;
import ai.theaware.stealth.dto.PredictionResponseDTO.StationForecastEntry;
import ai.theaware.stealth.dto.RouteAnalysisResponseDTO;
import ai.theaware.stealth.dto.RouteResponseDTO;
import ai.theaware.stealth.entity.Route;
import ai.theaware.stealth.entity.Users;
import ai.theaware.stealth.repository.RouteRepository;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class GoogleRoutingService {

    private static final double SCORING_WEIGHT = 0.5;

    @Value("${app.ai.service.url}")
    private String aiAnalyzeUrl;

    private final GeoApiContext geoApiContext;
    private final RouteRepository routeRepository;
    private final GeometryFactory geometryFactory;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final PredictionService predictionService;

    private static final double INTERVAL_METERS = 1000.0;

    public GoogleRoutingService(RouteRepository routeRepository, RestTemplate restTemplate,
                                GeoApiContext geoApiContext, PredictionService predictionService) {
        this.routeRepository = routeRepository;
        this.restTemplate = restTemplate;
        this.geoApiContext = geoApiContext;
        this.predictionService = predictionService;
        this.objectMapper = new ObjectMapper();
        this.geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
    }

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    public RouteResponseDTO getProcessedRouteDTO(Double sLat, Double sLon, Double dLat, Double dLon) {
        try {
            DirectionsResult result = fetchDirectionsFromGoogle(sLat, sLon, dLat, dLon);
            return buildRouteResponseDTO(result);
        } catch (ApiException | IOException | InterruptedException e) {
            log.error("Failed to build Debug DTO", e);
            throw new RuntimeException("Resampling failed: " + e.getMessage());
        }
    }

    public RouteResponseDTO getRawRouteDTO(Double sLat, Double sLon, Double dLat, Double dLon) {
        try {
            DirectionsResult result = fetchDirectionsFromGoogle(sLat, sLon, dLat, dLon);

            List<RouteResponseDTO.RouteDetail> routesList = new ArrayList<>();
            for (DirectionsRoute route : result.routes) {
                List<RouteResponseDTO.Coordinate> rawCoords = route.overviewPolyline.decodePath()
                        .stream()
                        .map(p -> new RouteResponseDTO.Coordinate(p.lat, p.lng))
                        .collect(Collectors.toList());

                routesList.add(new RouteResponseDTO.RouteDetail(
                        route.legs[0].distance.humanReadable,
                        route.legs[0].distance.inMeters,
                        route.legs[0].duration.humanReadable,
                        rawCoords
                ));
            }
            return new RouteResponseDTO(routesList.size(), routesList);

        } catch (ApiException | IOException | InterruptedException e) {
            log.error("Failed to build raw route DTO", e);
            throw new RuntimeException("Raw route fetch failed: " + e.getMessage());
        }
    }

    @Cacheable(value = "aqi_routes", key = "#sLat + ',' + #sLon + ',' + #dLat + ',' + #dLon")
    public Object processRoute(Double sLat, Double sLon, Double dLat, Double dLon, Users user) {
        log.info("[CACHE MISS] Processing fresh request for user: {}", user.getEmail());

        try {
            DirectionsResult result = fetchDirectionsFromGoogle(sLat, sLon, dLat, dLon);
            RouteResponseDTO routesDto = buildRouteResponseDTO(result);

            Map<String, Double> routeDurations = extractDurationsMap(result);

            Map<String, Object> aiRequest = Map.of(
                    "start_loc", List.of(sLat, sLon),
                    "end_loc", List.of(dLat, dLon),
                    "routeCount", routesDto.getRouteCount(),
                    "routes", routesDto.getRoutes()
            );
            logJsonPayload(aiRequest);

            // Fire-and-forget async AQI forecast (for /predict endpoint)
            predictionService.triggerPrediction(user.getEmail(), sLat, sLon, dLat, dLon, routesDto.getRoutes());

            // Call synchronous AI ground-truth analysis service
            Object rawAiResponse;
            try {
                rawAiResponse = restTemplate.postForObject(aiAnalyzeUrl, aiRequest, Object.class);
            } catch (RestClientException e) {
                log.error("AI Service Unreachable: {}", e.getMessage());
                return Map.of("error", "AI Service Unreachable");
            }

            // Build the enriched response with "recommended" appended
            Object enrichedResponse = appendRecommendation(rawAiResponse, routeDurations, routesDto.getRouteCount());

            checkAndSaveHistory(sLat, sLon, dLat, dLon, user, result.routes[0]);

            return enrichedResponse;

        } catch (ApiException | IOException | InterruptedException e) {
            log.error("Fatal routing error", e);
            return Map.of("error", "Processing Error", "message", e.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // Scoring integration
    // -------------------------------------------------------------------------

    private Object appendRecommendation(Object rawAiResponse,
                                        Map<String, Double> routeDurations,
                                        int routeCount) {
        try {
            Map<String, Object> aiMap = objectMapper.convertValue(rawAiResponse,
                    objectMapper.getTypeFactory().constructMapType(LinkedHashMap.class, String.class, Object.class));

            Map<String, RouteForecast> routeForecasts = buildRouteForecastsFromAnalysis(aiMap, routeCount);
            Map<String, Double> scores = RouteScoringService.computeScores(routeForecasts, routeDurations, SCORING_WEIGHT);

            // Sort route ids by score ascending (lower = better)
            List<String> ranked = scores.entrySet().stream()
                    .sorted(Map.Entry.comparingByValue())
                    .map(Map.Entry::getKey)
                    .collect(Collectors.toList());

            log.info("[SCORE] Route scores: {} | Ranked (best→poor): {}", scores, ranked);

            RouteAnalysisResponseDTO response = new RouteAnalysisResponseDTO();
            aiMap.forEach(response::setAiField);
            applyRankLabels(response, ranked);
            return response;

        } catch (IllegalArgumentException e) {
            log.error("[SCORE] Scoring failed, applying default rank labels: {}", e.getMessage(), e);
            try {
                Map<String, Object> aiMap = objectMapper.convertValue(rawAiResponse,
                        objectMapper.getTypeFactory().constructMapType(LinkedHashMap.class, String.class, Object.class));
                RouteAnalysisResponseDTO response = new RouteAnalysisResponseDTO();
                aiMap.forEach(response::setAiField);
                // Fallback: rank by natural order Route_1, Route_2, Route_3
                List<String> fallback = new ArrayList<>();
                for (int i = 1; i <= routeCount; i++) fallback.add("Route_" + i);
                applyRankLabels(response, fallback);
                return response;
            } catch (IllegalArgumentException inner) {
                log.error("[SCORE] Fallback also failed: {}", inner.getMessage());
                return rawAiResponse;
            }
        }
    }

    private void applyRankLabels(RouteAnalysisResponseDTO response, List<String> ranked) {
        if (ranked.isEmpty()) return;

        // Build label lookup: routeId -> label, keyed by score-sorted position
        Map<String, String> labelMap = new HashMap<>();
        labelMap.put(ranked.get(0), "best");
        if (ranked.size() == 2) {
            labelMap.put(ranked.get(1), "poor");
        } else if (ranked.size() >= 3) {
            labelMap.put(ranked.get(1), "moderate");
            labelMap.put(ranked.get(ranked.size() - 1), "poor");
        }
        ranked.stream()
              .sorted()
              .forEach(routeId -> response.setAiField(routeId, labelMap.get(routeId)));

        response.setRecommended(ranked.get(0));
    }

    /**
     * Builds a {@code Map<routeId, RouteForecast>} from the {@code route_analysis}
     * block inside the AI response map.
     *
     * Each detail point's AQI is wrapped into a {@link StationForecastEntry} so
     * {@link RouteScoringService} can iterate over them uniformly.
     */
    private Map<String, RouteForecast> buildRouteForecastsFromAnalysis(Map<String, Object> aiMap, int routeCount) {
        Map<String, RouteForecast> result = new LinkedHashMap<>();

        Object routeAnalysisRaw = aiMap.get("route_analysis");
        if (routeAnalysisRaw == null) {
            log.warn("[SCORE] 'route_analysis' missing from AI response – using empty forecasts");
            return buildEmptyForecasts(routeCount);
        }

        Map<String, Object> routeAnalysis;
        try {
            routeAnalysis = (Map<String, Object>) routeAnalysisRaw;
        } catch (ClassCastException e) {
            log.warn("[SCORE] 'route_analysis' has unexpected type: {}", routeAnalysisRaw.getClass());
            return buildEmptyForecasts(routeCount);
        }

        for (Map.Entry<String, Object> entry : routeAnalysis.entrySet()) {
            String routeId = entry.getKey();
            Map<String, Object> routeData = (Map<String, Object>) entry.getValue();

            List<Object> details = (List<Object>) routeData.getOrDefault("details", List.of());

            List<StationForecastEntry> forecastPoints = new ArrayList<>();
            for (Object detailObj : details) {
                Map<String, Object> detail = (Map<String, Object>) detailObj;
                Double aqi = toDouble(detail.get("aqi"));
                if (aqi != null) {
                    StationForecastEntry entry2 = new StationForecastEntry();
                    entry2.setAqi(aqi);
                    forecastPoints.add(entry2);
                }
            }

            Double avgAqi = toDouble(routeData.get("avg_aqi"));
            RouteForecast forecast = new RouteForecast();
            forecast.setForecast(forecastPoints);
            forecast.setAvgRouteAqi(avgAqi);
            result.put(routeId, forecast);
        }

        return result;
    }

    /** Fallback: produce empty RouteForecast entries so scoring doesn't crash. */
    private Map<String, RouteForecast> buildEmptyForecasts(int routeCount) {
        Map<String, RouteForecast> result = new LinkedHashMap<>();
        for (int i = 1; i <= routeCount; i++) {
            RouteForecast rf = new RouteForecast();
            rf.setForecast(List.of());
            result.put("Route_" + i, rf);
        }
        return result;
    }

    /**
     * Extracts travel durations (in minutes) from the Google Directions result,
     * keyed as "Route_1", "Route_2", …
     */
    private Map<String, Double> extractDurationsMap(DirectionsResult result) {
        Map<String, Double> durations = new HashMap<>();
        for (int i = 0; i < result.routes.length; i++) {
            double durationMinutes = result.routes[i].legs[0].duration.inSeconds / 60.0;
            durations.put("Route_" + (i + 1), durationMinutes);
        }
        return durations;
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private Double toDouble(Object value) {
        if (value == null) return null;
        if (value instanceof Number number) return number.doubleValue();
        try { return Double.valueOf(value.toString()); } catch (NumberFormatException e) { return null; }
    }

    private DirectionsResult fetchDirectionsFromGoogle(Double sLat, Double sLon, Double dLat, Double dLon)
            throws ApiException, InterruptedException, IOException {
        return DirectionsApi.newRequest(geoApiContext)
                .origin(new LatLng(sLat, sLon))
                .destination(new LatLng(dLat, dLon))
                .alternatives(true)
                .await();
    }

    private RouteResponseDTO buildRouteResponseDTO(DirectionsResult result) {
        List<RouteResponseDTO.RouteDetail> routesList = new ArrayList<>();

        for (DirectionsRoute route : result.routes) {
            List<RouteResponseDTO.Coordinate> rawCoords = route.overviewPolyline.decodePath()
                    .stream()
                    .map(p -> new RouteResponseDTO.Coordinate(p.lat, p.lng))
                    .collect(Collectors.toList());

            List<RouteResponseDTO.Coordinate> resampled = resamplePath(rawCoords, INTERVAL_METERS);

            routesList.add(new RouteResponseDTO.RouteDetail(
                    route.legs[0].distance.humanReadable,
                    route.legs[0].distance.inMeters,
                    route.legs[0].duration.humanReadable,
                    resampled
            ));
        }
        return new RouteResponseDTO(routesList.size(), routesList);
    }

    private void logJsonPayload(Object payload) {
        try {
            String json = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(payload);
            log.info("\n==============================\nSENDING TO AI SERVICE:\n{}\n==============================", json);
        } catch (JsonProcessingException e) {
            log.warn("Could not log JSON payload: {}", e.getMessage());
        }
    }

    private void checkAndSaveHistory(Double sLat, Double sLon, Double dLat, Double dLon,
                                     Users user, DirectionsRoute primaryRoute) {
        Optional<Route> lastEntry = routeRepository.findFirstByUserOrderByCreatedAtDesc(user);

        boolean isDuplicate = lastEntry.isPresent() &&
                lastEntry.get().getStartLat().equals(sLat) &&
                lastEntry.get().getStartLon().equals(sLon) &&
                lastEntry.get().getEndLat().equals(dLat) &&
                lastEntry.get().getEndLon().equals(dLon);

        if (isDuplicate) {
            log.debug("Route already exists in history for {}. Skipping DB save.", user.getEmail());
        } else {
            try {
                saveToDatabase(sLat, sLon, dLat, dLon, user, primaryRoute);
                log.info("Successfully logged history for {}", user.getEmail());
            } catch (Exception e) {
                log.error("History save failed for {}: {}", user.getEmail(), e.getMessage());
            }
        }
    }

    private void saveToDatabase(Double sLat, Double sLon, Double dLat, Double dLon,
                                Users user, DirectionsRoute primaryRoute) throws Exception {
        Route routeEntity = new Route();
        routeEntity.setUser(user);
        routeEntity.setStartLat(sLat);
        routeEntity.setStartLon(sLon);
        routeEntity.setEndLat(dLat);
        routeEntity.setEndLon(dLon);
        routeEntity.setCreatedAt(LocalDateTime.now());

        List<LatLng> path = primaryRoute.overviewPolyline.decodePath();
        Coordinate[] jtsCoords = path.stream()
                .map(p -> new Coordinate(p.lng, p.lat))
                .toArray(Coordinate[]::new);

        routeEntity.setGeom(geometryFactory.createLineString(jtsCoords));
        routeRepository.save(routeEntity);
    }

    private List<RouteResponseDTO.Coordinate> resamplePath(List<RouteResponseDTO.Coordinate> path, double interval) {
        List<RouteResponseDTO.Coordinate> resampled = new ArrayList<>();
        if (path.isEmpty()) return resampled;
        resampled.add(round(path.get(0)));
        double accumulatedDist = 0.0;
        for (int i = 0; i < path.size() - 1; i++) {
            RouteResponseDTO.Coordinate start = path.get(i);
            RouteResponseDTO.Coordinate end = path.get(i + 1);
            double segmentDist = haversine(start.getLat(), start.getLng(), end.getLat(), end.getLng());
            while (accumulatedDist + segmentDist >= interval) {
                double remainingNeeded = interval - accumulatedDist;
                double ratio = remainingNeeded / segmentDist;
                double nextLat = start.getLat() + (end.getLat() - start.getLat()) * ratio;
                double nextLng = start.getLng() + (end.getLng() - start.getLng()) * ratio;
                RouteResponseDTO.Coordinate nextPoint = new RouteResponseDTO.Coordinate(nextLat, nextLng);
                resampled.add(round(nextPoint));
                start = nextPoint;
                segmentDist -= remainingNeeded;
                accumulatedDist = 0.0;
            }
            accumulatedDist += segmentDist;
        }
        return resampled;
    }

    private RouteResponseDTO.Coordinate round(RouteResponseDTO.Coordinate c) {
        double lat = BigDecimal.valueOf(c.getLat()).setScale(6, RoundingMode.HALF_UP).doubleValue();
        double lng = BigDecimal.valueOf(c.getLng()).setScale(6, RoundingMode.HALF_UP).doubleValue();
        return new RouteResponseDTO.Coordinate(lat, lng);
    }

    private double haversine(double lat1, double lon1, double lat2, double lon2) {
        double R = 6371000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}