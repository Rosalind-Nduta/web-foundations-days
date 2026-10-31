# SnapShare Scaling Plan

SnapShare is a photo-sharing app. Users upload photos and scroll a feed of photos from people they follow.

## 1. Assumptions

| Item | Value |
|---|---|
| Registered users | 10,000,000 |
| Daily active rate | 10% |
| Uploads per active user per day | 1 photo |
| Feed pages viewed per active user per day | 50 |
| Average original photo size | 2 MB |
| Thumbnail size | 50 KB (one per photo) |
| Seconds per day | 86,400 |
| Peak factor | 5x the average |
| Units | Decimal (1 TB = 1,000,000 MB), to keep the arithmetic simple |

**Daily active users (DAU)** = 10,000,000 x 10% = **1,000,000 users per day**

## 2. Estimates

### Uploads per second
- Uploads per day = 1,000,000 users x 1 photo = 1,000,000 photos/day
- Average = 1,000,000 / 86,400 = **about 11.6 uploads/s**
- Peak (5x) = **about 58 uploads/s**

### Feed views per second
- Feed views per day = 1,000,000 users x 50 pages = 50,000,000 views/day
- Average = 50,000,000 / 86,400 = **about 579 views/s**
- Peak (5x) = **about 2,900 views/s**

### Photo storage per year
- Originals per day = 1,000,000 x 2 MB = 2,000,000 MB = 2 TB/day
- Thumbnails per day = 1,000,000 x 50 KB = 50 GB/day
- Total per day = 2.05 TB/day
- Originals per year = 2 TB x 365 = **730 TB**
- Thumbnails per year = 50 GB x 365 = **18.25 TB**
- Total per year = **about 748 TB (roughly 0.75 PB)**

Storage will be dominated by the original photos (about 97.6% of the total). Thumbnails add under 3%.
This estimate excludes replication or backups, which would multiply the raw storage (for example 3 copies would give about 2.2 PB). Database metadata is tiny by comparison (a few hundred bytes per photo, so about 100 GB per year at 1M photos/day).

## 3. Read-heavy or write-heavy?

**The system is read-heavy.** There are 50 million feed views per day against 1 million uploads per day, a ratio of about **50 reads for every 1 write**.

What this means for the design:
- **Cache aggressively.** Feed data and hot photo metadata can be served from an in-memory cache so most reads never hit the database.
- **Use a CDN** for photo and thumbnail delivery, so the heavy bytes are served from edge locations close to users and not from our servers.
- **Add read replicas** so reads are spread across copies of the database and the primary only handles writes.
- **Keep the write path simple and asynchronous.** Writes are rare enough that one primary database can handle them for a long time, and slow work (thumbnails) can be pushed to a background queue.
- **Scale app servers horizontally** (stateless servers behind a load balancer) to absorb the peak of about 2,900 feed views/s.

## 4. Why photos should not be stored in the database

- **Size.** Photos are large binary blobs (2 MB each). At 1M photos/day that would add 2 TB per day to the database, making backups, replication and restores slow and expensive.
- **Cost.** Database storage (fast SSDs, replicated) costs far more per GB than object storage.
- **Performance.** Large blobs fill the database cache and slow down the small, frequent queries (users, follows, captions) the database is good at.
- **Serving.** A database cannot hand files to a CDN efficiently, and every photo request would burn a database connection.
- **Scaling.** Object storage scales almost without limit and is built for durability (data is copied across multiple machines or zones).

**Where they go instead:** photo files (originals and thumbnails) go into **object storage** (for example Amazon S3, Google Cloud Storage or similar). The database stores only the **metadata**: photo ID, owner, caption, timestamp and the **URL or key** pointing to the file in object storage. The CDN then serves the files from object storage.

## 5. Architecture diagram

```
                              +----------------+
                              |     Users      |
                              | (web / mobile) |
                              +--------+-------+
                                       |
                 +---------------------+----------------------+
                 | photo / thumbnail                          | API requests
                 | downloads                                  | (feed, upload, follow)
                 v                                            v
        +-----------------+                          +-----------------+
        |       CDN       |                          |  Load Balancer  |
        | (edge caches)   |                          +--------+--------+
        +--------+--------+                                   |
                 | cache miss                  +--------------+--------------+
                 |                             |              |              |
                 |                             v              v              v
                 |                      +-----------+  +-----------+  +-----------+
                 |                      | App Server|  | App Server|  | App Server|
                 |                      |     1     |  |     2     |  |     N     |
                 |                      +-----+-----+  +-----+-----+  +-----+-----+
                 |                            |              |              |
                 |        +-------------------+--------------+--------------+
                 |        |                   |                             |
                 |        | feed / metadata   | metadata writes             | upload job
                 |        | reads             | and cache misses            | message
                 |        v                   v                             v
                 |   +---------+       +--------------+               +-----------+
                 |   |  Cache  |       |  Database    |               |   Queue   |
                 |   | (Redis) |       |  (Primary)   |               +-----+-----+
                 |   +----+----+       +------+-------+                     |
                 |        | miss              | replication                 | job
                 |        v                   v                             v
                 |   +--------------+  +---------------+             +--------------+
                 |   | Read Replica |  | Read Replica  |             | Thumbnail    |
                 |   |  (reads)     |  |  (reads)      |             | Worker(s)    |
                 |   +--------------+  +---------------+             +------+-------+
                 |                                                          |
                 |                                         reads original,  |
                 |                                         writes thumbnail |
                 v                                                          v
        +-------------------------------------------------------------------------+
        |                      Object Storage (photo files)                       |
        |                  originals (2 MB)  +  thumbnails (50 KB)                |
        +-------------------------------------------------------------------------+
                  ^
                  | app servers write the original photo here
                  | (direct, or via a pre-signed upload URL)
```

Reading the diagram:
- **Reads:** App servers check the cache first, then a read replica. Photo files come from the CDN, which falls back to object storage on a miss.
- **Writes:** The app server saves the original to object storage and the metadata to the primary database. It then puts a job on the queue.
- **Background:** A worker takes the job, creates the thumbnail and saves it back to object storage.

## 6. Components in one sentence each

- **CDN:** Serves photos and thumbnails from edge servers close to the user, which cuts latency and keeps most of the heavy photo traffic off our own servers.
- **Load balancer:** Spreads incoming requests across many app servers and stops sending traffic to servers that fail, so no single server is a bottleneck or a single point of failure.
- **App servers:** Run the application logic (authentication, building the feed, handling uploads) and are stateless, so we can add more of them to handle more traffic.
- **Cache:** Keeps frequently read data (feed pages, photo metadata) in memory so repeated reads are fast and the database is not overloaded.
- **Database (primary):** Stores the durable, structured data (users, follows, photo metadata) and handles all writes.
- **Read replica:** Holds a copy of the primary and serves read queries, which spreads the 50:1 read load and protects the primary.
- **Object storage:** Stores the large photo files cheaply and durably, and scales to hundreds of terabytes without a database holding the blobs.
- **Queue:** Holds thumbnail jobs so the upload request can return immediately and traffic spikes are smoothed out instead of overwhelming the workers.
- **Thumbnail worker:** Picks jobs off the queue and generates the small 50 KB thumbnails in the background, so users do not wait for image processing.

## 7. Upload flow, step by step

1. The user picks a photo in the app and taps upload. The client may resize or compress it slightly first.
2. The request goes through the **CDN/DNS** to the **load balancer**, which forwards it to a healthy **app server**.
3. The app server **authenticates** the user and validates the file (type, size limit).
4. The app server saves the **original photo to object storage** under a unique key (for example `photos/<user_id>/<photo_id>.jpg`). Alternatively, it hands the client a pre-signed URL and the client uploads straight to object storage, which keeps large files off the app servers.
5. The app server writes a **metadata row to the primary database** (photo ID, owner, caption, timestamp, original file key, thumbnail status = `pending`).
6. The app server **publishes a message to the queue**, for example `{photo_id, original_key}`.
7. The app server **returns success to the user** right away. The photo is accepted without waiting for the thumbnail.
8. A **thumbnail worker** takes the message from the queue and downloads the original from object storage.
9. The worker **creates the 50 KB thumbnail** and uploads it to object storage.
10. The worker **updates the database** (thumbnail key, status = `ready`). If the worker fails, the job is not acknowledged and the queue retries it (after repeated failures it moves to a dead-letter queue for inspection).
11. The relevant **cache entries are invalidated or updated**, so followers' feeds include the new photo. Followers then see it, with the thumbnail served by the **CDN**. Until the thumbnail is ready, the feed can show a placeholder or the resized original.

## 8. Trade-offs

1. **Caching speeds up reads but can show stale data.** A feed served from cache may not include a photo uploaded seconds ago, and invalidating caches correctly is hard. We accept slightly stale feeds (eventual consistency) in exchange for far lower database load and faster responses. Cache memory also costs money.
2. **Read replicas scale reads but have replication lag.** A user might upload a photo and not see it right away if their next read hits a replica that has not caught up. We can mitigate this by reading the user's own recent writes from the primary, at the cost of added complexity.
3. **A queue and worker make uploads fast but the thumbnail is not instant.** The user gets a quick response, but the thumbnail is created a little later, so the system is eventually consistent and needs placeholders, retries and monitoring. It also adds more moving parts to run than doing the resize inside the upload request.
4. **Using a CDN and object storage lowers load and latency but adds cost and cache-invalidation issues.** CDN bandwidth is billed, and deleted or replaced photos may continue to be served from edge caches until they expire. We accept this because the photo bytes would otherwise overwhelm our own servers.
5. **Keeping photos out of the database means two systems must stay in sync.** A failed upload might leave a file with no database row, or a row pointing to a missing file, so we need cleanup jobs and a careful write order (file first, then metadata).

## Summary

| Metric | Estimate |
|---|---|
| Daily active users | 1,000,000 |
| Uploads/s (average / peak) | about 11.6 / about 58 |
| Feed views/s (average / peak) | about 579 / about 2,900 |
| Storage per year | about 748 TB (730 TB originals + 18.25 TB thumbnails) |
| Read:write ratio | about 50:1 (read-heavy) |
