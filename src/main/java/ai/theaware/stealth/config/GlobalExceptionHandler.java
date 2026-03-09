package ai.theaware.stealth.config;

import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import lombok.extern.slf4j.Slf4j;

@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    /**
     * Handles @Valid failures on @RequestBody DTOs.
     * Returns field-level messages WITHOUT leaking internal stack traces.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .collect(Collectors.toMap(
                        fe -> fe.getField(),
                        fe -> fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "Invalid value",
                        // Keep first message if duplicate fields exist
                        (existing, replacement) -> existing
                ));

        log.warn("[VALIDATION] Request rejected: {}", fieldErrors);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of(
                        "error", "Validation failed",
                        "details", fieldErrors
                ));
    }

    /**
     * Handles type mismatches in @RequestParam (e.g. "abc" for a Double).
     * Returns a clean message without exposing internal class names.
     */
    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<Map<String, String>> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
        String msg = String.format("Parameter '%s' must be a valid number", ex.getName());
        log.warn("[VALIDATION] Type mismatch on param '{}': {}", ex.getName(), ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(Map.of("error", msg));
    }

    /**
     * Catch-all for RuntimeExceptions.
     * Logs the full stack trace server-side but returns only a generic message to the client.
     */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntime(RuntimeException ex) {
        // Log full detail server-side for debugging
        log.error("[ERROR] Unhandled RuntimeException: {}", ex.getMessage(), ex);

        // Never leak internal exception messages to clients
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "An unexpected error occurred. Please try again later."));
    }

    /**
     * Catch-all for all other exceptions (e.g. checked exceptions bubbling up).
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleAll(Exception ex) {
        log.error("[ERROR] Unhandled Exception: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "An unexpected error occurred. Please try again later."));
    }
}