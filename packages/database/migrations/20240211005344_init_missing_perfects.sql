update results as r
inner join results r1 ON r1.shared_chart = r.shared_chart
  and r1.mix = r.mix
  and r1.misses is not null
  and r1.bads is not null
  and r1.goods is not null
  and r1.greats is not null
  and r1.perfects is not null
set r.perfects = (
  r1.misses + r1.bads + r1.goods + r1.greats + r1.perfects - r.misses - r.bads - r.goods - r.greats 
)
where r.perfects is null
and r.misses is not null
and r.bads is not null
and r.goods is not null
and r.greats is not null