alter table wrestling.match_predictions
  add column if not exists match_flow_summary jsonb;
comment on column wrestling.match_predictions.match_flow_summary is
  'Structured 3-stage tactical breakdown for AI matchup projections.';
