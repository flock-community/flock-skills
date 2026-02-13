# Steps 9-13: Finalize Setup

## Step 9: Create Application Class

Create `app/src/main/kotlin/{package-path}/{ProjectName}Application.kt`:

```kotlin
package {GROUP_ID}

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication(scanBasePackages = ["{GROUP_ID}"])
class {ProjectName}Application

fun main(args: Array<String>) {
    runApplication<{ProjectName}Application>(*args)
}
```

Replace `{ProjectName}` with PascalCase version of project name (e.g., `my-service` -> `MyServiceApplication`).

## Step 10: Create Application Configuration

Create `app/src/main/resources/application.properties`:

```properties
spring.application.name={project-name}
```

Or alternatively, create `app/src/main/resources/application.yaml` for more complex configurations:

```yaml
spring:
  application:
    name: {project-name}
```

## Step 11: Create CLAUDE.md and README.md

Create `CLAUDE.md` in the project root. See [templates/CLAUDE.md.template](templates/CLAUDE.md.template) for the content.

Create `README.md` in the project root. See [templates/README.md.template](templates/README.md.template) for the content.

## Step 12: Initialize Git Repository

Initialize git and update `.gitignore`:

```bash
cd {target-directory}/{project-name}
git init
```

Spring Initializr generates a `.gitignore` file. Append these additional entries:

```gitignore
### Environment ###
.env
.env.local
*.local.properties

### Logs ###
*.log
logs/

### OS ###
.DS_Store
Thumbs.db
```

Make initial commit:

```bash
git add .
git commit -m "Initial project setup with hexagonal architecture"
```

## Step 13: Verify Setup

Run the build to verify everything is configured correctly:

```bash
./gradlew build
```

Or for Maven:
```bash
./mvnw verify
```

The build should complete successfully with:
- All modules compiled
- Detekt rules passing
- Tests passing (if any)
