package ai.theaware.stealth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AuthRequestDTO {
    @NotBlank @Size(min=3, max=50) 
    private String username;
    
   @NotBlank @Size(min=8) 
   private String password;
}