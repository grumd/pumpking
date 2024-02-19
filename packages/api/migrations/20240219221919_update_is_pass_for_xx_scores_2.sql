update `results`
set `is_pass` = 1
where `mix` <= 26
and `grade` in ('SSS', 'SS', 'S', 'A+', 'B+', 'C+', 'D+', 'F+')