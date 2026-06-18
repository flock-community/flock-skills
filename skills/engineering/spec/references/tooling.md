# Tooling

Scripts and patterns for indexing, validating, and managing spec relationships.

## Table of Contents

1. [Quick Index Generation](#quick-index)
2. [Relationship Graph](#relationship-graph)
3. [Validation Scripts](#validation)
4. [Common Queries](#queries)

---

## Quick Index

Generate a snapshot of the current spec system state.

### Index Script

```python
#!/usr/bin/env python3
"""
Generate specs-index.json from all spec files.
Run from specs/ directory.
"""

import os
import json
import yaml
import hashlib
from pathlib import Path
from datetime import datetime

def extract_frontmatter(filepath):
    """Extract YAML frontmatter from markdown file."""
    with open(filepath, 'r') as f:
        content = f.read()

    if not content.startswith('---'):
        return None, content

    parts = content.split('---', 2)
    if len(parts) < 3:
        return None, content

    try:
        frontmatter = yaml.safe_load(parts[1])
        body = parts[2]
        return frontmatter, body
    except yaml.YAMLError:
        return None, content

def get_file_hash(filepath):
    """Get git-style blob hash of file."""
    with open(filepath, 'rb') as f:
        content = f.read()
    return hashlib.sha1(b'blob ' + str(len(content)).encode() + b'\0' + content).hexdigest()[:8]

def build_index(specs_dir='.'):
    """Build complete index of all specs."""
    index = {
        'generated_at': datetime.now().isoformat(),
        'specs': {},
        'by_type': {},
        'by_status': {},
        'relationships': {
            'refs': [],      # spec -> spec references
            'parents': [],   # child -> parent
            'orphans': []    # specs with no incoming refs
        }
    }

    all_refs = set()  # Track all referenced specs
    all_specs = set()  # Track all existing specs

    for root, dirs, files in os.walk(specs_dir):
        # Skip hidden directories
        dirs[:] = [d for d in dirs if not d.startswith('.')]

        for filename in files:
            if not filename.endswith('.md'):
                continue

            filepath = Path(root) / filename
            rel_path = str(filepath.relative_to(specs_dir))

            frontmatter, body = extract_frontmatter(filepath)
            if not frontmatter:
                continue

            spec_id = frontmatter.get('id', rel_path)
            spec_type = frontmatter.get('$schema', 'unknown')
            status = frontmatter.get('status', 'unknown')

            spec_entry = {
                'path': rel_path,
                'id': spec_id,
                'title': frontmatter.get('title', filename),
                'type': spec_type,
                'status': status,
                'version': frontmatter.get('version', '0.0.0'),
                'hash': get_file_hash(filepath),
                'refs': frontmatter.get('refs', []),
                'parent': frontmatter.get('parent'),
                'children': frontmatter.get('children', [])
            }

            index['specs'][rel_path] = spec_entry
            all_specs.add(rel_path)

            # Index by type
            if spec_type not in index['by_type']:
                index['by_type'][spec_type] = []
            index['by_type'][spec_type].append(rel_path)

            # Index by status
            if status not in index['by_status']:
                index['by_status'][status] = []
            index['by_status'][status].append(rel_path)

            # Track relationships
            for ref in spec_entry['refs']:
                ref_path = normalize_ref(ref)
                index['relationships']['refs'].append({
                    'from': rel_path,
                    'to': ref_path
                })
                all_refs.add(ref_path)

            if spec_entry['parent']:
                parent_path = normalize_ref(spec_entry['parent'])
                index['relationships']['parents'].append({
                    'child': rel_path,
                    'parent': parent_path
                })
                all_refs.add(parent_path)

    # Find orphans (specs never referenced)
    index['relationships']['orphans'] = list(all_specs - all_refs - {'design/vision.md'})

    return index

def normalize_ref(ref):
    """Normalize a reference to a file path."""
    if not ref.endswith('.md'):
        ref = ref + '.md'
    return ref

if __name__ == '__main__':
    index = build_index()

    with open('specs-index.json', 'w') as f:
        json.dump(index, f, indent=2)

    print(f"Indexed {len(index['specs'])} specs")
    print(f"Types: {list(index['by_type'].keys())}")
    print(f"Orphans: {len(index['relationships']['orphans'])}")
```

### Output Format

```json
{
  "generated_at": "2025-01-26T15:30:00",
  "specs": {
    "design/features/checkout.md": {
      "path": "design/features/checkout.md",
      "id": "FEAT-001",
      "title": "Checkout",
      "type": "feature",
      "status": "active",
      "version": "1.0.0",
      "hash": "a1b2c3d4",
      "refs": ["design/entities/order", "design/rules/pricing"],
      "parent": null,
      "children": ["checkout/payment", "checkout/shipping"]
    }
  },
  "by_type": {
    "feature": ["design/features/checkout.md", "..."],
    "entity": ["design/entities/order.md", "..."]
  },
  "by_status": {
    "active": ["..."],
    "draft": ["..."],
    "deprecated": ["..."]
  },
  "relationships": {
    "refs": [
      {"from": "design/features/checkout.md", "to": "design/entities/order.md"}
    ],
    "parents": [
      {"child": "design/features/checkout/payment.md", "parent": "design/features/checkout.md"}
    ],
    "orphans": ["design/features/old-feature.md"]
  }
}
```

---

## Relationship Graph

Generate a visual or queryable graph of spec relationships.

### Mermaid Graph Generator

```python
#!/usr/bin/env python3
"""
Generate Mermaid diagram from specs-index.json.
"""

import json

def generate_mermaid(index_path='specs-index.json'):
    with open(index_path) as f:
        index = json.load(f)

    lines = ['graph LR']

    # Define node styles by type
    lines.append('    classDef vision fill:#ffd700')
    lines.append('    classDef feature fill:#87ceeb')
    lines.append('    classDef entity fill:#90ee90')
    lines.append('    classDef rule fill:#ffb6c1')
    lines.append('    classDef agent fill:#dda0dd')

    # Add nodes
    for path, spec in index['specs'].items():
        node_id = path.replace('/', '_').replace('.md', '').replace('-', '_')
        label = spec['title'][:20]
        spec_type = spec['type']
        lines.append(f'    {node_id}["{label}"]:::{spec_type}')

    # Add edges
    for rel in index['relationships']['refs']:
        from_id = rel['from'].replace('/', '_').replace('.md', '').replace('-', '_')
        to_id = rel['to'].replace('/', '_').replace('.md', '').replace('-', '_')
        lines.append(f'    {from_id} --> {to_id}')

    # Add parent-child edges
    for rel in index['relationships']['parents']:
        child_id = rel['child'].replace('/', '_').replace('.md', '').replace('-', '_')
        parent_id = rel['parent'].replace('/', '_').replace('.md', '').replace('-', '_')
        lines.append(f'    {parent_id} -.-> {child_id}')

    return '\n'.join(lines)

if __name__ == '__main__':
    print(generate_mermaid())
```

### ASCII Tree View

For quick terminal output:

```bash
#!/bin/bash
# Show spec hierarchy as tree

echo "=== Design Specs ==="
find design -name "*.md" | sort | while read f; do
    depth=$(echo "$f" | tr -cd '/' | wc -c)
    indent=$(printf '%*s' $((depth * 2)) '')
    name=$(basename "$f" .md)
    status=$(grep -m1 "^status:" "$f" 2>/dev/null | cut -d: -f2 | tr -d ' ')
    echo "${indent}${name} [${status:-?}]"
done

echo ""
echo "=== Build Specs ==="
find build -name "*.md" | sort | while read f; do
    depth=$(echo "$f" | tr -cd '/' | wc -c)
    indent=$(printf '%*s' $((depth * 2)) '')
    name=$(basename "$f" .md)
    echo "${indent}${name}"
done
```

---

## Validation

Scripts to check spec system integrity.

### Validation Script

```python
#!/usr/bin/env python3
"""
Validate spec system integrity.
"""

import json
import os
from pathlib import Path

def validate_specs(index_path='specs-index.json'):
    with open(index_path) as f:
        index = json.load(f)

    errors = []
    warnings = []

    # Check 1: Broken references
    existing_paths = set(index['specs'].keys())
    for rel in index['relationships']['refs']:
        to_path = rel['to']
        if to_path not in existing_paths:
            errors.append(f"Broken ref: {rel['from']} -> {to_path}")

    # Check 2: Broken parent references
    for rel in index['relationships']['parents']:
        if rel['parent'] not in existing_paths:
            errors.append(f"Broken parent: {rel['child']} -> {rel['parent']}")

    # Check 3: Orphan specs (no incoming references)
    orphans = index['relationships']['orphans']
    for orphan in orphans:
        spec = index['specs'].get(orphan, {})
        if spec.get('status') == 'active':
            warnings.append(f"Orphan spec (no refs): {orphan}")

    # Check 4: Deprecated specs still referenced
    deprecated = set(index['by_status'].get('deprecated', []))
    for rel in index['relationships']['refs']:
        if rel['to'] in deprecated:
            from_spec = index['specs'].get(rel['from'], {})
            if from_spec.get('status') != 'deprecated':
                warnings.append(f"Active spec refs deprecated: {rel['from']} -> {rel['to']}")

    # Check 5: Missing required fields
    for path, spec in index['specs'].items():
        if not spec.get('id'):
            warnings.append(f"Missing id: {path}")
        if not spec.get('title'):
            errors.append(f"Missing title: {path}")
        if spec.get('type') == 'unknown':
            warnings.append(f"Missing $schema: {path}")

    # Check 6: Large specs that should be split
    for path in index['specs']:
        filepath = Path(path)
        if filepath.exists():
            lines = len(filepath.read_text().splitlines())
            if lines > 150:
                warnings.append(f"Large spec ({lines} lines): {path}")

    # Check 7: Circular references
    def find_cycles(start, visited=None, path=None):
        if visited is None:
            visited = set()
        if path is None:
            path = []

        if start in visited:
            cycle_start = path.index(start)
            return [path[cycle_start:] + [start]]

        visited.add(start)
        path.append(start)
        cycles = []

        for rel in index['relationships']['refs']:
            if rel['from'] == start:
                cycles.extend(find_cycles(rel['to'], visited.copy(), path.copy()))

        return cycles

    for spec_path in index['specs']:
        cycles = find_cycles(spec_path)
        for cycle in cycles:
            if len(cycle) > 1:
                errors.append(f"Circular reference: {' -> '.join(cycle)}")

    return errors, warnings

if __name__ == '__main__':
    errors, warnings = validate_specs()

    if errors:
        print("ERRORS:")
        for e in errors:
            print(f"  ❌ {e}")

    if warnings:
        print("\nWARNINGS:")
        for w in warnings:
            print(f"  ⚠️ {w}")

    if not errors and not warnings:
        print("✅ All specs valid")

    exit(1 if errors else 0)
```

### Quick Validation (Bash)

For fast checks without Python:

```bash
#!/bin/bash
# Quick spec validation

echo "=== Checking for broken refs ==="
grep -rh "^refs:" design/ build/ 2>/dev/null | \
    sed 's/refs://' | tr ',' '\n' | tr -d '[] ' | \
    while read ref; do
        [ -z "$ref" ] && continue
        path="${ref}.md"
        [ ! -f "$path" ] && echo "Missing: $ref"
    done

echo ""
echo "=== Checking for large specs ==="
find . -name "*.md" -exec wc -l {} \; | \
    awk '$1 > 150 {print "Large (" $1 " lines): " $2}'

echo ""
echo "=== Checking for missing schemas ==="
for f in $(find design build -name "*.md" 2>/dev/null); do
    grep -q '^\$schema:' "$f" || echo "No schema: $f"
done
```

---

## Queries

Common operations Claude Code can run.

### Find All Refs To a Spec

```bash
# Find all specs that reference checkout
grep -rl "checkout" design/ build/ --include="*.md" | \
    xargs grep -l "refs:" | \
    xargs grep -l "checkout"
```

### Find Implementation Status

```bash
# Compare specs to .implemented.json
jq -r 'to_entries[] | "\(.key): \(.value // "not implemented")"' .implemented.json
```

### List Specs by Status

```bash
# Find all draft specs
grep -rl "^status: draft" design/ build/ --include="*.md"

# Find all deprecated specs
grep -rl "^status: deprecated" design/ build/ --include="*.md"
```

### Find Specs Without Scenarios

```bash
# Features should have Given/When/Then
for f in design/features/*.md; do
    grep -q "Given:" "$f" || echo "No scenarios: $f"
done
```

### Generate Summary Stats

```bash
#!/bin/bash
# Quick stats about spec system

echo "=== Spec System Stats ==="
echo "Design specs: $(find design -name '*.md' 2>/dev/null | wc -l)"
echo "Build specs:  $(find build -name '*.md' 2>/dev/null | wc -l)"
echo ""
echo "By type:"
for type in vision persona feature entity rule journey agent skill lens workflow; do
    count=$(grep -rl "^\$schema: $type" . --include="*.md" 2>/dev/null | wc -l)
    [ "$count" -gt 0 ] && echo "  $type: $count"
done
echo ""
echo "By status:"
for status in draft active deprecated; do
    count=$(grep -rl "^status: $status" . --include="*.md" 2>/dev/null | wc -l)
    [ "$count" -gt 0 ] && echo "  $status: $count"
done
```

---

## Claude Code Integration

How Claude Code can use these tools:

### On Session Start

```bash
# Quick state assessment
cd specs/
./scripts/stats.sh
```

### Before Making Changes

```bash
# Check current integrity
python3 scripts/validate.py
```

### After Making Changes

```bash
# Rebuild index
python3 scripts/index.py

# Validate again
python3 scripts/validate.py
```

### Answering Questions

| Question | Command |
|----------|---------|
| "What specs exist?" | `cat specs-index.json \| jq '.specs \| keys'` |
| "What references checkout?" | `grep -rl "checkout" --include="*.md"` |
| "Show the spec graph" | `python3 scripts/graph.py > graph.mmd` |
| "Any broken refs?" | `python3 scripts/validate.py` |
| "What's not implemented?" | `jq 'to_entries[] \| select(.value==null)' .implemented.json` |

### Inline Queries (No Scripts)

Claude Code can also parse specs directly:

```bash
# Extract frontmatter from a spec
sed -n '/^---$/,/^---$/p' design/features/checkout.md | tail -n +2 | head -n -1

# Get all refs from a spec
grep "^refs:" design/features/checkout.md | sed 's/refs://' | tr ',' '\n'

# Count scenarios in a feature
grep -c "^### " design/features/checkout.md
```
