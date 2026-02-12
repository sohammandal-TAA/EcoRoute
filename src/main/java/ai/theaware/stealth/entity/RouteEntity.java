package ai.theaware.stealth.entity;

import org.locationtech.jts.geom.LineString;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Data
@Table(name = "routes")
public class RouteEntity {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Double startLat;
    private Double startLon;
    private Double endLat;
    private Double endLon;

    private Long distanceMeters;

    @Column(columnDefinition = "geometry(LineString, 4326)")
    private LineString geom; 
}