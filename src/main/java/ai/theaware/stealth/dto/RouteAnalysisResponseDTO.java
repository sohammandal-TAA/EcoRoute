package ai.theaware.stealth.dto;

import java.util.LinkedHashMap;
import java.util.Map;

import com.fasterxml.jackson.annotation.JsonAnyGetter;
import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonPropertyOrder;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@JsonPropertyOrder({ "best", "moderate", "poor", "recommended" })
@JsonInclude(JsonInclude.Include.NON_NULL)
public class RouteAnalysisResponseDTO {

    private Map<String, Object> aiFields;

    @JsonProperty("best")
    private String best;

    @JsonProperty("moderate")
    private String moderate;

    @JsonProperty("poor")
    private String poor;

    @JsonProperty("recommended")
    private String recommended;

    @JsonAnyGetter
    public Map<String, Object> getAiFields() {
        return aiFields;
    }

    @JsonAnySetter
    public void setAiField(String name, Object value) {
        if (aiFields == null) {
            aiFields = new LinkedHashMap<>();
        }
        aiFields.put(name, value);
    }
}