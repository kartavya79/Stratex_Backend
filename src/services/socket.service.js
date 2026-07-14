let io = null;

const init = (serverIo) => {
  io = serverIo;
};

const getIo = () => io;

const emitToUser = (userId, event, payload) => {
  if (!io) return;
  try {
    io.to(`user:${userId}`).emit(event, payload);
  } catch (err) {
    console.error('emitToUser error', err);
  }
};

const emitToUsers = (userIds = [], event, payload) => {
  if (!io) return;
  for (const id of userIds) {
    try {
      io.to(`user:${id}`).emit(event, payload);
    } catch (err) {
      console.error('emitToUsers error', err);
    }
  }
};

module.exports = { init, getIo, emitToUser, emitToUsers };
