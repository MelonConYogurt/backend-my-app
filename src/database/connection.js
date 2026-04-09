import mongoose from "mongoose";
import "dotenv/config";

const URI = process.env.URI;

export default async function Connection() {
  try {
    if (!URI) {
      console.log("URI no found");
      return;
    }
    await mongoose.connect(URI);
    console.log("Connect to database succesfully");
  } catch (error) {
    console.log(error);
    return;
  }
}
