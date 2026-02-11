package ai.theaware.stealth.service;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.google.maps.DirectionsApi;
import com.google.maps.GeoApiContext;
import com.google.maps.errors.ApiException;
import com.google.maps.model.DirectionsResult;
import com.google.maps.model.DirectionsRoute;
import com.google.maps.model.LatLng;

import ai.theaware.stealth.dto.RouteResponseDTO;

@Service
public class GoogleRoutingService {

    @Value("${google.maps.api.key}")
    private String apiKey;

    private final double INTERVAL_METERS = 500.0;

    public RouteResponseDTO getCalculatedRoutes(Double sLat, Double sLon, Double dLat, Double dLon) {
        GeoApiContext context = new GeoApiContext.Builder()
                .apiKey(apiKey)
                .build();

        try {
            DirectionsResult result = DirectionsApi.newRequest(context)
                    .origin(new LatLng(sLat, sLon))
                    .destination(new LatLng(dLat, dLon))
                    .alternatives(true)
                    .await();

            List<RouteResponseDTO.RouteDetail> routeDetails = new ArrayList<>();

            for (DirectionsRoute route : result.routes) {
                // 1. Decode Google's sparse polyline
                List<RouteResponseDTO.Coordinate> sparseCoords = route.overviewPolyline.decodePath()
                        .stream()
                        .map(p -> new RouteResponseDTO.Coordinate(p.lat, p.lng))
                        .collect(Collectors.toList());

                // 2. Interpolate to get a point every 500m
                List<RouteResponseDTO.Coordinate> denseCoords = interpolatePoints(sparseCoords, INTERVAL_METERS);

                long totalDistanceMeters = route.legs[0].distance.inMeters;
                
                routeDetails.add(new RouteResponseDTO.RouteDetail(
                        route.legs[0].distance.humanReadable,
                        totalDistanceMeters,
                        route.legs[0].duration.humanReadable,
                        denseCoords
                ));
            }

            return new RouteResponseDTO(routeDetails.size(), routeDetails);

        } catch (ApiException | IOException | InterruptedException e) {
            throw new RuntimeException("Google API Error: " + e.getMessage());
        } finally {
            context.shutdown();
        }
    }

    /**
     * Fills in the gaps between coordinates to ensure a point exists every 'interval' meters.
     */
    private List<RouteResponseDTO.Coordinate> interpolatePoints(List<RouteResponseDTO.Coordinate> path, double interval) {
        List<RouteResponseDTO.Coordinate> result = new ArrayList<>();
        if (path == null || path.isEmpty()) return result;

        result.add(path.get(0));

        for (int i = 0; i < path.size() - 1; i++) {
            RouteResponseDTO.Coordinate start = path.get(i);
            RouteResponseDTO.Coordinate end = path.get(i + 1);

            double segmentDist = calculateHaversine(start, end);

            if (segmentDist > interval) {
                int pointsToAdd = (int) (segmentDist / interval);
                for (int j = 1; j <= pointsToAdd; j++) {
                    double ratio = (j * interval) / segmentDist;
                    double nextLat = start.getLat() + (end.getLat() - start.getLat()) * ratio;
                    double nextLon = start.getLng() + (end.getLng() - start.getLng()) * ratio;
                    result.add(new RouteResponseDTO.Coordinate(nextLat, nextLon));
                }
            }
            result.add(end);
        }
        return result;
    }

    /**
     * Calculates distance between two points in meters.
     */
    private double calculateHaversine(RouteResponseDTO.Coordinate p1, RouteResponseDTO.Coordinate p2) {
        double R = 6371000; // Earth's radius in meters
        double dLat = Math.toRadians(p2.getLat() - p1.getLat());
        double dLon = Math.toRadians(p2.getLng() - p1.getLng());
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                   Math.cos(Math.toRadians(p1.getLat())) * Math.cos(Math.toRadians(p2.getLat())) *
                   Math.sin(dLon / 2) * Math.sin(dLon / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}