#!/bin/bash
awk '
{
  print $0
  if ($0 ~ /- \[x\] \*\*DIRECTOR OS & ADMIN OS OVERHAUL\*\*: Admin active incidents click navigation and Director OS system-wide visual simplification./) {
    print "- [x] **COACH OS OVERHAUL**: Simplified Match Day layout and normalized design system colors (Void Black, Navy Slate, Action Gold, Data Cyan)."
  }
}' ROADMAP.md > ROADMAP_temp.md && mv ROADMAP_temp.md ROADMAP.md
