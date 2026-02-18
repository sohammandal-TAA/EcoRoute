package ai.theaware.stealth.service;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;

import org.springframework.web.client.RestClientException;

@Service
@Slf4j
public class PredictionService {

    @Value("${app.ai.service.url}")
    private String aiServiceUrl;

    private final RestTemplate restTemplate;

    private final ConcurrentHashMap<String, CompletableFuture<Object>> pendingPredictions
            = new ConcurrentHashMap<>();

    public PredictionService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Async
    public void triggerPrediction(String userEmail, Double lat, Double lon) {
        CompletableFuture<Object> future = new CompletableFuture<>();
        pendingPredictions.put(userEmail, future);

        try {
            String predictUrl = aiServiceUrl
                    .replace("/analyze-routes", "/predict-all-stations");

            Map<String, Object> payload = Map.of(
                    "lat", lat,
                    "lon", lon
            );

            Object result = restTemplate.postForObject(predictUrl, payload, Object.class);
            future.complete(result);
            log.info("Prediction complete for user: {}", userEmail);

        } catch (RestClientException e) {
            future.completeExceptionally(e);
            log.error("Prediction failed for user {}: {}", userEmail, e.getMessage());
        }
    }

    public Object getPrediction(String userEmail) {
        CompletableFuture<Object> future = pendingPredictions.get(userEmail);

        if (future == null) {
            return Map.of("error", "No prediction found. Please call /process first.");
        }

        try {
            return future.get(30, java.util.concurrent.TimeUnit.SECONDS);
        } catch (java.util.concurrent.TimeoutException e) {
            return Map.of("error", "Prediction still processing, try again in a moment.");
        } catch (InterruptedException | ExecutionException e) {
            return Map.of("error", "Prediction failed: " + e.getMessage());
        }
    }
}