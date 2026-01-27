#!/bin/bash
# Quick stats about the spec system
# Run from project root
#
# Supports three-layer model: why/, what/, how/

SPECS_DIR="${1:-specs}"

echo "=== Spec System Stats ==="
echo ""

# Count by layer
why_count=$(find "$SPECS_DIR/why" -name '*.md' 2>/dev/null | wc -l | tr -d ' ')
what_count=$(find "$SPECS_DIR/what" -name '*.md' 2>/dev/null | wc -l | tr -d ' ')
how_count=$(find "$SPECS_DIR/how" -name '*.md' 2>/dev/null | wc -l | tr -d ' ')
echo "Why specs:   $why_count"
echo "What specs:  $what_count"
echo "How specs:   $how_count"
echo "Total:       $((why_count + what_count + how_count))"
echo ""

# By type
echo "By type:"
# Why layer types
for type in vision goal persona constraint decision; do
    count=$(grep -rl "^\$schema: $type" "$SPECS_DIR" --include="*.md" 2>/dev/null | wc -l | tr -d ' ')
    [ "$count" -gt 0 ] && printf "  %-12s %s\n" "$type:" "$count"
done
# What layer types
for type in entity feature rule journey interface; do
    count=$(grep -rl "^\$schema: $type" "$SPECS_DIR" --include="*.md" 2>/dev/null | wc -l | tr -d ' ')
    [ "$count" -gt 0 ] && printf "  %-12s %s\n" "$type:" "$count"
done
# How layer types
for type in agent skill lens workflow stack; do
    count=$(grep -rl "^\$schema: $type" "$SPECS_DIR" --include="*.md" 2>/dev/null | wc -l | tr -d ' ')
    [ "$count" -gt 0 ] && printf "  %-12s %s\n" "$type:" "$count"
done
echo ""

# By status
echo "By status:"
for status in draft active deprecated; do
    count=$(grep -rl "^status: $status" "$SPECS_DIR" --include="*.md" 2>/dev/null | wc -l | tr -d ' ')
    [ "$count" -gt 0 ] && printf "  %-12s %s\n" "$status:" "$count"
done
echo ""

# Check for issues
echo "Quick checks:"

# Orphans
orphan_count=0
for f in $(find "$SPECS_DIR/why" "$SPECS_DIR/what" "$SPECS_DIR/how" -name "*.md" 2>/dev/null); do
    name=$(basename "$f" .md)
    if ! grep -rq "$name" "$SPECS_DIR" --include="*.md" 2>/dev/null; then
        orphan_count=$((orphan_count + 1))
    fi
done
echo "  Potential orphans: $orphan_count"

# Large files
large_count=$(find "$SPECS_DIR" -name "*.md" -exec wc -l {} \; 2>/dev/null | awk '$1 > 150 {count++} END {print count+0}')
echo "  Large specs (>150 lines): $large_count"

# Missing schema
no_schema=$(find "$SPECS_DIR/why" "$SPECS_DIR/what" "$SPECS_DIR/how" -name "*.md" 2>/dev/null | while read f; do
    grep -q '^\$schema:' "$f" || echo "$f"
done | wc -l | tr -d ' ')
echo "  Missing \$schema: $no_schema"

echo ""
echo "Run 'python3 scripts/validate.py' for detailed validation"
