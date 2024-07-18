import mongoose, {Schema} from "mongoose";

const userSchema = new Schema({
      email: {
        type: String,
        required: true,
        unique: true,
        max: 50,
      },
      isAdmin: {
        type: Boolean,
        default: false,
      },
    });

const User = mongoose.models?.User || mongoose.model("User",userSchema);

export default User;