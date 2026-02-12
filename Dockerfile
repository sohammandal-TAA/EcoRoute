# Stage 1: Build
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /build
# Copy pom.xml and source code
COPY pom.xml .
COPY src ./src
# Build the application
RUN mvn clean package -DskipTests

# Stage 2: Run
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
# Copy the built jar from the build stage
COPY --from=build /build/target/*.jar app.jar

EXPOSE 8080
# Run the application
ENTRYPOINT ["java", "-jar", "app.jar"]