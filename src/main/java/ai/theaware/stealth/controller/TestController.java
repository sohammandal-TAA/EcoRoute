package ai.theaware.stealth.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.google.maps.model.DirectionsResult;

import ai.theaware.stealth.service.TestService;

@RestController
@RequestMapping("/")
public class TestController {

    private final TestService s;

    public TestController(TestService s) {
        this.s = s;
    }

    @GetMapping()
    public DirectionsResult getRawRoutes(
            @RequestParam Double sLat, @RequestParam Double sLon,
            @RequestParam Double dLat, @RequestParam Double dLon) {
        return s.getRawGoogleRoutes(sLat, sLon, dLat, dLon);
    }
}