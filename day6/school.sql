-- Day 6: School database (SQLite)
-- Run the whole script top to bottom in an SQLite playground.

PRAGMA foreign_keys = ON;

-- Clean start so the script can be re-run safely
DROP TABLE IF EXISTS enrolments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;

-- ---------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------

CREATE TABLE students (
    id    INTEGER PRIMARY KEY,
    name  TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
    id      INTEGER PRIMARY KEY,
    title   TEXT NOT NULL,
    credits INTEGER NOT NULL CHECK (credits > 0)
);

CREATE TABLE enrolments (
    id          INTEGER PRIMARY KEY,
    student_id  INTEGER NOT NULL,
    course_id   INTEGER NOT NULL,
    grade       TEXT,  -- NULL until the student has been graded
    enrolled_on TEXT NOT NULL DEFAULT (date('now')),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (course_id)  REFERENCES courses(id),
    -- the same student cannot enrol on the same course twice
    UNIQUE (student_id, course_id)
);

-- ---------------------------------------------------------
-- 2. Sample data
-- ---------------------------------------------------------

INSERT INTO students (id, name, email) VALUES
    (1, 'Amina Wanjiru', 'amina@example.com'),
    (2, 'Brian Otieno',  'brian@example.com'),
    (3, 'Chloe Kamau',   'chloe@example.com'),
    (4, 'David Mwangi',  'david@example.com');

INSERT INTO courses (id, title, credits) VALUES
    (1, 'Web Foundations',        4),
    (2, 'Databases',              3),
    (3, 'JavaScript Essentials',  3);

INSERT INTO enrolments (id, student_id, course_id, grade, enrolled_on) VALUES
    (1, 1, 1, 'A', '2026-09-01'),
    (2, 1, 2, 'B', '2026-09-01'),
    (3, 2, 1, 'B', '2026-09-02'),
    (4, 2, 3, NULL, '2026-09-02'),
    (5, 3, 2, 'A', '2026-09-03'),
    (6, 3, 1, NULL, '2026-09-03');
-- David (student 4) is deliberately not enrolled on anything.

-- ---------------------------------------------------------
-- 3. Queries
-- ---------------------------------------------------------

-- Q1. All courses for one student, found by name
SELECT s.name, c.title, e.grade
FROM students s
JOIN enrolments e ON e.student_id = s.id
JOIN courses c    ON c.id = e.course_id
WHERE s.name = 'Amina Wanjiru';

-- Q2. All students on one course
SELECT c.title, s.name, s.email
FROM courses c
JOIN enrolments e ON e.course_id = c.id
JOIN students s   ON s.id = e.student_id
WHERE c.title = 'Web Foundations';

-- Q3. Number of students per course (courses with none show 0)
SELECT c.title, COUNT(e.id) AS student_count
FROM courses c
LEFT JOIN enrolments e ON e.course_id = c.id
GROUP BY c.id, c.title
ORDER BY student_count DESC;

-- Q4. Students who have no enrolments
SELECT s.id, s.name, s.email
FROM students s
LEFT JOIN enrolments e ON e.student_id = s.id
WHERE e.id IS NULL;

-- Q5. Update one enrolment's grade (Brian's JavaScript Essentials grade)
UPDATE enrolments
SET grade = 'A'
WHERE student_id = (SELECT id FROM students WHERE name = 'Brian Otieno')
  AND course_id  = (SELECT id FROM courses  WHERE title = 'JavaScript Essentials');

-- Check the update worked
SELECT s.name, c.title, e.grade
FROM enrolments e
JOIN students s ON s.id = e.student_id
JOIN courses c  ON c.id = e.course_id
WHERE s.name = 'Brian Otieno';