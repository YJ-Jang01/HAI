# Project

## Goal

Build a Human-AI Interaction shopping demo that shows how AI can help users interact with dense product-search GUIs.

The development target is the shopping demo in `frontend/Amazon/`.

## Main Concept

**GroundedCompare**: users compare multiple visible items with AI evidence attached directly to the relevant cards.

For the shopping demo, the target experience is:

1. User sees a dense product grid.
2. User selects multiple products.
3. The system shows evidence-backed summaries on or near selected cards.
4. User expands source review snippets when needed.
5. User compares items without repeatedly opening detail pages.
6. User makes the final choice.

## Why This Matters

Existing AI summaries and chat assistants are useful, but they often separate evidence from the item being compared. This project focuses on spatially grounding AI evidence in the current UI so users can keep item, evidence, and decision context together.

## Primary Scope

Implement in `frontend/Amazon/`:

- numbered product cards
- multi-item selection
- in-place evidence overlays
- comparison tray
- source review snippets
- repair/undo for selections
- study logging

## Non-Goals

- Full Amazon clone.
- Real purchasing flow.
- Web crawling.
- Production backend.
- General autonomous GUI agent.
