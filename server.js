import 'dotenv/config';
import app from './src/app.js';
import { initializeFirebase } from './src/config/firebase.js';


let server; 

// Initialize Firebase and start server
(async () => {
    try {
        await initializeFirebase();

        // Get port from environment or use default
        const PORT = process.env.PORT || 5000;

        // Start server and assign to the 'server' variable
        server = app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });

        // --- Error and Shutdown Handlers ---

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (err) => {
            console.error('Unhandled Promise Rejection:', err);
            // Attempt to close server gracefully before exiting
            if (server) {
                server.close(() => process.exit(1));
            } else {
                process.exit(1);
            }
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (err) => {
            console.error('Uncaught Exception:', err);
            // Attempt to close server gracefully before exiting
            if (server) {
                server.close(() => process.exit(1));
            } else {
                process.exit(1);
            }
        });

        // Graceful shutdown (for signals like Ctrl+C or deployment kill commands)
        process.on('SIGTERM', () => {
            console.log('SIGTERM received. Closing server gracefully...');
            // Check if server is running before attempting to close
            if (server) {
                server.close(() => {
                    console.log('Server closed');
                    process.exit(0);
                });
            } else {
                process.exit(0);
            }
        });

    } catch (error) {
        console.error('Failed to initialize or start server:', error.message);
        process.exit(1);
    }
})();

