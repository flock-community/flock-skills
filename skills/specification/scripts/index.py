#!/usr/bin/env python3
"""
Generate specs-index.json from all spec files.
Run from project root (parent of specs/).

Supports three-layer model: why/, what/, how/
"""

import os
import json
import hashlib
import re
from pathlib import Path
from datetime import datetime

def parse_yaml(yaml_str):
    """
    Simple YAML parser for frontmatter.
    Handles: scalars, inline lists [a, b], multi-line lists with dashes.
    """
    result = {}
    lines = yaml_str.strip().split('\n')
    current_key = None
    current_list = None

    for line in lines:
        # Skip empty lines and comments
        stripped = line.strip()
        if not stripped or stripped.startswith('#'):
            continue

        # Check for list item (starts with -)
        list_match = re.match(r'^(\s*)-\s+(.*)$', line)
        if list_match and current_key is not None:
            value = list_match.group(2).strip()
            if current_list is not None:
                current_list.append(value)
            continue

        # Check for key: value pair
        kv_match = re.match(r'^([^:]+):\s*(.*)$', line)
        if kv_match:
            key = kv_match.group(1).strip()
            value = kv_match.group(2).strip()

            # If we were building a list, save it
            if current_key and current_list is not None:
                result[current_key] = current_list
                current_list = None
                current_key = None

            # Handle inline list [a, b, c]
            if value.startswith('[') and value.endswith(']'):
                items = value[1:-1].split(',')
                result[key] = [item.strip().strip('"\'') for item in items if item.strip()]
            # Handle multi-line list (value is empty, list follows)
            elif value == '':
                current_key = key
                current_list = []
            # Handle quoted strings
            elif value.startswith('"') and value.endswith('"'):
                result[key] = value[1:-1]
            elif value.startswith("'") and value.endswith("'"):
                result[key] = value[1:-1]
            # Handle pipe for multiline strings
            elif value == '|':
                result[key] = ''
            else:
                result[key] = value

    # Save any remaining list
    if current_key and current_list is not None:
        result[current_key] = current_list

    return result

def extract_frontmatter(filepath):
    """Extract YAML frontmatter from markdown file."""
    with open(filepath, 'r') as f:
        content = f.read()

    if not content.startswith('---'):
        return None, content

    parts = content.split('---', 2)
    if len(parts) < 3:
        return None, content

    frontmatter = parse_yaml(parts[1])
    return frontmatter, parts[2]

def get_file_hash(filepath):
    """Get git-style blob hash of file."""
    with open(filepath, 'rb') as f:
        content = f.read()
    return hashlib.sha1(b'blob ' + str(len(content)).encode() + b'\0' + content).hexdigest()[:8]

def normalize_ref(ref, ref_type=None):
    """Normalize a reference to a file path."""
    if not ref:
        return None
    ref = ref.strip()
    if not ref:
        return None

    # If already has path separator, just ensure .md
    if '/' in ref:
        if not ref.endswith('.md'):
            ref = ref + '.md'
        return ref

    # Short name - expand based on type using three-layer model
    type_paths = {
        # Why layer
        'vision': 'why',
        'goal': 'why/goals',
        'persona': 'why/personas',
        'constraint': 'why/constraints',
        'decision': 'why/decisions',
        # What layer
        'entity': 'what/entities',
        'feature': 'what/features',
        'rule': 'what/rules',
        'journey': 'what/journeys',
        'interface': 'what/interfaces',
        # How layer
        'agent': 'how/agents',
        'skill': 'how/skills',
        'lens': 'how/lenses',
        'workflow': 'how/workflows',
        'stack': 'how/stack',
    }

    if ref_type and ref_type in type_paths:
        return f"{type_paths[ref_type]}/{ref}.md"

    # Default: assume it's a path fragment
    if not ref.endswith('.md'):
        ref = ref + '.md'
    return ref

def extract_all_refs(frontmatter):
    """Extract all references from frontmatter, from multiple fields."""
    refs = set()

    # Direct refs field
    refs_list = frontmatter.get('refs', [])
    if isinstance(refs_list, str):
        refs_list = [refs_list]
    for ref in refs_list:
        normalized = normalize_ref(ref)
        if normalized:
            refs.add(normalized)

    # Cross-layer reference fields (why, what, how)
    for layer_field in ['why', 'what', 'how']:
        layer_refs = frontmatter.get(layer_field, [])
        if isinstance(layer_refs, str):
            layer_refs = [layer_refs]
        for ref in layer_refs:
            normalized = normalize_ref(ref)
            if normalized:
                refs.add(normalized)

    # Entity references
    entities = frontmatter.get('entities', [])
    if isinstance(entities, str):
        entities = [entities]
    for entity in entities:
        normalized = normalize_ref(entity, 'entity')
        if normalized:
            refs.add(normalized)

    # Persona references
    personas = frontmatter.get('personas', [])
    if isinstance(personas, str):
        personas = [personas]
    for persona in personas:
        normalized = normalize_ref(persona, 'persona')
        if normalized:
            refs.add(normalized)

    # Target personas (used in vision)
    target_personas = frontmatter.get('target_personas', [])
    if isinstance(target_personas, str):
        target_personas = [target_personas]
    for persona in target_personas:
        normalized = normalize_ref(persona, 'persona')
        if normalized:
            refs.add(normalized)

    # Goals
    goals = frontmatter.get('goals', [])
    if isinstance(goals, str):
        goals = [goals]
    for goal in goals:
        normalized = normalize_ref(goal, 'goal')
        if normalized:
            refs.add(normalized)

    # Constraints
    constraints = frontmatter.get('constraints', [])
    if isinstance(constraints, str):
        constraints = [constraints]
    for constraint in constraints:
        normalized = normalize_ref(constraint, 'constraint')
        if normalized:
            refs.add(normalized)

    # Decisions
    decisions = frontmatter.get('decisions', [])
    if isinstance(decisions, str):
        decisions = [decisions]
    for decision in decisions:
        normalized = normalize_ref(decision, 'decision')
        if normalized:
            refs.add(normalized)

    # Related entities
    related = frontmatter.get('related_entities', [])
    if isinstance(related, str):
        related = [related]
    for entity in related:
        normalized = normalize_ref(entity, 'entity')
        if normalized:
            refs.add(normalized)

    # Features
    features = frontmatter.get('features', [])
    if isinstance(features, str):
        features = [features]
    for feature in features:
        normalized = normalize_ref(feature, 'feature')
        if normalized:
            refs.add(normalized)

    # Skills (for agents)
    skills = frontmatter.get('skills', [])
    if isinstance(skills, str):
        skills = [skills]
    for skill in skills:
        normalized = normalize_ref(skill, 'skill')
        if normalized:
            refs.add(normalized)

    # Lenses (for agents)
    lenses = frontmatter.get('lenses', [])
    if isinstance(lenses, str):
        lenses = [lenses]
    for lens in lenses:
        normalized = normalize_ref(lens, 'lens')
        if normalized:
            refs.add(normalized)

    # Implements (for agents/workflows)
    implements = frontmatter.get('implements', [])
    if isinstance(implements, str):
        implements = [implements]
    for impl in implements:
        normalized = normalize_ref(impl)
        if normalized:
            refs.add(normalized)

    # Applies to (for constraints/rules)
    applies_to = frontmatter.get('applies_to', [])
    if isinstance(applies_to, str):
        applies_to = [applies_to]
    for apply in applies_to:
        normalized = normalize_ref(apply)
        if normalized:
            refs.add(normalized)

    # Journeys
    journeys = frontmatter.get('journeys', [])
    if isinstance(journeys, str):
        journeys = [journeys]
    for journey in journeys:
        normalized = normalize_ref(journey, 'journey')
        if normalized:
            refs.add(normalized)

    # Implemented by (for decisions)
    implemented_by = frontmatter.get('implemented_by', [])
    if isinstance(implemented_by, str):
        implemented_by = [implemented_by]
    for impl in implemented_by:
        normalized = normalize_ref(impl)
        if normalized:
            refs.add(normalized)

    # Interfaces
    interfaces = frontmatter.get('interfaces', [])
    if isinstance(interfaces, str):
        interfaces = [interfaces]
    for interface in interfaces:
        normalized = normalize_ref(interface, 'interface')
        if normalized:
            refs.add(normalized)

    # Stacks
    stacks = frontmatter.get('stacks', [])
    if isinstance(stacks, str):
        stacks = [stacks]
    for stack in stacks:
        normalized = normalize_ref(stack, 'stack')
        if normalized:
            refs.add(normalized)

    # Rules
    rules = frontmatter.get('rules', [])
    if isinstance(rules, str):
        rules = [rules]
    for rule in rules:
        normalized = normalize_ref(rule, 'rule')
        if normalized:
            refs.add(normalized)

    # Workflows
    workflows = frontmatter.get('workflows', [])
    if isinstance(workflows, str):
        workflows = [workflows]
    for workflow in workflows:
        normalized = normalize_ref(workflow, 'workflow')
        if normalized:
            refs.add(normalized)

    # Agents
    agents = frontmatter.get('agents', [])
    if isinstance(agents, str):
        agents = [agents]
    for agent in agents:
        normalized = normalize_ref(agent, 'agent')
        if normalized:
            refs.add(normalized)

    # Vision (singular reference)
    vision = frontmatter.get('vision')
    if vision:
        normalized = normalize_ref(vision, 'vision')
        if normalized:
            refs.add(normalized)

    # Children (for parent specs with children list)
    children = frontmatter.get('children', [])
    if isinstance(children, str):
        children = [children]
    for child in children:
        normalized = normalize_ref(child)
        if normalized:
            refs.add(normalized)

    # Parent (singular reference to parent spec)
    parent = frontmatter.get('parent')
    if parent:
        normalized = normalize_ref(parent)
        if normalized:
            refs.add(normalized)

    return list(refs)

def build_index(specs_dir='specs'):
    """Build complete index of all specs."""
    index = {
        'generated_at': datetime.now().isoformat(),
        'specs': {},
        'by_type': {},
        'by_status': {},
        'by_layer': {
            'why': [],
            'what': [],
            'how': []
        },
        'relationships': {
            'refs': [],
            'parents': [],
            'orphans': []
        }
    }

    all_refs = set()
    all_specs = set()

    specs_path = Path(specs_dir)
    if not specs_path.exists():
        print(f"Directory not found: {specs_dir}")
        return index

    for root, dirs, files in os.walk(specs_path):
        # Skip hidden directories and scripts
        dirs[:] = [d for d in dirs if not d.startswith('.') and d != 'scripts']

        for filename in files:
            if not filename.endswith('.md'):
                continue

            filepath = Path(root) / filename
            rel_path = str(filepath.relative_to(specs_path))

            frontmatter, body = extract_frontmatter(filepath)
            if not frontmatter:
                continue

            spec_id = frontmatter.get('id', rel_path)
            spec_type = frontmatter.get('$schema', 'unknown')
            status = frontmatter.get('status', 'unknown')

            # Get all refs from multiple fields
            all_spec_refs = extract_all_refs(frontmatter)

            spec_entry = {
                'path': rel_path,
                'id': spec_id,
                'title': frontmatter.get('title', filename.replace('.md', '')),
                'type': spec_type,
                'status': status,
                'version': frontmatter.get('version', '0.0.0'),
                'hash': get_file_hash(filepath),
                'refs': all_spec_refs,
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

            # Index by layer
            if rel_path.startswith('why/'):
                index['by_layer']['why'].append(rel_path)
            elif rel_path.startswith('what/'):
                index['by_layer']['what'].append(rel_path)
            elif rel_path.startswith('how/'):
                index['by_layer']['how'].append(rel_path)

            # Track relationships
            for ref in all_spec_refs:
                index['relationships']['refs'].append({
                    'from': rel_path,
                    'to': ref
                })
                all_refs.add(ref)

            if spec_entry['parent']:
                parent_path = normalize_ref(spec_entry['parent'])
                if parent_path:
                    index['relationships']['parents'].append({
                        'child': rel_path,
                        'parent': parent_path
                    })
                    all_refs.add(parent_path)

    # Find orphans (specs never referenced, excluding vision)
    for spec in all_specs:
        if spec not in all_refs and 'vision' not in spec.lower():
            index['relationships']['orphans'].append(spec)

    return index

if __name__ == '__main__':
    import sys

    specs_dir = sys.argv[1] if len(sys.argv) > 1 else 'specs'
    index = build_index(specs_dir)

    output_file = os.path.join(specs_dir, 'specs-index.json')
    with open(output_file, 'w') as f:
        json.dump(index, f, indent=2)

    print(f"Indexed {len(index['specs'])} specs")
    print(f"Layers: Why={len(index['by_layer']['why'])}, What={len(index['by_layer']['what'])}, How={len(index['by_layer']['how'])}")
    print(f"Types: {list(index['by_type'].keys())}")
    print(f"Statuses: {list(index['by_status'].keys())}")
    if index['relationships']['orphans']:
        print(f"Orphans: {len(index['relationships']['orphans'])}")
    print(f"Output: {output_file}")
