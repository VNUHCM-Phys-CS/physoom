import mongoose from "mongoose"
import slug from'mongoose-slug-generator';
mongoose.plugin(slug);
const connection = {};

const uri = process.env.MONGODB_URI
export const connectToDb = async () => {
  try {
    if(connection.isConnected) {
      console.log("Using existing connection");
      return;
    }
    const db = await mongoose.connect(uri);
    connection.isConnected = db.connections[0].readyState;
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
};
