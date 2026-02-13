# Adding a New Adapter

When adding a new adapter (e.g., for a database or external service):

## Step 1: Create Directory Structure

Create the adapter directory:

```
adapters/{adapter-name}/
└── src/
    ├── main/kotlin/{package-path}/adapters/{adapter-name}/
    └── test/kotlin/{package-path}/adapters/{adapter-name}/
```

## Step 2: Add to settings.gradle.kts

```kotlin
include("adapters:{adapter-name}")
```

## Step 3: Create build.gradle.kts

Create `adapters/{adapter-name}/build.gradle.kts`:

```kotlin
plugins {
    kotlin("jvm")
    kotlin("plugin.spring")
}

dependencies {
    implementation(project(":domain"))
    implementation("org.springframework:spring-context")
    // Add adapter-specific dependencies here

    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<Test> {
    useJUnitPlatform()
}
```

## Step 4: Add to app/build.gradle.kts

```kotlin
dependencies {
    implementation(project(":adapters:{adapter-name}"))
    // ... other dependencies
}
```

## Common Adapter Types

### Database Adapter (JPA)

```kotlin
plugins {
    kotlin("jvm")
    kotlin("plugin.spring")
    kotlin("plugin.jpa")
}

dependencies {
    implementation(project(":domain"))
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")

    runtimeOnly("org.postgresql:postgresql")
    // or runtimeOnly("com.h2database:h2")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}
```

### HTTP Client Adapter

```kotlin
plugins {
    kotlin("jvm")
    kotlin("plugin.spring")
}

dependencies {
    implementation(project(":domain"))
    implementation("org.springframework.boot:spring-boot-starter-webflux")
    implementation("tools.jackson.module:jackson-module-kotlin")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("com.squareup.okhttp3:mockwebserver")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}
```

### Messaging Adapter (Kafka)

```kotlin
plugins {
    kotlin("jvm")
    kotlin("plugin.spring")
}

dependencies {
    implementation(project(":domain"))
    implementation("org.springframework.kafka:spring-kafka")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.kafka:spring-kafka-test")
    testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
    testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}
```

## Adapter Structure

Each adapter should follow this pattern:

```
adapters/{adapter-name}/src/main/kotlin/{package-path}/adapters/{adapter-name}/
├── {Entity}RepositoryAdapter.kt    # Implements domain port
├── {Entity}Entity.kt               # Database/external representation
└── {Entity}Mapper.kt               # Maps between domain and adapter types
```

Example implementation:

```kotlin
package {GROUP_ID}.adapters.postgres

import {GROUP_ID}.domain.user.User
import {GROUP_ID}.domain.user.UserId
import {GROUP_ID}.domain.user.UserRepository
import org.springframework.stereotype.Repository

@Repository
class UserRepositoryAdapter(
    private val jpaRepository: UserJpaRepository
) : UserRepository {

    override suspend fun findById(id: UserId): User? =
        jpaRepository.findById(id.value)?.toDomain()

    override suspend fun save(user: User): User =
        jpaRepository.save(user.toEntity()).toDomain()
}
```
