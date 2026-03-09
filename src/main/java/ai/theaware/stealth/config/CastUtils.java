package ai.theaware.stealth.config;

import java.util.List;
import java.util.Map;

import lombok.extern.slf4j.Slf4j;

@Slf4j
public final class CastUtils {

    private CastUtils() {}

    /**
     * Safely casts an Object to Map<String, Object>.
     * Returns an empty map instead of throwing ClassCastException.
     */
    @SuppressWarnings("unchecked")
    public static Map<String, Object> safeMap(Object raw) {
        if (raw instanceof Map<?, ?> map) {
            try {
                return (Map<String, Object>) map;
            } catch (ClassCastException e) {
                log.warn("[SAFE_CAST] Expected Map<String,Object>, got: {}", raw.getClass());
            }
        }
        return Map.of();
    }

    /**
     * Safely casts an Object to List<Object>.
     * Returns an empty list instead of throwing ClassCastException.
     */
    @SuppressWarnings("unchecked")
    public static List<Object> safeList(Object raw) {
        if (raw instanceof List<?> list) {
            try {
                return (List<Object>) list;
            } catch (ClassCastException e) {
                log.warn("[SAFE_CAST] Expected List<Object>, got: {}", raw.getClass());
            }
        }
        return List.of();
    }
}