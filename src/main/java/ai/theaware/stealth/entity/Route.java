package ai.theaware.stealth.entity;

import java.time.LocalDateTime;

import org.locationtech.jts.geom.LineString;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Data
@Table(name = "routes")
public class Route {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_email", nullable = false)
    private Users user;

    private Double startLat;
    private Double startLon;
    private Double endLat;
    private Double endLon;

    @Column(name = "geom", columnDefinition = "geometry(LineString, 4326)")
    private LineString geom;

    private LocalDateTime createdAt;
}