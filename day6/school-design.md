# School database design

## Tables

**students** holds one row per person who studies at the school: an `id` (primary key), a `name` and an `email`. The email is `NOT NULL` and `UNIQUE`, so two students can never share an address and it can be used to identify someone.

**courses** holds one row per course offered: an `id` (primary key), a `title` and the number of `credits` (which must be above zero).

**enrolments** records the fact that a particular student is on a particular course. Each row has its own `id`, a `student_id` and a `course_id` (both foreign keys, both `NOT NULL`), the `grade` (allowed to be `NULL` because a grade does not exist until the student has been marked) and the `enrolled_on` date. A `UNIQUE (student_id, course_id)` constraint stops the same student enrolling on the same course twice.

## Relationships

- One student has many enrolments, and each enrolment belongs to exactly one student: **one-to-many**.
- One course has many enrolments, and each enrolment belongs to exactly one course: **one-to-many**.
- Taken together, students and courses are **many-to-many**: a student can take several courses, and a course has several students.

A join table is needed because a relational table can't store a list in one column. Putting `course_id` on `students` would allow only one course per student, and putting `student_id` on `courses` would allow only one student per course. Storing comma-separated ids in a single column would break the foreign keys and make queries and constraints much harder. The `enrolments` table splits the many-to-many relationship into two one-to-many relationships, and it is also the natural place to store facts about the pairing itself, such as the grade and enrolment date.

## Index

I would add an index on `enrolments(course_id)`:

```sql
CREATE INDEX idx_enrolments_course_id ON enrolments(course_id);
```

The `UNIQUE (student_id, course_id)` constraint already creates an index that helps lookups starting with `student_id`, but queries that start from a course ("all students on this course", "students per course") filter and join on `course_id` alone. Without an index SQLite has to scan the whole enrolments table for each of those queries, which gets slow as the number of enrolments grows. The index lets it jump straight to the matching rows.

## SQL or NoSQL?

I would choose SQL (a relational database) for this system. The data is naturally structured and relational: students, courses and enrolments have a fixed shape and are linked by clear relationships. The rules that matter here, such as unique emails, no duplicate enrolments and no enrolment pointing at a student or course that doesn't exist, are enforced directly by the database through constraints and foreign keys, so bad data is rejected instead of silently stored. Questions like "how many students per course" or "which students have no enrolments" are also exactly what joins and `GROUP BY` do well. A document database could store a student with their courses nested inside, but then each course's students would be duplicated or hard to query from the other side, and keeping copies consistent would be left to the application. NoSQL would make more sense if the data were loosely structured, changed shape often, or had to scale across many servers, and a school's enrolment records need none of that.
