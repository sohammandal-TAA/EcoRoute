package ai.theaware.stealth.service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.ObjectMapper;

import ai.theaware.stealth.dto.PredictionResponseDTO;
import ai.theaware.stealth.dto.RouteResponseDTO;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class PredictionService {

    @Value("${app.ai.predict-url}")
    private String predictUrl;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<String, CompletableFuture<PredictionResponseDTO>> pendingPredictions =
            new ConcurrentHashMap<>();

    public PredictionService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
        this.objectMapper = new ObjectMapper();
    }

    @Async
    public void triggerPrediction(String userEmail, Double sLat, Double sLon, Double dLat, Double dLon,
                                  List<RouteResponseDTO.RouteDetail> routes) {
        log.info("[PREDICT] triggerPrediction called for user: {}", userEmail);

        CompletableFuture<PredictionResponseDTO> future = new CompletableFuture<>();
        pendingPredictions.put(userEmail, future);
        log.info("[PREDICT] Future registered for user: {} | Active predictions: {}", userEmail, pendingPredictions.size());

        try {
            Map<String, Object> payload = Map.of(
                    "sLat", sLat,
                    "sLon", sLon,
                    "dLat", dLat,
                    "dLon", dLon,
                    "routes", routes
            );

            log.info("[PREDICT] Sending request to: {}", predictUrl);
            Object raw = restTemplate.postForObject(predictUrl, payload, Object.class);
            log.info("[PREDICT] Raw response received, converting to DTO...");

            PredictionResponseDTO dto = objectMapper.convertValue(raw, PredictionResponseDTO.class);
            log.info("[PREDICT] DTO conversion success | status={} | stationForecasts={} | routeForecasts={}",
                    dto.getStatus(),
                    dto.getStationForecasts() != null ? dto.getStationForecasts().size() : "null",
                    dto.getRouteForecasts() != null ? dto.getRouteForecasts().size() : "null");

            future.complete(dto);
            log.info("[PREDICT] Future completed for user: {}", userEmail);

        } catch (RestClientException e) {
            future.completeExceptionally(e);
            log.error("[PREDICT] HTTP error for user {}: {}", userEmail, e.getMessage());
        } catch (Exception e) {
            future.completeExceptionally(e);
            log.error("[PREDICT] Unexpected error for user {}: {}", userEmail, e.getMessage(), e);
        }
    }

    public PredictionResponseDTO getPrediction(String userEmail) {
        log.info("[PREDICT] getPrediction called for user: {} | Pending keys: {}", userEmail, pendingPredictions.keySet());

        CompletableFuture<PredictionResponseDTO> future = pendingPredictions.get(userEmail);

        if (future == null) {
            log.warn("[PREDICT] No future found for user: {} — /process was not called first or already consumed", userEmail);
            PredictionResponseDTO err = new PredictionResponseDTO();
            err.setStatus("error");
            return err;
        }

        log.info("[PREDICT] Future found for user: {} | isDone={} | isCancelled={}", 
                userEmail, future.isDone(), future.isCancelled());

        try {
            PredictionResponseDTO result = future.get(30, java.util.concurrent.TimeUnit.SECONDS);
            pendingPredictions.remove(userEmail);
            log.info("[PREDICT] Successfully retrieved prediction for user: {} | status={}", userEmail, result.getStatus());
            return result;

        } catch (java.util.concurrent.TimeoutException e) {
            log.warn("[PREDICT] Timeout waiting for prediction for user: {}", userEmail);
            PredictionResponseDTO pending = new PredictionResponseDTO();
            pending.setStatus("pending");
            return pending;

        } catch (InterruptedException | ExecutionException e) {
            pendingPredictions.remove(userEmail);
            log.error("[PREDICT] Execution error for user {}: {}", userEmail, e.getMessage(), e);
            PredictionResponseDTO err = new PredictionResponseDTO();
            err.setStatus("error");
            return err;
        }
    }
}