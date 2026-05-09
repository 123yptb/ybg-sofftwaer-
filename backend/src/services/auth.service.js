const bcrypt = require('bcryptjs');
const { getUserByEmail, getUserById } = require('../models/user.model');
const { generateToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

const loginUserWithEmailAndPassword = async (email, password) => {
  const user = await getUserByEmail(email);
  if (!user) {
    throw new ApiError(401, 'Incorrect email or password');
  }

  const isPasswordMatch = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordMatch) {
    throw new ApiError(401, 'Incorrect email or password');
  }

  const token = generateToken(user.id, user.tenant_id, user.role);

  // Return user without password_hash for safety
  const { password_hash, ...userWithoutPassword } = user;
  
  return { user: userWithoutPassword, token };
};

const getUserProfile = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return user;
};

module.exports = { loginUserWithEmailAndPassword, getUserProfile };
