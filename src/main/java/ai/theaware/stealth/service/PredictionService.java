package ai.theaware.stealth.service;

import ai.theaware.stealth.dto.PredictionResponseDTO;
import ai.theaware.stealth.dto.RouteResponseDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;

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
        CompletableFuture<PredictionResponseDTO> future = new CompletableFuture<>();
        pendingPredictions.put(userEmail, future);

        try {
            Map<String, Object> payload = Map.of(
                    "sLat", sLat,
                    "sLon", sLon,
                    "dLat", dLat,
                    "dLon", dLon,
                    "routes", routes   // Python RouteRequest requires this field
            );

            log.info("Triggering AI Prediction at: {}", predictUrl);

            Object raw = restTemplate.postForObject(predictUrl, payload, Object.class);
            PredictionResponseDTO dto = objectMapper.convertValue(raw, PredictionResponseDTO.class);

            future.complete(dto);
        } catch (RestClientException e) {
            future.completeExceptionally(e);
            log.error("Prediction error: {}", e.getMessage());
        }
    }

    public PredictionResponseDTO getPrediction(String userEmail) {
        CompletableFuture<PredictionResponseDTO> future = pendingPredictions.get(userEmail);

        if (future == null) {
            PredictionResponseDTO err = new PredictionResponseDTO();
            err.setStatus("error");
            return err;
        }

        try {
            PredictionResponseDTO result = future.get(30, java.util.concurrent.TimeUnit.SECONDS);
            pendingPredictions.remove(userEmail);
            return result;
        } catch (java.util.concurrent.TimeoutException e) {
            PredictionResponseDTO pending = new PredictionResponseDTO();
            pending.setStatus("pending");
            return pending;
        } catch (InterruptedException | ExecutionException e) {
            pendingPredictions.remove(userEmail);
            log.error("Prediction failed for {}: {}", userEmail, e.getMessage());
            PredictionResponseDTO err = new PredictionResponseDTO();
            err.setStatus("error");
            return err;
        }
    }
}