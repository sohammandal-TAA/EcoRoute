package ai.theaware.stealth.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import ai.theaware.stealth.dto.RouteResponseDTO;
import ai.theaware.stealth.service.GoogleRoutingService;

@RestController
@RequestMapping("/api/v1/routes")
public class RouteController {

    @Autowired
    private GoogleRoutingService routingService;

    @GetMapping("/compare")
    public ResponseEntity<?> getRouteComparison(
            @RequestParam(name = "sLat") Double sLat,
            @RequestParam(name = "sLon") Double sLon,   
            @RequestParam(name = "dLat") Double dLat,
            @RequestParam(name = "dLon") Double dLon) {
        
        // Simple manual check to provide a better error message than the log you saw
        if (sLat == null || sLon == null || dLat == null || dLon == null) {
            return ResponseEntity.badRequest()
                .body("Error: Please provide all coordinates: sLaa, sLon, dLat, dLon");
        }

        try {
            RouteResponseDTO routes = routingService.getCalculatedRoutes(sLat, sLon, dLat, dLon);
            return ResponseEntity.ok(routes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                .body("Google API Error: " + e.getMessage());
        }
    }
}