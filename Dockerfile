# ─────────────────────────────────────────
# Stage 1: Build
# ─────────────────────────────────────────
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /build

# Cache dependencies first (only re-downloads if pom.xml changes)
COPY pom.xml .
RUN mvn dependency:go-offline -q

# Copy source (includes src/main/resources/application.properties)
COPY src ./src

# Build, skip tests
RUN mvn clean package -DskipTests -q

# ─────────────────────────────────────────
# Stage 2: Run
# ─────────────────────────────────────────
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Non-root user for security
RUN addgroup --system spring && adduser --system --ingroup spring spring
USER spring

COPY --from=build /build/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]