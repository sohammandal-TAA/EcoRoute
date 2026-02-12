package ai.theaware.stealth.dto;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RouteResponseDTO {

    private int routeCount;
    private List<RouteDetail> routes;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RouteDetail {
        private String distance;
        private long distanceValue;
        private String duration;
        private List<Coordinate> coordinates;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Coordinate {
        private double lat;
        private double lng;
    }
}