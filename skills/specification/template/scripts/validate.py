#!/usr/bin/env python3
"""
Validate spec system integrity.
Run from project root (parent of specs/).

Supports three-layer model: why/, what/, how/
"""

import json
import os
from pathlib import Path

def validate_specs(specs_dir='specs'):
    """Validate spec system and return errors/warnings."""
    index_path = os.path.join(specs_dir, 'specs-index.json')

    if not os.path.exists(index_path):
        print(f"Index not found: {index_path}")
        print("Run: python3 scripts/index.py first")
        return [], []

    with open(index_path) as f:
        index = json.load(f)

    errors = []
    warnings = []

    existing_paths = set(index['specs'].keys())

    # Check 1: Broken references
    for rel in index['relationships']['refs']:
        to_path = rel['to']
        # Check various path formats
        found = False
        for check_path in [to_path, to_path.lstrip('/')]:
            if check_path in existing_paths:
                found = True
                break
        if not found:
            errors.append(f"Broken ref: {rel['from']} -> {to_path}")

    # Check 2: Broken parent references
    for rel in index['relationships']['parents']:
        parent = rel['parent']
        found = False
        for check_path in [parent, parent.lstrip('/')]:
            if check_path in existing_paths:
                found = True
                break
        if not found:
            errors.append(f"Broken parent: {rel['child']} -> {parent}")

    # Check 3: Orphan specs
    for orphan in index['relationships']['orphans']:
        spec = index['specs'].get(orphan, {})
        if spec.get('status') == 'active':
            warnings.append(f"Orphan (no refs): {orphan}")

    # Check 4: Deprecated specs still referenced
    deprecated = set(index['by_status'].get('deprecated', []))
    for rel in index['relationships']['refs']:
        to_path = rel['to']
        if to_path in deprecated:
            from_spec = index['specs'].get(rel['from'], {})
            if from_spec.get('status') != 'deprecated':
                warnings.append(f"Active refs deprecated: {rel['from']} -> {to_path}")

    # Check 5: Missing required fields
    for path, spec in index['specs'].items():
        if not spec.get('id'):
            warnings.append(f"Missing id: {path}")
        if not spec.get('title'):
            errors.append(f"Missing title: {path}")
        if spec.get('type') == 'unknown':
            warnings.append(f"Missing $schema: {path}")

    # Check 6: Large specs
    for path in index['specs']:
        filepath = Path(specs_dir) / path
        if filepath.exists():
            lines = len(filepath.read_text().splitlines())
            if lines > 150:
                warnings.append(f"Large spec ({lines} lines, consider split): {path}")

    # Check 7: Circular references (proper cycle detection using DFS)
    # Build adjacency list
    graph = {}
    for spec_path in index['specs']:
        graph[spec_path] = []
    for rel in index['relationships']['refs']:
        from_path = rel['from']
        to_path = rel['to']
        # Only add edges for specs that exist
        if from_path in graph and to_path in existing_paths:
            graph[from_path].append(to_path)

    def find_cycle(node, visited, rec_stack, path):
        """
        DFS-based cycle detection.
        Returns the cycle path if found, None otherwise.
        """
        visited.add(node)
        rec_stack.add(node)
        path.append(node)

        for neighbor in graph.get(node, []):
            if neighbor not in visited:
                result = find_cycle(neighbor, visited, rec_stack, path)
                if result:
                    return result
            elif neighbor in rec_stack:
                # Found cycle - return the cycle portion of the path
                cycle_start = path.index(neighbor)
                return path[cycle_start:] + [neighbor]

        path.pop()
        rec_stack.remove(node)
        return None

    visited = set()
    cycles_found = set()
    for spec_path in index['specs']:
        if spec_path not in visited:
            cycle = find_cycle(spec_path, visited, set(), [])
            if cycle:
                # Create a canonical representation to avoid duplicate cycle reports
                cycle_key = tuple(sorted(cycle[:-1]))  # Exclude repeated start node
                if cycle_key not in cycles_found:
                    cycles_found.add(cycle_key)
                    cycle_str = ' -> '.join(cycle)
                    # Determine if this is an acceptable structural cycle
                    cycle_paths = cycle[:-1]  # Exclude repeated start node

                    # Entity-to-entity cycles are common in domain models (bi-directional relationships)
                    all_entities = all('entities/' in p for p in cycle_paths)

                    # Feature-rule cycles are common (feature uses rule, rule applies_to feature)
                    feature_rule_cycle = (
                        len(cycle_paths) == 2 and
                        any('features/' in p for p in cycle_paths) and
                        any('rules/' in p for p in cycle_paths)
                    )

                    if all_entities:
                        warnings.append(f"Entity cycle (bi-directional relationship): {cycle_str}")
                    elif feature_rule_cycle:
                        warnings.append(f"Feature-rule cycle (applies_to reference): {cycle_str}")
                    else:
                        errors.append(f"Circular reference: {cycle_str}")

    # Check 8: Layer integrity (optional, warn if specs don't follow layer conventions)
    layer_types = {
        'why': ['vision', 'goal', 'persona', 'constraint', 'decision'],
        'what': ['entity', 'feature', 'rule', 'journey', 'interface'],
        'how': ['agent', 'skill', 'lens', 'workflow', 'stack']
    }

    for path, spec in index['specs'].items():
        spec_type = spec.get('type', 'unknown')
        if spec_type == 'unknown':
            continue

        # Determine expected layer from spec type
        expected_layer = None
        for layer, types in layer_types.items():
            if spec_type in types:
                expected_layer = layer
                break

        if expected_layer:
            # Check if file is in correct layer directory
            if not path.startswith(f"{expected_layer}/"):
                warnings.append(f"Type/layer mismatch: {path} has type '{spec_type}' but not in {expected_layer}/")

    return errors, warnings

if __name__ == '__main__':
    import sys

    specs_dir = sys.argv[1] if len(sys.argv) > 1 else 'specs'
    errors, warnings = validate_specs(specs_dir)

    if errors:
        print("ERRORS:")
        for e in errors:
            print(f"  ❌ {e}")

    if warnings:
        print("\nWARNINGS:")
        for w in warnings:
            print(f"  ⚠️  {w}")

    if not errors and not warnings:
        print("✅ All specs valid")

    # Exit with error code if there are errors
    exit(1 if errors else 0)
