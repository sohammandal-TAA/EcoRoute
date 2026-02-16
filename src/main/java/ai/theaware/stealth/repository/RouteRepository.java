package ai.theaware.stealth.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import ai.theaware.stealth.entity.Route;
import ai.theaware.stealth.entity.Users;

public interface RouteRepository extends JpaRepository<Route, Long> { 
    Optional<Route> findFirstByUserOrderByCreatedAtDesc(Users user);
}