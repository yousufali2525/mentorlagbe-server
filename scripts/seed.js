
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
  isActive: true,
  createdAt: new Date(),
};

const tuitionData = [
  {
    title: "Class 6 Mathematics Tutor Needed",
    subject: "Mathematics",
    description: "Experienced tutor needed for Class 6 mathematics.",
    location: "Uttara, Dhaka",
    salary: 5000,
    category: "School",
    banner: "",
  },
  {
    title: "Class 8 English Tutor Needed",
    subject: "English",
    description: "Looking for an English tutor for Class 8 student.",
    location: "Mirpur, Dhaka",
    salary: 6000,
    category: "School",
    banner: "",
  },
  {
    title: "HSC Physics Tutor Needed",
    subject: "Physics",
    description: "Need a skilled physics tutor for HSC preparation.",
    location: "Dhanmondi, Dhaka",
    salary: 8000,
    category: "College",
    banner: "",
  },
  {
    title: "Class 9 Chemistry Tutor",
    subject: "Chemistry",
    description: "Chemistry tutor required for Class 9 student.",
    location: "Mohammadpur, Dhaka",
    salary: 5500,
    category: "School",
    banner: "",
  },
  {
    title: "IELTS English Tutor Needed",
    subject: "English",
    description: "Looking for an experienced IELTS preparation tutor.",
    location: "Banani, Dhaka",
    salary: 10000,
    category: "Language",
    banner: "",
  },
  {
    title: "Class 5 All Subject Tutor",
    subject: "All Subjects",
    description: "Home tutor needed for Class 5 student.",
    location: "Rajshahi Sadar, Rajshahi",
    salary: 4000,
    category: "School",
    banner: "",
  },
  {
    title: "University Mathematics Tutor",
    subject: "Mathematics",
    description: "Need a tutor for university-level mathematics.",
    location: "Motijheel, Dhaka",
    salary: 9000,
    category: "University",
    banner: "",
  },
  {
    title: "Class 10 Biology Tutor",
    subject: "Biology",
    description: "Biology tutor needed for SSC preparation.",
    location: "Khilgaon, Dhaka",
    salary: 6500,
    category: "School",
    banner: "",
  },
  {
    title: "HSC Higher Mathematics Tutor",
    subject: "Higher Mathematics",
    description: "Experienced tutor required for HSC higher mathematics.",
    location: "Shantinagar, Dhaka",
    salary: 8500,
    category: "College",
    banner: "",
  },
  {
    title: "Spoken English Tutor",
    subject: "English",
    description: "Need a tutor for spoken English practice.",
    location: "Rajshahi Sadar, Rajshahi",
    salary: 5000,
    category: "Language",
    banner: "",
  },
  {
    title: "Class 7 Science Tutor",
    subject: "Science",
    description: "Science tutor required for Class 7 student.",
    location: "Bashundhara, Dhaka",
    salary: 6000,
    category: "School",
    banner: "",
  },
  {
    title: "HSC ICT Tutor Needed",
    subject: "ICT",
    description: "Looking for an ICT tutor for HSC preparation.",
    location: "Mirpur, Dhaka",
    salary: 7000,
    category: "College",
    banner: "",
  },
];

const seedDatabase = async () => {
  try {
    await connectDB();

    const db = getAppDb();

    await db.collection("users").updateOne(
      { _id: tutorId },
      { $setOnInsert: tutor },
      { upsert: true }
    );

    await db.collection("tuitions").deleteMany({
      tutorId,
    });

    const tuitions = tuitionData.map((tuition) => ({
      ...tuition,
      tutorId,
      tutorName: tutor.name,
      tutorEmail: tutor.email,
      approvalStatus: "approved",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await db.collection("tuitions").insertMany(tuitions);

    console.log("Seed data inserted successfully");
    console.log("12 approved tuitions created");
  } catch (error) {
    console.error("Seed Error:", error.message);
    process.exitCode = 1;
  } finally {
    await client?.close();
  }
};

seedDatabase();
