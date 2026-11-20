
import "dotenv/config";
import { connectDB, getAppDb } from "./config/db.js";

const images = [
  {
    title: "Class 6 Mathematics Tutor Needed",
    banner: "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=900",
  },
  {
    title: "Class 8 English Tutor Needed",
    banner: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=900",
  },
  {
    title: "HSC Physics Tutor Needed",
    banner: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?w=900",
  },
  {
    title: "Class 9 Chemistry Tutor",
    banner: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=900",
  },
  {
    title: "IELTS English Tutor Needed",
    banner: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=900",
  },
  {
    title: "Class 5 All Subject Tutor",
    banner: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=900",
  },
  {
    title: "University Mathematics Tutor",
    banner: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=900",
  },
  {
    title: "Class 10 Biology Tutor",
    banner: "https://images.unsplash.com/photo-1530026405186-ed1f139313f8?w=900",
  },
  {
    title: "HSC Higher Mathematics Tutor",
    banner: "https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=900",
  },
  {
    title: "Spoken English Tutor",
    banner: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=900",
  },
  {
    title: "Class 7 Science Tutor",
    banner: "https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=900",
  },
  {
    title: "HSC ICT Tutor Needed",
    banner: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900",
  },
  {
    title: "English Tutor Needed",
    banner: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=900",
  },
  {
    title: "Mathematics Tutor Needed",
    banner: "https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=900",
  },
];

const addTuitionImages = async () => {
  try {
    await connectDB();

    const collection = getAppDb().collection("tuitions");

    let updated = 0;
    let notFound = 0;

    for (const item of images) {
      const result = await collection.updateOne(
        { title: item.title },
        { $set: { banner: item.banner } }
      );

      updated += result.modifiedCount;

      if (result.matchedCount === 0) {
        notFound++;
        console.log("Not found:", item.title);
      }
    }

    console.log("Total tuition checked:", images.length);
    console.log("Images added/updated:", updated);
    console.log("Not found:", notFound);
    console.log("Tuition image update completed.");
  } catch (error) {
    console.error("Image update failed:", error.message);
    process.exitCode = 1;
  }

  process.exit();
};

addTuitionImages();
