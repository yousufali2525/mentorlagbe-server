import "dotenv/config";
import { connectDB, getAppDb, client } from "../config/db.js";

const tutorId = "seed-tutor-mentorlagbe";

const tutor = {
  _id: tutorId,
  name: "Demo Tutor",
  email: "demo.tutor@mentorlagbe.test",
  role: "tutor",
  plan: "pro",
  profileImage: "",
  phone: "",
  location: "Dhaka, Bangladesh",
  bio: "Experienced tutor for school, college, and university students.",
  isActive: true,
};

const tuitionData = [
  {
    title: "Class 6 Mathematics Tutor Needed",
    subject: "Math",
    classLevel: "Class 6",
    mode: "Offline",
    location: "Uttara, Dhaka",
    monthlyFee: 5000,
    daysPerWeek: 3,
    bannerImage: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=900",
    description: "Experienced tutor needed for Class 6 mathematics, focusing on fundamentals and exam preparation.",
    category: "School",
  },
  {
    title: "Class 9 Physics Home Tutor",
    subject: "Physics",
    classLevel: "Class 9",
    mode: "Offline",
    location: "Dhanmondi, Dhaka",
    monthlyFee: 7000,
    daysPerWeek: 3,
    bannerImage: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=900",
    description: "Need a skilled physics tutor for Class 9 to build strong concepts and problem-solving skills.",
    category: "School",
  },
  {
    title: "HSC Chemistry Tutor Needed",
    subject: "Chemistry",
    classLevel: "HSC",
    mode: "Online",
    location: "Mirpur, Dhaka",
    monthlyFee: 8000,
    daysPerWeek: 4,
    bannerImage: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=900",
    description: "Looking for an HSC chemistry tutor for board exam preparation and chapter-wise practice.",
    category: "College",
  },
  {
    title: "Class 10 Biology Tutor Needed",
    subject: "Biology",
    classLevel: "Class 10",
    mode: "Offline",
    location: "Khilgaon, Dhaka",
    monthlyFee: 6500,
    daysPerWeek: 3,
    bannerImage: "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=900",
    description: "Biology tutor needed for SSC preparation with diagrams, notes, and regular tests.",
    category: "School",
  },
  {
    title: "IELTS Preparation Tutor Online",
    subject: "English/IELTS",
    classLevel: "University",
    mode: "Online",
    location: "Banani, Dhaka",
    monthlyFee: 12000,
    daysPerWeek: 4,
    bannerImage: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=900",
    description: "Experienced IELTS tutor needed for speaking, writing, listening, and reading practice.",
    category: "Language",
  },
  {
    title: "University Programming Mentor",
    subject: "Programming",
    classLevel: "University",
    mode: "Online",
    location: "Mohakhali, Dhaka",
    monthlyFee: 10000,
    daysPerWeek: 2,
    bannerImage: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900",
    description: "Need a programming mentor for JavaScript, problem solving, and project guidance.",
    category: "University",
  },
  {
    title: "Class 8 Mathematics Tutor Needed",
    subject: "Math",
    classLevel: "Class 8",
    mode: "Online",
    location: "Rajshahi Sadar, Rajshahi",
    monthlyFee: 5500,
    daysPerWeek: 3,
    bannerImage: "https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=900",
    description: "Online math tutor required for Class 8 algebra, geometry, and regular homework support.",
    category: "School",
  },
  {
    title: "HSC Physics Problem Solving Tutor",
    subject: "Physics",
    classLevel: "HSC",
    mode: "Offline",
    location: "Shantinagar, Dhaka",
    monthlyFee: 9000,
    daysPerWeek: 4,
    bannerImage: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=900",
    description: "HSC physics tutor needed for numerical problem solving and exam-focused preparation.",
    category: "College",
  },
  {
    title: "Class 9 Chemistry Lab Concepts Tutor",
    subject: "Chemistry",
    classLevel: "Class 9",
    mode: "Online",
    location: "Chattogram City, Chattogram",
    monthlyFee: 6000,
    daysPerWeek: 2,
    bannerImage: "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=900",
    description: "Online chemistry tutor for Class 9 students to strengthen theory and practical concepts.",
    category: "School",
  },
  {
    title: "HSC Biology Admission Prep Tutor",
    subject: "Biology",
    classLevel: "HSC",
    mode: "Offline",
    location: "Farmgate, Dhaka",
    monthlyFee: 8500,
    daysPerWeek: 5,
    bannerImage: "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=900",
    description: "Biology tutor for HSC and medical admission preparation with structured revision.",
    category: "College",
  },
  {
    title: "Spoken English and IELTS Basics",
    subject: "English/IELTS",
    classLevel: "Class 9",
    mode: "Offline",
    location: "Bashundhara, Dhaka",
    monthlyFee: 5000,
    daysPerWeek: 2,
    bannerImage: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=900",
    description: "Tutor needed for spoken English, grammar basics, and introductory IELTS skills.",
    category: "Language",
  },
  {
    title: "University Programming Fundamentals Tutor",
    subject: "Programming",
    classLevel: "University",
    mode: "Offline",
    location: "Motijheel, Dhaka",
    monthlyFee: 9500,
    daysPerWeek: 3,
    bannerImage: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=900",
    description: "In-person programming tutor for C/C++, data structures, and university coursework.",
    category: "University",
  },
];

const seedDatabase = async () => {
  try {
    await connectDB();
    const db = getAppDb();
    const users = db.collection("users");
    const tuitions = db.collection("tuitions");
    const now = new Date();

    await users.updateOne(
      { _id: tutorId },
      {
        $set: {
          name: tutor.name,
          email: tutor.email,
          role: tutor.role,
          plan: tutor.plan,
          profileImage: tutor.profileImage,
          phone: tutor.phone,
          location: tutor.location,
          bio: tutor.bio,
          isActive: tutor.isActive,
          updatedAt: now,
        },
        $setOnInsert: {
          _id: tutorId,
          createdAt: now,
        },
      },
      { upsert: true }
    );

    // Migrate existing tuition documents missing assignment fields.
    await tuitions.updateMany(
      { $or: [{ monthlyFee: { $exists: false } }, { monthlyFee: null }] },
      [
        {
          $set: {
            monthlyFee: {
              $ifNull: ["$salary", { $ifNull: ["$monthlyFee", 0] }],
            },
          },
        },
      ]
    );

    await tuitions.updateMany(
      {
        $or: [
          { salary: { $exists: false } },
          { salary: null },
        ],
        monthlyFee: { $exists: true },
      },
      [{ $set: { salary: "$monthlyFee" } }]
    );

    await tuitions.updateMany(
      { $or: [{ bannerImage: { $exists: false } }, { bannerImage: null }, { bannerImage: "" }] },
      [
        {
          $set: {
            bannerImage: { $ifNull: ["$banner", ""] },
          },
        },
      ]
    );

    await tuitions.updateMany(
      { $or: [{ banner: { $exists: false } }, { banner: null }] },
      [{ $set: { banner: { $ifNull: ["$bannerImage", ""] } } }]
    );

    await tuitions.updateMany(
      { $or: [{ classLevel: { $exists: false } }, { classLevel: null }, { classLevel: "" }] },
      { $set: { classLevel: "General" } }
    );

    await tuitions.updateMany(
      { $or: [{ mode: { $exists: false } }, { mode: null }, { mode: "" }] },
      { $set: { mode: "Online" } }
    );

    await tuitions.updateMany(
      { $or: [{ daysPerWeek: { $exists: false } }, { daysPerWeek: null }] },
      { $set: { daysPerWeek: 3 } }
    );

    await tuitions.updateMany(
      { $or: [{ isActive: { $exists: false } }, { isActive: null }] },
      { $set: { isActive: true } }
    );

    await tuitions.updateMany(
      { $or: [{ approvalStatus: { $exists: false } }, { approvalStatus: null }, { approvalStatus: "" }] },
      { $set: { approvalStatus: "pending" } }
    );

    let upserted = 0;
    let modified = 0;

    for (const tuition of tuitionData) {
      const doc = {
        ...tuition,
        salary: tuition.monthlyFee,
        banner: tuition.bannerImage,
        tutorId,
        tutorName: tutor.name,
        tutorEmail: tutor.email,
        approvalStatus: "approved",
        isActive: true,
        updatedAt: now,
      };

      const result = await tuitions.updateOne(
        { tutorId, title: tuition.title },
        {
          $set: doc,
          $setOnInsert: { createdAt: now },
        },
        { upsert: true }
      );

      if (result.upsertedCount) upserted += result.upsertedCount;
      if (result.modifiedCount) modified += result.modifiedCount;
    }

    console.log("Seed completed successfully");
    console.log(`Seeded tutor: ${tutor.email}`);
    console.log(`Tuitions processed: ${tuitionData.length}`);
    console.log(`Tuitions upserted: ${upserted}`);
    console.log(`Tuitions modified: ${modified}`);
  } catch (error) {
    console.error("Seed Error:", error.message);
    process.exitCode = 1;
  } finally {
    await client?.close();
  }
};

seedDatabase();