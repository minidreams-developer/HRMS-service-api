const { User } = require('../models');

const dot = (a, b) => a.reduce((sum, value, index) => sum + value * b[index], 0);
const magnitude = (values) => Math.sqrt(dot(values, values));

const cosineSimilarity = (a, b) => {
  const denominator = magnitude(a) * magnitude(b);
  return denominator === 0 ? 0 : dot(a, b) / denominator;
};

const findMatchingPerson = async (embedding) => {
  const users = await User.find({
    isDeleted: { $ne: true },
    isActive: 'Active',
    faceEmbedding: { $exists: true, $ne: [] },
  }).select('+faceEmbedding name employeeId role faceEmbedding').lean();

  const threshold = Number(process.env.FACE_SIMILARITY_THRESHOLD || 0.75);
  const match = users
    .filter((user) => user.faceEmbedding.length === embedding.length)
    .map((user) => ({ user, confidence: cosineSimilarity(embedding, user.faceEmbedding) }))
    .sort((a, b) => b.confidence - a.confidence)[0];

  if (!match || match.confidence < threshold) return null;
  return {
    person: {
      id: String(match.user._id),
      name: match.user.name,
      employeeCode: match.user.employeeId,
      role: match.user.role,
    },
    confidence: Number(match.confidence.toFixed(4)),
  };
};

module.exports = { findMatchingPerson };
