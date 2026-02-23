package ai.theaware.stealth.dto;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class PredictionResponseDTO {

    private String status;

    @JsonProperty("station_forecasts")
    private Map<String, List<StationForecastEntry>> stationForecasts;

    @JsonProperty("route_forecasts")
    private Map<String, RouteForecast> routeForecasts;

    private Meta meta;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class StationForecastEntry {
        private String time;
        private Double aqi;

        @JsonProperty("health_info")
        private HealthInfo healthInfo;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class RouteForecast {
        private List<StationForecastEntry> forecast;

        @JsonProperty("avg_route_aqi")
        private Double avgRouteAqi;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class HealthInfo {
        private String category;
        private String color;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Meta {
        private String location;
    }
}