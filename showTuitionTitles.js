import "dotenv/config";
import { connectDB, getAppDb } from "./config/db.js";

const showTuitionTitles = async () => {
  try {
    await connectDB();

    const tuitions = await getAppDb()
      .collection("tuitions")
      .find({})
      .project({ title: 1, subject: 1, banner: 1 })
      .toArray();

    console.table(
      tuitions.map((tuition) => ({
        title: tuition.title,
        subject: tuition.subject,
        hasImage: Boolean(tuition.banner),
      }))
    );
  } catch (error) {
    console.error("Failed:", error.message);
    process.exitCode = 1;
  }
};

showTuitionTitles();