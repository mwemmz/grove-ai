/** BIT353 Big Data and Data Warehousing visuals. Shown only to students whose ID starts with "BIT" (see services/access).
 *  Examples follow the course's own slides (the Lusaka/Harare MapReduce example, SmartMart batch processing,
 *  the six data mining tasks) and the questions its past papers ask. */
import type { VisualStep, VisualTopic } from './visualTopics';

export type BitTopicId =
  | 'bit-etl'
  | 'bit-star-schema'
  | 'bit-olap-cube'
  | 'bit-hdfs'
  | 'bit-mapreduce'
  | 'bit-batch-stream'
  | 'bit-data-mining'
  | 'bit-big-data-stack';

const AUDIENCE = 'BIT';
const steps = (ranges: [number, number][], items: [string, string][]): VisualStep[] =>
  items.map(([title, text], i) => ({ title, text, t0: ranges[i][0], t1: ranges[i][1] }));
const even = (n: number, each: number): [number, number][] => Array.from({ length: n }, (_, i) => [i * each, (i + 1) * each]);
const base = { group: 'Big data and warehousing' as const, courseCode: 'BIT353', audience: AUDIENCE };

export const BIT_TOPICS: VisualTopic[] = [
  {
    ...base,
    id: 'bit-etl',
    name: 'ETL: getting data into the warehouse',
    unit: 'Units 2, 5 and 9',
    src: 'visuals/bit-etl/index.html',
    steps: steps(even(5, 3), [
      ['Extract', 'Copy data out of the operational systems that run the business: tills, mobile money, the customer database.'],
      ['Transform', 'Clean it in a staging area: remove duplicates, put dates and amounts in one format, match customer IDs, aggregate where needed.'],
      ['Load', 'Write the clean rows into the warehouse’s fact and dimension tables, usually on a schedule.'],
      ['Use it', 'Reports, dashboards and KPIs read one consistent, integrated copy of the data.'],
      ['ETL vs ELT', 'ELT loads raw data first and transforms it inside the warehouse. It suits cloud warehouses (BigQuery, Snowflake, Redshift) that have the computing power to do it.'],
    ]),
    notes: {
      summary: 'ETL is how data gets from many messy operational systems into one clean, consistent warehouse. Most of the effort, and most exam marks, are in the transform step.',
      ideas: [
        'Extract: read from sources (databases, files, APIs) without disturbing them.',
        'Transform: cleaning, standardising, de-duplicating, joining, deriving and aggregating.',
        'Load: full load the first time, then incremental loads of only what changed.',
        'ELT reverses the last two steps; KDD adds selection, preprocessing and interpretation around data mining.',
      ],
      table: {
        heading: ['Step', 'Typical job', 'Example'],
        rows: [
          ['Extract', 'Copy from source', 'Daily CSV from every till'],
          ['Transform', 'Clean and standardise', '05/03/26 → 2026-03-05'],
          ['Load', 'Insert into warehouse', 'Add rows to fact_sales'],
        ],
      },
      useWhen: ['A question asks you to “explain the ETL process” for a scenario (hospital and insurance data, bank branches).', 'Comparing a data warehouse with the operational database.'],
      watchOut: ['Transform is not just “convert”. Name concrete cleaning steps.', 'ETL is not the same as data mining; it prepares data for it.'],
    },
    quiz: [
      { q: 'Dates arrive as 05/03/26 and 2026-03-05. Which ETL step fixes this?', options: ['Extract', 'Transform', 'Load', 'Report'], answer: 1, why: 'Standardising formats is transformation, done in staging before loading.', step: 1 },
      { q: 'What does ELT do differently from ETL?', options: ['Skips loading', 'Transforms inside the warehouse after loading raw data', 'Never cleans data', 'Only works offline'], answer: 1, why: 'ELT loads first and uses the warehouse’s own processing to transform.', step: 4 },
      { q: 'Where does transformation usually happen in ETL?', options: ['In the source system', 'In a staging area', 'On the dashboard', 'In the user’s browser'], answer: 1, why: 'A staging area keeps the work away from the live systems and the warehouse.', step: 1 },
    ],
  },
  {
    ...base,
    id: 'bit-star-schema',
    name: 'Star schema and snowflake schema',
    unit: 'Units 5 and 6',
    src: 'visuals/bit-star-schema/index.html',
    steps: steps(even(5, 3), [
      ['The fact table', 'One row per business event (a sale). It holds the measures you add up, quantity and amount, plus a foreign key to each dimension.'],
      ['Dimension tables', 'Descriptive tables for the who, what, where and when: customer, product, store, date.'],
      ['A star', 'Each key in the fact table points to one dimension, so the fact table sits in the middle with dimensions around it.'],
      ['A query', '“Total sales by province in Q1”: join fact to store and date, filter quarter = Q1, group by province, sum amount.'],
      ['Snowflake', 'Normalising a dimension (product → category) gives a snowflake schema: less repetition, but more joins and slower queries.'],
    ]),
    notes: {
      summary: 'Dimensional modelling organises a warehouse around facts (numbers to analyse) and dimensions (ways to slice them). The star schema is the standard design; the snowflake normalises its dimensions.',
      ideas: [
        'Fact table: measures plus foreign keys; usually very many rows.',
        'Dimension table: descriptive attributes with a primary key; fewer rows.',
        'Star: dimensions are denormalised, one join per dimension, fast queries.',
        'Snowflake: dimensions split into sub-tables, saves space, more joins.',
      ],
      table: {
        heading: ['', 'Star', 'Snowflake'],
        rows: [
          ['Dimensions', 'Denormalised', 'Normalised'],
          ['Joins per query', 'Fewer', 'More'],
          ['Storage', 'More repetition', 'Less repetition'],
        ],
      },
      useWhen: ['“Design a star schema for this data mart” questions: name the fact table, its measures, and four dimensions.', 'Explaining why warehouses are not designed like OLTP databases.'],
      watchOut: ['Measures go in the fact table, descriptions in dimensions. Don’t put “customer name” in the fact table.', 'Every fact row needs a date dimension key.'],
    },
    quiz: [
      { q: 'In a sales star schema, which belongs in the fact table?', options: ['Customer address', 'Product brand', 'Sale amount', 'Store manager'], answer: 2, why: 'Amount is a measure you add up. The others describe a dimension.', step: 0 },
      { q: 'What makes a schema a snowflake?', options: ['No fact table', 'Dimensions are normalised into further tables', 'Only one dimension', 'It is stored in the cloud'], answer: 1, why: 'Splitting dimensions (product → category) gives the snowflake shape.', step: 4 },
      { q: 'Why are star schemas fast to query?', options: ['They have no keys', 'One join per dimension from the central fact table', 'They store no numbers', 'They are always small'], answer: 1, why: 'Denormalised dimensions keep joins few and simple.', step: 2 },
    ],
  },
  {
    ...base,
    id: 'bit-olap-cube',
    name: 'OLAP cube operations',
    unit: 'OLAP lecture · Unit 5',
    src: 'visuals/bit-olap-cube/index.html',
    steps: steps([[0, 3], [3, 6], [6, 9], [9, 12], [12, 15], [15, 18]], [
      ['The cube', 'OLAP stores data by several dimensions at once. Here: region × product × quarter, each cell holding sales.'],
      ['Slice', 'Fix one dimension to a single value (quarter = Q1). The result is a two-dimensional table.'],
      ['Dice', 'Choose a range on two or more dimensions (two regions, two products, Q1–Q2). The result is a smaller cube.'],
      ['Roll-up', 'Aggregate up a hierarchy: regions → country, quarters → year. Less detail, bigger totals.'],
      ['Drill-down', 'The opposite of roll-up: break Q1 into January, February and March. More detail.'],
      ['Pivot', 'Rotate the axes: products become rows and regions become columns. Same data, different view.'],
    ]),
    notes: {
      summary: 'OLAP (online analytical processing) lets analysts explore multidimensional data quickly with five standard operations. OLTP, by contrast, handles day-to-day transactions.',
      ideas: [
        'OLAP is read-heavy, historical, aggregated and multidimensional; OLTP is write-heavy, current and detailed.',
        'Tools: MOLAP (stores a cube), ROLAP (works on relational tables), HOLAP (both), DOLAP (desktop).',
        'Roll-up and drill-down move along a hierarchy; slice, dice and pivot change which part or angle you see.',
      ],
      table: {
        heading: ['Operation', 'What it does', 'Example'],
        rows: [
          ['Slice', 'One value on one dimension', 'Q1 only'],
          ['Dice', 'Ranges on several dimensions', '2 regions × 2 products × Q1–Q2'],
          ['Roll-up', 'Aggregate up a hierarchy', 'Month → quarter → year'],
          ['Drill-down', 'Go to finer detail', 'Year → quarter → month'],
          ['Pivot', 'Swap rows and columns', 'Products as rows'],
        ],
      },
      useWhen: ['“Explain how roll-up and drill-down could be applied” questions.', '“Difference between OLAP and OLTP / OLAP and data mining” questions.'],
      watchOut: ['Slice fixes one dimension; dice selects on two or more.', 'OLAP answers questions you ask; data mining finds patterns you didn’t ask about.'],
    },
    quiz: [
      { q: 'A manager views only Q1 sales across all regions and products. Which operation?', options: ['Slice', 'Dice', 'Pivot', 'Drill-down'], answer: 0, why: 'One dimension fixed to one value is a slice.', step: 1 },
      { q: 'Monthly sales are combined into yearly totals. Which operation?', options: ['Drill-down', 'Roll-up', 'Slice', 'Dice'], answer: 1, why: 'Aggregating up a hierarchy is roll-up.', step: 3 },
      { q: 'Which statement fits OLAP rather than OLTP?', options: ['Many small inserts per second', 'Current balances only', 'Historical, aggregated analysis', 'Strict row-level updates'], answer: 2, why: 'OLAP is for analysis over history; OLTP runs daily transactions.', step: 0 },
    ],
  },
  {
    ...base,
    id: 'bit-hdfs',
    name: 'How HDFS stores a file',
    unit: 'Unit 8 · Hadoop',
    src: 'visuals/bit-hdfs/index.html',
    steps: steps(even(5, 3), [
      ['Split into blocks', 'HDFS cuts a large file into fixed-size blocks, 128 MB by default. A 384 MB file becomes three blocks.'],
      ['Replicate', 'Each block is stored on three different DataNodes (replication factor 3), so one machine’s failure loses nothing.'],
      ['The NameNode keeps the map', 'The NameNode holds only metadata: which blocks make up each file and which DataNodes hold each copy.'],
      ['A DataNode fails', 'DataNodes send heartbeats. When DN2 stops, its blocks are still readable from their other two copies.'],
      ['Self-healing', 'The NameNode re-replicates the under-copied blocks onto healthy nodes until each block has three copies again.'],
    ]),
    notes: {
      summary: 'HDFS spreads big files across many cheap machines by splitting them into blocks and storing several copies of each. A single NameNode tracks where everything is; DataNodes hold the data.',
      ideas: [
        'Write once, read many; built for large files and high throughput.',
        'Fault tolerance comes from replication plus heartbeats and re-replication.',
        'Data locality: computation is sent to the node that holds the data.',
        'Weak spots: many small files overload NameNode memory; not designed for low-latency random reads.',
      ],
      table: {
        heading: ['Part', 'Holds', 'If it fails'],
        rows: [
          ['NameNode', 'Metadata (block map)', 'Cluster stops without a standby'],
          ['DataNode', 'The blocks themselves', 'Other copies serve reads; blocks re-replicated'],
        ],
      },
      useWhen: ['“Explain how HDFS can solve the company’s storage issues” questions.', '“Limitations of HDFS for low-latency access or many small files” questions.'],
      watchOut: ['The NameNode does not store file contents.', 'Replication factor 3 means three copies in total, not three extra copies.'],
    },
    quiz: [
      { q: 'A 640 MB file with a 128 MB block size is split into how many blocks?', options: ['3', '4', '5', '6'], answer: 2, why: '640 ÷ 128 = 5 blocks.', step: 0 },
      { q: 'What does the NameNode store?', options: ['The file data', 'Metadata: which blocks are where', 'Only replicas', 'User passwords'], answer: 1, why: 'DataNodes hold blocks; the NameNode holds the map.', step: 2 },
      { q: 'Why does HDFS struggle with millions of tiny files?', options: ['Blocks are too big to read', 'Each file’s metadata uses NameNode memory', 'DataNodes refuse small files', 'Replication stops'], answer: 1, why: 'Every file and block is an entry in NameNode memory.', step: 2 },
    ],
  },
  {
    ...base,
    id: 'bit-mapreduce',
    name: 'MapReduce step by step, and Spark',
    unit: 'Unit 8 · MapReduce · Unit 10 · Spark',
    src: 'visuals/bit-mapreduce/index.html',
    steps: steps(even(5, 3), [
      ['Input and splitting', 'Daily temperature files are split into chunks, and each chunk goes to a mapper on a different node.'],
      ['Map', 'Each mapper turns its records into key/value pairs: <city, temperature>, such as <Lusaka, 18>.'],
      ['Shuffle and sort', 'Pairs are grouped by key, so every Lusaka value goes to one reducer, every Harare value to another.'],
      ['Reduce', 'Each reducer keeps the maximum: <Lusaka, 38> <Harare, 27> <Cape Town, 33> <Windhoek, 32>.'],
      ['Spark instead', 'MapReduce writes intermediate results to disk. Spark keeps them in memory as RDDs and can rebuild lost partitions from their lineage, so iterative and interactive jobs run much faster.'],
    ]),
    notes: {
      summary: 'MapReduce processes huge data sets in parallel with two functions you write: map (make key/value pairs) and reduce (combine all values for a key). Spark does the same kind of work in memory.',
      ideas: [
        'Phases: input → splitting → mapping → shuffling → reducing.',
        'Fault tolerance: failed map or reduce tasks are re-run on another node; input is safe in HDFS.',
        'Spark resilience: RDD lineage records how each partition was built, so it is recomputed rather than restored from disk.',
        'YARN allocates cluster resources to both.',
      ],
      table: {
        heading: ['', 'MapReduce', 'Spark'],
        rows: [
          ['Intermediate data', 'Written to disk', 'Kept in memory'],
          ['Best for', 'Large one-pass batch jobs', 'Iterative, interactive, streaming'],
          ['Recovery', 'Re-run failed tasks', 'Recompute from lineage'],
        ],
      },
      useWhen: ['“In which scenarios would you recommend Spark over MapReduce?”', '“Discuss fault tolerance in HDFS and MapReduce” and “How does Spark’s resilience differ?”'],
      watchOut: ['Shuffle happens between map and reduce, not after reduce.', 'Spark can run on HDFS and YARN; it replaces MapReduce, not Hadoop storage.'],
    },
    quiz: [
      { q: 'Which phase sends all values for one city to the same reducer?', options: ['Map', 'Shuffle and sort', 'Reduce', 'Split'], answer: 1, why: 'Shuffle groups pairs by key before reducing.', step: 2 },
      { q: 'Why is Spark faster for iterative machine learning jobs?', options: ['It uses no memory', 'It keeps intermediate data in memory', 'It skips the reduce step', 'It stores no data'], answer: 1, why: 'Avoiding disk writes between iterations saves most of the time.', step: 4 },
      { q: 'How does Spark recover a lost partition?', options: ['From a backup tape', 'By recomputing it from its lineage', 'It cannot', 'By asking the user'], answer: 1, why: 'RDDs record the steps that built them.', step: 4 },
    ],
  },
  {
    ...base,
    id: 'bit-batch-stream',
    name: 'Batch vs real-time processing',
    unit: 'Unit 9',
    src: 'visuals/bit-batch-stream/index.html',
    steps: steps(even(5, 3), [
      ['Sales happen all day', 'SmartMart’s tills record transactions continuously.'],
      ['Batch: collect', 'In batch processing, transactions accumulate in a transaction file until the scheduled run.'],
      ['Batch: run at night', 'The batch run updates the master file (stock records) all at once. Until then the records are out of date.'],
      ['Real time: stream', 'Each sale is published to a Kafka topic and processed within seconds, so stock levels stay current.'],
      ['Choosing', 'Batch: high throughput, simple, cheap, but delayed. Real time: low latency, but more complex and costly.'],
    ]),
    notes: {
      summary: 'Batch processing handles data in scheduled groups; real-time (stream) processing handles each record as it arrives. Ingestion tools like Kafka and Flume feed the pipelines.',
      ideas: [
        'Master file: the permanent record (e.g. stock) updated by the transaction file in each batch run.',
        'The primary key field (e.g. product code) matches each transaction to its master record.',
        'Kafka: distributed message queue/stream bus; Flume: collects and moves log data.',
        'Three common processing methods: batch, real-time (online), and distributed/parallel processing.',
      ],
      table: {
        heading: ['', 'Batch', 'Real time'],
        rows: [
          ['Latency', 'Hours', 'Seconds or less'],
          ['Throughput', 'High', 'Per event'],
          ['Examples', 'Payroll, daily reports', 'Stock levels, fraud alerts, ATMs'],
        ],
      },
      useWhen: ['SmartMart-style questions on master files, primary keys, and batch advantages and disadvantages.', 'Comparing Flume and Kafka for ingestion.'],
      watchOut: ['Real time is not “faster batch”: it processes each event, not small piles.', 'Give two of each when asked for advantages and disadvantages.'],
    },
    quiz: [
      { q: 'What is the master file in a batch system?', options: ['A temporary list of today’s sales', 'The permanent record updated by each batch run', 'A Kafka topic', 'A backup copy'], answer: 1, why: 'The transaction file updates the master file during the run.', step: 2 },
      { q: 'Which needs real-time processing?', options: ['Monthly payroll', 'Fraud alerts on card payments', 'Year-end report', 'Archiving old logs'], answer: 1, why: 'A fraud alert is useless hours later.', step: 4 },
      { q: 'What is the primary key used for in batch processing?', options: ['Encrypting files', 'Matching each transaction to its master record', 'Sorting by date only', 'Counting users'], answer: 1, why: 'Transactions are sorted and matched to master records by key.', step: 2 },
    ],
  },
  {
    ...base,
    id: 'bit-data-mining',
    name: 'Data mining: association rules and choosing a task',
    unit: 'Unit 6',
    src: 'visuals/bit-data-mining/index.html',
    steps: steps(even(5, 3), [
      ['Six baskets', 'Market basket analysis (association rule learning) finds products bought together. Rule to test: bread → butter.'],
      ['Support', 'How often bread and butter appear together: in 3 of 6 baskets, so support = 50%.'],
      ['Confidence', 'Of the 4 baskets with bread, 3 also have butter: confidence = 75%.'],
      ['Lift', 'Butter appears in 50% of all baskets. Lift = 75% ÷ 50% = 1.5. Above 1 means a real association, not chance.'],
      ['Which task?', 'Association: bought together. Clustering: groups without labels. Classification: labelled yes/no. Anomaly detection: fraud. Sequential patterns: what follows what. Regression: predict a number.'],
    ]),
    notes: {
      summary: 'Data mining discovers patterns in large data sets that nobody asked about directly. The exam usually gives a business problem and asks which of the six tasks fits.',
      ideas: [
        'Support(A→B) = baskets with A and B ÷ all baskets.',
        'Confidence(A→B) = baskets with A and B ÷ baskets with A.',
        'Lift(A→B) = confidence ÷ support of B. Lift > 1: positive association.',
        'Data mining finds unknown patterns; OLAP answers questions you already have.',
      ],
      table: {
        heading: ['Business question', 'Task', 'Why'],
        rows: [
          ['What do customers buy together?', 'Association rules', 'Co-occurrence'],
          ['Which transactions look fraudulent?', 'Anomaly detection / classification', 'Unusual or labelled cases'],
          ['Savings account, then a loan?', 'Sequential patterns', 'Order matters'],
          ['Natural customer segments?', 'Clustering', 'No labels given'],
          ['Will this customer leave?', 'Classification', 'Learn from past churners'],
        ],
      },
      useWhen: ['ABC Bank / ZamFinance-style compulsory questions.', 'Any “recommend a data mining technique” question: name the task and say why.'],
      watchOut: ['Clustering has no labels; classification needs them.', 'High confidence alone can mislead if B is common anyway. Check lift.'],
    },
    quiz: [
      { q: 'A bank wants to know if customers open savings accounts before applying for loans. Which task?', options: ['Clustering', 'Sequential pattern mining', 'Regression', 'Summarisation'], answer: 1, why: 'The order of events is the pattern.', step: 4 },
      { q: '100 baskets: 40 have bread, 20 have bread and butter. What is confidence(bread → butter)?', options: ['20%', '40%', '50%', '200%'], answer: 2, why: '20 ÷ 40 = 50%.', step: 2 },
      { q: 'Grouping customers into segments with no predefined labels is…', options: ['Classification', 'Clustering', 'Association', 'Regression'], answer: 1, why: 'Clustering discovers groups without labels.', step: 4 },
    ],
  },
  {
    ...base,
    id: 'bit-big-data-stack',
    name: 'The Big Data technology stack',
    unit: 'Units 7 and 8',
    src: 'visuals/bit-big-data-stack/index.html',
    steps: steps(even(5, 3), [
      ['Why “big” data', 'Data is “big” when its volume, velocity and variety (and questions of veracity and value) are too much for one ordinary database.'],
      ['Sources and ingestion', 'Data comes from apps, sensors, logs and social media. Kafka, Flume and Sqoop bring it into the platform.'],
      ['Storage', 'HDFS, a data lake or a NoSQL store (HBase, Cassandra, MongoDB) keeps it across many machines.'],
      ['Processing', 'MapReduce or Spark process it in parallel. YARN manages which job gets which resources.'],
      ['Analysis and visualisation', 'Hive, Spark SQL and BI dashboards turn the processed data into answers people can act on.'],
    ]),
    notes: {
      summary: 'The Big Data stack is a set of layers, each with its own tools, that together move data from where it is produced to where it informs decisions.',
      ideas: [
        'Structured data: tables (sales, inventory). Semi-structured: JSON, logs, reviews. Unstructured: images, video, free text.',
        'Hadoop’s core: HDFS (storage), YARN (resources), MapReduce (processing), Hadoop Common (shared libraries).',
        'Cloud versions: Amazon EMR, Google BigQuery, Azure HDInsight.',
        'Privacy and security risks grow with scale: breaches, misuse, compliance with data protection law.',
      ],
      table: {
        heading: ['Layer', 'Job', 'Tools'],
        rows: [
          ['Sources', 'Produce data', 'Apps, sensors, logs'],
          ['Ingestion', 'Bring it in', 'Kafka, Flume, Sqoop'],
          ['Storage', 'Keep it', 'HDFS, data lake, NoSQL'],
          ['Processing', 'Compute on it', 'MapReduce, Spark, YARN'],
          ['Analysis', 'Explain it', 'Hive, Spark SQL, BI'],
        ],
      },
      useWhen: ['“Define Big Data and explain why this data set is Big Data” (use the Vs with scenario examples).', '“Differentiate structured, semi-structured and unstructured data.”'],
      watchOut: ['Volume alone does not make data “big”: mention velocity and variety too.', 'A data lake stores raw data of any kind; a warehouse stores structured, cleaned data.'],
    },
    quiz: [
      { q: 'Customer reviews in JSON are…', options: ['Structured', 'Semi-structured', 'Unstructured', 'Not data'], answer: 1, why: 'They have tags and fields but no fixed table schema.', step: 0 },
      { q: 'Which layer does Kafka belong to?', options: ['Storage', 'Ingestion', 'Visualisation', 'Sources'], answer: 1, why: 'Kafka moves streams of events into the platform.', step: 1 },
      { q: 'What does YARN do?', options: ['Stores blocks', 'Allocates cluster resources to jobs', 'Draws dashboards', 'Collects logs'], answer: 1, why: 'YARN is Hadoop’s resource manager.', step: 3 },
    ],
  },
];

/** Words that point at each BIT353 picture. */
export const BIT_MATCH: [BitTopicId, RegExp][] = [
  ['bit-etl', /\b(etl|elt|extract,? transform|staging area|data cleaning|data cleansing|data transformation)\b/i],
  ['bit-star-schema', /\b(star schema|snowflake schema|fact tables?|dimension tables?|dimensional model\w*|data marts?)\b/i],
  ['bit-olap-cube', /\b(olap|roll[- ]?up|drill[- ]?down|slice|dice|pivot|data cubes?|molap|rolap|holap)\b/i],
  ['bit-hdfs', /\b(hdfs|hadoop distributed file system|namenode|name node|datanode|data node|replication factor|blocks? size)\b/i],
  ['bit-mapreduce', /\b(map ?reduce|mapper|reducer|shuffle|spark|rdd|lineage)\b/i],
  ['bit-batch-stream', /\b(batch processing|batch data|real[- ]time (processing|data)|stream(ing)? processing|kafka|flume|master file)\b/i],
  ['bit-data-mining', /\b(data mining|association rules?|market basket|support and confidence|clustering|classification|anomaly detection|sequential pattern\w*|kdd)\b/i],
  ['bit-big-data-stack', /\b(big data|hadoop|yarn|data lake|nosql|volume,? velocity|unstructured data|semi[- ]structured)\b/i],
];
