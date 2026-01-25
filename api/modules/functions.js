async function createUser(userId, firstName, location) {
  try {
    // Validate input data
    if (!userId || !firstName || !location) {
      throw new Error("Missing required user data");
    }

    // Check for existing user with unique and valid `tg_id`
    const existingUser = await User.findOne({ userId });
    if (existingUser) {
      throw new Error(`User with ID ${userId} already exists`);
    }

    const newUser = new User({
      userId,
      firstName,
      location,
    });

    await newUser.save();
    console.log(`New user created with ID: ${userId}`);

    const safeUser = {
      userId,
      firstName,
      location,
    };
    return safeUser;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

async function getUser(userId) {
  try {
    const user = await User.findOne({ userId });
    return user;
  } catch (error) {
    console.error("Error fetching user:", error);
    throw error;
  }
}
