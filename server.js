const app = require('./src/app');
const Connection = require('./src/db/stratex');
const http = require('http');
const { Server } = require('socket.io');
const socketService = require('./src/services/socket.service');
const PORT = process.env.PORT || 5000;

// Global handlers to capture crashes and unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Optional: give process manager (e.g., PM2) a chance to restart
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  // In many cases it's safer to exit after an uncaught exception to avoid unknown state
  try {
    // attempt to perform any synchronous cleanup here if necessary
  } catch (cleanupErr) {
    console.error('Error during cleanup after uncaughtException:', cleanupErr);
  }
  // exit with failure code; process manager should restart the process
  process.exit(1);
});

const startServer = async () => {
    await Connection();

    const server = http.createServer(app);

    const io = new Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || '*',
            methods: ['GET', 'POST'],
            credentials: true
        }
    });

    // Initialize socket service so other modules can emit events
    socketService.init(io);

    // Secure socket connections by validating JWT during handshake
    const jwt = require('jsonwebtoken');
    const userModel = require('./src/models/user.model');

    io.use(async (socket, next) => {
        try {
            // token may come from cookie, auth payload, or auth header
            const cookieHeader = socket.handshake.headers?.cookie || "";
            let token = null;

            // parse cookies
            if (cookieHeader) {
                const pairs = cookieHeader.split(';').map(s => s.trim());
                for (const p of pairs) {
                    if (p.startsWith('access_token=')) {
                        token = p.split('=')[1];
                        break;
                    }
                }
            }

            // fallback to handshake auth (socket.io v3+ supports auth payload)
            if (!token && socket.handshake.auth && socket.handshake.auth.token) {
                token = socket.handshake.auth.token;
            }

            // fallback to Authorization header
            if (!token && socket.handshake.headers && socket.handshake.headers.authorization) {
                const parts = String(socket.handshake.headers.authorization).split(' ');
                token = parts.length === 2 ? parts[1] : null;
            }

            // Enforce strict authentication: reject connection if token missing/invalid
            if (!token) {
                return next(new Error('Authentication error: token missing'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (!decoded || !decoded.userId) return next(new Error('Authentication error: invalid token'));

            const authUser = await userModel.findById(decoded.userId).select('-password -setupToken -setupTokenExpiry');
            if (!authUser) return next(new Error('Authentication error: user not found'));

            // attach user info to socket and join user room
            socket.user = { _id: String(decoded.userId), ...decoded };
            socket.join(`user:${decoded.userId}`);

            return next();
        } catch (err) {
            console.warn('socket auth failed:', err.message);
            return next(new Error('Authentication error: verification failed'));
        }
    });

    io.on('connection', (socket) => {
        // connection established; socket.user present if authenticated
        if (socket.user) {
            // user already joined room in middleware
            console.log(`Socket connected for user ${socket.user._id}`);
        }

        socket.on('join', (payload) => {
            try {
                const userId = payload && payload.userId ? String(payload.userId) : null;
                if (userId) {
                    socket.join(`user:${userId}`);
                }
            } catch (err) {
                console.error('socket join error', err);
            }
        });

        socket.on('disconnect', () => {
            // cleanup if needed
        });
    });

    const enableRetry = String(process.env.ENABLE_PORT_RETRY || 'false').toLowerCase() === 'true';
    const maxAttempts = Number(process.env.MAX_PORT_RETRY_ATTEMPTS || 10);

    if (!enableRetry) {
        // Default behavior: single listen attempt, fail loudly on EADDRINUSE
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });

        server.on('error', (err) => {
            if (err && err.code === 'EADDRINUSE') {
                console.error(`Port ${PORT} is already in use. Exiting.`);
                process.exit(1);
            } else {
                console.error('Server error:', err);
                process.exit(1);
            }
        });
    } else {
        // Safe retry behavior: try successive ports up to maxAttempts
        const startListening = (port, attemptsLeft = maxAttempts) => {
            port = Number(port) || 5000;

            // remove previous error listeners to avoid duplication when retrying
            server.removeAllListeners('error');

            server.listen(port, () => {
                console.log(`Server is running on port ${port}`);
            });

            server.on('error', (err) => {
                if (err && err.code === 'EADDRINUSE') {
                    console.error(`Port ${port} is already in use.`);
                    if (attemptsLeft > 0) {
                        const nextPort = port + 1;
                        console.log(`Retrying with port ${nextPort} (${attemptsLeft} attempts left)...`);
                        setTimeout(() => startListening(nextPort, attemptsLeft - 1), 500);
                    } else {
                        console.error('No available ports found. Exiting.');
                        process.exit(1);
                    }
                } else {
                    console.error('Server error:', err);
                    process.exit(1);
                }
            });
        };

        startListening(Number(PORT), maxAttempts);
    }

}
startServer().catch((err) => {
    console.error("Failed to start server:", err.message);
    process.exit(1);
});
