# Step 8: Detekt Configuration

Create `domain/detekt.yml` with hexagonal architecture rules:

```yaml
hexagonal:
  active: true

  # Domain Rules
  DomainNoPrimitiveObsession:
    active: true
    domainPackages: ['domain']
    excludeClassNamePatterns: ['.*Error$']

  DomainNoFrameworkImports:
    active: true
    domainPackages: ['domain']
    forbiddenImports:
      - 'io.ktor'
      - 'jakarta.persistence'
      - 'jakarta.servlet'
      - 'javax.servlet'
      - 'io.micronaut'
      - 'io.quarkus'
      - 'org.hibernate'
      - 'org.jooq'

  DomainMustBeImmutable:
    active: true
    domainPackages: ['domain']

  ValueClassMustHaveJvmInline:
    active: true
    domainPackages: ['domain']

  # Port Rules
  PortMustBeInterface:
    active: true
    portPackages: ['port', 'ports']
    portSuffixes: ['Port', 'Repository', 'Gateway', 'Client']

  PortNamingConvention:
    active: true
    portPackages: ['port', 'ports']
    allowedSuffixes: ['Port', 'Repository', 'Gateway', 'Client']

  PortsInDomainOnly:
    active: true
    domainPackages: ['domain']
    adapterPackages: ['adapter', 'adapters', 'infrastructure']
    apiPackages: ['api', 'controller', 'controllers', 'rest']
    portSuffixes: ['Port', 'Repository', 'Gateway', 'Client']

  # Adapter Rules
  AdapterMustImplementPort:
    active: true
    adapterPackages: ['adapter', 'adapters', 'infrastructure']

  AdapterNamingConvention:
    active: true
    adapterPackages: ['adapter', 'adapters', 'infrastructure']

  AdapterCannotDependOnAdapter:
    active: true
    adapterPackages: ['adapter', 'adapters', 'infrastructure']

  # Dependency Rules
  DomainCannotDependOnAdapters:
    active: true
    domainPackages: ['domain']
    adapterPackages: ['adapter', 'adapters', 'infrastructure']

  DomainCannotDependOnApi:
    active: true
    domainPackages: ['domain']
    apiPackages: ['api', 'controller', 'controllers', 'rest']

  ApiCannotDependOnAdapters:
    active: true
    apiPackages: ['api', 'controller', 'controllers', 'rest']
    adapterPackages: ['adapter', 'adapters', 'infrastructure']
```

## Rule Descriptions

### Domain Rules

| Rule | Purpose |
|------|---------|
| `DomainNoPrimitiveObsession` | Encourages value objects over primitives |
| `DomainNoFrameworkImports` | Keeps domain free of framework dependencies |
| `DomainMustBeImmutable` | Ensures domain entities are immutable |
| `ValueClassMustHaveJvmInline` | Enforces `@JvmInline` on value classes |

### Port Rules

| Rule | Purpose |
|------|---------|
| `PortMustBeInterface` | Ports must be interfaces, not classes |
| `PortNamingConvention` | Enforces consistent port naming |
| `PortsInDomainOnly` | Ports can only be defined in domain module |

### Adapter Rules

| Rule | Purpose |
|------|---------|
| `AdapterMustImplementPort` | Adapters must implement a port interface |
| `AdapterNamingConvention` | Enforces adapter naming patterns |
| `AdapterCannotDependOnAdapter` | Prevents adapter-to-adapter dependencies |

### Dependency Rules

| Rule | Purpose |
|------|---------|
| `DomainCannotDependOnAdapters` | Domain cannot import from adapters |
| `DomainCannotDependOnApi` | Domain cannot import from API layer |
| `ApiCannotDependOnAdapters` | API layer cannot import from adapters |
