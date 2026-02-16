package ai.theaware.stealth.entity;

import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Data
@Table(name = "users")
public class Users {

    @Id
    @Column(nullable = false, length = 50)
    private String username;
    
    @Column(nullable = false)
    private String password; 

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    private List<Route> routes;
}