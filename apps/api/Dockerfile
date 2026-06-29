# ---- Build stage ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace

# Cache dependencies separately from sources for faster rebuilds
COPY pom.xml .
RUN mvn -q -B dependency:go-offline

COPY src ./src
RUN mvn -q -B package -DskipTests

# ---- Runtime stage ----
FROM eclipse-temurin:21-jre
WORKDIR /app

# Create the runtime user and make the working dir (incl. the local file
# storage root) writable so document export can persist files as non-root.
RUN useradd --system --uid 1001 appuser \
    && mkdir -p /app/.myvision-storage \
    && chown -R appuser /app
USER appuser

COPY --from=build --chown=appuser /workspace/target/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
