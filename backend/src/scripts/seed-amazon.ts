console.log(
  [
    "The legacy synthetic Amazon seed has been retired.",
    "Use the Amazon Reviews 2023 pipeline instead:",
    "  pnpm run dataset:plan:amazon2023 -- --metadata <meta_Amazon_Fashion.jsonl.gz> --reviews <Amazon_Fashion.jsonl.gz> --out reports/amazon2023-seed-plan.json",
    "  pnpm run dataset:import:amazon2023 -- --metadata <meta_Amazon_Fashion.jsonl.gz> --reviews <Amazon_Fashion.jsonl.gz> --selection-plan reports/amazon2023-seed-plan.json",
    "  pnpm run db:verify:amazon2023",
  ].join("\n"),
);
