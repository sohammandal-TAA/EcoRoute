package ai.theaware.stealth.service;

import java.util.List;
import java.util.Map;

public final class RouteHealthMetricsService {

    private static final double VENTILATION_RATE = 0.012; // m³/min

    private RouteHealthMetricsService() {}

    // -------------------------------------------------------------------------
    // Result container
    // -------------------------------------------------------------------------

    public static class HealthMetrics {
        public final double exposureReductionPct;  // %
        public final double pm25AvoidedUg;          // µg
        public final double equivalentMinutes;      // min

        public HealthMetrics(double exposureReductionPct,
                             double pm25AvoidedUg,
                             double equivalentMinutes) {
            this.exposureReductionPct = round(exposureReductionPct);
            this.pm25AvoidedUg        = round(pm25AvoidedUg);
            this.equivalentMinutes    = round(equivalentMinutes);
        }

        @Override
        public String toString() {
            return String.format(
                "HealthMetrics{exposureReductionPct=%.4f, pm25AvoidedUg=%.4f, equivalentMinutes=%.4f}",
                exposureReductionPct, pm25AvoidedUg, equivalentMinutes);
        }
    }

    // -------------------------------------------------------------------------
    // Main entry point
    // -------------------------------------------------------------------------

    /**
     * @param routeAnalysis  parsed "route_analysis" block from AI service response
     * @param ecoRouteId     the recommended route id e.g. "Route_1"
     * @return               all three health metrics
     */
    public static HealthMetrics compute(Map<String, Object> routeAnalysis, String ecoRouteId) {

        if (routeAnalysis == null || ecoRouteId == null) {
            return new HealthMetrics(0, 0, 0);
        }

        Map<String, Object> ecoData = (Map<String, Object>) routeAnalysis.get(ecoRouteId);
        if (ecoData == null) {
            return new HealthMetrics(0, 0, 0);
        }

        double avgAqiEco  = extractAvgAqi(ecoData);
        double avgPm25Eco = extractAvgPm25(ecoData);
        double tEco       = parseDurationMinutes(ecoData);

        double eEco = avgAqiEco  * tEco;
        double dEco = avgPm25Eco * VENTILATION_RATE * tEco;

        // ── Find WORST alternative (highest exposure), not mean ──────────────
        double worstExposure = Double.MIN_VALUE;
        double worstDose     = Double.MIN_VALUE;
        double worstDuration = 0.0;

        boolean hasAlternatives = false;

        for (Map.Entry<String, Object> entry : routeAnalysis.entrySet()) {
            if (entry.getKey().equals(ecoRouteId)) continue;

            Map<String, Object> altData = (Map<String, Object>) entry.getValue();

            double avgAqiAlt  = extractAvgAqi(altData);
            double avgPm25Alt = extractAvgPm25(altData);
            double tAlt       = parseDurationMinutes(altData);

            double altExposure = avgAqiAlt  * tAlt;
            double altDose     = avgPm25Alt * VENTILATION_RATE * tAlt;

            if (altExposure > worstExposure) {
                worstExposure = altExposure;
                worstDose     = altDose;
                worstDuration = tAlt;
            }

            hasAlternatives = true;
        }

        if (!hasAlternatives) {
            return new HealthMetrics(0, 0, 0);
        }

        // ── Metric 1: Exposure Reduction % ───────────────────────────────────
        double exposureReductionPct = worstExposure == 0.0
                ? 0.0
                : ((worstExposure - eEco) / worstExposure) * 100.0;

        // ── Metric 2: PM2.5 Avoided (µg) ─────────────────────────────────────
        double pm25Avoided = worstDose - dEco;

        // ── Metric 3: Equivalent Minutes ─────────────────────────────────────
        double equivalentMinutes = worstDose == 0.0
                ? 0.0
                : (pm25Avoided * worstDuration) / worstDose;

        // ── Safety clamp: metrics must never be negative ──────────────────────
        // This can still theoretically occur if recommended is the absolute
        // worst route in a degenerate edge case (e.g. only 1 route returned)
        exposureReductionPct = Math.max(0.0, exposureReductionPct);
        pm25Avoided          = Math.max(0.0, pm25Avoided);
        equivalentMinutes    = Math.max(0.0, equivalentMinutes);

        return new HealthMetrics(exposureReductionPct, pm25Avoided, equivalentMinutes);
    }

    // -------------------------------------------------------------------------
    // Extraction helpers
    // -------------------------------------------------------------------------

    private static double extractAvgAqi(Map<String, Object> routeData) {
        return averageField(routeData, "aqi");
    }

    private static double extractAvgPm25(Map<String, Object> routeData) {
        // Prefer pre-computed avg_pm25 if present
        Object precomputed = routeData.get("avg_pm25");
        if (precomputed instanceof Number number) {
            return number.doubleValue();
        }
        return averageField(routeData, "pm25");
    }

    private static double averageField(Map<String, Object> routeData, String field) {
        Object detailsRaw = routeData.get("details");
        if (!(detailsRaw instanceof List)) return 0.0;

        List<Object> details = (List<Object>) detailsRaw;
        if (details.isEmpty()) return 0.0;

        double sum = 0.0;
        int count  = 0;

        for (Object item : details) {
            if (!(item instanceof Map)) continue;
            Object val = ((Map<String, Object>) item).get(field);
            if (val instanceof Number number) {
                sum += number.doubleValue();
                count++;
            }
        }
        return count == 0 ? 0.0 : sum / count;
    }

    /**
     * Parses "17 mins", "1 hour 5 mins", "1 hour" → total minutes as double.
     */
    private static double parseDurationMinutes(Map<String, Object> routeData) {
        Object raw = routeData.get("duration");
        if (!(raw instanceof String)) return 0.0;

        String duration = ((String) raw).trim().toLowerCase();
        double total    = 0.0;

        java.util.regex.Matcher h = java.util.regex.Pattern
                .compile("(\\d+)\\s*hour").matcher(duration);
        if (h.find()) total += Integer.parseInt(h.group(1)) * 60.0;

        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("(\\d+)\\s*min").matcher(duration);
        if (m.find()) total += Integer.parseInt(m.group(1));

        return total;
    }

    // -------------------------------------------------------------------------
    // Math helpers
    // -------------------------------------------------------------------------

    private static double round(double value) {
        return Math.round(value * 10000.0) / 10000.0;
    }
}