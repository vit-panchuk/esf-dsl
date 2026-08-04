// The WIP graph for the Foobar fixture. Same item codes as the report —
// one namespace, so R1 is the same address in prose, here, in the page
// anchor and in the JSON-LD @id.
//
// It carries two deliberately private properties (`file`, `recovered_from`)
// and a local `uri`, so the sanitizer has something real to strip: the
// smoke test asserts none of it reaches the public projection.

MERGE (n:`root-cause` {id:'RC1'}) SET n.title = 'Nobody owns the schedule', n.ensures = 'every timing question becomes an archaeology exercise';
MERGE (n:`risk` {id:'R1'}) SET n.title = 'The queue is the real bottleneck', n.flag = 'amber', n.likelihood = 'likely within two quarters', n.falsifier = 'a week of queue timings with a median under 60s';
MERGE (n:`debt` {id:'D1'}) SET n.title = 'An undocumented cadence', n.kind = 'knowledge';
MERGE (n:`credit` {id:'C1'}) SET n.title = 'Six years of unbroken weekly release', n.status = 'realized';
MERGE (n:`premortem` {id:'P1'}) SET n.title = 'The queue is never measured', n.warning = 'a second skipped release', n.mitigation = 'instrument the queue first';
MERGE (n:`decision` {id:'DL1'}) SET n.title = 'Hold ship day until the queue is measured', n.status = 'superseded';
MERGE (n:`strategy` {id:'S1'}) SET n.title = 'Ship weekly, on Tuesday', n.state = 'written', n.health = 'working, cause unknown';
MERGE (n:`strategy` {id:'S2'}) SET n.title = 'Measure before optimizing', n.state = 'unwritten', n.health = 'not in force';
MERGE (n:`bet` {id:'B1'}) SET n.title = 'Instrument the queue for one week', n.verdict = 'Do', n.cost = '1 day';
MERGE (n:`bet` {id:'B2'}) SET n.title = 'Split the build before measuring', n.verdict = 'Kill', n.cost = '3 weeks';
MERGE (n:`easy-win` {id:'E1'}) SET n.title = 'Log queue entry and exit timestamps', n.feeds = 'observability', n.status = 'done';
MERGE (n:`question` {id:'Q1'}) SET n.title = 'Why Tuesday?', n.rank = 1;
MERGE (n:`option` {id:'O1'}) SET n.title = 'Move ship day';

// A source with a local checkout address and a public mirror: the local one
// must drop and the mirror must stand in for it.
MERGE (n:`source` {id:'SRC1'}) SET n.title = 'Foobar build logs', n.uri = 'file:///Users/nobody/checkouts/foobar/logs', n.mirror = 'https://example.com/foobar/logs';

// Working-state properties. These never leave the build.
MATCH (n {id:'R1'}) SET n.file = '/Users/nobody/.claude/projects/foobar/nodes/r1.md';
MATCH (n {id:'D1'}) SET n.recovered_from = 'session-transcript-8f3ac1.jsonl';

MATCH (a {id:'B1'}), (b {id:'R1'}) MERGE (a)-[:ADDRESSES]->(b);
MATCH (a {id:'B1'}), (b {id:'D1'}) MERGE (a)-[:ADDRESSES]->(b);
MATCH (a {id:'B2'}), (b {id:'RC1'}) MERGE (a)-[:ADDRESSES]->(b);
MATCH (a {id:'R1'}), (b {id:'RC1'}) MERGE (a)-[:CAUSED_BY]->(b);
MATCH (a {id:'Q1'}), (b {id:'DL1'}) MERGE (a)-[:BLOCKS]->(b);
MATCH (a {id:'O1'}), (b {id:'S1'}) MERGE (a)-[:CHALLENGES]->(b);
