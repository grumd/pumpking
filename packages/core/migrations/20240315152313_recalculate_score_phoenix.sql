update `results`
set `score_phoenix` = FLOOR(
	1000000 *
	(
		0.995 * (`perfects` + 0.6 * `greats` + 0.2 * `goods` + 0.1 * `bads`)
		+ 0.005 * `max_combo`
	)
	/ (`perfects` + `greats` + `goods` + `bads` + `misses`)
)
where `misses` is not null
and `bads` is not null
and `greats` is not null
and `goods` is not null
and `perfects` is not null
and `max_combo` is not null
and `rank_mode` is not TRUE