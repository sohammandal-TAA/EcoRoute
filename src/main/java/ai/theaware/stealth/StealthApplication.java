package ai.theaware.stealth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;

@SpringBootApplication
@EnableCaching
public class StealthApplication {

	public static void main(String[] args) {
		SpringApplication.run(StealthApplication.class, args);
	}
}
