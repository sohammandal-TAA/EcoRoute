package ai.theaware.stealth.service;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
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

import com.google.maps.DirectionsApi;
import com.google.maps.GeoApiContext;
import com.google.maps.errors.ApiException;
import com.google.maps.model.DirectionsResult;
import com.google.maps.model.DirectionsRoute;
import com.google.maps.model.LatLng;

import ai.theaware.stealth.dto.RouteResponseDTO;
import ai.theaware.stealth.entity.Route;
import ai.theaware.stealth.entity.Users;
import ai.theaware.stealth.repository.RouteRepository;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class GoogleRoutingService {

    @Value("${google.maps.api.key}")
    private String apiKey;

    @Value("${app.ai.service.url}")
    private String aiServiceUrl;

    private final RouteRepository routeRepository;
    private final GeometryFactory geometryFactory;
    private final RestTemplate restTemplate;

    private static final double INTERVAL_METERS = 1000.0;

    public GoogleRoutingService(RouteRepository routeRepository, 
                                RestTemplate restTemplate) {
        this.routeRepository = routeRepository;
        this.restTemplate = restTemplate;
        this.geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
    }

    @Cacheable(value = "aqi_routes", 
           key = "#sLat + ',' + #sLon + ',' + #dLat + ',' + #dLon + ',' + #user.email")
    public Object processRoute(Double sLat, Double sLon, Double dLat, Double dLon, Users user) {
        System.out.println("[CACHE MISS] Processing fresh request for user: " + user.getEmail());

        GeoApiContext context = new GeoApiContext.Builder().apiKey(apiKey).build();

        try {
            DirectionsResult result = DirectionsApi.newRequest(context)
                    .origin(new LatLng(sLat, sLon))
                    .destination(new LatLng(dLat, dLon))
                    .alternatives(true)
                    .await();

            List<RouteResponseDTO.RouteDetail> routesList = new ArrayList<>();

            for (DirectionsRoute route : result.routes) {
                List<RouteResponseDTO.Coordinate> rawCoords = route.overviewPolyline.decodePath()
                        .stream()
                        .map(p -> new RouteResponseDTO.Coordinate(p.lat, p.lng))
                        .collect(Collectors.toList());

                List<RouteResponseDTO.Coordinate> cleaned = resamplePath(rawCoords, INTERVAL_METERS);

                RouteResponseDTO.RouteDetail detail = new RouteResponseDTO.RouteDetail(
                        route.legs[0].distance.humanReadable,
                        route.legs[0].distance.inMeters,
                        route.legs[0].duration.humanReadable,
                        cleaned
                );
                routesList.add(detail);
            }

            Map<String, Object> aiRequest = Map.of(
                "start_loc", List.of(sLat, sLon),
                "end_loc",   List.of(dLat, dLon),
                "routeCount", routesList.size(),
                "routes",    routesList
            );

            Object aiResponse;
            try {
                aiResponse = restTemplate.postForObject(
                    aiServiceUrl,
                    aiRequest,
                    Object.class
                );
            } catch (RestClientException e) {
                log.error("AI Service Error: {}", e.getMessage());
                return Map.of("error", "AI Service Unreachable");
            }

            checkAndSaveHistory(sLat, sLon, dLat, dLon, user, result.routes[0]);

            return aiResponse;

        } catch (ApiException | IOException | InterruptedException e) {
            log.error("Fatal routing error", e);
            return Map.of("error", "Processing Error", "message", e.getMessage());

        } finally {
            context.shutdown();
        }
    }

    private void checkAndSaveHistory(Double sLat, Double sLon, Double dLat, Double dLon, 
                                     Users user, DirectionsRoute primaryRoute) {
        
        // Find the absolute last route this specific user requested
        Optional<Route> lastEntry = routeRepository.findFirstByUserOrderByCreatedAtDesc(user);

        boolean isDuplicate = lastEntry.isPresent() &&
                lastEntry.get().getStartLat().equals(sLat) &&
                lastEntry.get().getStartLon().equals(sLon) &&
                lastEntry.get().getEndLat().equals(dLat) &&
                lastEntry.get().getEndLon().equals(dLon);

        if (isDuplicate) {
            System.out.println("Route already exists in history for " + user.getEmail() + ". Skipping DB save.");
        } else {
            try {
                saveToDatabase(sLat, sLon, dLat, dLon, user, primaryRoute);
                System.out.println("Successfully logged history for " + user.getEmail());
            } catch (Exception e) {
                System.err.println("History save failed: " + e.getMessage());
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