package ai.theaware.stealth.service;

import java.io.IOException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.google.maps.DirectionsApi;
import com.google.maps.GeoApiContext;
import com.google.maps.errors.ApiException;
import com.google.maps.model.DirectionsResult;
import com.google.maps.model.LatLng;

@Service
public class TestService {

    @Value("${google.maps.api.key}")
    private String apiKey;

    public DirectionsResult getRawGoogleRoutes(Double sLat, Double sLon, Double dLat, Double dLon) {
        GeoApiContext context = new GeoApiContext.Builder()
                .apiKey(apiKey)
                .build();

        try {
            return DirectionsApi.newRequest(context)
                    .origin(new LatLng(sLat, sLon))
                    .destination(new LatLng(dLat, dLon))
                    .alternatives(true)
                    .await();
        } catch (ApiException | IOException | InterruptedException e) {
            throw new RuntimeException("Google API Error: " + e.getMessage());
        } finally {
            context.shutdown();
        }
    }
}