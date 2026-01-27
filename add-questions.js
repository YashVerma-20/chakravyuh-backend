const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'chakravyuh.db'));

console.log('📊 Clearing existing questions and inserting REAL ROUND 3 questions...\n');

// Clear existing questions
db.prepare('DELETE FROM question_bank').run();
db.prepare('DELETE FROM team_questions').run();
console.log('✅ Cleared old questions\n');

const insertStmt = db.prepare(`
  INSERT INTO question_bank
  (question_text, question_type, options, correct_answer, max_points, question_set_id)
  VALUES (?, ?, ?, ?, ?, ?)
`);

/* =========================
   REAL ROUND 3 QUESTIONS (41 MCQs + 1 DESCRIPTIVE per set)
   ========================= */

const questions = [
    // Question 1
    {
        text: 'An algorithm performs the following operations on an array of size n: A loop runs n times. Inside the loop, a binary search is performed on a sorted array. What is the overall time complexity?',
        type: 'MCQ',
        options: '{"A":"O(n)","B":"O(n log n)","C":"O(log n)","D":"O(n²)"}',
        answer: 'B',
        points: 10
    },
    // Question 2
    {
        text: 'An algorithm runs a loop n times. Inside the loop, another loop runs i times for the current value of i (starting from 1). What is the overall time complexity?',
        type: 'MCQ',
        options: '{"A":"O(n)","B":"O(n log n)","C":"O(n²)","D":"O(n³)"}',
        answer: 'C',
        points: 10
    },
    // Question 3
    {
        text: 'Which of the following algorithms has different best-case and worst-case time complexities?',
        type: 'MCQ',
        options: '{"A":"Merge Sort","B":"Binary Search","C":"Heap Sort","D":"Selection Sort"}',
        answer: 'B',
        points: 10
    },
    // Question 4
    {
        text: 'You are given an unsorted array of n distinct elements. Which algorithm will take exactly the same number of comparisons, regardless of input order?',
        type: 'MCQ',
        options: '{"A":"Bubble Sort","B":"Insertion Sort","C":"Selection Sort","D":"Quick Sort"}',
        answer: 'C',
        points: 10
    },
    // Question 5
    {
        text: 'A recursive function calls itself once for every element in an array of size n and does constant work each time. What is the time complexity?',
        type: 'MCQ',
        options: '{"A":"O(log n)","B":"O(n)","C":"O(n log n)","D":"O(n²)"}',
        answer: 'B',
        points: 10
    },
    // Question 6 (numbered as 7 in original)
    {
        text: 'You need to find the second largest element in an unsorted array using the minimum number of comparisons. Which approach is best?',
        type: 'MCQ',
        options: '{"A":"Sort the array","B":"Traverse the array twice","C":"Use a tournament method","D":"Use Binary Search"}',
        answer: 'C',
        points: 10
    },
    // Question 7 (numbered as 8 in original)
    {
        text: 'You need to sort an array where input size is small and nearly all elements are already sorted. Which algorithm is most efficient?',
        type: 'MCQ',
        options: '{"A":"Quick Sort","B":"Merge Sort","C":"Insertion Sort","D":"Heap Sort"}',
        answer: 'C',
        points: 10
    },
    // Question 8
    {
        text: 'A stack is initially empty. Elements 1, 2, 3, 4 are pushed in this order. Which of the following output sequences is NOT possible?',
        type: 'MCQ',
        options: '{"A":"3 1 4 2","B":"2 4 3 1","C":"4 3 2 1","D":"3 2 4 1"}',
        answer: 'A',
        points: 10
    },
    // Question 9
    {
        text: 'In a binary tree: Inorder: D B E A F C G, Preorder: A B D E C F G. What is the left child of C?',
        type: 'MCQ',
        options: '{"A":"F","B":"G","C":"E","D":"D"}',
        answer: 'A',
        points: 10
    },
    // Question 10
    {
        text: 'Given the expression: ((A + (B * C)) - ((D / E) + F)). What is the maximum stack depth required during evaluation?',
        type: 'MCQ',
        options: '{"A":"3","B":"4","C":"5","D":"6"}',
        answer: 'C',
        points: 10
    },
    // Question 11
    {
        text: 'Input: 1 2 3 4. Rules: Elements move from input → Stack S1 → Stack S2 → Output. You cannot move directly from input to S2. You may pop from either stack at any time. Which sequence is IMPOSSIBLE?',
        type: 'MCQ',
        options: '{"A":"2 1 4 3","B":"3 2 1 4","C":"4 3 2 1","D":"3 1 4 2"}',
        answer: 'D',
        points: 10
    },
    // Question 12
    {
        text: 'Stack and Queue start empty. Operations: 1) Push 1,2,3,4,5 into stack 2) Pop three elements → enqueue 3) Push 6,7 into stack 4) Dequeue one element 5) Pop remaining stack elements → enqueue. Final queue order?',
        type: 'MCQ',
        options: '{"A":"5 4 3 7 6 2 1","B":"5 4 3 6 7 2 1","C":"3 4 5 7 6 2 1","D":"5 4 6 7 3 2 1"}',
        answer: 'A',
        points: 10
    },
    // Question 13
    {
        text: 'Circular queue size = 10. Initial: front = 7, rear = 6, Queue is not empty and not full. Operations: 1) ENQUEUE ×3 2) DEQUEUE ×4 3) ENQUEUE ×2. How many elements remain?',
        type: 'MCQ',
        options: '{"A":"5","B":"6","C":"7","D":"8"}',
        answer: 'B',
        points: 10
    },
    // Question 14
    {
        text: 'A singly linked list contains: 10 → 20 → 30 → 40 → 50 → NULL. Operations: 1) Delete the second node 2) Insert 25 after node containing 30 3) Delete the last node. What is the final list?',
        type: 'MCQ',
        options: '{"A":"10 → 30 → 25 → 40","B":"10 → 30 → 25 → 40 → 50","C":"10 → 20 → 30 → 25 → 40","D":"10 → 25 → 30 → 40"}',
        answer: 'A',
        points: 10
    },
    // Question 15
    {
        text: 'A Binary Search Tree (BST) contains the keys: 15, 10, 20, 8, 12, 17, 25. If you delete the node 10, what is the inorder traversal of the new BST?',
        type: 'MCQ',
        options: '{"A":"8, 12, 15, 17, 20, 25","B":"8, 15, 12, 17, 20, 25","C":"8, 12, 15, 20, 17, 25","D":"12, 8, 15, 17, 20, 25"}',
        answer: 'A',
        points: 10
    },
    // Question 16
    {
        text: 'If A → B and B → C are functional dependencies, which is always TRUE?',
        type: 'MCQ',
        options: '{"A":"C → A","B":"A → C","C":"B → A","D":"C → B"}',
        answer: 'B',
        points: 10
    },
    // Question 17
    {
        text: 'Which statement is TRUE?',
        type: 'MCQ',
        options: '{"A":"A primary key can contain NULL values","B":"A table can have more than one candidate key","C":"A foreign key must reference a primary key only","D":"Candidate keys can have duplicate values"}',
        answer: 'B',
        points: 10
    },
    // Question 18
    {
        text: 'A relation is in 3NF but not in BCNF. Which of the following MUST be true?',
        type: 'MCQ',
        options: '{"A":"It contains partial dependency","B":"It contains transitive dependency","C":"There exists a non-key determinant","D":"It has multivalued dependency"}',
        answer: 'C',
        points: 10
    },
    // Question 19
    {
        text: 'Which ACID property ensures that partial changes are never saved if a transaction fails?',
        type: 'MCQ',
        options: '{"A":"Atomicity","B":"Consistency","C":"Isolation","D":"Durability"}',
        answer: 'A',
        points: 10
    },
    // Question 20
    {
        text: 'What happens if a referenced primary key value is deleted without cascade rules?',
        type: 'MCQ',
        options: '{"A":"The delete always succeeds","B":"Related foreign key values are set to NULL","C":"The delete is rejected","D":"The table is automatically dropped"}',
        answer: 'C',
        points: 10
    },
    // Question 21
    {
        text: 'Which of the following is a weak entity?',
        type: 'MCQ',
        options: '{"A":"An entity with a composite key","B":"An entity dependent on another entity for identification","C":"An entity with multiple attributes","D":"An entity without relationships"}',
        answer: 'B',
        points: 10
    },
    // Question 22
    {
        text: 'Table Users has Names: Alice, Alina, Bob. Query: SELECT * FROM Users WHERE Name LIKE \'Al%\'; Output?',
        type: 'MCQ',
        options: '{"A":"Alice","B":"Alina","C":"Alice, Alina","D":"Bob"}',
        answer: 'C',
        points: 10
    },
    // Question 23
    {
        text: 'Transaction T1: UPDATE Account SET Balance=Balance-100 WHERE ID=1. Transaction T2: SELECT Balance FROM Account WHERE ID=1 (simultaneous). Which anomaly can occur if isolation level = READ UNCOMMITTED?',
        type: 'MCQ',
        options: '{"A":"Dirty Read","B":"Lost Update","C":"Phantom Read","D":"None"}',
        answer: 'A',
        points: 10
    },
    // Question 24
    {
        text: 'Table Products: ID=1,Name=Pen,Price=10 and ID=2,Name=Book,Price=50. Query: UPDATE Products SET Price = Price + 10 WHERE Name=\'Pen\'; New price of Book?',
        type: 'MCQ',
        options: '{"A":"10","B":"50","C":"60","D":"20"}',
        answer: 'B',
        points: 10
    },
    // Question 25
    {
        text: 'How many times is "Hello" printed? for(int i = 1; i <= 3; i++){ for(int j = i; j <= 3; j++){ print("Hello"); } }',
        type: 'MCQ',
        options: '{"A":"3","B":"4","C":"5","D":"6"}',
        answer: 'D',
        points: 10
    },
    // Question 26
    {
        text: 'What is the output? int x = 5; if(true){ int x = 10; } print(x);',
        type: 'MCQ',
        options: '{"A":"5","B":"10","C":"Compile-time error","D":"Runtime error"}',
        answer: 'C',
        points: 10
    },
    // Question 27
    {
        text: 'What is the value of x? int x = 5; x = x++ + ++x;',
        type: 'MCQ',
        options: '{"A":"10","B":"11","C":"12","D":"Undefined behavior"}',
        answer: 'D',
        points: 10
    },
    // Question 28
    {
        text: 'int x = 2, y = 1; for(int i = 1; i <= 4; i++){ y = y + x; x = x + i; } print(x + y);',
        type: 'MCQ',
        options: '{"A":"16","B":"18","C":"20","D":"22"}',
        answer: 'C',
        points: 10
    },
    // Question 29
    {
        text: 'int sum = 0; for(int i = 1; i <= 5; i++){ int x = i; while(x > 0){ sum += x; x = x - 2; } } print(sum);',
        type: 'MCQ',
        options: '{"A":"15","B":"20","C":"25","D":"30"}',
        answer: 'C',
        points: 10
    },
    // Question 30
    {
        text: 'int x = 0, i = 1; while(i <= 10){ if(i % 4 == 0) x += i; else if(i % 3 == 0) x -= i; i++; } print(x);',
        type: 'MCQ',
        options: '{"A":"2","B":"4","C":"6","D":"8"}',
        answer: 'B',
        points: 10
    },
    // Question 31
    {
        text: 'Which of the following necessarily occurs during a context switch?',
        type: 'MCQ',
        options: '{"A":"CPU cache is cleared","B":"Process state is saved","C":"Process code is modified","D":"Hard disk access is required"}',
        answer: 'B',
        points: 10
    },
    // Question 32
    {
        text: 'A system allows preemption of resources. Which deadlock condition is definitely eliminated?',
        type: 'MCQ',
        options: '{"A":"Mutual exclusion","B":"Hold and wait","C":"No preemption","D":"Circular wait"}',
        answer: 'C',
        points: 10
    },
    // Question 33
    {
        text: 'Which statement is CORRECT?',
        type: 'MCQ',
        options: '{"A":"Paging eliminates internal fragmentation","B":"Segmentation eliminates external fragmentation","C":"Paging divides memory into fixed-size blocks","D":"Segmentation uses physical memory addresses only"}',
        answer: 'C',
        points: 10
    },
    // Question 34
    {
        text: 'Why are user programs not allowed to execute privileged instructions?',
        type: 'MCQ',
        options: '{"A":"To improve execution speed","B":"To reduce memory consumption","C":"To ensure system security and stability","D":"To avoid compilation errors"}',
        answer: 'C',
        points: 10
    },
    // Question 35
    {
        text: 'A program P is stored on disk. It is loaded into memory and execution begins. Later, execution is paused and resumed. Which statement is TRUE?',
        type: 'MCQ',
        options: '{"A":"P is a program throughout","B":"P becomes a process only when paused","C":"P is a process during execution and pause","D":"P becomes a process only when resumed"}',
        answer: 'C',
        points: 10
    },
    // Question 36
    {
        text: 'During a context switch, which of the following MUST be saved to resume execution correctly?',
        type: 'MCQ',
        options: '{"A":"Source code of the process","B":"Process registers and program counter","C":"Entire main memory","D":"Hard disk data"}',
        answer: 'B',
        points: 10
    },
    // Question 37
    {
        text: 'A system removes the hold and wait condition. What is the strongest conclusion?',
        type: 'MCQ',
        options: '{"A":"Deadlock is still possible","B":"Deadlock is impossible","C":"Starvation is impossible","D":"Circular wait is guaranteed"}',
        answer: 'B',
        points: 10
    },
    // Question 38
    {
        text: 'A process is: Loaded into memory, Given CPU time, Requests I/O, Later resumes execution. Which sequence of states is MOST accurate?',
        type: 'MCQ',
        options: '{"A":"New → Ready → Running → Ready → Running","B":"New → Ready → Running → Waiting → Ready → Running","C":"New → Running → Waiting → Terminated","D":"Ready → Running → Waiting → Running"}',
        answer: 'B',
        points: 10
    },
    // Question 39
    {
        text: 'Increasing cache size indefinitely will eventually:',
        type: 'MCQ',
        options: '{"A":"Always improve performance","B":"Increase average memory access time","C":"Show diminishing performance gains","D":"Eliminate need for RAM"}',
        answer: 'C',
        points: 10
    },
    // Question 40
    {
        text: 'If interrupts are disabled for too long, the MOST serious issue is:',
        type: 'MCQ',
        options: '{"A":"Reduced CPU speed","B":"Increased memory usage","C":"Delayed I/O handling","D":"Faster execution"}',
        answer: 'C',
        points: 10
    },
    // Question 41
    {
        text: 'A program updates a database record and then crashes before commit. Which component ensures the database remains correct?',
        type: 'MCQ',
        options: '{"A":"Compiler","B":"Operating System","C":"Transaction Manager","D":"Stack Memory"}',
        answer: 'C',
        points: 10
    },
    // DESCRIPTIVE Question (Last question for each team)
    {
        text: 'Explain the concept of deadlock in operating systems. Describe at least TWO conditions required for deadlock to occur and explain ONE prevention method in detail.',
        type: 'DESCRIPTIVE',
        options: null,
        answer: null,
        points: 15
    }
];

/* =========================
   INSERT 7 QUESTION SETS
   6 MCQs + 1 DESCRIPTIVE per team
   ========================= */

console.log('Creating 7 question sets for 7 teams...\n');

db.transaction(() => {
    for (let setId = 1; setId <= 7; setId++) {
        // Select 6 MCQs for this set (evenly distributed)
        const startIdx = ((setId - 1) * 6) % 41;
        const selectedQuestions = [];

        for (let i = 0; i < 6; i++) {
            const idx = (startIdx + i) % 41;
            selectedQuestions.push(questions[idx]);
        }

        // Add the descriptive question (always last)
        selectedQuestions.push(questions[41]);

        // Insert questions for this set
        selectedQuestions.forEach(q => {
            insertStmt.run(
                q.text,
                q.type,
                q.options,
                q.answer,
                q.points,
                setId
            );
        });

        console.log(`✅ Set ${setId} inserted (6 MCQ + 1 DESCRIPTIVE)`);
    }
})();

const count = db.prepare('SELECT COUNT(*) as total FROM question_bank').get();
console.log(`\n📚 Total questions in DB: ${count.total}`);
console.log('   (7 sets × 7 questions = 49 questions)');

db.close();
console.log('\n🎯 REAL ROUND 3 QUESTIONS LOADED SUCCESSFULLY!');