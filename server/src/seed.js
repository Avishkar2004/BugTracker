/**
 * Wipes the database and fills it with a realistic demo dataset.
 * Run with: npm run seed
 */
import env from "./config/env.js";
import { connectDB, disconnectDB } from "./config/db.js";
import User from "./models/User.js";
import Bug from "./models/Bug.js";
import Comment from "./models/Comment.js";
import Activity from "./models/Activity.js";
import Counter from "./models/Counter.js";

const DEMO_PASSWORD = "password123";
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(Date.now() - n * DAY);

const USERS = [
  { name: "Avishkar Kakde", email: "admin@bugtracker.dev", role: "admin" },
  { name: "Priya Sharma", email: "priya@bugtracker.dev", role: "developer" },
  { name: "Marcus Chen", email: "marcus@bugtracker.dev", role: "developer" },
  { name: "Fatima Noor", email: "fatima@bugtracker.dev", role: "tester" },
  { name: "Diego Rivera", email: "diego@bugtracker.dev", role: "reporter" },
];

const BUGS = [
  {
    title: "Login fails silently when the session token has expired",
    description:
      "Submitting the login form with an expired session cookie present returns a 200 but never redirects. The user is left on the login page with no error message.",
    stepsToReproduce:
      "1. Log in and stay idle for 8 days\n2. Reload /login\n3. Enter valid credentials and submit\n4. Nothing happens — no redirect, no error",
    environment: "Chrome 131, Windows 11",
    priority: "Critical",
    status: "In Progress",
    tags: ["auth", "frontend"],
    assignee: 1,
    reporter: 3,
    age: 6,
  },
  {
    title: "Attachment upload rejects PNGs larger than 2 MB",
    description:
      "The server caps uploads at 2 MB even though the documented limit is 10 MB. Screenshots from high-DPI displays are routinely rejected.",
    stepsToReproduce: "1. Open any bug\n2. Attach a 4 MB PNG\n3. Observe HTTP 413",
    environment: "API v1.0, Node 20",
    priority: "High",
    status: "New",
    tags: ["api", "uploads"],
    assignee: null,
    reporter: 3,
    age: 2,
  },
  {
    title: "Dashboard chart renders off-screen on 1366x768 laptops",
    description:
      "The status breakdown chart overflows its container at narrow widths, pushing the legend outside the viewport.",
    stepsToReproduce: "1. Set the browser to 1366x768\n2. Open the dashboard\n3. The legend is clipped",
    environment: "Firefox 133, Windows 10",
    priority: "Medium",
    status: "Testing",
    tags: ["ui", "responsive"],
    assignee: 2,
    reporter: 4,
    age: 9,
  },
  {
    title: "Bulk status change does not write activity history",
    description:
      "Changing status via the bulk action bar updates the bugs but leaves no audit trail, so nobody can tell who moved 30 bugs to Closed.",
    stepsToReproduce: "1. Select 5 bugs\n2. Bulk set status to Closed\n3. Open any of them — activity is empty",
    environment: "API v1.0",
    priority: "High",
    status: "Resolved",
    tags: ["api", "audit"],
    assignee: 1,
    reporter: 0,
    age: 14,
    resolvedAfter: 4,
  },
  {
    title: "Search ignores the bug key when it contains a hyphen",
    description: "Searching for BUG-12 returns nothing; searching for 12 returns every bug created in December.",
    stepsToReproduce: "1. Type BUG-12 into the search box\n2. No results",
    environment: "API v1.0",
    priority: "Medium",
    status: "Resolved",
    tags: ["search", "api"],
    assignee: 2,
    reporter: 3,
    age: 20,
    resolvedAfter: 6,
  },
  {
    title: "Email notification links point at localhost in production",
    description:
      "Assignment emails are generated with the dev base URL, so every link in production is unreachable for the recipient.",
    stepsToReproduce: "1. Assign a bug in production\n2. Open the email\n3. The link is http://localhost:5173/...",
    environment: "Production",
    priority: "Critical",
    status: "New",
    tags: ["notifications", "config"],
    assignee: null,
    reporter: 0,
    age: 1,
  },
  {
    title: "Comment box loses draft text when the page auto-refreshes",
    description: "A half-written comment is discarded whenever the bug detail poll refreshes the page data.",
    stepsToReproduce: "1. Start typing a comment\n2. Wait 30 seconds for the refresh\n3. The textarea is empty",
    environment: "Chrome 131",
    priority: "Low",
    status: "New",
    tags: ["ui", "comments"],
    assignee: null,
    reporter: 4,
    age: 3,
  },
  {
    title: "Closed bugs still appear in the assignee workload count",
    description: "The 'my open bugs' counter includes Resolved and Closed items, inflating everyone's workload.",
    stepsToReproduce: "1. Close all of your bugs\n2. The sidebar still shows a non-zero count",
    environment: "API v1.0",
    priority: "Medium",
    status: "In Progress",
    tags: ["api", "stats"],
    assignee: 2,
    reporter: 1,
    age: 5,
  },
  {
    title: "CSV export drops the description column entirely",
    description: "Exported files contain every column except description, which is the one QA actually needs.",
    stepsToReproduce: "1. Export any filtered list as CSV\n2. Open it — no description column",
    environment: "API v1.0",
    priority: "Low",
    status: "Closed",
    tags: ["export"],
    assignee: 1,
    reporter: 4,
    age: 26,
    resolvedAfter: 9,
  },
  {
    title: "Tag filter is case sensitive",
    description: "Filtering by 'API' returns nothing while 'api' returns 14 bugs. Tags should be normalised.",
    stepsToReproduce: "1. Filter by the tag API in uppercase\n2. Zero results",
    environment: "API v1.0",
    priority: "Medium",
    status: "Closed",
    tags: ["search", "tags"],
    assignee: 2,
    reporter: 3,
    age: 30,
    resolvedAfter: 3,
  },
  {
    title: "Priority dropdown resets to Medium after a failed save",
    description:
      "If the PATCH request fails validation, the form state is reset rather than preserved, losing the user's selection.",
    stepsToReproduce: "1. Set priority to Critical\n2. Force a validation error\n3. The dropdown shows Medium again",
    environment: "Chrome 131",
    priority: "Low",
    status: "Testing",
    tags: ["ui", "forms"],
    assignee: 1,
    reporter: 3,
    age: 11,
  },
  {
    title: "Rate limiting blocks legitimate QA batch reporting",
    description:
      "Filing more than 10 bugs in a minute triggers the rate limiter, which is normal behaviour during a regression sweep.",
    stepsToReproduce: "1. File 11 bugs in under a minute\n2. Receive HTTP 429",
    environment: "Production",
    priority: "High",
    status: "In Progress",
    tags: ["api", "rate-limit"],
    assignee: 2,
    reporter: 3,
    age: 8,
  },
];

const COMMENTS = [
  { bug: 0, author: 1, body: "Reproduced locally. The refresh token check runs before the expiry check, so the guard short-circuits.", age: 5 },
  { bug: 0, author: 3, body: "Confirming this also happens on Safari 18.", age: 4 },
  { bug: 0, author: 1, body: "Fix is up on the auth-expiry branch, needs review.", age: 1 },
  { bug: 1, author: 0, body: "The 2 MB cap is hardcoded in the multer config — easy fix, just needs the env wired through.", age: 1 },
  { bug: 3, author: 1, body: "Added activity writes to the bulk handler. Ready for QA.", age: 3 },
  { bug: 3, author: 3, body: "Verified on staging, audit trail now shows the actor and both values.", age: 2 },
  { bug: 5, author: 0, body: "Blocking the release. Assigning as soon as someone frees up.", age: 1 },
  { bug: 7, author: 2, body: "The aggregate needs a $nin on the closed statuses. Working on it.", age: 2 },
  { bug: 11, author: 2, body: "Proposal: exempt authenticated testers from the per-minute cap.", age: 6 },
];

async function seed() {
  await connectDB(env.mongoUri);

  await Promise.all([
    User.deleteMany({}),
    Bug.deleteMany({}),
    Comment.deleteMany({}),
    Activity.deleteMany({}),
    Counter.deleteMany({}),
  ]);
  console.log("Cleared existing collections.");

  const users = [];
  for (const spec of USERS) {
    users.push(await User.create({ ...spec, password: DEMO_PASSWORD }));
  }
  console.log(`Created ${users.length} users.`);

  const bugs = [];
  for (const spec of BUGS) {
    const bug = await Bug.create({
      title: spec.title,
      description: spec.description,
      stepsToReproduce: spec.stepsToReproduce,
      environment: spec.environment,
      priority: spec.priority,
      status: spec.status,
      tags: spec.tags,
      reporter: users[spec.reporter]._id,
      assignee: spec.assignee === null ? null : users[spec.assignee]._id,
    });

    const createdAt = daysAgo(spec.age);
    const resolvedAt =
      spec.resolvedAfter != null ? daysAgo(Math.max(0, spec.age - spec.resolvedAfter)) : null;

    // Backdate through the raw collection: Mongoose marks `createdAt` immutable,
    // so a model-level $set on it is silently stripped.
    await Bug.collection.updateOne(
      { _id: bug._id },
      { $set: { createdAt, updatedAt: resolvedAt || createdAt, resolvedAt } }
    );

    const history = [
      { bug: bug._id, actor: bug.reporter, type: "created", note: bug.key, createdAt },
    ];
    if (bug.assignee) {
      history.push({
        bug: bug._id,
        actor: users[0]._id,
        type: "assigned",
        field: "assignee",
        to: String(bug.assignee),
        createdAt: new Date(createdAt.getTime() + 2 * 60 * 60 * 1000),
      });
    }
    if (spec.status !== "New") {
      history.push({
        bug: bug._id,
        actor: bug.assignee || users[0]._id,
        type: "status_changed",
        field: "status",
        from: "New",
        to: spec.status,
        createdAt: resolvedAt || new Date(createdAt.getTime() + DAY),
      });
    }
    await Activity.insertMany(history, { timestamps: false });

    bugs.push(bug);
  }
  console.log(`Created ${bugs.length} bugs with activity history.`);

  for (const spec of COMMENTS) {
    const comment = await Comment.create({
      bug: bugs[spec.bug]._id,
      author: users[spec.author]._id,
      body: spec.body,
    });
    await Comment.updateOne(
      { _id: comment._id },
      { $set: { createdAt: daysAgo(spec.age), updatedAt: daysAgo(spec.age) } },
      { timestamps: false }
    );
    await Bug.updateOne({ _id: bugs[spec.bug]._id }, { $inc: { commentCount: 1 } }, { timestamps: false });
    await Activity.insertMany(
      [
        {
          bug: bugs[spec.bug]._id,
          actor: users[spec.author]._id,
          type: "commented",
          createdAt: daysAgo(spec.age),
        },
      ],
      { timestamps: false }
    );
  }
  console.log(`Created ${COMMENTS.length} comments.`);

  console.log("\nSeed complete. Log in with any of these accounts:");
  for (const u of users) console.log(`  ${u.email.padEnd(26)} ${DEMO_PASSWORD}   (${u.role})`);

  await disconnectDB();
}

seed().catch(async (err) => {
  console.error("Seed failed:", err);
  await disconnectDB();
  process.exit(1);
});
